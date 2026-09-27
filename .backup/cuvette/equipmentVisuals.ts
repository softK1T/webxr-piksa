import {
  Color3,
  DynamicTexture,
  StandardMaterial,
  type AbstractMesh,
  type Scene,
} from "@babylonjs/core";
import type { ScenarioState, StepId } from "../sim/scenario";
import {
  filtrateColor,
  phMeterScreen,
  rawWaterColor,
  readPhMeter,
  residueColor,
  turbidimeterScreen,
  type Rgb,
} from "../sim/water";

export interface EquipmentView {
  bottle: number;
  flask: number;
  cuvette: number;
  filtrate: number;
  filterStained: boolean;
  turbidimeter: string;
  phMeter: string;
}

/** Pure: what the equipment shows for a scenario state (levels 0..1, screen texts). */
export function equipmentView(state: ScenarioState): EquipmentView {
  const done = (id: StepId) => state.completed.includes(id);
  const filtered = done("toggle_lever");
  return {
    bottle: state.flaskFilled ? 0 : 1,
    flask: state.flaskFilled ? (filtered ? 0.25 : 1) : 0,
    cuvette: done("tube_to_rack") ? 1 : 0,
    filtrate: filtered ? 1 : 0,
    filterStained: filtered,
    turbidimeter: done("tube_to_rack")
      ? turbidimeterScreen(state.sample, state.flaskFilled)
      : "READY",
    phMeter: done("press_start")
      ? phMeterScreen(readPhMeter(state.sample, state.calibrated))
      : state.calibrated
        ? "CAL 7.00 OK"
        : "CAL ---",
  };
}

const MIN_LEVEL = 0.0001;

/** Applies equipmentView to the loaded models. Call on state change only (no per-frame work). */
export function createEquipmentVisuals(scene: Scene) {
  const mats = new Map<string, StandardMaterial>();
  const screens = new Map<string, DynamicTexture>();

  const parts = (placementId: string, part: RegExp): AbstractMesh[] =>
    scene.meshes.filter(
      (m) =>
        (m.metadata as { placementId?: string } | null)?.placementId ===
          placementId && part.test(m.name),
    );

  const tint = (key: string, rgb: Rgb, alpha: number) => {
    let mat = mats.get(key);
    if (!mat) {
      mat = new StandardMaterial(`visual_${key}`, scene);
      mat.specularColor = Color3.Black();
      mat.alpha = alpha;
      mats.set(key, mat);
    }
    mat.diffuseColor = new Color3(rgb[0], rgb[1], rgb[2]);
    return mat;
  };

  const level = (
    meshes: AbstractMesh[],
    value: number,
    mat: StandardMaterial,
  ) => {
    for (const m of meshes) {
      m.material = mat;
      m.scaling.y = Math.max(value, MIN_LEVEL);
      m.unfreezeWorldMatrix();
    }
  };

  const screen = (placementId: string, text: string) => {
    const meshes = parts(placementId, /^Screen/);
    if (meshes.length === 0) return;
    let tex = screens.get(placementId);
    if (!tex) {
      tex = new DynamicTexture(
        `screen_${placementId}`,
        { width: 256, height: 128 },
        scene,
        false,
      );
      const mat = new StandardMaterial(`screen_${placementId}`, scene);
      mat.emissiveTexture = tex;
      mat.disableLighting = true;
      for (const m of meshes) m.material = mat;
      screens.set(placementId, tex);
    }
    const ctx = tex.getContext();
    ctx.fillStyle = "#0b1a10";
    ctx.fillRect(0, 0, 256, 128);
    ctx.fillStyle = "#b8f5a0";
    ctx.font = "bold 30px monospace";
    text
      .replace(/ {2,}/g, "\n")
      .split("\n")
      .slice(0, 3)
      .forEach((line, i) => ctx.fillText(line, 12, 40 + i * 36));
    tex.update();
  };

  const update = (state: ScenarioState) => {
    const v = equipmentView(state);
    const raw = rawWaterColor(state.sample);
    level(parts("sample_bottle", /^Liquid/), v.bottle, tint("raw", raw, 0.85));
    level(parts("erlenmeyer", /^Liquid/), v.flask, tint("raw", raw, 0.85));
    level(parts("cuvette", /^Liquid/), v.cuvette, tint("raw", raw, 0.85));
    level(
      parts("filtration", /^(Filtrate|Liquid)/),
      v.filtrate,
      tint("filtrate", filtrateColor(state.sample), 0.6),
    );
    level(parts("filtration", /^FunnelLiquid/), 0, tint("raw", raw, 0.85));
    if (v.filterStained)
      for (const m of parts("filtration", /^Filter(?!ed|ate)/))
        m.material = tint("residue", residueColor(state.sample), 1);
    screen("turbidimeter", v.turbidimeter);
    screen("ph_meter", v.phMeter);
  };

  return { update };
}
