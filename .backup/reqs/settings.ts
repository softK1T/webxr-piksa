import type { LocomotionMode, XRSettings } from "../xr/setupXR";

export type Quality = "low" | "medium" | "high";
export type TurnType = "snap" | "smooth";

export interface Settings {
  locomotion: LocomotionMode;
  moveSpeed: number;
  turn: TurnType;
  quality: Quality;
}

export const SETTINGS_KEY = "piksa.settings";
export const SPEED_MIN = 0.5;
export const SPEED_MAX = 2;

export const DEFAULT_SETTINGS: Settings = {
  locomotion: "teleport",
  moveSpeed: 1,
  turn: "snap",
  quality: "medium",
};

const pick = <T extends string>(
  value: unknown,
  allowed: readonly T[],
  fallback: T,
): T => (allowed.includes(value as T) ? (value as T) : fallback);

export function sanitizeSettings(raw: unknown): Settings {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<
    string,
    unknown
  >;
  const speed =
    typeof r.moveSpeed === "number" && Number.isFinite(r.moveSpeed)
      ? r.moveSpeed
      : DEFAULT_SETTINGS.moveSpeed;
  return {
    locomotion: pick(
      r.locomotion,
      ["teleport", "free"] as const,
      DEFAULT_SETTINGS.locomotion,
    ),
    moveSpeed: Math.min(SPEED_MAX, Math.max(SPEED_MIN, speed)),
    turn: pick(r.turn, ["snap", "smooth"] as const, DEFAULT_SETTINGS.turn),
    quality: pick(
      r.quality,
      ["low", "medium", "high"] as const,
      DEFAULT_SETTINGS.quality,
    ),
  };
}

type Store = Pick<Storage, "getItem" | "setItem">;
const defaultStore = (): Store | undefined =>
  typeof localStorage === "undefined" ? undefined : localStorage;

export function loadSettings(
  storage: Store | undefined = defaultStore(),
): Settings {
  try {
    const text = storage?.getItem(SETTINGS_KEY);
    return sanitizeSettings(text ? JSON.parse(text) : {});
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(
  settings: Settings,
  storage: Store | undefined = defaultStore(),
): void {
  try {
    storage?.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    /* storage unavailable */
  }
}

export function hardwareScaling(
  quality: Quality,
  devicePixelRatio: number,
): number {
  if (quality === "low") return 1.5;
  if (quality === "medium") return 1;
  return 1 / Math.min(Math.max(devicePixelRatio, 1), 2);
}

export function toXRSettings(settings: Settings): XRSettings {
  return {
    mode: settings.locomotion,
    moveSpeed: settings.moveSpeed,
    rotationSpeed: settings.moveSpeed,
    snapTurn: settings.turn === "snap",
  };
}
