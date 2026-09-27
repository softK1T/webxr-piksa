import { expect, test } from "vitest";
import { mapLimit } from "./loadLabModels";

test("mapLimit runs every item and never exceeds the limit", async () => {
  let active = 0;
  let peak = 0;
  const done: number[] = [];
  await mapLimit([1, 2, 3, 4, 5, 6, 7], 3, async (n) => {
    active++;
    peak = Math.max(peak, active);
    await new Promise((r) => setTimeout(r, 5));
    done.push(n);
    active--;
  });
  expect(done.sort()).toEqual([1, 2, 3, 4, 5, 6, 7]);
  expect(peak).toBe(3);
});

test("mapLimit stops taking new items after false", async () => {
  const seen: number[] = [];
  await mapLimit([1, 2, 3, 4], 1, async (n) => {
    seen.push(n);
    return n < 2;
  });
  expect(seen).toEqual([1, 2]);
});
