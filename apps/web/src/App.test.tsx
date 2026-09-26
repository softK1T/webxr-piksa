import { render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import App from "./App";

vi.mock("./components/LabCanvas", () => ({
  default: () => <div data-testid="lab" />,
}));

afterEach(() => vi.unstubAllGlobals());

test("displays API connectivity and lab", async () => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({ status: "ok" }) }),
  );
  render(<App />);
  expect(await screen.findByText("API connected")).toBeInTheDocument();
  expect(screen.getByTestId("lab")).toBeInTheDocument();
});

test("displays API failure", async () => {
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
  render(<App />);
  expect(await screen.findByText("API unavailable")).toBeInTheDocument();
});
