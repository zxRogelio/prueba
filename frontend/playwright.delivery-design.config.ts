import { defineConfig } from "@playwright/test";

// Frontend only: the runner disables Vite .env loading and every API request
// is fulfilled in the browser. The real DB/provider harness is separate.
export default defineConfig({
  testDir: "./e2e", testMatch: "delivery-design.spec.ts", workers: 1, fullyParallel: false,
  timeout: 30000, expect: { timeout: 10000 }, retries: 0,
  outputDir: "./test-results/delivery-design/artifacts",
  reporter: [["list"], ["json", { outputFile: "./test-results/delivery-design/results.json" }]],
  use: { baseURL: "http://127.0.0.1:5198", channel: "chrome", headless: true,
    viewport: { width: 1440, height: 1000 }, serviceWorkers: "block", trace: "off", screenshot: "only-on-failure" },
});
