import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

declare const process: { env: Record<string, string | undefined> };

export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 4000,
    rollupOptions: {
      output: {
        manualChunks: {
          babylon: ["@babylonjs/core"],
          "babylon-loaders": ["@babylonjs/loaders"],
        },
      },
    },
  },
  server: {
    // listen on all interfaces (needed inside Docker) and accept the public domain behind Cloudflare
    host: true,
    allowedHosts: ["localhost", ".softk1t.space"],
    proxy: {
      "/api": {
        target: process.env.API_PROXY_TARGET || "http://localhost:8000",
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: "./src/test-setup.ts",
    pool: "threads",
    exclude: ["e2e/**", "node_modules/**", "dist/**"],
  },
});
