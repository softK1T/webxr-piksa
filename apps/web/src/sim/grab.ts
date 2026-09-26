import {
  AbstractMesh,
  Scene,
  TransformNode,
  Vector3,
  type Node as BabylonNode,
} from "@babylonjs/core";
import { placementOf } from "../xr/selection";
import type { ScenarioEvent } from "./scenario";
import { findZone } from "./zones";

export const GRABBABLE: ReadonlySet<string> = new Set([
  "safety_goggles",
  "lab_flask",
  "test_tube",
]);

interface Held {
  anchor: TransformNode;
  model: string;
  home: Vector3;
  holder: string;
}

export class GrabSystem {
  private held: Held | null = null;

  constructor(
    private readonly scene: Scene,
    private readonly onEvent: (event: ScenarioEvent) => void,
  ) {}

  get heldModel(): string | null {
    return this.held?.model ?? null;
  }

  get holding(): boolean {
    return this.held !== null;
  }

  grab(
    mesh: AbstractMesh | null,
    parent: BabylonNode,
    holder: string,
    offset?: Vector3,
  ): boolean {
    if (this.held) return false;
    const placement = placementOf(mesh);
    if (!placement || !GRABBABLE.has(placement.model)) return false;
    const anchor = this.scene.getTransformNodeByName(
      `place_${placement.placementId}`,
    );
    if (!anchor) return false;
    anchor.computeWorldMatrix(true);
    const home = anchor.getAbsolutePosition().clone();
    anchor.setParent(parent);
    if (offset) {
      anchor.position.copyFrom(offset);
      anchor.rotationQuaternion = null;
      anchor.rotation.set(0, 0, 0);
    }
    this.held = { anchor, model: placement.model, home, holder };
    this.onEvent({ type: "grabbed", model: placement.model });
    return true;
  }

  release(holder: string): string | null {
    if (!this.held || this.held.holder !== holder) return null;
    const { anchor, model, home } = this.held;
    this.held = null;
    let node: BabylonNode | null = anchor.parent;
    const chain: BabylonNode[] = [];
    while (node) {
      chain.unshift(node);
      node = node.parent;
    }
    for (const n of chain)
      if (n instanceof TransformNode) n.computeWorldMatrix(true);
    anchor.computeWorldMatrix(true);
    const pos = anchor.getAbsolutePosition().clone();
    anchor.setParent(null);
    anchor.rotationQuaternion = null;
    anchor.rotation.set(0, 0, 0);
    const zone = findZone([pos.x, pos.y, pos.z], model);
    if (zone) anchor.position.set(...zone.snap);
    else anchor.position.copyFrom(home);
    this.onEvent({ type: "placed", model, zone: zone?.id ?? null });
    return zone?.id ?? null;
  }
}
