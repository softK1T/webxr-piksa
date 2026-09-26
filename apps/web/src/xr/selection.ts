import { Color3 } from "@babylonjs/core";

export type SelectAction = "trigger" | "squeeze" | "click";

export interface SelectionEvent {
  placementId: string | null;
  model: string | null;
  action: SelectAction;
  hand: string;
}

interface Outlinable {
  metadata: unknown;
  renderOutline: boolean;
  outlineWidth: number;
  outlineColor: Color3;
}

interface PlacementMeta {
  placementId: string;
  model: string;
}

export function placementOf(
  mesh: { metadata: unknown } | null | undefined,
): PlacementMeta | null {
  const meta = mesh?.metadata as Partial<PlacementMeta> | null | undefined;
  return meta?.placementId && meta.model
    ? { placementId: meta.placementId, model: meta.model }
    : null;
}

const HIGHLIGHT = new Color3(1, 0.85, 0.2);

export function applyHighlight(
  meshes: readonly Outlinable[],
  placementId: string | null,
): number {
  let count = 0;
  for (const mesh of meshes) {
    const on =
      placementId !== null && placementOf(mesh)?.placementId === placementId;
    mesh.renderOutline = on;
    if (on) {
      mesh.outlineWidth = 0.008;
      mesh.outlineColor = HIGHLIGHT;
      count += 1;
    }
  }
  return count;
}
