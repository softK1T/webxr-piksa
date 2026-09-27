import { expect, test } from "vitest";
import { herringboneRects } from "./parquet";

test("herringbone parquet covers the floor without overlaps", () => {
  const r = herringboneRects(2, 1.6, 0.09, 6);
  const area = r.reduce((s, [a, b, c, d]) => s + (c - a) * (d - b), 0);
  expect(area).toBeGreaterThan(2 * 1.6 * 0.97);
  expect(area).toBeLessThan(2 * 1.6 * 1.001);
  for (let i = 0; i < r.length; i++)
    for (let j = i + 1; j < r.length; j++) {
      const [a0, b0, c0, d0] = r[i];
      const [a1, b1, c1, d1] = r[j];
      const ox = Math.min(c0, c1) - Math.max(a0, a1);
      const oz = Math.min(d0, d1) - Math.max(b0, b1);
      expect(ox > 1e-6 && oz > 1e-6).toBe(false);
    }
});
