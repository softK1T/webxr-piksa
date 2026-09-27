import {
  AbstractMesh,
  Color3,
  Color4,
  DynamicTexture,
  Mesh,
  MeshBuilder,
  ParticleSystem,
  PointerEventTypes,
  Ray,
  StandardMaterial,
  Texture,
  TransformNode,
  Vector3,
  Quaternion,
  type Scene,
  type WebXRInputSource,
} from "@babylonjs/core";
import { createBevelBox } from "../scene/bevelBox";
import { placementOf } from "../xr/selection";

export const BLASTER_TARGETS = [
  "erlenmeyer_flask",
  "cuvette",
  "sample_bottle",
] as const;
export const RESPAWN_MS = 3000;
/** Muzzle in model space: origin is the centre of the grip (where the palm is). */
export const MUZZLE_LOCAL = new Vector3(0, 0.084, 0.178);

export function isBlasterTarget(model: string | null | undefined): boolean {
  return !!model && (BLASTER_TARGETS as readonly string[]).includes(model);
}

type MatKey = "carbon" | "polymer" | "steel" | "dot" | "gold" | "red";
type Part = {
  name: string;
  mesh: (scene: Scene) => Mesh;
  pos: [number, number, number];
  rot?: [number, number, number];
  mat: MatKey;
};

const box = (w: number, h: number, d: number) => (scene: Scene) =>
  createBevelBox(
    "b",
    { width: w, height: h, depth: d, bevel: Math.min(w, h, d) * 0.22 },
    scene,
  );
const cyl =
  (d: number, h: number, t = 20) =>
  (scene: Scene) =>
    MeshBuilder.CreateCylinder(
      "c",
      { diameter: d, height: h, tessellation: t },
      scene,
    );

const X = Math.PI / 2;
const GRIP_ANGLE = 0.36; // ~21 degrees, like a modern polymer pistol

/**
 * Compact carbon-fibre pistol, ~19 cm long and 13 cm tall (Glock 19-class proportions).
 * Built along +Z with the centre of the grip on the origin (where the palm sits).
 */
