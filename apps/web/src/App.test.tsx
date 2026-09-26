import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import App from "./App";

vi.mock("./components/LabCanvas", () => ({
  default: () => <div data-testid="lab" />,
}));

afterEach(() => vi.unstubAllGlobals());

const json = (status: number, body: unknown) =>
  Promise.resolve({ ok: status < 400, status, json: async () => body });

function mockApi(routes: Record<string, () => Promise<unknown>>) {
  const fn = vi.fn((url: string) => (routes[url] ?? (() => json(404, {})))());
  vi.stubGlobal("fetch", fn);
  return fn;
}

test("restores session and shows lab", async () => {
  mockApi({
    "/api/health": () => json(200, { status: "ok" }),
    "/api/auth/me": () => json(200, { id: 1, login: "nazar" }),
  });
  render(<App />);
  expect(await screen.findByTestId("lab")).toBeInTheDocument();
  expect(screen.getByText("nazar")).toBeInTheDocument();
  expect(await screen.findByText("API connected")).toBeInTheDocument();
});

test("shows sign-in form without session and API failure", async () => {
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
  render(<App />);
  expect(await screen.findByText("API unavailable")).toBeInTheDocument();
  expect(
    await screen.findByRole("heading", { name: "Sign in" }),
  ).toBeInTheDocument();
  expect(screen.queryByTestId("lab")).not.toBeInTheDocument();
});

test("login error, successful login and logout", async () => {
  let loginOk = false;
  mockApi({
    "/api/health": () => json(200, { status: "ok" }),
    "/api/auth/me": () => json(401, {}),
    "/api/auth/login": () =>
      loginOk ? json(200, { id: 1, login: "nazar" }) : json(401, {}),
    "/api/auth/logout": () => json(204, {}),
  });
  render(<App />);
  fireEvent.change(await screen.findByLabelText("Login"), {
    target: { value: "nazar" },
  });
  fireEvent.change(screen.getByLabelText("Password"), {
    target: { value: "secret-pass-1" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Invalid login or password",
  );
  loginOk = true;
  fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
  expect(await screen.findByTestId("lab")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Log out" }));
  expect(
    await screen.findByRole("heading", { name: "Sign in" }),
  ).toBeInTheDocument();
});

test("register validates password match and handles taken login", async () => {
  mockApi({
    "/api/health": () => json(200, { status: "ok" }),
    "/api/auth/me": () => json(401, {}),
    "/api/auth/register": () => json(409, {}),
  });
  render(<App />);
  fireEvent.click(
    await screen.findByRole("button", { name: "Create an account" }),
  );
  fireEvent.change(screen.getByLabelText("Login"), {
    target: { value: "nazar" },
  });
  fireEvent.change(screen.getByLabelText("Password"), {
    target: { value: "secret-pass-1" },
  });
  fireEvent.change(screen.getByLabelText("Repeat password"), {
    target: { value: "other-pass-1" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Register" }));
  expect(screen.getByRole("alert")).toHaveTextContent("Passwords do not match");
  fireEvent.change(screen.getByLabelText("Repeat password"), {
    target: { value: "" },
  });
  fireEvent.change(screen.getByLabelText("Repeat password"), {
    target: { value: "secret-pass-1" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Register" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("already taken");
});

test("401 from content API returns user to sign-in", async () => {
  mockApi({
    "/api/health": () => json(200, { status: "ok" }),
    "/api/auth/me": () => json(200, { id: 1, login: "nazar" }),
  });
  render(<App />);
  await screen.findByTestId("lab");
  const { readJson } = await import("./editor/api");
  await expect(readJson(new Response("{}", { status: 401 }))).rejects.toThrow();
  expect(
    await screen.findByRole("heading", { name: "Sign in" }),
  ).toBeInTheDocument();
});
