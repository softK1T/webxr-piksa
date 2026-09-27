import { NullEngine, Scene, TransformNode } from "@babylonjs/core";
import { expect, test } from "vitest";
import { clickEvent, openParcelLid } from "./devices";
import { createPourWatcher, isPouring, tiltDeg } from "./pour";

test("equipment clicks map to scenario events", () => {
  expect(clickEvent("parcel", null, false)).toEqual({ type: "panel_opened" });
  expect(clickEvent("pump", null, false)).toEqual({ type: "lever", on: true });
  expect(clickEvent("pump", null, true)).toEqual({ type: "lever", on: false });
  expect(clickEvent("ph_meter", null, false)).toEqual({ type: "button" });
  expect(clickEvent("erlenmeyer", null, false)).toBeNull();
  expect(clickEvent("erlenmeyer", "sample_bottle", false)).toMatchObject({
    type: "poured",
    into: "erlenmeyer_flask",
  });
  expect(clickEvent("cuvette", "erlenmeyer_flask", false)).toMatchObject({
    type: "poured",
    into: "cuvette",
  });
  expect(clickEvent("cuvette", null, false)).toBeNull();
  expect(clickEvent("goggles", null, false)).toBeNull();
});

test("pouring needs a tilt over 60 degrees just above the flask mouth", () => {
  const mouth = [-2, 1.14, 1.15] as const;
  expect(tiltDeg(1)).toBeCloseTo(0);
  expect(tiltDeg(0)).toBeCloseTo(90);
  expect(isPouring(75, [-2.05, 1.25, 1.15], mouth)).toBe(true);
  expect(isPouring(45, [-2.05, 1.25, 1.15], mouth)).toBe(false);
  expect(isPouring(90, [-1.5, 1.25, 1.15], mouth)).toBe(false);
  expect(isPouring(90, [-2, 0.9, 1.15], mouth)).toBe(false);
});

test("pour watcher adds a frame observer only while active", async () => {
  const scene = new Scene(new NullEngine());
  const count = () => scene.onBeforeRenderObservable.observers.length;
  const base = count();
  const w = createPourWatcher(
    scene,
    () => null,
    () => [0, 0, 0],
    () => {},
  );
  expect(count()).toBe(base);
  w.start();
  w.start();
  expect(count()).toBe(base + 1);
  w.stop();
  expect(w.active).toBe(false);
  // Babylon unregisters observers on the next tick
  await new Promise((r) => setTimeout(r, 0));
  expect(count()).toBe(base);
});

test("parcel lid opens, other lids stay", () => {
  const scene = new Scene(new NullEngine());
  const parcel = new TransformNode("place_parcel", scene);
  const lid = new TransformNode("Lid", scene);
  lid.parent = parcel;
  const other = new TransformNode("Lid", scene);
  other.parent = new TransformNode("place_turbidimeter", scene);
  expect(openParcelLid(scene)).toBe(1);
  expect(lid.rotation.x).toBeLessThan(-1);
  expect(other.rotation.x).toBe(0);
});
