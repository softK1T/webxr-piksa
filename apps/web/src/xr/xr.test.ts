import { Color3 } from "@babylonjs/core";
import { expect, test } from "vitest";
import { applyHighlight, placementOf } from "./selection";
import { nextMode } from "./setupXR";
import { checkXRSupport } from "./xrSupport";

const nav = (xr?: unknown) => ({ xr }) as unknown as Navigator;

test("reports missing navigator.xr", async () => {
  expect(await checkXRSupport(nav(), true)).toBe("no-webxr");
});

test("reports insecure context", async () => {
  expect(await checkXRSupport(nav({}), false)).toBe("insecure");
});

test("detects immersive-vr support", async () => {
  expect(
    await checkXRSupport(nav({ isSessionSupported: async () => true }), true),
  ).toBe("supported");
  expect(
    await checkXRSupport(nav({ isSessionSupported: async () => false }), true),
  ).toBe("unsupported");
  expect(
    await checkXRSupport(
      nav({
        isSessionSupported: async () => {
          throw new Error("x");
        },
      }),
      true,
    ),
  ).toBe("unsupported");
});

test("toggles locomotion mode", () => {
  expect(nextMode("teleport")).toBe("free");
  expect(nextMode("free")).toBe("teleport");
});

test("highlights only meshes of selected placement", () => {
  const mk = (placementId?: string) => ({
    metadata: placementId ? { placementId, model: "m" } : null,
    renderOutline: false,
    outlineWidth: 0,
    outlineColor: new Color3(),
  });
  const meshes = [mk("flask"), mk("flask"), mk("rack"), mk()];
  expect(applyHighlight(meshes, "flask")).toBe(2);
  expect(meshes.map((m) => m.renderOutline)).toEqual([
    true,
    true,
    false,
    false,
  ]);
  expect(applyHighlight(meshes, null)).toBe(0);
  expect(placementOf(meshes[3])).toBeNull();
});

test("resetXRPose moves the rig to the spawn point inside the room", async () => {
  const { resetXRPose, XR_SPAWN } = await import("./setupXR");
  const cam = { position: { x: 9, y: 1.6, z: 9 }, rotationQuaternion: null };
  resetXRPose(cam);
  expect(cam.position).toEqual({ x: XR_SPAWN.x, y: 1.6, z: XR_SPAWN.z });
  expect(Math.abs(cam.position.z)).toBeLessThan(4);
  expect(cam.rotationQuaternion).not.toBeNull();
});
