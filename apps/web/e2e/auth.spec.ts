import { expect, test } from "@playwright/test";
import { PASSWORD, register } from "./helpers";

test("register, keep session after reload, logout and login again", async ({
  page,
}) => {
  const login = await register(page);
  await page.reload();
  await expect(page.getByText(login, { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Log out" }).click();
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();

  await page.getByLabel("Login").fill(login);
  await page.getByLabel("Password", { exact: true }).fill("wrong-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("alert")).toHaveText("Invalid login or password");

  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByText(login, { exact: true })).toBeVisible();
});

test("duplicate login is rejected", async ({ page, browser }) => {
  const login = await register(page);
  const other = await browser.newPage();
  await other.goto("/");
  await other.getByRole("button", { name: "Create an account" }).click();
  await other.getByLabel("Login").fill(login);
  await other.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await other.getByLabel("Repeat password").fill(PASSWORD);
  await other.getByRole("button", { name: "Register" }).click();
  await expect(other.getByRole("alert")).toContainText("already taken");
});

test("content API is protected without session", async ({ request }) => {
  expect((await request.get("/api/scenes")).status()).toBe(401);
});
