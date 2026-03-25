import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  timeout: 30_000,
  retries: 1,
  use: {
    baseURL: "http://localhost:80",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "on-first-retry",
    extraHTTPHeaders: {
      "X-Dev-Principal-Id": "00000000-0000-0000-0000-000000000001",
    },
  },
  outputDir: "./test-results",
  reporter: [["list"], ["html", { outputFolder: "./playwright-report" }]],
});
