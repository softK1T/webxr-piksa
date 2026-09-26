import { NullEngine, Scene } from "@babylonjs/core";
import { expect, test } from "vitest";
import { ITEM_LABELS, LAB_LAYOUT, LAB_ZONES, zoneOf } from "./labLayout";
import {
  DROP_PREFIX,
  LABEL_PREFIX,
  ZONE_PREFIX,
  createDropZones,
  dressLab,
} from "./labDressing";
import { DROP_ZONES } from "../sim/zones";

test("every placement belongs to exactly one zone", () => {
  for (const p of LAB_LAYOUT) {
    expect(LAB_ZONES.filter((z) => z.items.includes(p.id)).length, p.id).toBe(
      1,
    );
  }
});

test("placements sit inside their zone footprint", () => {
  for (const p of LAB_LAYOUT) {
    const zone = zoneOf(p.id)!;
    const [x, , z] = p.position;
    expect(Math.abs(x - zone.center[0]), p.id).toBeLessThanOrEqual(
      zone.size[0] / 2 + 0.3,
    );
    expect(Math.abs(z - zone.center[1]), p.id).toBeLessThanOrEqual(
      zone.size[1] / 2 + 0.3,
    );
  }
});

test("dressLab creates zone floors and labels", () => {
  const scene = new Scene(new NullEngine());
  dressLab(scene);
  const names = scene.meshes.map((m) => m.name);
  for (const zone of LAB_ZONES) {
    expect(names).toContain(ZONE_PREFIX + zone.id);
    expect(names).toContain(`${LABEL_PREFIX}zone_${zone.id}`);
  }
  for (const id of Object.keys(ITEM_LABELS))
    expect(names).toContain(LABEL_PREFIX + id);
  expect(scene.meshes.every((m) => !m.isPickable)).toBe(true);
});

test("createDropZones draws a pad and label for every drop zone", () => {
  const scene = new Scene(new NullEngine());
  createDropZones(scene);
  const names = scene.meshes.map((m) => m.name);
  for (const z of DROP_ZONES) {
    expect(names).toContain(DROP_PREFIX + z.id);
    expect(names).toContain(`${LABEL_PREFIX}${DROP_PREFIX}${z.id}`);
  }
  expect(scene.meshes.every((m) => !m.isPickable)).toBe(true);
});
