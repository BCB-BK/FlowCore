import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "../..");

const SPEC_PATH = join(ROOT, "lib/api-spec/openapi.yaml");
const ROUTES_DIR = join(ROOT, "artifacts/api-server/src/routes");
const INDEX_PATH = join(ROUTES_DIR, "index.ts");

function normalizePath(path: string): string {
  return path
    .replace(/\{[^}]+\}/g, "{_}")
    .replace(/\/+$/, "")
    .replace(/^$/, "/");
}

function extractSpecPaths(): Map<string, Set<string>> {
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

    const pathMatch = line.match(/^  (\/[^:]+):\s*$/);
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

interface MountInfo {
  importName: string;
  prefix: string;
  sourceFile: string | null;
}

function extractMounts(): MountInfo[] {
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

  const useLines = indexContent.split("\n");
  for (const line of useLines) {
    const withPath = line.match(
      /router\.use\(\s*["']([^"']+)["']\s*,\s*(\w+)/,
    );
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

function extractRoutesFromFile(
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
    let path = m[2];

    path = path.replace(/:(\w+)/g, "{$1}");

    const fullPath = mountPrefix + path;

    if (!routes.has(fullPath)) {
      routes.set(fullPath, new Set());
    }
    routes.get(fullPath)!.add(method);
  }

  return routes;
}

const specPaths = extractSpecPaths();
const mounts = extractMounts();
const implPaths = new Map<string, Set<string>>();

for (const mount of mounts) {
  if (!mount.sourceFile) continue;
  const filePath = join(ROUTES_DIR, mount.sourceFile);
  try {
    const fileRoutes = extractRoutesFromFile(filePath, mount.prefix);
    for (const [path, methods] of fileRoutes) {
      if (!implPaths.has(path)) implPaths.set(path, new Set());
      for (const method of methods) {
        implPaths.get(path)!.add(method);
      }
    }
  } catch {
    // file might not exist
  }
}

let missingImpl = 0;
let undocumented = 0;

const normalizedSpec = new Map<string, Set<string>>();
for (const [path, methods] of specPaths) {
  const norm = normalizePath(path);
  if (!normalizedSpec.has(norm)) normalizedSpec.set(norm, new Set());
  for (const m of methods) normalizedSpec.get(norm)!.add(m);
}

const normalizedImpl = new Map<string, Set<string>>();
for (const [path, methods] of implPaths) {
  const norm = normalizePath(path);
  if (!normalizedImpl.has(norm)) normalizedImpl.set(norm, new Set());
  for (const m of methods) normalizedImpl.get(norm)!.add(m);
}

console.log("=== Route Contract Check ===\n");

const missingImplList: string[] = [];
for (const [normPath, methods] of normalizedSpec) {
  for (const method of methods) {
    const implMethods = normalizedImpl.get(normPath);
    if (!implMethods || !implMethods.has(method)) {
      missingImplList.push(`  ${method} ${normPath}`);
      missingImpl++;
    }
  }
}

if (missingImplList.length > 0) {
  console.log("--- Missing implementations (in spec, not in code) ---");
  for (const line of missingImplList) {
    console.error(line);
  }
} else {
  console.log("--- No missing implementations ---");
}

const undocumentedList: string[] = [];
for (const [normPath, methods] of normalizedImpl) {
  for (const method of methods) {
    const specMethods = normalizedSpec.get(normPath);
    if (!specMethods || !specMethods.has(method)) {
      undocumentedList.push(`  ${method} ${normPath}`);
      undocumented++;
    }
  }
}

if (undocumentedList.length > 0) {
  console.log("\n--- Undocumented routes (in code, not in spec) ---");
  for (const line of undocumentedList) {
    console.warn(line);
  }
} else {
  console.log("\n--- No undocumented routes ---");
}

const specCount = Array.from(specPaths.values()).reduce(
  (sum, s) => sum + s.size,
  0,
);
const implCount = Array.from(implPaths.values()).reduce(
  (sum, s) => sum + s.size,
  0,
);

console.log(`\nSpec endpoints: ${specCount}`);
console.log(`Implemented routes: ${implCount}`);
console.log(`Missing implementations: ${missingImpl}`);
console.log(`Undocumented routes: ${undocumented}`);

if (missingImpl + undocumented > 0) {
  console.error(
    `\n${missingImpl + undocumented} route contract issue(s) found.`,
  );
  process.exit(1);
} else {
  console.log("\n✔ All routes match the OpenAPI spec.");
}
