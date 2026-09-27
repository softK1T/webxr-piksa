import { PointerDragBehavior, Scene, TransformNode, Vector3 } from "@babylonjs/core";
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

/**
 * Attach a horizontal-plane drag behaviour to an anchor node so the user can
 * drag it with the mouse while the editor panel is open.
 * The drag is constrained to the XZ plane (Y stays fixed) so objects slide
 * along the floor rather than flying into the air.
 */
export function attachDrag(
  scene: Scene,
  anchor: TransformNode,
  onDragEnd: () => void,
): void {
  // Remove any existing drag behaviour first (idempotent).
  anchor.behaviors
    .filter((b) => b instanceof PointerDragBehavior)
    .forEach((b) => anchor.removeBehavior(b));

  const drag = new PointerDragBehavior({
    dragPlaneNormal: new Vector3(0, 1, 0), // XZ plane
  });
  drag.useObjectOrientationForDragging = false;
  drag.onDragEndObservable.add(onDragEnd);
  anchor.addBehavior(drag);
}

/**
 * Remove drag behaviour from all editor-placed anchors (call when editor closes).
 */
export function detachAllDrags(scene: Scene): void {
  for (const node of scene.transformNodes) {
    if (!anchorMeta(node)) continue;
    node.behaviors
      .filter((b) => b instanceof PointerDragBehavior)
      .forEach((b) => node.removeBehavior(b));
  }
}

/**
 * Return a spawn position 2 m in front of the active camera,
 * snapped to Y = 0 (floor level).
 */
export function spawnInFront(scene: Scene): [number, number, number] {
  const camera = scene.activeCamera;
  if (!camera) return [0, 0, 0];
  const forward = camera.getForwardRay(2).direction;
  const pos = camera.position.add(forward.scale(2));
  return [pos.x, 0, pos.z];
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
