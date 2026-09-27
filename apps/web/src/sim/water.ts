// Water sample model for the parcel scenario: hidden profile -> device readings -> report.
// Pure and deterministic given `rand`; no Babylon imports (rendering reads these values).

export type Rgb = readonly [number, number, number];
export type ProfileId = "clay" | "iron" | "surface";
type Range = readonly [number, number];

export interface WaterProfile {
  id: ProfileId;
  cause: string;
  rawNtu: Range;
  filteredNtu: Range;
  ph: Range;
  conductivity: Range;
  water: Rgb;
  residue: Rgb;
}

/** EU Drinking Water Directive 2020/2184 indicator values used by the report. */
export const WATER_LIMITS = {
  turbidityNtu: 1,
  phMin: 6.5,
  phMax: 9.5,
  conductivityUsCm: 2500,
} as const;

export const PROFILE_IDS: readonly ProfileId[] = ["clay", "iron", "surface"];

export const WATER_PROFILES: Record<ProfileId, WaterProfile> = {
  clay: {
    id: "clay",
    cause: "Clay washed into the well by rain",
    rawNtu: [25, 60],
    filteredNtu: [0.3, 0.9],
    ph: [7.0, 7.6],
    conductivity: [400, 700],
    water: [0.55, 0.42, 0.25],
    residue: [0.5, 0.36, 0.2],
  },
  iron: {
    id: "iron",
    cause: "Dissolved iron and manganese",
    rawNtu: [8, 20],
    filteredNtu: [2, 5],
    ph: [6.2, 6.8],
    conductivity: [600, 900],
    water: [0.62, 0.38, 0.15],
    residue: [0.7, 0.35, 0.1],
  },
  surface: {
    id: "surface",
    cause: "Surface water leaking into the well",
    rawNtu: [15, 40],
    filteredNtu: [1.3, 3],
    ph: [6.8, 7.4],
    conductivity: [1200, 2600],
    water: [0.4, 0.42, 0.3],
    residue: [0.35, 0.4, 0.3],
  },
};

export interface WaterSample {
  profile: ProfileId;
  rawNtu: number;
  filteredNtu: number;
  ph: number;
  conductivity: number;
}

const round = (value: number, digits: number): number => {
  const k = 10 ** digits;
  return Math.round(value * k) / k;
};

const pick = (range: Range, rand: () => number, digits: number): number =>
  round(range[0] + (range[1] - range[0]) * rand(), digits);

/** Small seeded PRNG (mulberry32) so a run can be replayed from its seed. */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function newSample(rand: () => number = Math.random, profile?: ProfileId): WaterSample {
  const index = Math.min(PROFILE_IDS.length - 1, Math.floor(rand() * PROFILE_IDS.length));
  const id: ProfileId = profile ?? PROFILE_IDS[index] ?? "clay";
  const p = WATER_PROFILES[id];
  return {
    profile: id,
    rawNtu: pick(p.rawNtu, rand, 1),
    filteredNtu: pick(p.filteredNtu, rand, 1),
    ph: pick(p.ph, rand, 2),
    conductivity: pick(p.conductivity, rand, 0),
  };
}

// ---- devices -------------------------------------------------------------

export const BUFFER_PH = {
  buffer_bottle_ph4: 4.01,
  buffer_bottle_ph7: 7.0,
  buffer_bottle_ph10: 10.01,
} as const;
export type BufferId = keyof typeof BUFFER_PH;
export const CALIBRATION_BUFFER: BufferId = "buffer_bottle_ph7";
/** Offset of an uncalibrated electrode; the meter flags the value as UNCAL. */
export const UNCALIBRATED_DRIFT = 0.45;

export function isCalibrationBuffer(id: string): boolean {
  return id === CALIBRATION_BUFFER;
}

/** Turbidimeter screen text: the cuvette is filled from the raw (unfiltered) sample. */
export function turbidimeterScreen(sample: WaterSample, cuvetteFilled: boolean): string {
  return cuvetteFilled ? `${sample.rawNtu.toFixed(1)} NTU` : "E1 NO SAMPLE";
}

