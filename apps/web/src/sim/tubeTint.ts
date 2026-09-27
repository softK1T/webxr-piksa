import { Color3, type Material, type Scene } from "@babylonjs/core";
import { placementOf } from "../xr/selection";
import type { ScenarioState } from "./scenario";

const EMPTY = null;
const SAMPLE = new Color3(0.85, 0.45, 0.12); // amber sample
const BUFFERED = new Color3(0.35, 0.75, 0.55); // sample + neutral buffer

/** Colour of the tube contents for the current scenario progress. */
export function tubeColor(
  state: Pick<ScenarioState, "completed">,
): Color3 | null {
  if (state.completed.includes("select_container")) return BUFFERED;
  if (state.completed.includes("flask_to_bench")) return SAMPLE;
  return EMPTY;
}

export function createTubeTint(scene: Scene) {
  const original = new Map<Material, Color3>();
  let last: Color3 | null | undefined;
  return {
    update(state: ScenarioState) {
      const color = tubeColor(state);
      if (color === last) return;
      last = color;
      for (const mesh of scene.meshes) {
        if (placementOf(mesh)?.model !== "test_tube" || !mesh.material)
          continue;
        if (!original.has(mesh.material)) {
          mesh.material =
            mesh.material.clone(`${mesh.material.name}_tint`) ?? mesh.material;
        }
        const m = mesh.material as Material & {
          albedoColor?: Color3;
          diffuseColor?: Color3;
        };
        const key =
          "albedoColor" in m && m.albedoColor ? "albedoColor" : "diffuseColor";
        const cur = m[key];
        if (!cur) continue;
        if (!original.has(m)) original.set(m, cur.clone());
        m[key] = color ? color.clone() : original.get(m)!.clone();
      }
    },
  };
}
