import {
  readFileSync,
  readdirSync,
  statSync,
  existsSync,
  writeFileSync,
} from "node:fs";
import { join, extname, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "../..");
const ENV_EXAMPLE_PATH = join(ROOT, ".env.example");

const EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx"]);
const IGNORE_DIRS = new Set([
  "node_modules",
  "dist",
  ".git",
  "generated",
  ".replit-artifact",
  ".local",
  "attached_assets",
  "e2e",
]);

const WELL_KNOWN_VARS = new Set([
  "NODE_ENV",
  "PORT",
  "BASE_PATH",
  "REPL_ID",
  "HOME",
  "PATH",
  "TZ",
  "TERM",
  "REPLIT_DEV_DOMAIN",
  "REPL_SLUG",
]);

function collectEnvRefs(dir: string): Map<string, string[]> {
  const refs = new Map<string, string[]>();

  function scan(d: string): void {
    for (const entry of readdirSync(d)) {
      if (IGNORE_DIRS.has(entry)) continue;
      const fullPath = join(d, entry);
      const stat = statSync(fullPath);
      if (stat.isDirectory()) {
        scan(fullPath);
      } else if (EXTENSIONS.has(extname(entry))) {
        const content = readFileSync(fullPath, "utf-8");
        const matches = content.matchAll(/process\.env\.([A-Z_][A-Z0-9_]*)/g);
        for (const m of matches) {
          const varName = m[1];
          if (WELL_KNOWN_VARS.has(varName)) continue;
          if (!refs.has(varName)) refs.set(varName, []);
          refs.get(varName)!.push(fullPath.replace(ROOT + "/", ""));
        }
      }
    }
  }

  scan(dir);
  return refs;
}

function loadEnvExample(): Set<string> {
  if (!existsSync(ENV_EXAMPLE_PATH)) {
    return new Set();
  }
  const content = readFileSync(ENV_EXAMPLE_PATH, "utf-8");
  const vars = new Set<string>();
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const match = trimmed.match(/^([A-Z_][A-Z0-9_]*)=/);
    if (match) vars.add(match[1]);
  }
  return vars;
}

function generateEnvExample(vars: Map<string, string[]>): void {
  const lines = [
    "# Auto-generated .env.example",
    "# Review and adjust default values before committing.",
    "",
  ];

  for (const varName of [...vars.keys()].sort()) {
    lines.push(`${varName}=`);
  }

  writeFileSync(ENV_EXAMPLE_PATH, lines.join("\n") + "\n");
  console.log(`Created ${ENV_EXAMPLE_PATH} with ${vars.size} variable(s).`);
  console.log("Please review the generated file and add default values.\n");
}

const scanDirs = ["artifacts", "lib", "scripts"].map((d) => join(ROOT, d));
const codeRefs = new Map<string, string[]>();

for (const dir of scanDirs) {
  try {
    const refs = collectEnvRefs(dir);
    for (const [key, files] of refs) {
      if (!codeRefs.has(key)) codeRefs.set(key, []);
      codeRefs.get(key)!.push(...files);
    }
  } catch {
    // skip
  }
}

console.log("=== Environment Variable Check ===\n");

if (!existsSync(ENV_EXAMPLE_PATH)) {
  console.warn("WARNING: .env.example does not exist — creating it now.\n");
  generateEnvExample(codeRefs);
  console.log("Variables included:");
  for (const [varName, files] of [...codeRefs.entries()].sort()) {
    console.log(`  ${varName}`);
    for (const f of [...new Set(files)]) {
      console.log(`    → ${f}`);
    }
  }
  console.error(
    `\nCreated .env.example with ${codeRefs.size} variable(s). Review and re-run.`,
  );
  process.exit(1);
}

const envExample = loadEnvExample();
let issues = 0;

console.log("--- Used in code but NOT in .env.example ---");
for (const [varName, files] of [...codeRefs.entries()].sort()) {
  if (!envExample.has(varName)) {
    console.error(`  UNDECLARED: ${varName}`);
    for (const f of [...new Set(files)]) {
      console.error(`    → ${f}`);
    }
    issues++;
  }
}

console.log("\n--- Declared in .env.example but NOT used in code ---");
for (const varName of [...envExample].sort()) {
  if (!codeRefs.has(varName)) {
    console.warn(`  UNUSED: ${varName}`);
    issues++;
  }
}

console.log(`\nDeclared: ${envExample.size}, Used: ${codeRefs.size}`);
console.log(`Issues: ${issues}`);

if (issues > 0) {
  console.error(`\n${issues} env variable issue(s) found.`);
  process.exit(1);
} else {
  console.log("\n✔ All environment variables are consistent.");
}
