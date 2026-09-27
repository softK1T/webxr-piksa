import {
  HemisphericLight,
  type AbstractMesh,
  type Scene,
  type TransformNode,
} from "@babylonjs/core";
import type { Quality } from "../ui/settings";

export interface QualityProfile {
  lodDistances: readonly [number, number];
  maxDynamicLights: number;
  shadows: boolean;
  minShadowCasterSize: number;
}

export const QUALITY_PROFILES: Record<Quality, QualityProfile> = {
  low: {
    lodDistances: [3, 6],
    maxDynamicLights: 1,
    shadows: false,
    minShadowCasterSize: Infinity,
  },
  medium: {
    lodDistances: [5, 10],
    maxDynamicLights: 2,
    shadows: true,
    minShadowCasterSize: 0.6,
  },
  high: {
    lodDistances: [8, 16],
    maxDynamicLights: 3,
    shadows: true,
    minShadowCasterSize: 0.2,
  },
};

export function pickLod(
  distance: number,
  [near, far]: readonly [number, number],
): 0 | 1 | 2 {
  if (distance < near) return 0;
  return distance < far ? 1 : 2;
}

export function profileOf(scene: Scene): QualityProfile {
  const quality = (scene.metadata as { quality?: Quality } | null)?.quality;
  return QUALITY_PROFILES[quality ?? "medium"];
}

const meshSize = (mesh: AbstractMesh) =>
  mesh.getBoundingInfo().boundingBox.extendSizeWorld.length() * 2;

export function applyQuality(scene: Scene, quality: Quality): QualityProfile {
  const profile = QUALITY_PROFILES[quality];
  scene.metadata = { ...(scene.metadata as object | null), quality };
  let dynamic = 0;
  for (const light of scene.lights) {
    if (light instanceof HemisphericLight) continue;
    dynamic += 1;
    light.setEnabled(dynamic <= profile.maxDynamicLights);
    light.shadowEnabled = profile.shadows;
    const renderList = light.getShadowGenerator()?.getShadowMap()?.renderList;
    if (renderList) {
      const casters = scene.meshes.filter(
        (m) => m.isEnabled() && meshSize(m) >= profile.minShadowCasterSize,
      );
      renderList.splice(0, renderList.length, ...casters);
    }
  }
  for (const mesh of scene.meshes) {
    mesh.receiveShadows =
      profile.shadows && meshSize(mesh) >= profile.minShadowCasterSize;
  }
  return profile;
}

export function freezeStatic(scene: Scene): number {
  let frozen = 0;
  for (const mesh of scene.meshes) {
    const meta = mesh.metadata as {
      placementId?: string;
      dynamic?: boolean;
    } | null;
    if (
      meta?.placementId ||
      meta?.dynamic ||
      mesh.isPickable ||
      mesh.isWorldMatrixFrozen
    )
      continue;
    mesh.freezeWorldMatrix();
    mesh.doNotSyncBoundingInfo = true;
    mesh.material?.freeze();
    frozen += 1;
  }
  return frozen;
}

type LodGroup = [TransformNode, TransformNode, TransformNode];

export class LodManager {
  private groups: LodGroup[] = [];
  private nodeCount = -1;

  constructor(private readonly scene: Scene) {}

  get size(): number {
    return this.groups.length;
  }

  refresh(): void {
    const byBase = new Map<string, TransformNode[]>();
    for (const node of this.scene.transformNodes) {
      const match = /^(.*)_LOD([012])$/.exec(node.name);
      if (!match || !node.parent) continue;
      const key = `${node.parent.uniqueId}:${match[1]}`;
      const list = byBase.get(key) ?? [];
      list[Number(match[2])] = node;
      byBase.set(key, list);
    }
    this.groups = [...byBase.values()].filter(
      (g): g is LodGroup => g.length === 3 && g.every(Boolean),
    );
    this.nodeCount = this.scene.transformNodes.length;
  }

  update(): void {
    const camera = this.scene.activeCamera;
    if (!camera) return;
    if (this.nodeCount !== this.scene.transformNodes.length) this.refresh();
    const eye = camera.globalPosition;
    const { lodDistances } = profileOf(this.scene);
    for (const group of this.groups) {
      const level = pickLod(
        group[0].getAbsolutePosition().subtract(eye).length(),
        lodDistances,
      );
      group.forEach((node, i) => {
        if (node.isEnabled(false) !== (i === level))
          node.setEnabled(i === level);
      });
    }
  }
}

/** x of the wall between lab and shooting range. */
export const RANGE_WALL_X = -5;

/**
 * Which ceiling lamps may be on. The quality cap (maxDynamicLights) used to keep
 * the first N lamps in creation order ON - always lab lamps - so the range lamps
 * were switched off for good. Now the cap is spent on the zone the player is in:
 * lab lamps in the lab, range lamps in the range (far/target lamp first).
 */
export function lampsToEnable(
  lamps: { name: string; x: number }[],
  inRange: boolean,
  cap: number,
): Set<string> {
  const zone = lamps.filter((l) => l.x < RANGE_WALL_X === inRange);
  let order = zone;
  if (inRange) {
    const byX = [...zone].sort((a, b) => a.x - b.x);
    order =
      byX.length > 1 ? [byX[0], byX[byX.length - 1], ...byX.slice(1, -1)] : byX;
  }
  return new Set(order.slice(0, cap).map((l) => l.name));
}

export function createLightZones(scene: Scene) {
  let acc = 0;
  const obs = scene.onBeforeRenderObservable.add(() => {
    acc += scene.getEngine().getDeltaTime();
    if (acc < 250) return;
    acc = 0;
    const cam = scene.activeCamera;
    if (!cam) return;
    const lamps = scene.lights.filter((l) => l.name.startsWith("mood_lamp_"));
    const want = lampsToEnable(
      lamps.map((l) => ({
        name: l.name,
        x: (l as unknown as { position: { x: number } }).position.x,
      })),
      cam.globalPosition.x < RANGE_WALL_X,
      profileOf(scene).maxDynamicLights,
    );
    for (const l of lamps) {
      const on = want.has(l.name);
      if (l.isEnabled() !== on) l.setEnabled(on); // only changes when crossing the door
    }
  });
  return { dispose: () => scene.onBeforeRenderObservable.remove(obs) };
}
