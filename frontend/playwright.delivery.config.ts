import { defineConfig } from "@playwright/test";
import { resolve } from "node:path";

const output = process.env.DELIVERY_BROWSER_OUTPUT;
if (!output || !process.env.DELIVERY_BROWSER_FIXTURE) throw new Error("Start with backend/scripts/verifyProductDeliveryBrowser.js and explicit test-branch authorization.");
export default defineConfig({
  testDir: "./e2e", testMatch: "delivery.spec.ts", fullyParallel: false, workers: 1, retries: 0,
  timeout: 60000, expect: { timeout: 15000 },
  outputDir: resolve(output, "artifacts"),
  reporter: [["list"], ["json", { outputFile: resolve(output, "results.json") }], ["html", { outputFolder: resolve(output, "html"), open: "never" }]],
  use: { baseURL: "http://127.0.0.1:5178", channel: "chrome", headless: true, viewport: { width: 1440, height: 1000 },
    screenshot: "only-on-failure", trace: "off", video: "off" },
});
