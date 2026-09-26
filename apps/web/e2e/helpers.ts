import { expect, type Page } from "@playwright/test";

export const PASSWORD = "secret-pass-1";

export const uniqueLogin = (prefix = "user") =>
  `${prefix}_${Date.now().toString(36)}${Math.floor(Math.random() * 1000)}`;

export async function register(page: Page, login = uniqueLogin()) {
  await page.goto("/");
  await page.getByRole("button", { name: "Create an account" }).click();
  await page.getByLabel("Login").fill(login);
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await page.getByLabel("Repeat password").fill(PASSWORD);
  await page.getByRole("button", { name: "Register" }).click();
  await expect(page.getByText(login, { exact: true })).toBeVisible();
  return login;
}
