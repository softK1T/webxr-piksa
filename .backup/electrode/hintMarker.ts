import {
  Color3,
  MeshBuilder,
  Scene,
  StandardMaterial,
  Vector3,
} from "@babylonjs/core";
import type { HintTarget } from "./hints";

export function createHintMarker(scene: Scene, getTarget: () => HintTarget) {
  const marker = MeshBuilder.CreateCylinder(
    "hint_marker",
    { diameterTop: 0.12, diameterBottom: 0, height: 0.18, tessellation: 8 },
    scene,
  );
  const material = new StandardMaterial("M_HintMarker", scene);
  material.emissiveColor = new Color3(1, 0.8, 0.1);
  material.disableLighting = true;
  marker.material = material;
  marker.isPickable = false;
  let time = 0;
  const position = new Vector3();
  scene.onBeforeRenderObservable.add(() => {
    time += scene.getEngine().getDeltaTime() / 1000;
    const target = getTarget();
    let found = false;
    if (target?.kind === "placement") {
      const node = scene.getTransformNodeByName(`place_${target.id}`);
      if (node) {
        position.copyFrom(node.getAbsolutePosition());
        found = true;
      }
    } else if (target?.kind === "point") {
      position.set(...target.position);
      found = true;
    }
    marker.setEnabled(found);
    if (!found) return;
    marker.position.set(
      position.x,
      position.y + 0.45 + Math.sin(time * 3) * 0.04,
      position.z,
    );
    marker.rotation.y = time;
  });
  return marker;
}
