import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import {
  ROOT,
  extractSpecPaths,
  collectImplementedPaths,
  normalizePath,
} from "./lib/route-inventory";

const API_CLIENT_PATH = join(ROOT, "lib/api-client-react/src/generated/api.ts");

function extractClientPaths(): Map<string, Set<string>> {
  const clientPaths = new Map<string, Set<string>>();

  if (!existsSync(API_CLIENT_PATH)) {
    console.warn(
      "WARNING: Generated API client not found at " + API_CLIENT_PATH,
    );
    return clientPaths;
  }

  const content = readFileSync(API_CLIENT_PATH, "utf-8");

  const urlFnBlocks = content.split(/(?=export const get\w+Url\s*=)/);
  const urlPaths = new Map<string, string>();

  for (const block of urlFnBlocks) {
    const nameMatch = block.match(/^export const (get\w+Url)\s*=/);
    if (!nameMatch) continue;
    const fnName = nameMatch[1];

    const backtickMatches = [...block.matchAll(/`([^`]+)`/g)];
    let basePath: string | null = null;
    for (const bm of backtickMatches) {
      const candidate = bm[1];
      if (candidate.startsWith("/api/") || candidate.startsWith("/")) {
        const cleaned = candidate
          .replace(/\$\{[^}]+\}/g, "{_}")
          .replace(/\?.*$/, "");
        if (!basePath || cleaned.length < basePath.length) {
          basePath = cleaned;
        }
      }
    }

    if (!basePath) continue;
    if (!basePath.startsWith("/")) basePath = "/" + basePath;
    basePath = basePath.replace(/^\/api/, "");
    urlPaths.set(fnName, basePath);
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
const implPaths = collectImplementedPaths();

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
      clientDriftList.push(
        `  ${method} ${normPath} (client has, spec missing)`,
      );
      clientDrift++;
    }
  }
}

for (const [normPath, methods] of normalizedSpec) {
  for (const method of methods) {
    const clientMethods = normalizedClient.get(normPath);
    if (!clientMethods || !clientMethods.has(method)) {
      clientDriftList.push(
        `  ${method} ${normPath} (spec has, client missing)`,
      );
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
