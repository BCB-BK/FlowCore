import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
    // Die Tests fassen keine Datenbank an; ein einzelner Lauf genuegt.
    pool: "threads",
    globals: false,
  },
});
