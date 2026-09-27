import { NullEngine, Scene } from "@babylonjs/core";
import { expect, test } from "vitest";
import { buildRoom } from "./buildRoom";

// guards against objects intersecting each other or hanging in the air
const WALL_MOUNTED =
  /^(window_|chalk|sign_|fire_board|reagent_glass|fume_glass|scope_screen|rack_indicator|lab_coat|ceiling|wall_|floor|door)/;
const ALLOWED = [
  ["window_glass", "window_frame"],
  ["window_frame_v", "window_frame_h"],
  ["desk_lamp_", "desk_lamp_"],
  ["reagent_cabinet", "reagent_bottle"], // hollow cabinet: bottles stand inside
];

test("no floating or interpenetrating furniture", () => {
  const s = new Scene(new NullEngine());
  const bb = buildRoom(s)
    .filter((m) => !/^(floor|ceiling|wall_)/.test(m.name))
    .map((m) => {
      m.computeWorldMatrix(true);
      const b = m.getBoundingInfo().boundingBox;
      return { n: m.name, a: b.minimumWorld, b: b.maximumWorld };
    });
  const bad: string[] = [];
  for (let i = 0; i < bb.length; i++)
    for (let j = i + 1; j < bb.length; j++) {
      const p = bb[i],
        q = bb[j];
      if (
        ALLOWED.some(
          ([x, y]) =>
            (p.n.startsWith(x) && q.n.startsWith(y)) ||
            (p.n.startsWith(y) && q.n.startsWith(x)),
        )
      )
        continue;
      const o = (["x", "y", "z"] as const).map(
        (k) => Math.min(p.b[k], q.b[k]) - Math.max(p.a[k], q.a[k]),
      );
      if (o.every((v) => v > 0.005)) bad.push(`overlap ${p.n} / ${q.n}`);
    }
  for (const x of bb) {
    if (x.a.y < 0.03 || WALL_MOUNTED.test(x.n)) continue;
    if (x.n === "reagent_bottle") {
      // shelf tops inside the merged cabinet: bottom 0.30, shelves 0.965 / 1.615
      if (![0.3, 0.965, 1.615].some((y) => Math.abs(x.a.y - y) < 0.01))
        bad.push(`bottle off shelf at y=${x.a.y.toFixed(3)}`);
      continue;
    }
    const ok = bb.some(
      (q) =>
        q !== x &&
        Math.abs(q.b.y - x.a.y) < 0.02 &&
        q.a.x < x.b.x &&
        q.b.x > x.a.x &&
        q.a.z < x.b.z &&
        q.b.z > x.a.z,
    );
    if (!ok) bad.push(`floating ${x.n} at y=${x.a.y.toFixed(2)}`);
  }
  expect(bad).toEqual([]);
});
