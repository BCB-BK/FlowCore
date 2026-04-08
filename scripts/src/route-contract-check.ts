import { readFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "../..");

const SPEC_PATH = join(ROOT, "lib/api-spec/openapi.yaml");
const ROUTES_DIR = join(ROOT, "artifacts/api-server/src/routes");
const INDEX_PATH = join(ROUTES_DIR, "index.ts");
const API_CLIENT_PATH = join(
  ROOT,
  "lib/api-client-react/src/generated/api.ts",
);

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

function extractClientPaths(): Map<string, Set<string>> {
  const clientPaths = new Map<string, Set<string>>();

  if (!existsSync(API_CLIENT_PATH)) {
    console.warn("WARNING: Generated API client not found at " + API_CLIENT_PATH);
    return clientPaths;
  }

  const content = readFileSync(API_CLIENT_PATH, "utf-8");

  const urlFnBlocks = content.split(/(?=export const get\w+Url\s*=)/);
  const urlPaths = new Map<string, string>();

  for (const block of urlFnBlocks) {
    const nameMatch = block.match(/^export const (get\w+Url)\s*=/);
    if (!nameMatch) continue;
    const fnName = nameMatch[1];

    const returnMatch = block.match(/return\s+`([^`]+)`/);
    if (!returnMatch) continue;

    let path = returnMatch[1]
      .replace(/\$\{[^}]+\}/g, "{_}")
      .replace(/\?.*$/, "");
    if (!path.startsWith("/")) path = "/" + path;
    path = path.replace(/\/api\//, "/");
    urlPaths.set(fnName, path);
  }

  const fnBlocks = content.split(/(?=export const \w+\s*=)/);
  for (const block of fnBlocks) {
    const fnNameMatch = block.match(/^export const (\w+)\s*=/);
    if (!fnNameMatch) continue;
    if (fnNameMatch[1].endsWith("Url")) continue;

    const methodMatch = block.match(/method:\s*["'](\w+)["']/);
    const urlFnMatch = block.match(/(get\w+Url)\s*\(/);

    if (urlFnMatch) {
      const urlFnName = urlFnMatch[1];
      const path = urlPaths.get(urlFnName);
      if (!path) continue;

      let method = "GET";
      if (methodMatch) {
        method = methodMatch[1].toUpperCase();
      }

      if (!clientPaths.has(path)) clientPaths.set(path, new Set());
      clientPaths.get(path)!.add(method);
    }
  }

  return clientPaths;
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
    // skip
  }
}

const clientPaths = extractClientPaths();

let missingImpl = 0;
let undocumented = 0;
let clientDrift = 0;

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

const normalizedClient = new Map<string, Set<string>>();
for (const [path, methods] of clientPaths) {
  const norm = normalizePath(path);
  if (!normalizedClient.has(norm)) normalizedClient.set(norm, new Set());
  for (const m of methods) normalizedClient.get(norm)!.add(m);
}

const clientDriftList: string[] = [];
for (const [normPath, methods] of normalizedClient) {
  for (const method of methods) {
    const specMethods = normalizedSpec.get(normPath);
    if (!specMethods || !specMethods.has(method)) {
      clientDriftList.push(`  ${method} ${normPath} (client has, spec missing)`);
      clientDrift++;
    }
  }
}

for (const [normPath, methods] of normalizedSpec) {
  for (const method of methods) {
    const clientMethods = normalizedClient.get(normPath);
    if (!clientMethods || !clientMethods.has(method)) {
      clientDriftList.push(`  ${method} ${normPath} (spec has, client missing)`);
      clientDrift++;
    }
  }
}

if (clientDriftList.length > 0) {
  console.log("\n--- API client drift (spec ↔ generated client) ---");
  for (const line of clientDriftList) {
    console.warn(line);
  }
} else {
  console.log("\n--- No API client drift ---");
}

const specCount = Array.from(specPaths.values()).reduce(
  (sum, s) => sum + s.size,
  0,
);
const implCount = Array.from(implPaths.values()).reduce(
  (sum, s) => sum + s.size,
  0,
);
const clientCount = Array.from(clientPaths.values()).reduce(
  (sum, s) => sum + s.size,
  0,
);

console.log(`\nSpec endpoints: ${specCount}`);
console.log(`Implemented routes: ${implCount}`);
console.log(`Client endpoints: ${clientCount}`);
console.log(`Missing implementations: ${missingImpl}`);
console.log(`Undocumented routes: ${undocumented}`);
console.log(`Client drift: ${clientDrift}`);

const totalIssues = missingImpl + undocumented + clientDrift;
if (totalIssues > 0) {
  console.error(`\n${totalIssues} route contract issue(s) found.`);
  process.exit(1);
} else {
  console.log("\n✔ All routes match across spec, backend, and client.");
}
