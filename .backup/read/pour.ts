import {
  Vector3,
  type Observer,
  type Scene,
  type TransformNode,
} from "@babylonjs/core";
import { LAB_LAYOUT, type Vec3 } from "../scene/labLayout";

export const POUR_TILT_DEG = 60;
const MOUTH_HEIGHT = 0.24;
const MOUTH_RADIUS = 0.18;

/** Angle between the bottle axis and world up, from the Y of its world up vector. */
export function tiltDeg(upY: number): number {
  return (Math.acos(Math.min(1, Math.max(-1, upY))) * 180) / Math.PI;
}

/** Bottle tilted past 60 degrees and held just above the flask mouth. */
export function isPouring(tilt: number, bottle: Vec3, mouth: Vec3): boolean {
  const dy = bottle[1] - mouth[1];
  return (
    tilt > POUR_TILT_DEG &&
    Math.hypot(bottle[0] - mouth[0], bottle[2] - mouth[2]) < MOUTH_RADIUS &&
    dy > -0.02 &&
    dy < 0.4
  );
}

export function mouthOf(
  scene: Scene,
  placementId: string,
  height: number,
): Vec3 {
  const node = scene.getTransformNodeByName(`place_${placementId}`);
  if (node) {
    const p = node.getAbsolutePosition();
    return [p.x, p.y + height, p.z];
  }
  const [x, y, z] = LAB_LAYOUT.find((p) => p.id === placementId)?.position ?? [
    0, 0, 0,
  ];
  return [x, y + height, z];
}

export const flaskMouthOf = (scene: Scene): Vec3 =>
  mouthOf(scene, "erlenmeyer", MOUTH_HEIGHT);
export const cuvetteMouthOf = (scene: Scene): Vec3 =>
  mouthOf(scene, "cuvette", 0.1);

/** Per-frame check that exists ONLY while the bottle is held (start on grab, stop on release). */
export function createPourWatcher(
  scene: Scene,
  getBottle: () => TransformNode | null,
  getMouth: () => Vec3,
  onPour: () => void,
) {
  let observer: Observer<Scene> | null = null;
  const stop = () => {
    if (observer) scene.onBeforeRenderObservable.remove(observer);
    observer = null;
  };
  const start = () => {
    if (observer) return;
    observer = scene.onBeforeRenderObservable.add(() => {
      const bottle = getBottle();
      if (!bottle) return stop();
      const up = Vector3.TransformNormal(
        Vector3.UpReadOnly,
        bottle.computeWorldMatrix(true),
      ).normalize();
      const p = bottle.getAbsolutePosition();
      if (isPouring(tiltDeg(up.y), [p.x, p.y, p.z], getMouth())) {
        stop();
        onPour();
      }
    });
  };
  return {
    start,
    stop,
    get active() {
      return observer !== null;
    },
  };
}
