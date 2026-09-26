import { expect, test } from "@playwright/test";
import { register } from "./helpers";

test("desktop lab renders and menu, settings work", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await register(page);

  const canvas = page.getByLabel("Virtual laboratory");
  await expect(canvas).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Instructions" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Settings" }).first().click();
  await expect(page.getByLabel(/quality/i).first()).toBeVisible();
  await page
    .getByRole("button", { name: /back|close|menu/i })
    .first()
    .click();

  await page
    .getByRole("button", { name: /desktop|3d|start/i })
    .first()
    .click();
  const box = await canvas.boundingBox();
  expect(box?.width ?? 0).toBeGreaterThan(200);
  await page.keyboard.down("w");
  await page.waitForTimeout(300);
  await page.keyboard.up("w");
  expect(errors).toEqual([]);
});

test("VR button is disabled without an XR device", async ({ page }) => {
  await register(page);
  const vr = page.getByRole("button", { name: /vr/i }).first();
  await expect(vr).toBeDisabled();
});
