import { defineConfig, devices } from "@playwright/test";

declare const process: { env: Record<string, string | undefined> };

const API_PY = "../api/.venv/bin/python";
const E2E_DB = "sqlite:///./e2e.db";
const RESET_DB = `import pathlib, app.models; pathlib.Path('e2e.db').unlink(missing_ok=True); from app.database import Base, make_engine; Base.metadata.create_all(make_engine())`;

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://localhost:5174",
    trace: "retain-on-failure",
    launchOptions: {
      args: ["--use-gl=swiftshader", "--enable-unsafe-swiftshader"],
    },
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: `cd ../api && DATABASE_URL=${E2E_DB} ${API_PY} -c "${RESET_DB}" && DATABASE_URL=${E2E_DB} MODELS_DIR=e2e-uploads ${API_PY} -m uvicorn app.main:app --port 8001`,
      url: "http://localhost:8001/health",
      reuseExistingServer: false,
    },
    {
      command:
        "API_PROXY_TARGET=http://localhost:8001 npm run dev -- --port 5174 --strictPort",
      url: "http://localhost:5174",
      reuseExistingServer: false,
    },
  ],
});
