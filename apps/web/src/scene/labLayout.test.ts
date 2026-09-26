import { expect, test } from "vitest";
import { LAB_LAYOUT, MODEL_NAMES, isInsideRoom } from "./labLayout";

test("every required model is placed exactly once", () => {
  expect([...LAB_LAYOUT.map((p) => p.model)].sort()).toEqual(
    [...MODEL_NAMES].sort(),
  );
});

test("placement ids are unique", () => {
  expect(new Set(LAB_LAYOUT.map((p) => p.id)).size).toBe(LAB_LAYOUT.length);
});

test("all placements are inside the room", () => {
  for (const p of LAB_LAYOUT) expect(isInsideRoom(p.position), p.id).toBe(true);
});
