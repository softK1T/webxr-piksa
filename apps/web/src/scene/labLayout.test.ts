import { expect, test } from "vitest";
import {
  LAB_LAYOUT,
  MODEL_NAMES,
  SURFACES,
  footprint,
  isInsideRoom,
} from "./labLayout";
import { DROP_ZONES } from "../sim/zones";

test("every required model is placed (flasks may repeat)", () => {
  expect([...new Set(LAB_LAYOUT.map((p) => p.model))].sort()).toEqual(
    [...MODEL_NAMES].sort(),
  );
});

test("placement ids are unique", () => {
  expect(new Set(LAB_LAYOUT.map((p) => p.id)).size).toBe(LAB_LAYOUT.length);
});

test("all placements are inside the room", () => {
  for (const p of LAB_LAYOUT) expect(isInsideRoom(p.position), p.id).toBe(true);
});

const overlap = (a: number[], b: number[], gap = 0.02) =>
  a[0] < b[1] + gap &&
  b[0] < a[1] + gap &&
  a[2] < b[3] + gap &&
  b[2] < a[3] + gap;

test("every item stands on its surface, fully supported", () => {
  for (const p of LAB_LAYOUT) {
    const s = SURFACES[p.on];
    expect(p.position[1], p.id).toBeCloseTo(s.y, 3);
    const [x0, x1, z0, z1] = footprint(p);
    expect(x0 >= s.x0 && x1 <= s.x1 && z0 >= s.z0 && z1 <= s.z1, p.id).toBe(
      true,
    );
  }
});

test("items on the same surface do not overlap", () => {
  for (const a of LAB_LAYOUT)
    for (const b of LAB_LAYOUT)
      if (a !== b && a.on === b.on && a.on !== "floor")
        expect(overlap(footprint(a), footprint(b)), `${a.id} vs ${b.id}`).toBe(
          false,
        );
});

test("drop pads lie on a table and are clear of other items", () => {
  for (const z of DROP_ZONES) {
    const pad = [
      z.center[0] - z.half[0],
      z.center[0] + z.half[0],
      z.center[2] - z.half[2],
      z.center[2] + z.half[2],
    ];
    const table = [SURFACES.table_a, SURFACES.table_b].find(
      (s) =>
        pad[0] >= s.x0 && pad[1] <= s.x1 && pad[2] >= s.z0 && pad[3] <= s.z1,
    );
    expect(table, z.id).toBeDefined();
    expect(z.center[1]).toBeCloseTo(table!.y, 3);
    for (const p of LAB_LAYOUT) {
      if (z.id === "rack_zone" && p.id === "rack") continue;
      if (p.on !== "table_a" && p.on !== "table_b") continue;
      expect(overlap(pad, footprint(p)), `${z.id} vs ${p.id}`).toBe(false);
    }
  }
});
