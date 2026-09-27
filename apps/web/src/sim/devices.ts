import { TransformNode, type Scene } from "@babylonjs/core";
import type { ScenarioEvent } from "./scenario";

/** Clicks on equipment (not grabs) -> scenario events. */
export function clickEvent(
  placementId: string | null,
  held: string | null,
  leverOn: boolean,
): ScenarioEvent | null {
  switch (placementId) {
    case "parcel":
      return { type: "panel_opened" };
    case "pump":
      return { type: "lever", on: !leverOn };
    case "ph_meter":
      return { type: "button" };
    case "erlenmeyer":
      // desktop fallback for pouring: click the flask while holding the bottle
      return held === "sample_bottle"
        ? { type: "poured", model: "sample_bottle", into: "erlenmeyer_flask" }
        : null;
    case "turbidimeter":
      return { type: "read", device: "turbidimeter" };
    case "cuvette":
      // desktop fallback: click the cuvette while holding the flask = fill it
      return held === "erlenmeyer_flask"
        ? { type: "poured", model: "erlenmeyer_flask", into: "cuvette" }
        : null;
    default:
      return null;
  }
}

const LID_OPEN = -1.9;

const underParcel = (node: TransformNode) => {
  for (
    let p: { name: string; parent: unknown } | null = node;
    p;
    p = p.parent as typeof p
  )
    if (/parcel/i.test(p.name)) return true;
  return false;
};

/** Swing the parcel `Lid` (pivot on the back top edge) open; returns the number of lid nodes moved. */
export function openParcelLid(scene: Scene): number {
  let moved = 0;
  for (const node of [...scene.transformNodes, ...scene.meshes]) {
    if (!/Lid/.test(node.name) || /Lid/.test(node.parent?.name ?? "")) continue;
    if (!underParcel(node)) continue;
    node.rotationQuaternion = null;
    node.rotation.x = LID_OPEN;
    node.unfreezeWorldMatrix();
    for (const d of node.getDescendants(false))
      if (d instanceof TransformNode) d.unfreezeWorldMatrix();
    moved++;
  }
  return moved;
}
