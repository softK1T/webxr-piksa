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
