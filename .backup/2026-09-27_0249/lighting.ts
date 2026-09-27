import {
  Color3,
  DefaultRenderingPipeline,
  GlowLayer,
  HemisphericLight,
  ImageProcessingConfiguration,
  Material,
  PointLight,
  Scene,
  ShadowGenerator,
  DirectionalLight,
  StandardMaterial,
  PBRMaterial,
  Vector3,
  type AbstractMesh,
  Color4,
  MeshBuilder,
} from "@babylonjs/core";
import { createBevelBox } from "./bevelBox";
import { GRABBABLE } from "../sim/grab";
import { placementOf } from "../xr/selection";
import { createLampAudio } from "./lampAudio";

/** One calm colour for every interaction point. */
export const INTERACTION_GLOW = new Color4(1, 0.82, 0.55, 1).scale(0.35);
export const LAMP_COLOR = new Color3(1, 0.8, 0.55);
const INTERACTIVE = new Set([
  ...GRABBABLE,
  "control_button",
  "control_lever",
  "information_panel",
]);

export function isInteractionPoint(mesh: AbstractMesh): boolean {
  if (mesh.name.startsWith("range_button")) return true;
  const p = placementOf(mesh);
  return !!p && INTERACTIVE.has(p.model);
}

/** Ceiling fixtures; `faulty` = stutter events per second. */
export const LAMPS: {
  pos: [number, number, number];
  intensity: number;
  faulty?: number;
}[] = [
  { pos: [-2.5, 2.72, -1.5], intensity: 0.32 },
  { pos: [2.5, 2.72, -1.5], intensity: 0.32, faulty: 0.12 },
  { pos: [-2.5, 2.72, 1.5], intensity: 0.36 },
  { pos: [2.5, 2.72, 1.5], intensity: 0.36 },
  { pos: [-7, 2.72, 2.5], intensity: 0.34, faulty: 0.25 },
  { pos: [-11, 2.72, 2.5], intensity: 0.34 },
  { pos: [-14, 2.72, 2.5], intensity: 0.3, faulty: 0.08 },
];

export const WARM = new Color3(1, 0.78, 0.52);
export const MAX_LIGHTS = 10;

const NO_CAST = [
  "floor",
  "ceiling",
  "wall",
  "range_floor",
  "range_ceiling",
  "range_wall",
  "range_backstop",
  "range_lamp",
  "foam",
  "blaster_tracer",
  "blaster_flash",
  "range_hole",
  "label",
  "skybox",
  "range_line",
  "zone_",
  "drop_",
];

/** Small props and furniture cast shadows; room shells and effects do not. */
export function shouldCastShadow(name: string): boolean {
  const n = name.toLowerCase();
  return !NO_CAST.some((p) => n.startsWith(p) || n.includes(`_${p}`));
}

function liftLightLimit(mat: Material | null) {
  if (mat instanceof StandardMaterial || mat instanceof PBRMaterial) {
    if (mat.isFrozen) mat.unfreeze();
    mat.maxSimultaneousLights = MAX_LIGHTS;
  }
}

/**
 * Moody lamp lighting: the old flat lights are removed, a very dim cool ambient
 * leaves corners dark, warm pools of light fall on the benches with real shadows,
 * lamps glow, a light haze fills the air.
 */
