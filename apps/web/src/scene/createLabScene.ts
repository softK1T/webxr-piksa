import {
  AbstractEngine,
  Color3,
  Color4,
  DirectionalLight,
  HemisphericLight,
  PointLight,
  Scene,
  UniversalCamera,
  Vector3,
} from "@babylonjs/core";
import { buildRoom } from "./buildRoom";
import { createDropZones, dressLab } from "./labDressing";

export const BASE_CAMERA_SPEED = 0.12;

export const CAMERA_START = new Vector3(0, 1.7, -3);

export function createLighting(scene: Scene) {
  const hemi = new HemisphericLight(
    "light_ambient",
    new Vector3(0, 1, 0),
    scene,
  );
  hemi.intensity = 0.65;
  hemi.groundColor = new Color3(0.3, 0.32, 0.35);
  const sun = new DirectionalLight(
    "light_key",
    new Vector3(-0.3, -1, 0.4),
    scene,
  );
  sun.intensity = 0.55;
  const lamp = new PointLight("light_fill", new Vector3(0, 2.7, 1), scene);
  lamp.intensity = 0.35;
  lamp.range = 8;
  return [hemi, sun, lamp];
}

export function createCamera(scene: Scene, canvas?: HTMLCanvasElement) {
  const camera = new UniversalCamera(
    "camera_desktop",
    CAMERA_START.clone(),
    scene,
  );
  camera.setTarget(new Vector3(0, 1.3, 1));
  camera.minZ = 0.05;
  camera.speed = BASE_CAMERA_SPEED;
  camera.angularSensibility = 3000;
  camera.inertia = 0.6;
  camera.keysUp.push(87);
  camera.keysDown.push(83);
  camera.keysLeft.push(65);
  camera.keysRight.push(68);
  camera.ellipsoid = new Vector3(0.3, 0.85, 0.3);
  camera.checkCollisions = true;
  camera.applyGravity = true;
  if (canvas) camera.attachControl(canvas, true);
  return camera;
}

export function createLabScene(
  engine: AbstractEngine,
  canvas?: HTMLCanvasElement,
): Scene {
  const scene = new Scene(engine);
  scene.clearColor = new Color4(0.08, 0.09, 0.11, 1);
  scene.collisionsEnabled = true;
  scene.gravity = new Vector3(0, -0.15, 0);
  createLighting(scene);
  createCamera(scene, canvas);
  buildRoom(scene);
  dressLab(scene);
  createDropZones(scene);
  return scene;
}
