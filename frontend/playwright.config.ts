import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/pwa",
  timeout: 40_000,
  expect: { timeout: 12_000 },
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  use: { baseURL: "http://localhost:4173", browserName: "chromium", serviceWorkers: "allow", trace: "retain-on-failure" },
  webServer: { command: "npm run preview -- --host localhost --port 4173 --strictPort", url: "http://localhost:4173", reuseExistingServer: false },
});
