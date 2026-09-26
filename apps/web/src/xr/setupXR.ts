import {
  AbstractMesh,
  type IWebXRControllerMovementOptions,
  Scene,
  WebXRFeatureName,
  WebXRMotionControllerTeleportation,
  WebXRState,
  type WebXRInputSource,
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

export interface XREvents {
  onStateChange(inXR: boolean): void;
  onSelect(event: SelectionEvent): void;
}

export interface XRController {
  enter(): Promise<void>;
  exit(): Promise<void>;
  setMode(mode: LocomotionMode): void;
  readonly isInXR: boolean;
  dispose(): void;
}

export function nextMode(mode: LocomotionMode): LocomotionMode {
  return mode === "teleport" ? "free" : "teleport";
}

export function emitSelection(
  scene: Scene,
  mesh: AbstractMesh | null,
  action: SelectAction,
  hand: string,
  events: XREvents,
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
  settings: XRSettings = DEFAULT_XR_SETTINGS,
): Promise<XRController> {
  const xr = await scene.createDefaultXRExperienceAsync({
    floorMeshes: [floor],
    disableDefaultUI: true,
    disableTeleportation: true,
    optionalFeatures: true,
  });
  const features = xr.baseExperience.featuresManager;

  const setMode = (mode: LocomotionMode) => {
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
    } else {
      features.disableFeature(WebXRFeatureName.TELEPORTATION);
      features.enableFeature(
        WebXRFeatureName.MOVEMENT,
        "latest",
        {
          xrInput: xr.input,
          movementSpeed: settings.moveSpeed,
          rotationSpeed: settings.rotationSpeed,
        } as IWebXRControllerMovementOptions,
        true,
        false,
      );
    }
  };
  setMode(settings.mode);

  const select = (source: WebXRInputSource, action: SelectAction) => {
    const mesh = xr.pointerSelection.getMeshUnderPointer(source.uniqueId);
    emitSelection(scene, mesh, action, source.inputSource.handedness, events);
  };

  xr.input.onControllerAddedObservable.add((source) => {
    source.onMotionControllerInitObservable.add((motion) => {
      const bind = (componentId: string, action: SelectAction) =>
        motion
          .getComponent(componentId)
          ?.onButtonStateChangedObservable.add((component) => {
            if (component.changes.pressed?.current) select(source, action);
          });
      bind("xr-standard-trigger", "trigger");
      bind("xr-standard-squeeze", "squeeze");
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
    get isInXR() {
      return xr.baseExperience.state === WebXRState.IN_XR;
    },
    dispose: () => xr.dispose(),
  };
}