export const GUN_PARTS: Part[] = [
  // grip with carbon side panels, finger grooves and magazine base
  {
    name: "grip",
    mesh: box(0.028, 0.098, 0.046),
    pos: [0, 0, -0.002],
    rot: [GRIP_ANGLE, 0, 0],
    mat: "polymer",
  },
  {
    name: "grip_panel_l",
    mesh: box(0.003, 0.078, 0.038),
    pos: [-0.0152, 0.002, -0.002],
    rot: [GRIP_ANGLE, 0, 0],
    mat: "carbon",
  },
  {
    name: "grip_panel_r",
    mesh: box(0.003, 0.078, 0.038),
    pos: [0.0152, 0.002, -0.002],
    rot: [GRIP_ANGLE, 0, 0],
    mat: "carbon",
  },
  ...[0, 1, 2].map((k): Part => ({
    name: `finger_${k}`,
    mesh: cyl(0.012, 0.029, 12),
    pos: [0, 0.022 - k * 0.022, 0.024 - k * 0.008],
    rot: [0, 0, X],
    mat: "polymer",
  })),
  {
    name: "backstrap",
    mesh: box(0.026, 0.09, 0.008),
    pos: [0, 0.004, -0.028],
    rot: [GRIP_ANGLE, 0, 0],
    mat: "polymer",
  },
  {
    name: "mag_base",
    mesh: box(0.03, 0.01, 0.05),
    pos: [0, -0.052, -0.02],
    rot: [GRIP_ANGLE, 0, 0],
    mat: "polymer",
  },
  {
    name: "beavertail",
    mesh: box(0.026, 0.012, 0.024),
    pos: [0, 0.052, -0.036],
    mat: "polymer",
  },
  // carbon frame with accessory rail and trigger guard
  {
    name: "frame",
    mesh: box(0.028, 0.022, 0.15),
    pos: [0, 0.058, 0.05],
    mat: "carbon",
  },
  {
    name: "dust_cover",
    mesh: box(0.026, 0.012, 0.06),
    pos: [0, 0.042, 0.1],
    mat: "carbon",
  },
  ...[0, 1, 2].map((k): Part => ({
    name: `rail_${k}`,
    mesh: box(0.024, 0.004, 0.008),
    pos: [0, 0.034, 0.08 + k * 0.018],
    mat: "polymer",
  })),
  {
    name: "guard_front",
    mesh: box(0.012, 0.03, 0.006),
    pos: [0, 0.03, 0.073],
    rot: [-0.25, 0, 0],
    mat: "polymer",
  },
  {
    name: "guard_bottom",
    mesh: box(0.012, 0.005, 0.05),
    pos: [0, 0.016, 0.047],
    mat: "polymer",
  },
  {
    name: "trigger",
    mesh: box(0.006, 0.022, 0.006),
    pos: [0, 0.033, 0.045],
    rot: [0.3, 0, 0],
    mat: "steel",
  },
  {
    name: "trigger_blade",
    mesh: box(0.003, 0.012, 0.004),
    pos: [0, 0.03, 0.049],
    rot: [0.3, 0, 0],
    mat: "polymer",
  },
  {
    name: "slide_stop",
    mesh: box(0.003, 0.004, 0.018),
    pos: [-0.0155, 0.064, 0.03],
    mat: "steel",
  },
  {
    name: "takedown",
    mesh: box(0.002, 0.004, 0.008),
    pos: [-0.0148, 0.056, 0.07],
    mat: "steel",
  },
  // carbon slide with steel details
  {
    name: "slide",
    mesh: box(0.026, 0.03, 0.19),
    pos: [0, 0.084, 0.055],
    mat: "carbon",
  },
  {
    name: "slide_bevel_l",
    mesh: box(0.004, 0.006, 0.19),
    pos: [-0.011, 0.1, 0.055],
    rot: [0, 0, 0.6],
    mat: "carbon",
  },
  {
    name: "slide_bevel_r",
    mesh: box(0.004, 0.006, 0.19),
    pos: [0.011, 0.1, 0.055],
    rot: [0, 0, -0.6],
    mat: "carbon",
  },
  ...[0, 1, 2, 3, 4, 5].map((k): Part => ({
    name: `serration_${k}`,
    mesh: box(0.0275, 0.022, 0.0018),
    pos: [0, 0.084, -0.03 + k * 0.0045],
    mat: "polymer",
  })),
  ...[0, 1, 2, 3].map((k): Part => ({
    name: `fserration_${k}`,
    mesh: box(0.0275, 0.018, 0.0018),
    pos: [0, 0.086, 0.118 + k * 0.0045],
    mat: "polymer",
  })),
  {
    name: "ejection_port",
    mesh: box(0.004, 0.012, 0.036),
    pos: [0.0125, 0.092, 0.05],
    mat: "polymer",
  },
  {
    name: "barrel_hood",
    mesh: box(0.018, 0.008, 0.034),
    pos: [0, 0.098, 0.05],
    mat: "gold",
  },
  {
    name: "extractor",
    mesh: box(0.002, 0.004, 0.014),
    pos: [0.0135, 0.09, 0.028],
    mat: "steel",
  },
  {
    name: "barrel_crown",
    mesh: cyl(0.013, 0.004),
    pos: [0, 0.084, 0.1505],
    rot: [X, 0, 0],
    mat: "steel",
  },
  {
    name: "bore",
    mesh: cyl(0.009, 0.002),
    pos: [0, 0.084, 0.1525],
    rot: [X, 0, 0],
    mat: "polymer",
  },
  {
    name: "recoil_rod",
    mesh: cyl(0.008, 0.003),
    pos: [0, 0.064, 0.1505],
    rot: [X, 0, 0],
    mat: "steel",
  },
  // steel sights with tritium dots
  {
    name: "rear_sight",
    mesh: box(0.022, 0.007, 0.008),
    pos: [0, 0.1025, -0.034],
    mat: "steel",
  },
  {
    name: "rear_dot_l",
    mesh: cyl(0.0022, 0.0012, 8),
    pos: [-0.006, 0.103, -0.0385],
    rot: [X, 0, 0],
    mat: "dot",
  },
  {
    name: "rear_dot_r",
    mesh: cyl(0.0022, 0.0012, 8),
    pos: [0.006, 0.103, -0.0385],
    rot: [X, 0, 0],
    mat: "dot",
  },
  {
    name: "front_sight",
    mesh: box(0.004, 0.007, 0.006),
    pos: [0, 0.1025, 0.14],
    mat: "steel",
  },
  {
    name: "front_dot",
    mesh: cyl(0.0022, 0.0012, 8),
    pos: [0, 0.1035, 0.1368],
    rot: [X, 0, 0],
    mat: "dot",
  },
  // match-grade upgrades: gold TiN barrel, compensator, slide windows, fibre-optic sight, red trigger
  {
    name: "barrel_gold",
    mesh: box(0.012, 0.006, 0.06),
    pos: [0, 0.0965, 0.095],
    mat: "gold",
  },
  ...[0, 1, 2].map((k): Part => ({
    name: `slide_window_${k}`,
    mesh: box(0.014, 0.004, 0.014),
    pos: [0, 0.1, 0.075 + k * 0.02],
    mat: "polymer",
  })),
  {
    name: "comp",
    mesh: box(0.026, 0.03, 0.026),
    pos: [0, 0.084, 0.163],
    mat: "carbon",
  },
  {
    name: "comp_port_l",
    mesh: box(0.0275, 0.004, 0.006),
    pos: [0, 0.098, 0.158],
    mat: "polymer",
  },
  {
    name: "comp_port_r",
    mesh: box(0.0275, 0.004, 0.006),
    pos: [0, 0.098, 0.168],
    mat: "polymer",
  },
  {
    name: "comp_ring",
    mesh: box(0.027, 0.031, 0.003),
    pos: [0, 0.084, 0.1505],
    mat: "gold",
  },
  {
    name: "comp_crown",
    mesh: cyl(0.012, 0.003),
    pos: [0, 0.084, 0.1765],
    rot: [X, 0, 0],
    mat: "gold",
  },
  {
    name: "fibre",
    mesh: cyl(0.003, 0.008, 8),
    pos: [0, 0.107, 0.14],
    rot: [X, 0, 0],
    mat: "red",
  },
  {
    name: "mag_gold",
    mesh: box(0.031, 0.003, 0.051),
    pos: [0, -0.046, -0.018],
    rot: [0.36, 0, 0],
    mat: "gold",
  },
  {
    name: "trigger_red",
    mesh: box(0.0065, 0.018, 0.0065),
    pos: [0, 0.031, 0.046],
    rot: [0.3, 0, 0],
    mat: "red",
  },
];

