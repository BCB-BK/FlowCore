import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, extname, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "../..");

const EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx"]);
const IGNORE_DIRS = new Set([
  "node_modules",
  "dist",
  ".git",
  "generated",
  ".replit-artifact",
]);

const PATTERNS: Array<{ regex: RegExp; description: string }> = [
  { regex: /localhost:\d{4,5}/, description: "Hardcoded localhost port" },
  { regex: /['"]sk-[a-zA-Z0-9]{20,}['"]/, description: "Hardcoded API key" },
  {
    regex: /password\s*[:=]\s*['"][^'"]+['"]/,
    description: "Hardcoded password",
  },
  {
    regex: /['"]mongodb(\+srv)?:\/\/[^'"]+['"]/,
    description: "Hardcoded MongoDB URI",
  },
  {
    regex: /['"]postgres(ql)?:\/\/[^'"]+['"]/,
    description: "Hardcoded PostgreSQL URI",
  },
];

let violations = 0;

function scanFile(filePath: string): void {
  const content = readFileSync(filePath, "utf-8");
  const lines = content.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    if (line.trim().startsWith("//") || line.trim().startsWith("*")) continue;

    for (const pattern of PATTERNS) {
      if (pattern.regex.test(line)) {
        console.error(
          `VIOLATION: ${filePath}:${i + 1} — ${pattern.description}`,
        );
        console.error(`  ${line.trim()}`);
        violations++;
      }
    }
  }
}

function scanDir(dir: string): void {
  for (const entry of readdirSync(dir)) {
    if (IGNORE_DIRS.has(entry)) continue;
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      scanDir(fullPath);
    } else if (EXTENSIONS.has(extname(entry))) {
      scanFile(fullPath);
    }
  }
}

const rootDirs = ["artifacts", "lib", "scripts"].map((d) => join(ROOT, d));
for (const dir of rootDirs) {
  try {
    scanDir(dir);
  } catch {
    // directory may not exist
  }
}

if (violations > 0) {
  console.error(`\n${violations} hardcode violation(s) found.`);
  process.exit(1);
} else {
  console.log("No hardcode violations found.");
}
