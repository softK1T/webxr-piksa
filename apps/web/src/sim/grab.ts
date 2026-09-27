import {
  AbstractMesh,
  Ray,
  Scene,
  TransformNode,
  Vector3,
  type Node as BabylonNode,
  type Observer,
} from "@babylonjs/core";
import { placementOf } from "../xr/selection";
import type { ScenarioEvent } from "./scenario";
import { findZone } from "./zones";

export const GRABBABLE: ReadonlySet<string> = new Set([
  "safety_goggles",
  "sample_bottle",
  "erlenmeyer_flask",
  "cuvette",
  "ph_electrode",
  "fire_extinguisher",
]);

/** Releasing goggles closer than this puts them on (desktop hold distance). */
export const RELEASE_WEAR_DISTANCE = 0.9;

const GRAVITY = 9.81;
/** Meshes a dropped item must not land on (labels, hint markers, drop-pad decals). */
const IGNORE_BELOW = /label|hint|marker|pad|zone|tag|screen/i;
const ROOM_HALF_X = 4.85;
const ROOM_HALF_Z = 3.85;

interface Fall {
  observer: Observer<Scene>;
  target: number;
}

interface Held {
  anchor: TransformNode;
  model: string;
  home: Vector3;
  holder: string;
}

export class GrabSystem {
  private heldId: string | undefined;
  private held: Held | null = null;
  private readonly falls = new Map<TransformNode, Fall>();

  constructor(
    private readonly scene: Scene,
    private readonly onEvent: (event: ScenarioEvent) => void,
  ) {}

  private nearFace(max: number): boolean {
    const cam = this.scene.activeCamera;
    if (!this.held || !cam) return false;
    this.held.anchor.computeWorldMatrix(true);
    return (
      Vector3.Distance(
        this.held.anchor.getAbsolutePosition(),
        cam.globalPosition,
      ) < max
    );
  }

  /** Put the held goggles on: they disappear from the world (you are wearing them). */
  wear(): boolean {
    if (this.held?.model !== "safety_goggles") return false;
    const { anchor } = this.held;
    this.held = null;
    anchor.setParent(null);
    anchor.setEnabled(false);
    this.onEvent({
      type: "placed",
      model: "safety_goggles",
      zone: "face",
      id: this.heldId,
    });
    return true;
  }

  get heldModel(): string | null {
    return this.held?.model ?? null;
  }

  get heldAnchor(): TransformNode | null {
    return this.held?.anchor ?? null;
  }

  get heldBy(): string | null {
    return this.held?.holder ?? null;
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
    this.stopFall(anchor);
    anchor.computeWorldMatrix(true);
    const home = anchor.getAbsolutePosition().clone();
    anchor.setParent(parent);
    if (offset) {
      anchor.position.copyFrom(offset);
      anchor.rotationQuaternion = null;
      anchor.rotation.set(0, 0, 0);
    }
    this.held = { anchor, model: placement.model, home, holder };
    this.heldId = placement.placementId;
    this.onEvent({
      type: "grabbed",
      model: placement.model,
      id: placement.placementId,
    });
    return true;
  }

  release(holder: string): string | null {
    if (!this.held || this.held.holder !== holder) return null;
    // letting go of goggles close to the face (desktop: they hang in front of the camera) = put on
    if (
      this.held.model === "safety_goggles" &&
      this.nearFace(RELEASE_WEAR_DISTANCE)
    ) {
      this.wear();
      return "face";
    }
    const { anchor, model } = this.held;
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
    else this.drop(anchor, pos);
    this.onEvent({
      type: "placed",
      model,
      zone: zone?.id ?? null,
      id: this.heldId,
    });
    return zone?.id ?? null;
  }

  /** Cheap "physics" for Quest: one ray down on release, then gravity until it lands (observer only while falling). */
  private drop(anchor: TransformNode, pos: Vector3): void {
    pos.x = Math.max(-ROOM_HALF_X, Math.min(ROOM_HALF_X, pos.x));
    pos.z = Math.max(-ROOM_HALF_Z, Math.min(ROOM_HALF_Z, pos.z));
    const target = this.surfaceBelow(pos, anchor);
    anchor.position.copyFrom(pos);
    if (pos.y - target < 0.005) {
      anchor.position.y = target;
      return;
    }
    let velocity = 0;
    const observer = this.scene.onBeforeRenderObservable.add(() => {
      const dt = Math.min(this.scene.getEngine().getDeltaTime() / 1000, 0.05);
      velocity += GRAVITY * dt;
      anchor.position.y -= velocity * dt;
      if (anchor.position.y <= target) this.land(anchor);
    });
    this.falls.set(anchor, { observer, target });
  }

  private surfaceBelow(pos: Vector3, anchor: TransformNode): number {
    const ray = new Ray(
      new Vector3(pos.x, pos.y + 0.02, pos.z),
      Vector3.Down(),
      pos.y + 1,
    );
    const hit = this.scene.pickWithRay(
      ray,
      (m) =>
        m.isPickable &&
        m.isEnabled() &&
        m.isVisible &&
        !m.isDescendantOf(anchor) &&
        !IGNORE_BELOW.test(m.name),
    );
    const y = hit?.hit && hit.pickedPoint ? hit.pickedPoint.y : 0;
    return Math.max(0, Math.min(y, pos.y));
  }

  private stopFall(anchor: TransformNode): Fall | undefined {
    const fall = this.falls.get(anchor);
    if (fall) this.scene.onBeforeRenderObservable.remove(fall.observer);
    this.falls.delete(anchor);
    return fall;
  }

  private land(anchor: TransformNode): void {
    const fall = this.stopFall(anchor);
    if (fall) anchor.position.y = fall.target;
  }

  /** Finish every fall instantly (tests, reset). */
  settle(): void {
    for (const anchor of [...this.falls.keys()]) this.land(anchor);
  }

  get falling(): number {
    return this.falls.size;
  }
}
