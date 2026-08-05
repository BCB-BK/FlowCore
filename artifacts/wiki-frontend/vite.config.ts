import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import { execSync } from "node:child_process";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

/**
 * Build-Kennung: Commit-Kürzel und Commit-Datum werden zur Build-Zeit
 * eingebettet, damit in der laufenden App eindeutig erkennbar ist, welcher
 * Stand ausgeliefert wird (statt einer manuell gepflegten Versionsnummer).
 * Steht kein Git zur Verfügung (z.B. Deployment aus einem Export), wird auf
 * das Build-Datum zurückgefallen.
 */
function readBuildInfo(): { commit: string; date: string } {
  const git = (args: string) =>
    execSync(`git ${args}`, {
      cwd: import.meta.dirname,
      stdio: ["ignore", "pipe", "ignore"],
    })
      .toString()
      .trim();
  try {
    return { commit: git("rev-parse --short HEAD"), date: git("log -1 --format=%cI") };
  } catch {
    return { commit: "", date: new Date().toISOString() };
  }
}

const buildInfo = readBuildInfo();

const isBuild = process.env.NODE_ENV === "production" || process.argv.includes("build");

const rawPort = process.env.PORT;
const port = rawPort ? Number(rawPort) : 3000;

if (!isBuild) {
  if (!rawPort) {
    throw new Error(
      "PORT environment variable is required but was not provided.",
    );
  }
  if (Number.isNaN(port) || port <= 0) {
    throw new Error(`Invalid PORT value: "${rawPort}"`);
  }
}

const basePath = process.env.BASE_PATH ?? "/";

export default defineConfig({
  base: basePath,
  define: {
    __BUILD_COMMIT__: JSON.stringify(buildInfo.commit),
    __BUILD_DATE__: JSON.stringify(buildInfo.date),
  },
  plugins: [
    react(),
    tailwindcss(),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer({
              root: path.resolve(import.meta.dirname, ".."),
            }),
          ),
          await import("@replit/vite-plugin-dev-banner").then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@assets": path.resolve(
        import.meta.dirname,
        "..",
        "..",
        "attached_assets",
      ),
    },
    dedupe: ["react", "react-dom"],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
    proxy: {
      "/api": {
        // Der API-Server liest PORT (nicht API_PORT); API_PORT bleibt als
        // Fallback für bestehende lokale Setups erhalten.
        target: `http://localhost:${process.env.PORT || process.env.API_PORT || "8080"}`,
        changeOrigin: true,
      },
    },
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
  preview: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
  },
});