/** Procedural 2x2 twill carbon-fibre weave. */
function carbonTexture(scene: Scene) {
  const size = 256;
  const tex = new DynamicTexture(
    "carbon_tex",
    { width: size, height: size },
    scene,
    true,
  );
  const ctx = tex.getContext() as unknown as CanvasRenderingContext2D | null;
  if (ctx) {
    const n = 8;
    const c = size / n;
    for (let y = 0; y < n; y++)
      for (let x = 0; x < n; x++) {
        const warp = ((x + y) >> 1) % 2 === 0;
        const g = warp
          ? ctx.createLinearGradient(x * c, 0, (x + 1) * c, 0)
          : ctx.createLinearGradient(0, y * c, 0, (y + 1) * c);
        g.addColorStop(0, "#0b0c0e");
        g.addColorStop(0.5, warp ? "#3a3d44" : "#2a2c31");
        g.addColorStop(1, "#0b0c0e");
        ctx.fillStyle = g;
        ctx.fillRect(x * c, y * c, c, c);
      }
    tex.update();
  }
  tex.wrapU = Texture.WRAP_ADDRESSMODE;
  tex.wrapV = Texture.WRAP_ADDRESSMODE;
  tex.uScale = 4;
  tex.vScale = 4;
  return tex;
}

function materials(scene: Scene) {
  const carbon = new StandardMaterial("M_GunCarbon", scene);
  carbon.diffuseTexture = carbonTexture(scene);
  carbon.specularColor = new Color3(0.55, 0.57, 0.6);
  carbon.specularPower = 140;
  carbon.emissiveColor = new Color3(0.03, 0.03, 0.035);
  const polymer = new StandardMaterial("M_GunPolymer", scene);
  polymer.diffuseColor = new Color3(0.06, 0.065, 0.07);
  polymer.specularColor = new Color3(0.08, 0.08, 0.08);
  const steel = new StandardMaterial("M_GunSteel", scene);
  steel.diffuseColor = new Color3(0.32, 0.33, 0.35);
  steel.specularColor = new Color3(0.95, 0.95, 0.95);
  steel.specularPower = 128;
  const dot = new StandardMaterial("M_GunTritium", scene);
  dot.emissiveColor = new Color3(0.35, 1, 0.3);
  dot.disableLighting = true;
  const flash = new StandardMaterial("M_GunFlash", scene);
  flash.emissiveColor = new Color3(1, 0.7, 0.25);
  flash.disableLighting = true;
  flash.alpha = 0.85;
  const gold = new StandardMaterial("M_GunGold", scene);
  gold.diffuseColor = new Color3(0.85, 0.62, 0.2);
  gold.specularColor = new Color3(1, 0.85, 0.5);
  gold.specularPower = 110;
  gold.emissiveColor = new Color3(0.12, 0.08, 0.02);
  const red = new StandardMaterial("M_GunRed", scene);
  red.diffuseColor = new Color3(0.9, 0.08, 0.06);
  red.emissiveColor = new Color3(0.45, 0.03, 0.02);
  red.specularColor = new Color3(0.8, 0.5, 0.5);
  return { carbon, polymer, steel, dot, gold, red, flash };
}

