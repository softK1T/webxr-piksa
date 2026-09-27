import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { hintTarget } from "../sim/hints";
import { initialScenario, reduceScenario } from "../sim/scenario";
import { SettingsForm } from "./SettingsForm";
import {
  DEFAULT_SETTINGS,
  hardwareScaling,
  loadSettings,
  sanitizeSettings,
  saveSettings,
  toXRSettings,
} from "./settings";

const memory = () => {
  const data = new Map<string, string>();
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
  };
};

test("invalid settings fall back to defaults and speed is clamped", () => {
  expect(sanitizeSettings(null)).toEqual(DEFAULT_SETTINGS);
  expect(
    sanitizeSettings({ quality: "ultra", moveSpeed: 9, turn: "smooth" }),
  ).toEqual({ ...DEFAULT_SETTINGS, moveSpeed: 2, turn: "smooth" });
});

test("settings round-trip through storage", () => {
  const store = memory();
  saveSettings({ ...DEFAULT_SETTINGS, quality: "high" }, store);
  expect(loadSettings(store).quality).toBe("high");
  expect(
    loadSettings({ getItem: () => "{broken", setItem: () => undefined }),
  ).toEqual(DEFAULT_SETTINGS);
});

test("quality maps to hardware scaling and settings map to XR", () => {
  expect(hardwareScaling("low", 2)).toBe(1.5);
  expect(hardwareScaling("medium", 2)).toBe(1);
  expect(hardwareScaling("high", 3)).toBe(0.5);
  expect(
    toXRSettings({ ...DEFAULT_SETTINGS, turn: "smooth", locomotion: "free" }),
  ).toMatchObject({ mode: "free", snapTurn: false });
});

test("hint points to item, then to zone while holding", () => {
  expect(hintTarget("flask_to_bench", null)).toEqual({
    kind: "placement",
    id: "sample_bottle",
  });
  expect(hintTarget("flask_to_bench", "sample_bottle")).toEqual({
    kind: "placement",
    id: "erlenmeyer",
  });
  expect(hintTarget("tube_to_rack", "cuvette")).toMatchObject({
    kind: "point",
  });
  expect(hintTarget(null, null)).toBeNull();
});

test("mistakes are counted", () => {
  const s = [
    { type: "button" } as const,
    { type: "placed", model: "test_tube", zone: "rack_zone" } as const,
  ].reduce(reduceScenario, initialScenario);
  expect(s.mistakes).toBe(2);
});

test("settings form emits changes", () => {
  const onChange = vi.fn();
  render(<SettingsForm settings={DEFAULT_SETTINGS} onChange={onChange} />);
  fireEvent.change(screen.getByLabelText("Graphics quality"), {
    target: { value: "low" },
  });
  expect(onChange).toHaveBeenCalledWith({
    ...DEFAULT_SETTINGS,
    quality: "low",
  });
});
