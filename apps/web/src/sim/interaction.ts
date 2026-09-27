import {
  AbstractMesh,
  Scene,
  Vector3,
  type Node as BabylonNode,
} from "@babylonjs/core";
import { placementOf } from "../xr/selection";
import type { ControllerAction } from "../xr/setupXR";
import { GrabSystem } from "./grab";
import type { ScenarioEvent } from "./scenario";

export const HOLD_OFFSET = new Vector3(0.15, -0.3, 0.7);

export function createInteraction(
  scene: Scene,
  grab: GrabSystem,
  dispatch: (event: ScenarioEvent) => void,
  onHeldTrigger?: (pressed: boolean, action: ControllerAction) => boolean,
) {
  let leverOn = false;

  const activate = (mesh: AbstractMesh | null) => {
    const placement = placementOf(mesh);
    if (!placement) return;
    switch (placement.model) {
      case "control_button": {
        const anchor = scene.getTransformNodeByName("place_button");
        if (anchor) {
          anchor.position.y -= 0.015;
          window.setTimeout(() => (anchor.position.y += 0.015), 150);
        }
        dispatch({ type: "button" });
        return;
      }
      case "control_lever": {
        leverOn = !leverOn;
        const anchor = scene.getTransformNodeByName("place_lever");
        if (anchor) anchor.rotation.x = leverOn ? -0.6 : 0;
        dispatch({ type: "lever", on: leverOn });
        return;
      }
      case "information_panel":
        dispatch({ type: "panel_opened" });
        return;
      default:
        dispatch({
          type: "selected",
          model: placement.model,
          id: placement.placementId,
        });
    }
  };

  return {
    activate,
    click(mesh: AbstractMesh | null, camera: BabylonNode) {
      if (grab.holding) {
        grab.release("mouse");
        return;
      }
      if (grab.grab(mesh, camera, "mouse", HOLD_OFFSET)) return;
      activate(mesh);
    },
    controller(action: ControllerAction) {
      if (action.action === "trigger") {
        if (onHeldTrigger?.(action.pressed, action)) return;
        if (action.pressed) activate(action.mesh);
        return;
      }
      if (action.pressed) grab.grab(action.mesh, action.grip, action.hand);
      else grab.release(action.hand);
    },
  };
}