function buildGun(scene: Scene) {
  const root = new TransformNode("blaster_root", scene);
  const model = new TransformNode("blaster_model", scene);
  model.parent = root;
  const mats = materials(scene);
  const byMat: Record<MatKey, Mesh[]> = {
    carbon: [],
    polymer: [],
    steel: [],
    dot: [],
    gold: [],
    red: [],
  };
  for (const p of GUN_PARTS) {
    const m = p.mesh(scene);
    m.position.set(...p.pos);
    if (p.rot) m.rotation.set(...p.rot);
    byMat[p.mat].push(m);
  }
  for (const [key, list] of Object.entries(byMat)) {
    const merged = Mesh.MergeMeshes(list, true, true);
    if (!merged) continue;
    merged.name = `blaster_${key}`;
    merged.material = mats[key as MatKey];
    merged.isPickable = false;
    merged.metadata = { dynamic: true };
    merged.parent = model;
  }
  const muzzle = new TransformNode("blaster_muzzle", scene);
  muzzle.parent = model;
  muzzle.position.copyFrom(MUZZLE_LOCAL);
  const flash = MeshBuilder.CreateSphere(
    "blaster_flash",
    { diameter: 0.05, segments: 8 },
    scene,
  );
  flash.material = mats.flash;
  flash.parent = muzzle;
  flash.position.z = 0.02;
  flash.isPickable = false;
  flash.metadata = { dynamic: true };
  flash.setEnabled(false);
  root.setEnabled(false);
  return { root, model, muzzle, flash };
}

