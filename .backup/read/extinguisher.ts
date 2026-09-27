import {
  Color3,
  Color4,
  DynamicTexture,
  Matrix,
  MeshBuilder,
  ParticleSystem,
  Quaternion,
  Ray,
  StandardMaterial,
  Vector3,
  type InstancedMesh,
  type Scene,
  type TransformNode,
} from "@babylonjs/core";

export const PARTY_CLICKS = 3;
export const PARTY_WINDOW_MS = 4000;
export const MAX_FOAM_BLOBS = 700;
export const FOAM_RANGE = 3.5;
export const NOZZLE_LOCAL = new Vector3(0.05, 0.48, 0);

/** Counts quick repeats; the third within the window returns "party". */
export function createSprayCounter(now: () => number = Date.now) {
  let hits: number[] = [];
  return () => {
    const t = now();
    hits = [...hits.filter((h) => t - h < PARTY_WINDOW_MS), t];
    if (hits.length >= PARTY_CLICKS) {
      hits = [];
      return "party" as const;
    }
    return "spray" as const;
  };
}

/** Ring buffer of foam blobs: returns the index to reuse once the cap is reached. */
export function nextBlobSlot(
  count: number,
  cursor: number,
  max = MAX_FOAM_BLOBS,
) {
  return count < max
    ? { reuse: false, index: count }
    : { reuse: true, index: cursor % max };
}

function foamTexture(scene: Scene) {
  const tex = new DynamicTexture(
    "foam_tex",
    { width: 64, height: 64 },
    scene,
    false,
  );
  const ctx = tex.getContext() as unknown as CanvasRenderingContext2D | null;
  if (ctx) {
    const g = ctx.createRadialGradient(32, 32, 2, 32, 32, 30);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
    tex.update();
  }
  tex.hasAlpha = true;
  return tex;
}

/**
 * Hand-held foam sprayer. While active, a foam jet leaves the extinguisher nozzle
 * and every surface it reaches gets covered with foam blobs.
 */
export function createFoamSprayer(scene: Scene) {
  const jet = new ParticleSystem("foam_jet", 3000, scene);
  jet.particleTexture = foamTexture(scene);
  const origin = new Vector3();
  jet.emitter = origin;
  jet.createPointEmitter(Vector3.Zero(), Vector3.Zero());
  jet.minEmitPower = 3;
  jet.maxEmitPower = 4.5;
  jet.gravity = new Vector3(0, -3, 0);
  jet.minSize = 0.03;
  jet.maxSize = 0.1;
  jet.minLifeTime = 0.4;
  jet.maxLifeTime = 0.9;
  jet.emitRate = 0;
  jet.color1 = new Color4(1, 1, 1, 0.95);
  jet.color2 = new Color4(0.9, 0.95, 1, 0.85);
  jet.colorDead = new Color4(1, 1, 1, 0);
  jet.blendMode = ParticleSystem.BLENDMODE_STANDARD;
  jet.start();

  const blobMat = new StandardMaterial("M_Foam", scene);
  blobMat.diffuseColor = new Color3(0.97, 0.98, 1);
  blobMat.emissiveColor = new Color3(0.35, 0.37, 0.4);
  blobMat.specularColor = new Color3(0.2, 0.2, 0.2);
  const base = MeshBuilder.CreateSphere(
    "foam_blob",
    { diameter: 1, segments: 6 },
    scene,
  );
  base.material = blobMat;
  base.isPickable = false;
  base.metadata = { dynamic: true };
  base.setEnabled(false);
  const blobs: InstancedMesh[] = [];
  let cursor = 0;

  let nozzle: TransformNode | null = null;
  let aim: (() => Vector3) | null = null;
  let originFrom: (() => Vector3) | null = null;
  let active = false;
  let sinceBlob = 0;

  const up = Vector3.Up();
  const addBlob = (point: Vector3, normal: Vector3) => {
    const slot = nextBlobSlot(blobs.length, cursor);
    let blob: InstancedMesh;
    if (slot.reuse) {
      blob = blobs[slot.index];
      cursor += 1;
    } else {
      blob = base.createInstance(`foam_${blobs.length}`);
      blob.isPickable = false;
      blob.metadata = { dynamic: true };
      blobs.push(blob);
    }
    const size = 0.07 + Math.random() * 0.13;
    blob.scaling.set(size, size * 0.45, size);
    blob.position.copyFrom(point.add(normal.scale(size * 0.12)));
    const axis = Vector3.Cross(up, normal);
    const angle = Math.acos(Math.min(1, Math.max(-1, Vector3.Dot(up, normal))));
    blob.rotationQuaternion =
      axis.lengthSquared() < 1e-6
        ? Quaternion.Identity()
        : Quaternion.RotationAxis(axis.normalize(), angle);
  };

  const obs = scene.onBeforeRenderObservable.add(() => {
    if (!active || !nozzle || !aim) {
      jet.emitRate = 0;
      return;
    }
    nozzle.computeWorldMatrix(true);
    if (originFrom) origin.copyFrom(originFrom());
    else
      Vector3.TransformCoordinatesToRef(
        NOZZLE_LOCAL,
        nozzle.getWorldMatrix(),
        origin,
      );
    const dir = aim().normalize();
    jet.direction1 = dir.add(new Vector3(-0.08, -0.02, -0.08));
    jet.direction2 = dir.add(new Vector3(0.08, 0.1, 0.08));
    jet.emitRate = 900;

    sinceBlob += scene.getEngine().getDeltaTime();
    while (sinceBlob > 18) {
      sinceBlob -= 18;
      const spread = new Vector3(
        (Math.random() - 0.5) * 0.25,
        (Math.random() - 0.5) * 0.25 - 0.05,
        (Math.random() - 0.5) * 0.25,
      );
      const ray = new Ray(
        origin.clone(),
        dir.add(spread).normalize(),
        FOAM_RANGE,
      );
      const hit = scene.pickWithRay(
        ray,
        (m) =>
          m.isEnabled() &&
          m.isVisible &&
          !m.name.startsWith("foam") &&
          !m.name.startsWith("blaster") &&
          !m.name.startsWith("label") &&
          !(nozzle && m.isDescendantOf(nozzle)),
      );
      if (hit?.pickedPoint) {
        const n = hit.getNormal(true, true) ?? up;
        addBlob(hit.pickedPoint, n);
      }
    }
  });

  return {
    get active() {
      return active;
    },
    /** Start spraying from the held extinguisher, aiming with the given direction source. */
    start(
      extinguisher: TransformNode,
      aimSource: () => Vector3,
      originSource?: () => Vector3,
    ) {
      originFrom = originSource ?? null;
      nozzle = extinguisher;
      aim = aimSource;
      active = true;
    },
    stop() {
      active = false;
    },
    clear() {
      for (const b of blobs) b.dispose();
      blobs.length = 0;
      cursor = 0;
    },
    get blobCount() {
      return blobs.length;
    },
    dispose() {
      scene.onBeforeRenderObservable.remove(obs);
      jet.dispose();
      this.clear();
      base.dispose();
    },
  };
}

export const forwardOf = (node: TransformNode) =>
  Vector3.TransformNormal(Vector3.Forward(), node.getWorldMatrix() as Matrix);
