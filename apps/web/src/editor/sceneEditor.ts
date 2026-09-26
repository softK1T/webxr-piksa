import { Scene, TransformNode } from "@babylonjs/core";
import { loadModel } from "../scene/loadLabModels";
import {
  modelLocation,
  toDegrees,
  toRadians,
  type ModelSource,
  type SceneConfigData,
  type SceneObjectConfig,
} from "./sceneConfig";

interface AnchorMeta {
  placementId: string;
  model: string;
  source?: ModelSource;
}

const anchorMeta = (node: TransformNode): AnchorMeta | null => {
  const meta = node.metadata as Partial<AnchorMeta> | null;
  return node.name.startsWith("place_") && meta?.placementId && meta.model
    ? { placementId: meta.placementId, model: meta.model, source: meta.source }
    : null;
};

export function snapshot(scene: Scene, name: string): SceneConfigData {
  const objects: SceneObjectConfig[] = [];
  for (const node of scene.transformNodes) {
    const meta = anchorMeta(node);
    if (!meta) continue;
    const rot = node.rotationQuaternion
      ? node.rotationQuaternion.toEulerAngles()
      : node.rotation;
    objects.push({
      id: meta.placementId,
      model: meta.model,
      source: meta.source ?? "builtin",
      position: [node.position.x, node.position.y, node.position.z],
      rotation: [toDegrees(rot.x), toDegrees(rot.y), toDegrees(rot.z)],
      scale: [node.scaling.x, node.scaling.y, node.scaling.z],
    });
  }
  return { name, version: 1, objects };
}

export function writeTransform(scene: Scene, obj: SceneObjectConfig): boolean {
  const anchor = scene.getTransformNodeByName(`place_${obj.id}`);
  if (!anchor) return false;
  anchor.position.set(obj.position[0], obj.position[1], obj.position[2]);
  anchor.rotationQuaternion = null;
  anchor.rotation.set(
    toRadians(obj.rotation[0]),
    toRadians(obj.rotation[1]),
    toRadians(obj.rotation[2]),
  );
  anchor.scaling.set(obj.scale[0], obj.scale[1], obj.scale[2]);
  return true;
}

export async function applyConfig(
  scene: Scene,
  config: SceneConfigData,
): Promise<string[]> {
  const failed: string[] = [];
  for (const obj of config.objects) {
    if (!scene.getTransformNodeByName(`place_${obj.id}`)) {
      try {
        await loadModel(
          scene,
          { id: obj.id, model: obj.model, position: obj.position },
          modelLocation(obj),
          obj.source,
        );
      } catch {
        failed.push(obj.id);
        continue;
      }
    }
    writeTransform(scene, obj);
  }
  return failed;
}

export function uniqueId(scene: Scene, model: string): string {
  let i = 1;
  while (scene.getTransformNodeByName(`place_${model}_${i}`)) i += 1;
  return `${model}_${i}`;
}