function burst(scene: Scene, at: Vector3, color: Color4, shards: boolean) {
  const ps = new ParticleSystem(
    shards ? "glass" : "splash",
    shards ? 250 : 400,
    scene,
  );
  ps.particleTexture = new Texture(
    "data:image/svg+xml;base64," +
      btoa(
        '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"><circle cx="8" cy="8" r="7" fill="white"/></svg>',
      ),
    scene,
  );
  ps.emitter = at.clone();
  ps.createSphereEmitter(0.05);
  ps.minEmitPower = shards ? 1.5 : 0.8;
  ps.maxEmitPower = shards ? 3.5 : 2;
  ps.gravity = new Vector3(0, -9.8, 0);
  ps.minSize = shards ? 0.008 : 0.015;
  ps.maxSize = shards ? 0.025 : 0.04;
  ps.minLifeTime = 0.4;
  ps.maxLifeTime = 1.1;
  ps.manualEmitCount = shards ? 160 : 260;
  ps.color1 = color;
  ps.color2 = color;
  ps.colorDead = new Color4(color.r, color.g, color.b, 0);
  ps.targetStopDuration = 1.2;
  ps.disposeOnStop = true;
  ps.start();
}

function tracer(scene: Scene, from: Vector3, to: Vector3) {
  const line = MeshBuilder.CreateLines(
    "blaster_tracer",
    { points: [from, to] },
    scene,
  );
  line.color = new Color3(1, 0.85, 0.4);
  line.isPickable = false;
  line.metadata = { dynamic: true };
  let life = 0.12;
  const obs = scene.onBeforeRenderObservable.add(() => {
    life -= scene.getEngine().getDeltaTime() / 1000;
    line.alpha = Math.max(0, life / 0.12);
    if (life <= 0) {
      scene.onBeforeRenderObservable.remove(obs);
      line.dispose();
    }
  });
}

export interface BlasterEvents {
  onHit(model: string, total: number): void;
  onRayHit?(mesh: AbstractMesh, point: Vector3): boolean;
}