export function applyWarmLighting(scene: Scene) {
  const quality =
    (scene.metadata as { quality?: string } | null)?.quality ?? "medium";
  scene.shadowsEnabled = true;
  scene.lightsEnabled = true;
  for (const l of [...scene.lights]) l.dispose();

  const ambient = new HemisphericLight(
    "mood_ambient",
    new Vector3(0.1, 1, 0.05),
    scene,
  );
  ambient.diffuse = new Color3(1, 0.9, 0.78);
  ambient.groundColor = new Color3(0.28, 0.24, 0.2);
  ambient.specular = Color3.Black();
  ambient.intensity = 0.42;

  // Soviet-lab ceiling fixtures: warm tubes in steel housings, slightly unstable
  for (const m of scene.meshes) {
    const mat = m.material as StandardMaterial | null;
    const e = mat?.emissiveColor;
    const top = m.getBoundingInfo().boundingBox.maximumWorld.y;
    if (e && e.r + e.g + e.b > 2.4 && top > 2.7) m.setEnabled(false);
  }
  const housingMat = new StandardMaterial("M_LampHousing", scene);
  housingMat.diffuseColor = new Color3(0.55, 0.56, 0.55);
  housingMat.specularColor = new Color3(0.3, 0.3, 0.3);
  const lamps = LAMPS.map((cfg, idx) => {
    const [x, y, z] = cfg.pos;
    const housing = createBevelBox(
      `lamp_housing_${idx}`,
      { width: 1.25, height: 0.06, depth: 0.2 },
      scene,
    );
    housing.position.set(x, y + 0.2, z);
    housing.material = housingMat;
    housing.isPickable = false;
    const tubeMat = new StandardMaterial(`M_LampTube${idx}`, scene);
    tubeMat.disableLighting = true;
    tubeMat.emissiveColor = LAMP_COLOR.clone();
    const tubes = [-0.05, 0.05].map((dz, k) => {
      const t = MeshBuilder.CreateCylinder(
        `lamp_tube_${idx}_${k}`,
        { diameter: 0.035, height: 1.15, tessellation: 12 },
        scene,
      );
      t.rotation.z = Math.PI / 2;
      t.position.set(x, y + 0.15, z + dz);
      t.material = tubeMat;
      t.isPickable = false;
      return t;
    });
    const light = new PointLight(
      `mood_lamp_${idx}`,
      new Vector3(x, y, z),
      scene,
    );
    light.diffuse = LAMP_COLOR;
    light.specular = LAMP_COLOR.scale(0.2);
    light.range = 9;
    light.intensity = cfg.intensity;
    return {
      idx,
      prevOn: true,
      cfg,
      light,
      tubeMat,
      tubes,
      housing,
      stutter: 0,
      next: 0,
      on: true,
      phase: Math.random() * 10,
    };
  });
  const lights = lamps.map((l) => l.light);
  const audio = createLampAudio(
    scene,
    LAMPS.map((c) => c.pos),
  );
  let time = 0;
  const flicker = scene.onBeforeRenderObservable.add(() => {
    const dt = scene.getEngine().getDeltaTime() / 1000;
    time += dt;
    for (const l of lamps) {
      // mains shimmer on every tube
      let k =
        1 +
        0.025 * Math.sin((time + l.phase) * 31) +
        0.015 * Math.sin((time + l.phase) * 7.3);
      if (l.cfg.faulty) {
        if (l.stutter <= 0 && Math.random() < dt * l.cfg.faulty)
          l.stutter = 0.3 + Math.random() * 1.4;
        if (l.stutter > 0) {
          l.stutter -= dt;
          l.next -= dt;
          if (l.next <= 0) {
            l.on = !l.on || Math.random() < 0.3;
            l.next = 0.03 + Math.random() * 0.12;
          }
          if (!l.on) k *= 0.08;
          if (l.stutter <= 0) l.on = true;
        }
      }
      l.light.intensity = l.cfg.intensity * k;
      audio.level(l.idx, k);
      if (l.on !== l.prevOn) {
        audio.click(l.idx);
        l.prevOn = l.on;
      }
      l.tubeMat.emissiveColor
        .copyFrom(LAMP_COLOR)
        .scaleInPlace(Math.min(1.1, 0.25 + 0.85 * k));
    }
  });

  // one soft directional key light gives the shadows (no visible edge on the floor)
  const key = new DirectionalLight(
    "mood_key",
    new Vector3(0.35, -1, 0.25),
    scene,
  );
  key.position = new Vector3(-3, 6, -2);
  key.diffuse = new Color3(1, 0.86, 0.68);
  key.specular = new Color3(0.3, 0.27, 0.22);
  key.intensity = 0.55;
  key.shadowMinZ = 0.5;
  key.shadowMaxZ = 20;

  const gens: ShadowGenerator[] = [];
  if (quality !== "low") {
    const g = new ShadowGenerator(quality === "high" ? 4096 : 2048, key);
    if (quality === "high") {
      g.useContactHardeningShadow = true;
      g.contactHardeningLightSizeUVRatio = 0.03;
    } else {
      g.usePercentageCloserFiltering = true;
      g.filteringQuality = ShadowGenerator.QUALITY_HIGH;
    }
    g.bias = 0.0008;
    g.normalBias = 0.02;
    g.darkness = 0.35;
    g.transparencyShadow = true;
    gens.push(g);
  }

  const register = (m: AbstractMesh) => {
    liftLightLimit(m.material);
    m.receiveShadows = true;
    if (shouldCastShadow(m.name))
      for (const g of gens) g.addShadowCaster(m, false);
  };
  scene.meshes.forEach(register);
  const onMesh = scene.onNewMeshAddedObservable.add((m) => {
    register(m);
    // materials arrive after the mesh for glTF models
    window.setTimeout(() => register(m), 0);
  });
  const onMat = scene.onNewMaterialAddedObservable.add(liftLightLimit);
  scene.materials.forEach(liftLightLimit);

  // haze
  scene.fogMode = Scene.FOGMODE_EXP2;
  scene.fogDensity = 0.012;
  scene.fogColor = new Color3(0.09, 0.075, 0.06);
  scene.clearColor.set(0.05, 0.04, 0.035, 1);

  const glow = new GlowLayer("mood_glow", scene, {
    mainTextureRatio: 0.5,
    blurKernelSize: 64,
  });
  glow.customEmissiveColorSelector = (mesh, _sub, _mat, out) => {
    if (isInteractionPoint(mesh)) out.copyFrom(INTERACTION_GLOW);
    else out.set(0, 0, 0, 0);
  };
  const pulse = scene.onBeforeRenderObservable.add(() => {
    glow.intensity = 0.45 + 0.15 * Math.sin(performance.now() / 900);
  });

  const ip = scene.imageProcessingConfiguration;
  ip.toneMappingEnabled = true;
  ip.toneMappingType = ImageProcessingConfiguration.TONEMAPPING_ACES;
  ip.exposure = 1.1;
  ip.contrast = 1.12;
  ip.vignetteEnabled = true;
  ip.vignetteWeight = 1.0;
  ip.vignetteColor.set(0, 0, 0, 0);
  ip.colorCurvesEnabled = false;

  let pipeline: DefaultRenderingPipeline | null = null;
  const cam = scene.getCameraByName("camera_desktop");
  if (cam && quality !== "low") {
    pipeline = new DefaultRenderingPipeline("mood_pipeline", true, scene, [
      cam,
    ]);
    pipeline.imageProcessingEnabled = false;
    pipeline.bloomEnabled = true;
    pipeline.bloomThreshold = 0.8;
    pipeline.bloomWeight = 0.3;
    pipeline.fxaaEnabled = true;
    pipeline.grainEnabled = true;
    pipeline.grain.intensity = 3;
    pipeline.grain.animated = true;
  }

  return {
    dispose() {
      scene.onNewMeshAddedObservable.remove(onMesh);
      scene.onNewMaterialAddedObservable.remove(onMat);
      pipeline?.dispose();
      scene.onBeforeRenderObservable.remove(flicker);
      audio.dispose();
      scene.onBeforeRenderObservable.remove(pulse);
      glow.dispose();
      lamps.forEach((l) => {
        l.tubes.forEach((t) => t.dispose());
        l.housing.dispose();
      });
      gens.forEach((g) => g.dispose());
      lights.forEach((l) => l.dispose());
      key.dispose();
      ambient.dispose();
      scene.fogMode = Scene.FOGMODE_NONE;
    },
  };
}
