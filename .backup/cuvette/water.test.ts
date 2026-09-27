import { describe, expect, test } from "vitest";
import {
  PROFILE_IDS,
  UNCALIBRATED_DRIFT,
  WATER_LIMITS,
  WATER_PROFILES,
  evaluate,
  filtrateColor,
  formatReport,
  isCalibrationBuffer,
  newSample,
  phMeterScreen,
  rawWaterColor,
  readPhMeter,
  seededRandom,
  turbidimeterScreen,
  type WaterSample,
} from "./water";

const inRange = (v: number, [lo, hi]: readonly [number, number]) =>
  v >= lo && v <= hi;

describe("newSample", () => {
  test("same seed gives the same sample", () => {
    expect(newSample(seededRandom(42))).toEqual(newSample(seededRandom(42)));
  });

  test("every profile is reachable and values stay inside the profile ranges", () => {
    const seen = new Set<string>();
    const rand = seededRandom(7);
    for (let i = 0; i < 300; i++) {
      const s = newSample(rand);
      const p = WATER_PROFILES[s.profile];
      seen.add(s.profile);
      expect(inRange(s.rawNtu, p.rawNtu)).toBe(true);
      expect(inRange(s.filteredNtu, p.filteredNtu)).toBe(true);
      expect(inRange(s.ph, p.ph)).toBe(true);
      expect(inRange(s.conductivity, p.conductivity)).toBe(true);
      expect(s.rawNtu).toBeGreaterThan(WATER_LIMITS.turbidityNtu); // the bottle is always murky
    }
    expect([...seen].sort()).toEqual([...PROFILE_IDS].sort());
  });
});

describe("evaluate", () => {
  const rand = seededRandom(1);
  test.each([
    ["clay", "drinkable_after_filtration"],
    ["iron", "not_drinkable"],
    ["surface", "not_drinkable"],
  ] as const)("profile %s -> %s", (profile, verdict) => {
    for (let i = 0; i < 50; i++)
      expect(evaluate(newSample(rand, profile)).verdict).toBe(verdict);
  });

  const base: WaterSample = {
    profile: "clay",
    rawNtu: 0.8,
    filteredNtu: 0.5,
    ph: 7.2,
    conductivity: 500,
  };
  test("clear water within limits is drinkable", () => {
    expect(evaluate(base).verdict).toBe("drinkable");
  });
  test("limits are inclusive", () => {
    expect(
      evaluate({
        ...base,
        rawNtu: 1,
        filteredNtu: 1,
        ph: 6.5,
        conductivity: 2500,
      }).verdict,
    ).toBe("drinkable");
  });
  test.each([
    [{ ph: 6.49 }],
    [{ ph: 9.51 }],
    [{ conductivity: 2501 }],
    [{ filteredNtu: 1.1 }],
  ])("out of limit %o -> not drinkable", (patch) => {
    expect(evaluate({ ...base, ...patch }).verdict).toBe("not_drinkable");
  });
});

describe("devices", () => {
  const s: WaterSample = {
    profile: "iron",
    rawNtu: 12.34,
    filteredNtu: 3,
    ph: 6.4,
    conductivity: 750.4,
  };
  test("turbidimeter shows NTU only with a filled cuvette", () => {
    expect(turbidimeterScreen(s, true)).toBe("12.3 NTU");
    expect(turbidimeterScreen(s, false)).toBe("E1 NO SAMPLE");
  });
  test("only the pH 7.00 buffer calibrates", () => {
    expect(isCalibrationBuffer("buffer_bottle_ph7")).toBe(true);
    expect(isCalibrationBuffer("buffer_bottle_ph4")).toBe(false);
    expect(isCalibrationBuffer("buffer_bottle_ph10")).toBe(false);
  });
  test("uncalibrated meter drifts and is flagged", () => {
    const ok = readPhMeter(s, true);
    const bad = readPhMeter(s, false);
    expect(ok.ph).toBe(6.4);
    expect(bad.ph).toBeCloseTo(6.4 + UNCALIBRATED_DRIFT, 2);
    expect(phMeterScreen(ok)).toBe("pH 6.40  750 uS/cm");
    expect(phMeterScreen(bad)).toContain("UNCAL");
  });
});

describe("report and visuals", () => {
  test("report lists every check and the verdict", () => {
    const lines = formatReport({
      profile: "surface",
      rawNtu: 30,
      filteredNtu: 2,
      ph: 7,
      conductivity: 2600,
    });
    expect(lines[0]).toBe("WATER TEST REPORT");
    expect(lines.filter((l) => l.endsWith("FAIL"))).toHaveLength(3);
    expect(lines.at(-1)).toContain("NOT DRINKABLE");
  });
  test("filtrate is always clearer than the raw sample", () => {
    const rand = seededRandom(3);
    const clear = [0.85, 0.9, 0.92];
    const dist = (c: readonly number[]) =>
      Math.hypot(...c.map((v, i) => v - (clear[i] ?? 0)));
    for (let i = 0; i < 100; i++) {
      const smp = newSample(rand);
      expect(dist(filtrateColor(smp))).toBeLessThan(dist(rawWaterColor(smp)));
    }
  });
});