export function createBlaster(scene: Scene, events: BlasterEvents) {
  const gun = buildGun(scene);
  const fwd = scene.useRightHandedSystem ? -1 : 1;
  let enabled = false;
  let hits = 0;
  let xrSource: WebXRInputSource | null = null;
  let recoil = 0;

  const controllerMeshes = () =>
    ((xrSource?.grip ?? xrSource?.pointer)?.getChildren() ?? []).filter(
      (n): n is AbstractMesh =>
        n instanceof AbstractMesh && !n.name.startsWith("blaster"),
    );

  const mount = () => {
    if (xrSource) {
      gun.root.parent = null;
      gun.root.scaling.setAll(1);
      for (const m of controllerMeshes()) m.setEnabled(!enabled);
    } else {
      gun.root.parent = scene.getCameraByName(
        "camera_desktop",
      ) as unknown as TransformNode | null;
      gun.root.position.set(0.2, -0.2, 0.42 * fwd);
      gun.root.rotation.set(0.04, -0.1 * fwd, 0);
    }
    gun.root.setEnabled(enabled);
  };

  const aimRay = new Ray(Vector3.Zero(), Vector3.Forward(), 30);
  const back = new Vector3();
  const follow = scene.onBeforeRenderObservable.add(() => {
    if (!enabled || !xrSource) return;
    xrSource.getWorldPointerRayToRef(aimRay);
    const dir = aimRay.direction.normalize();
    // grip sits a bit behind and below the aim origin so the barrel lines up with the ray
    back.copyFrom(aimRay.origin).subtractInPlace(dir.scale(0.12));
    back.y -= 0.07;
    gun.root.position.copyFrom(back);
    const yaw = Math.atan2(dir.x, dir.z);
    const pitch = -Math.asin(Math.max(-1, Math.min(1, dir.y)));
    gun.root.rotationQuaternion = Quaternion.RotationYawPitchRoll(
      yaw,
      pitch,
      0,
    );
  });

  const kick = scene.onBeforeRenderObservable.add(() => {
    if (recoil <= 0) return;
    recoil = Math.max(0, recoil - scene.getEngine().getDeltaTime() / 1000);
    const k = recoil / 0.12;
    gun.model.rotation.x = -0.35 * k * k;
    gun.model.position.z = -0.025 * k * fwd;
    gun.flash.setEnabled(recoil > 0.07);
  });

  const shatter = (mesh: AbstractMesh, point: Vector3) => {
    const placement = placementOf(mesh);
    if (!placement || !isBlasterTarget(placement.model)) return false;
    const anchor = scene.getTransformNodeByName(
      `place_${placement.placementId}`,
    );
    if (!anchor || !anchor.isEnabled()) return false;
    anchor.setEnabled(false);
    burst(scene, point, new Color4(0.8, 0.95, 1, 0.9), true);
    burst(scene, point, new Color4(0.3, 0.6, 1, 0.85), false);
    hits += 1;
    events.onHit(placement.model!, hits);
    window.setTimeout(() => anchor.setEnabled(true), RESPAWN_MS);
    return true;
  };

  const fireRay = (ray: Ray) => {
    gun.muzzle.computeWorldMatrix(true);
    const muzzle = gun.muzzle.getAbsolutePosition().clone();
    recoil = 0.12;
    const pick = scene.pickWithRay(
      ray,
      (m) => m.isPickable && m.isEnabled() && !m.name.startsWith("foam"),
    );
    const end = pick?.pickedPoint ?? ray.origin.add(ray.direction.scale(20));
    tracer(scene, muzzle, end);
    if (pick?.pickedMesh && pick.pickedPoint) {
      if (!shatter(pick.pickedMesh, pick.pickedPoint))
        events.onRayHit?.(pick.pickedMesh, pick.pickedPoint);
    }
  };

  const pointer = scene.onPointerObservable.add(
    (info, state) => {
      if (!enabled) return;
      state.skipNextObservers = true;
      if (info.type !== PointerEventTypes.POINTERDOWN) return;
      if ((info.event as PointerEvent).pointerType === "xr") return;
      const ray =
        info.pickInfo?.ray ??
        scene.createPickingRay(
          scene.pointerX,
          scene.pointerY,
          null,
          scene.activeCamera,
        );
      fireRay(ray);
    },
    PointerEventTypes.POINTERDOWN |
      PointerEventTypes.POINTERUP |
      PointerEventTypes.POINTERTAP |
      PointerEventTypes.POINTERPICK,
    true,
  );

  return {
    get enabled() {
      return enabled;
    },
    setEnabled(on: boolean) {
      enabled = on;
      mount();
    },
    /** Fire along the barrel (used for VR triggers). */
    fireFromGun() {
      if (!enabled) return;
      if (xrSource) {
        xrSource.getWorldPointerRayToRef(aimRay);
        fireRay(
          new Ray(
            aimRay.origin.clone(),
            aimRay.direction.normalize().clone(),
            30,
          ),
        );
        return;
      }
      gun.muzzle.computeWorldMatrix(true);
      const dir = Vector3.TransformNormal(
        new Vector3(0, 0, 1),
        gun.muzzle.getWorldMatrix(),
      ).normalize();
      fireRay(new Ray(gun.muzzle.getAbsolutePosition().clone(), dir, 30));
    },
    attachToController(source: WebXRInputSource | null) {
      xrSource = source;
      if (!source) gun.root.rotationQuaternion = null;
      mount();
    },
    dispose() {
      scene.onPointerObservable.remove(pointer);
      scene.onBeforeRenderObservable.remove(kick);
      scene.onBeforeRenderObservable.remove(follow);
      gun.root.dispose(false, true);
    },
  };
}
