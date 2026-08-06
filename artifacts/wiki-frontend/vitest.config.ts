// Eigene Testkonfiguration: vite.config.ts verlangt PORT aus der Umgebung und
// ist damit fuer einen reinen Unit-Test-Lauf ungeeignet (Audit-Befund A5).
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const here = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  resolve: { alias: { "@": `${here}src` } },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
  },
});
