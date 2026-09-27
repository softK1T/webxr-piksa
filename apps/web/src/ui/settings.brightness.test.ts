import { expect, test } from "vitest";
import {
  BRIGHTNESS_MAX,
  BRIGHTNESS_MIN,
  DEFAULT_SETTINGS,
  sanitizeSettings,
} from "./settings";

test("brightness defaults to 100% and is clamped to 50-150%", () => {
  expect(DEFAULT_SETTINGS.brightness).toBe(1);
  expect(sanitizeSettings({}).brightness).toBe(1);
  expect(sanitizeSettings({ brightness: 5 }).brightness).toBe(BRIGHTNESS_MAX);
  expect(sanitizeSettings({ brightness: 0 }).brightness).toBe(BRIGHTNESS_MIN);
  expect(sanitizeSettings({ brightness: "x" }).brightness).toBe(1);
  expect(sanitizeSettings({ brightness: 1.25 }).brightness).toBe(1.25);
});
