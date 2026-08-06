import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  testIgnore: ["**/frontend-ui.spec.ts"],
  timeout: 30_000,
  retries: 1,
  use: {
    // Ziel per Umgebung setzbar, damit derselbe Lauf lokal und in der CI
    // gegen unterschiedliche Umgebungen fahren kann (Audit-Befund A4).
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:80",
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