export interface MeterReading {
  ph: number;
  conductivity: number;
  calibrated: boolean;
}

/** pH/conductivity meter reading on the filtrate. */
export function readPhMeter(sample: WaterSample, calibrated: boolean): MeterReading {
  return {
    ph: calibrated ? sample.ph : round(sample.ph + UNCALIBRATED_DRIFT, 2),
    conductivity: sample.conductivity,
    calibrated,
  };
}

export function phMeterScreen(reading: MeterReading): string {
  const flag = reading.calibrated ? "" : " UNCAL";
  return `pH ${reading.ph.toFixed(2)}${flag}  ${Math.round(reading.conductivity)} uS/cm`;
}

// ---- report --------------------------------------------------------------

export type Verdict = "drinkable" | "drinkable_after_filtration" | "not_drinkable";

export interface Check {
  name: string;
  value: string;
  limit: string;
  ok: boolean;
}

export interface WaterReport {
  checks: Check[];
  verdict: Verdict;
  cause: string;
}

export function evaluate(sample: WaterSample): WaterReport {
  const L = WATER_LIMITS;
  const rawOk = sample.rawNtu <= L.turbidityNtu;
  const filteredOk = sample.filteredNtu <= L.turbidityNtu;
  const phOk = sample.ph >= L.phMin && sample.ph <= L.phMax;
  const condOk = sample.conductivity <= L.conductivityUsCm;
  const checks: Check[] = [
    { name: "Turbidity, raw", value: `${sample.rawNtu.toFixed(1)} NTU`, limit: `<= ${L.turbidityNtu}`, ok: rawOk },
    { name: "Turbidity, filtered", value: `${sample.filteredNtu.toFixed(1)} NTU`, limit: `<= ${L.turbidityNtu}`, ok: filteredOk },
    { name: "pH", value: sample.ph.toFixed(2), limit: `${L.phMin} - ${L.phMax}`, ok: phOk },
    { name: "Conductivity", value: `${Math.round(sample.conductivity)} uS/cm`, limit: `<= ${L.conductivityUsCm}`, ok: condOk },
  ];
  const verdict: Verdict = !(filteredOk && phOk && condOk)
    ? "not_drinkable"
    : rawOk
      ? "drinkable"
      : "drinkable_after_filtration";
  return { checks, verdict, cause: WATER_PROFILES[sample.profile].cause };
}

const VERDICT_TEXT: Record<Verdict, string> = {
  drinkable: "DRINKABLE",
  drinkable_after_filtration: "DRINKABLE ONLY AFTER FILTRATION - fit a sediment filter",
  not_drinkable: "NOT DRINKABLE - do not drink, contact the sanitary station",
};

export function formatReport(sample: WaterSample): string[] {
  const report = evaluate(sample);
  return [
    "WATER TEST REPORT",
    ...report.checks.map((c) => `${c.name}: ${c.value} (limit ${c.limit}) ${c.ok ? "OK" : "FAIL"}`),
    `Likely cause: ${report.cause}`,
    `VERDICT: ${VERDICT_TEXT[report.verdict]}`,
  ];
}

// ---- visuals derived from the same numbers ---------------------------------

const CLEAR_WATER: Rgb = [0.85, 0.9, 0.92];

const mix = (a: Rgb, b: Rgb, t: number): Rgb => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];

/** Raw sample colour: murkier profiles/values drift further from clear water. */
export function rawWaterColor(sample: WaterSample): Rgb {
  return mix(CLEAR_WATER, WATER_PROFILES[sample.profile].water, Math.min(1, 0.4 + sample.rawNtu / 60));
}

export function filtrateColor(sample: WaterSample): Rgb {
  return mix(CLEAR_WATER, WATER_PROFILES[sample.profile].water, Math.min(0.3, sample.filteredNtu / 15));
}

export function residueColor(sample: WaterSample): Rgb {
  return WATER_PROFILES[sample.profile].residue;
}
