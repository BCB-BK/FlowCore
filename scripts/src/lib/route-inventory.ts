// Gemeinsame Bestandsaufnahme von Spezifikation und implementierten Routen.
//
// Frueher lag diese Logik nur in route-contract-check.ts. Seit es daneben einen
// Generator gibt, der fehlende Routen in die Spezifikation nachtraegt, muessen
// beide zwingend dieselbe Sicht auf den Bestand haben -- sonst meldet der
// Pruefer Luecken, die der Generator gar nicht sieht (Audit-Befund B1).
import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

export const ROOT = resolve(import.meta.dirname, "../../..");
export const SPEC_PATH = join(ROOT, "lib/api-spec/openapi.yaml");
export const ROUTES_DIR = join(ROOT, "artifacts/api-server/src/routes");
export const INDEX_PATH = join(ROUTES_DIR, "index.ts");

/** Pfadparameter vereinheitlichen, damit /x/{id} und /x/{nodeId} vergleichbar sind. */
export function normalizePath(path: string): string {
  return path
    .replace(/\{[^}]+\}/g, "{_}")
    .replace(/\/+$/, "")
    .replace(/^$/, "/");
}

/** Pfade und Methoden aus der OpenAPI-Datei lesen (bewusst ohne YAML-Parser). */
export function extractSpecPaths(): Map<string, Set<string>> {
  const content = readFileSync(SPEC_PATH, "utf-8");
  const paths = new Map<string, Set<string>>();
  const lines = content.split("\n");

  let currentPath: string | null = null;
  let inPaths = false;

  for (const line of lines) {
    if (/^paths:\s*$/.test(line)) {
      inPaths = true;
      continue;
    }
    if (inPaths && /^\S/.test(line) && !/^paths:/.test(line)) {
      inPaths = false;
      continue;
    }
    if (!inPaths) continue;

    const pathMatch = line.match(/^ {2}(\/[^:]+):\s*$/);
    if (pathMatch) {
      currentPath = pathMatch[1];
      if (!paths.has(currentPath)) {
        paths.set(currentPath, new Set());
      }
      continue;
    }

    if (currentPath) {
      const methodMatch = line.match(/^\s{4}(get|post|put|patch|delete):\s*$/);
      if (methodMatch) {
        paths.get(currentPath)!.add(methodMatch[1].toUpperCase());
      }
    }
  }

  return paths;
}

export interface MountInfo {
  importName: string;
  prefix: string;
  sourceFile: string | null;
}

/** Aus routes/index.ts ablesen, unter welchem Praefix welche Datei haengt. */
export function extractMounts(): MountInfo[] {
  const indexContent = readFileSync(INDEX_PATH, "utf-8");
  const mounts: MountInfo[] = [];

  const importMap = new Map<string, string>();
  const importRegex =
    /import\s+(?:\{?\s*(\w+)\s*\}?|(\w+))\s+from\s+["']\.\/([^"']+)["']/g;
  let im;
  while ((im = importRegex.exec(indexContent))) {
    const name = im[1] || im[2];
    const file = im[3].replace(/\.ts$/, "") + ".ts";
    importMap.set(name, file);
  }

  for (const line of indexContent.split("\n")) {
    const withPath = line.match(/router\.use\(\s*["']([^"']+)["']\s*,\s*(\w+)/);
    if (withPath) {
      const name = withPath[2];
      mounts.push({
        importName: name,
        prefix: withPath[1],
        sourceFile: importMap.get(name) || null,
      });
      continue;
    }

    const withoutPath = line.match(/router\.use\(\s*(\w+)\s*\)/);
    if (withoutPath) {
      const name = withoutPath[1];
      mounts.push({
        importName: name,
        prefix: "",
        sourceFile: importMap.get(name) || null,
      });
    }
  }

  return mounts;
}

/** Alle router.get/post/... einer Routendatei mit Mount-Praefix aufloesen. */
export function extractRoutesFromFile(
  filePath: string,
  mountPrefix: string,
): Map<string, Set<string>> {
  const content = readFileSync(filePath, "utf-8");
  const routes = new Map<string, Set<string>>();

  const routerVarMatch = content.match(
    /(?:const|let)\s+(\w+)\s*(?::\s*\w+)?\s*=\s*Router\(\)/,
  );
  if (!routerVarMatch) return routes;
  const routerVar = routerVarMatch[1];

  const routeRegex = new RegExp(
    `${routerVar}\\.(get|post|put|patch|delete)\\(\\s*["']([^"']+)["']`,
    "g",
  );

  let m;
  while ((m = routeRegex.exec(content))) {
    const method = m[1].toUpperCase();
    const path = m[2].replace(/:(\w+)/g, "{$1}");
    const fullPath = mountPrefix + path;

    if (!routes.has(fullPath)) {
      routes.set(fullPath, new Set());
    }
    routes.get(fullPath)!.add(method);
  }

  return routes;
}

export interface ImplementedRoute {
  /** Pfad mit echten Parameternamen, z. B. /admin/workflows/{id} */
  path: string;
  method: string;
  /** Routendatei, aus der die Route stammt -- Grundlage fuer den Tag. */
  sourceFile: string;
}

/**
 * Vollstaendiger Bestand der implementierten Routen, inklusive Herkunft.
 * Die Herkunft braucht der Generator, um sinnvolle Tags zu vergeben.
 */
export function collectImplementedRoutes(): ImplementedRoute[] {
  const known = new Set(readdirSync(ROUTES_DIR));
  const result: ImplementedRoute[] = [];
  const seen = new Set<string>();

  for (const mount of extractMounts()) {
    if (!mount.sourceFile || !known.has(mount.sourceFile)) continue;
    let fileRoutes: Map<string, Set<string>>;
    try {
      fileRoutes = extractRoutesFromFile(
        join(ROUTES_DIR, mount.sourceFile),
        mount.prefix,
      );
    } catch {
      continue;
    }
    for (const [path, methods] of fileRoutes) {
      for (const method of methods) {
        const key = `${method} ${normalizePath(path)}`;
        if (seen.has(key)) continue;
        seen.add(key);
        result.push({ path, method, sourceFile: mount.sourceFile });
      }
    }
  }

  return result;
}

/** Implementierte Routen als Pfad→Methoden-Karte (Form des Vertragspruefers). */
export function collectImplementedPaths(): Map<string, Set<string>> {
  const implPaths = new Map<string, Set<string>>();
  for (const mount of extractMounts()) {
    if (!mount.sourceFile) continue;
    try {
      const fileRoutes = extractRoutesFromFile(
        join(ROUTES_DIR, mount.sourceFile),
        mount.prefix,
      );
      for (const [path, methods] of fileRoutes) {
        if (!implPaths.has(path)) implPaths.set(path, new Set());
        for (const method of methods) implPaths.get(path)!.add(method);
      }
    } catch {
      // Datei nicht lesbar -- der Vertragspruefer meldet die Luecke ohnehin.
    }
  }
  return implPaths;
}
