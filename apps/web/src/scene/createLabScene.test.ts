import { NullEngine } from "@babylonjs/core";
import { afterEach, expect, test } from "vitest";
import { createLabScene } from "./createLabScene";

const engines: NullEngine[] = [];
afterEach(() => engines.splice(0).forEach((e) => e.dispose()));

function scene() {
  const engine = new NullEngine();
  engines.push(engine);
  return createLabScene(engine);
}

test("room contains required static elements", () => {
  const names = scene().meshes.map((m) => m.name);
  for (const n of [
    "floor",
    "ceiling",
    "wall_north",
    "wall_south",
    "wall_east",
    "wall_west",
    "door",
    "table_a",
    "table_b",
    "shelf",
    "control_console",
  ]) {
    expect(names).toContain(n);
  }
});

test("lighting is limited and camera is desktop-ready", () => {
  const s = scene();
  expect(s.lights.length).toBeLessThanOrEqual(3);
  expect(s.activeCamera?.name).toBe("camera_desktop");
  expect(s.collisionsEnabled).toBe(true);
});
