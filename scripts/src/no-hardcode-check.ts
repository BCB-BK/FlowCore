import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, extname, resolve, relative } from "node:path";

const ROOT = resolve(import.meta.dirname, "../..");

const EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx"]);
const IGNORE_DIRS = new Set([
  "node_modules",
  "dist",
  ".git",
  "generated",
  ".replit-artifact",
  ".local",
  "attached_assets",
]);

const ALLOWLIST: Array<{ file: RegExp; line: RegExp }> = [
  { file: /e2e\//, line: /.*/ },
  { file: /\.test\.ts/, line: /.*/ },
  { file: /\.spec\.ts/, line: /.*/ },
  { file: /seed.*\.ts$/, line: /.*/ },
  { file: /migrate-pilot/, line: /.*/ },
  { file: /import-.*\.ts$/, line: /.*/ },
  { file: /export-.*\.ts$/, line: /.*/ },
  { file: /cleanup-content/, line: /.*/ },
  { file: /no-hardcode-check\.ts$/, line: /.*/ },
  { file: /custom-fetch\.ts$/, line: /Bearer/ },
  { file: /vite\.config\.ts$/, line: /localhost/ },
  { file: /main\.tsx$/, line: /X-Dev-Principal-Id/ },
  { file: /orval\.config\.ts$/, line: /.*/ },
  { file: /notification\.service\.ts$/, line: /00000000-0000-0000-0000-000000000000/ },
  { file: /drizzle\.config\.ts$/, line: /.*/ },
  { file: /apply-triggers\.ts$/, line: /.*/ },
];

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
  {
    regex: /['"][0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}['"]/,
    description: "Hardcoded UUID (potential dev principal ID or secret)",
  },
  {
    regex: /['"]Bearer\s+[A-Za-z0-9._~+\/=-]{20,}['"]/,
    description: "Hardcoded Bearer token",
  },
  {
    regex: /['"]https?:\/\/[^'"]*\.(azurewebsites|sharepoint|graph\.microsoft)\.com[^'"]*['"]/,
    description: "Hardcoded Azure/SharePoint URL",
  },
  {
    regex: /X-Dev-Principal-Id.*['"][0-9a-f-]{36}['"]/,
    description: "Hardcoded dev principal ID in header",
  },
];

interface Violation {
  file: string;
  line: number;
  description: string;
  content: string;
}

const violations: Violation[] = [];

function isAllowlisted(filePath: string, lineContent: string): boolean {
  const rel = relative(ROOT, filePath);
  return ALLOWLIST.some(
    (entry) => entry.file.test(rel) && entry.line.test(lineContent),
  );
}

function scanFile(filePath: string): void {
  const content = readFileSync(filePath, "utf-8");
  const lines = content.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    const trimmed = line.trim();
    if (trimmed.startsWith("//") || trimmed.startsWith("*")) continue;

    for (const pattern of PATTERNS) {
      if (pattern.regex.test(line)) {
        if (isAllowlisted(filePath, line)) continue;
        const rel = relative(ROOT, filePath);
        violations.push({
          file: rel,
          line: i + 1,
          description: pattern.description,
          content: trimmed,
        });
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
    // skip
  }
}

if (violations.length > 0) {
  console.error("=== Hardcode Violations ===\n");
  for (const v of violations) {
    console.error(`VIOLATION: ${v.file}:${v.line} — ${v.description}`);
    console.error(`  ${v.content}\n`);
  }
  console.error(`\n${violations.length} hardcode violation(s) found.`);
  process.exit(1);
} else {
  console.log("✔ No hardcode violations found.");
}
