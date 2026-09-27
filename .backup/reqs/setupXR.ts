import { Observable, type WebXRInputSource } from "@babylonjs/core";

export const onXRControllerAdded = new Observable<WebXRInputSource>();
export const onXRControllerRemoved = new Observable<WebXRInputSource>();
import {
  AbstractMesh,
  Quaternion,
  Scene,
  TransformNode,
  WebXRFeatureName,
  WebXRMotionControllerTeleportation,
  WebXRState,
  type IWebXRControllerMovementOptions,
} from "@babylonjs/core";
import {
  applyHighlight,
  placementOf,
  type SelectAction,
  type SelectionEvent,
} from "./selection";

export type LocomotionMode = "teleport" | "free";

export interface XRSettings {
  mode: LocomotionMode;
  moveSpeed: number;
  rotationSpeed: number;
  snapTurn: boolean;
}

export const DEFAULT_XR_SETTINGS: XRSettings = {
  mode: "teleport",
  moveSpeed: 1,
  rotationSpeed: 1,
  snapTurn: true,
};

export const SNAP_ANGLE = Math.PI / 4;

export interface ControllerAction {
  action: "trigger" | "squeeze";
  pressed: boolean;
  hand: string;
  mesh: AbstractMesh | null;
  grip: TransformNode;
}

export interface XREvents {
  onStateChange(inXR: boolean): void;
  onSelect(event: SelectionEvent): void;
  onAction?(action: ControllerAction): void;
}

export interface XRController {
  enter(): Promise<void>;
  exit(): Promise<void>;
  setMode(mode: LocomotionMode): void;
  applySettings(settings: XRSettings): void;
  readonly isInXR: boolean;
  dispose(): void;
}

export const XR_SPAWN = { x: 0, z: -2.6, yaw: 0 } as const;

/** Put the XR rig at the spawn point facing the benches, keeping the tracked head height. */
export function resetXRPose(camera: {
  position: { x: number; y: number; z: number };
  rotationQuaternion: Quaternion | null;
}) {
  camera.position.x = XR_SPAWN.x;
  camera.position.z = XR_SPAWN.z;
  camera.rotationQuaternion = Quaternion.RotationYawPitchRoll(
    XR_SPAWN.yaw,
    0,
    0,
  );
}

export function nextMode(mode: LocomotionMode): LocomotionMode {
  return mode === "teleport" ? "free" : "teleport";
}

export function emitSelection(
  scene: Scene,
  mesh: AbstractMesh | null,
  action: SelectAction,
  hand: string,
  events: Pick<XREvents, "onSelect">,
) {
  const placement = placementOf(mesh);
  applyHighlight(scene.meshes, placement?.placementId ?? null);
  events.onSelect({
    placementId: placement?.placementId ?? null,
    model: placement?.model ?? null,
    action,
    hand,
  });
}

export async function setupXR(
  scene: Scene,
  floor: AbstractMesh,
  events: XREvents,
  initial: XRSettings = DEFAULT_XR_SETTINGS,
): Promise<XRController> {
  let settings = initial;
  const xr = await scene.createDefaultXRExperienceAsync({
    floorMeshes: [floor],
    disableDefaultUI: true,
    disableTeleportation: true,
    optionalFeatures: true,
  });
  const features = xr.baseExperience.featuresManager;

  const enableMovement = (move: boolean) =>
    features.enableFeature(
      WebXRFeatureName.MOVEMENT,
      "latest",
      {
        xrInput: xr.input,
        movementEnabled: move,
        rotationEnabled: !settings.snapTurn,
        movementSpeed: settings.moveSpeed,
        rotationSpeed: settings.rotationSpeed,
      } as IWebXRControllerMovementOptions,
      true,
      false,
    );

  const setMode = (mode: LocomotionMode) => {
    settings = { ...settings, mode };
    if (mode === "teleport") {
      features.disableFeature(WebXRFeatureName.MOVEMENT);
      const teleport = features.enableFeature(
        WebXRFeatureName.TELEPORTATION,
        "stable",
        { xrInput: xr.input, floorMeshes: [floor] },
        true,
        false,
      ) as WebXRMotionControllerTeleportation;
      teleport.rotationEnabled = settings.snapTurn;
      if (!settings.snapTurn) enableMovement(false);
    } else {
      features.disableFeature(WebXRFeatureName.TELEPORTATION);
      enableMovement(true);
    }
  };
  setMode(settings.mode);

  const desktop = scene.getCameraByName("camera_desktop");
  const canvas = scene.getEngine().getRenderingCanvas();
  xr.baseExperience.onStateChangedObservable.add((state) => {
    if (state === WebXRState.IN_XR) {
      desktop?.detachControl();
      resetXRPose(xr.baseExperience.camera);
    } else if (state === WebXRState.NOT_IN_XR && desktop && canvas) {
      desktop.attachControl(canvas, true);
    }
  });

  xr.input.onControllerAddedObservable.add((source) => {
    onXRControllerAdded.notifyObservers(source);
    source.onMotionControllerInitObservable.add((motion) => {
      const bind = (componentId: string, action: "trigger" | "squeeze") =>
        motion
          .getComponent(componentId)
          ?.onButtonStateChangedObservable.add((component) => {
            const change = component.changes.pressed;
            if (!change) return;
            const mesh = xr.pointerSelection.getMeshUnderPointer(
              source.uniqueId,
            );
            const hand = source.inputSource.handedness;
            if (change.current)
              emitSelection(scene, mesh, action, hand, events);
            events.onAction?.({
              action,
              pressed: change.current,
              hand,
              mesh,
              grip: source.grip ?? source.pointer,
            });
          });
      bind("xr-standard-trigger", "trigger");
      bind("xr-standard-squeeze", "squeeze");
      if (motion.handedness === "right") {
        let latched = false;
        motion
          .getComponent("xr-standard-thumbstick")
          ?.onAxisValueChangedObservable.add(({ x }) => {
            if (settings.mode !== "free" || !settings.snapTurn) return;
            if (Math.abs(x) < 0.3) latched = false;
            if (latched || Math.abs(x) < 0.7) return;
            latched = true;
            xr.baseExperience.camera.rotationQuaternion.multiplyInPlace(
              Quaternion.FromEulerAngles(0, Math.sign(x) * SNAP_ANGLE, 0),
            );
          });
      }
    });
  });

  xr.baseExperience.onStateChangedObservable.add((state) =>
    events.onStateChange(state === WebXRState.IN_XR),
  );

  return {
    enter: async () => {
      await xr.baseExperience.enterXRAsync(
        "immersive-vr",
        "local-floor",
        xr.renderTarget,
      );
    },
    exit: async () => {
      if (xr.baseExperience.state === WebXRState.IN_XR)
        await xr.baseExperience.exitXRAsync();
    },
    setMode,
    applySettings: (next: XRSettings) => {
      settings = next;
      setMode(next.mode);
    },
    get isInXR() {
      return xr.baseExperience.state === WebXRState.IN_XR;
    },
    dispose: () => xr.dispose(),
  };
}
