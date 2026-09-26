import {
  FreeCamera,
  HemisphericLight,
  MeshBuilder,
  NullEngine,
  PointLight,
  Scene,
  TransformNode,
  Vector3,
} from "@babylonjs/core";
import { expect, test } from "vitest";
import {
  LodManager,
  QUALITY_PROFILES,
  applyQuality,
  freezeStatic,
  pickLod,
} from "./quality";
import { detectWebGPU, requestedRenderer } from "./webgpu";

const makeScene = () => {
  const scene = new Scene(new NullEngine());
  scene.activeCamera = new FreeCamera("cam", Vector3.Zero(), scene);
  return scene;
};

test("pickLod uses near and far thresholds", () => {
  expect(pickLod(1, [3, 6])).toBe(0);
  expect(pickLod(4, [3, 6])).toBe(1);
  expect(pickLod(9, [3, 6])).toBe(2);
});

test("low switches LOD earlier than high", () => {
  const [lowNear] = QUALITY_PROFILES.low.lodDistances;
  const [highNear] = QUALITY_PROFILES.high.lodDistances;
  expect(lowNear).toBeLessThan(highNear);
  expect(QUALITY_PROFILES.low.shadows).toBe(false);
});

test("LodManager enables exactly one level by distance", () => {
  const scene = makeScene();
  const anchor = new TransformNode("place_device", scene);
  const levels = [0, 1, 2].map((i) => {
    const node = new TransformNode(`measurement_device_LOD${i}`, scene);
    node.parent = anchor;
    return node;
  });
  const lod = new LodManager(scene);
  applyQuality(scene, "low");
  anchor.position.set(0, 0, 1);
  lod.update();
  expect(lod.size).toBe(1);
  expect(levels.map((n) => n.isEnabled(false))).toEqual([true, false, false]);
  anchor.position.set(0, 0, 4);
  anchor.computeWorldMatrix(true);
  levels.forEach((n) => n.computeWorldMatrix(true));
  lod.update();
  expect(levels.map((n) => n.isEnabled(false))).toEqual([false, true, false]);
  anchor.position.set(0, 0, 20);
  anchor.computeWorldMatrix(true);
  levels.forEach((n) => n.computeWorldMatrix(true));
  lod.update();
  expect(levels.map((n) => n.isEnabled(false))).toEqual([false, false, true]);
});

test("applyQuality limits dynamic lights and shadows", () => {
  const scene = makeScene();
  const hemi = new HemisphericLight("hemi", Vector3.Up(), scene);
  const a = new PointLight("a", Vector3.Zero(), scene);
  const b = new PointLight("b", Vector3.Zero(), scene);
  const small = MeshBuilder.CreateBox("small", { size: 0.1 }, scene);
  const big = MeshBuilder.CreateBox("big", { size: 2 }, scene);
  applyQuality(scene, "low");
  expect([hemi, a, b].map((l) => l.isEnabled())).toEqual([true, true, false]);
  expect(big.receiveShadows).toBe(false);
  applyQuality(scene, "high");
  expect(b.isEnabled()).toBe(true);
  expect(big.receiveShadows).toBe(true);
  expect(small.receiveShadows).toBe(false);
});

test("freezeStatic freezes only non-interactive room meshes", () => {
  const scene = makeScene();
  const wall = MeshBuilder.CreateBox("wall", {}, scene);
  wall.isPickable = false;
  const item = MeshBuilder.CreateBox("item", {}, scene);
  item.isPickable = false;
  item.metadata = { placementId: "flask" };
  expect(freezeStatic(scene)).toBe(1);
  expect(wall.isWorldMatrixFrozen).toBe(true);
  expect(item.isWorldMatrixFrozen).toBe(false);
});

test("WebGPU is opt-in and detected safely", async () => {
  expect(requestedRenderer("")).toBe("webgl");
  expect(requestedRenderer("?renderer=webgpu")).toBe("webgpu");
  expect(await detectWebGPU({})).toBe(false);
  expect(
    await detectWebGPU({ gpu: { requestAdapter: async () => ({}) } }),
  ).toBe(true);
  expect(
    await detectWebGPU({
      gpu: { requestAdapter: () => Promise.reject(new Error("x")) },
    }),
  ).toBe(false);
});
