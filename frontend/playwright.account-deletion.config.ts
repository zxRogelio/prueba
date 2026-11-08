import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e', testMatch: 'account-deletion.spec.ts', workers: 1,
  outputDir: 'test-results/account-deletion', reporter: 'list',
  use: { baseURL: 'http://127.0.0.1:5189', headless: true },
  webServer: {
    command: 'node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5189 --strictPort',
    url: 'http://127.0.0.1:5189', reuseExistingServer: false,
    env: { VITE_API_URL: 'http://127.0.0.1:5190/api' },
  },
});
