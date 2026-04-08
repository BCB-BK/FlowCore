import { execSync } from "node:child_process";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "../..");

const ANTIPATTERNS: Array<{
  regex: RegExp;
  description: string;
  severity: "warn" | "error";
  excludeFiles?: RegExp[];
}> = [
  {
    regex: /catch\s*\(\s*\w*\s*\)\s*\{\s*\}/,
    description: "Empty catch block",
    severity: "error",
  },
  {
    regex: /catch\s*\{\s*\}/,
    description: "Empty catch block (no param)",
    severity: "error",
  },
  {
    regex: /db\.(update|insert|delete)\s*\(/,
    description: "Direct db write without transaction wrapper",
    severity: "warn",
    excludeFiles: [/\.test\./, /\.spec\./, /seed/, /migrate/, /import-/],
  },
  {
    regex: /\/\/\s*@ts-ignore/,
    description: "@ts-ignore suppression",
    severity: "warn",
  },
  {
    regex: /\/\/\s*@ts-expect-error/,
    description: "@ts-expect-error suppression",
    severity: "warn",
  },
  {
    regex: /as\s+any\b/,
    description: "Unsafe 'as any' type assertion",
    severity: "warn",
  },
  {
    regex: /console\.log\s*\(/,
    description: "console.log in production code",
    severity: "warn",
    excludeFiles: [/scripts\//, /\.test\./, /\.spec\./, /seed/, /logger/],
  },
  {
    regex: /setTimeout\s*\(/,
    description: "setTimeout usage (potential async anti-pattern)",
    severity: "warn",
    excludeFiles: [/\.test\./, /\.spec\./],
  },
  {
    regex: /setInterval\s*\(/,
    description: "setInterval usage (potential async anti-pattern)",
    severity: "warn",
    excludeFiles: [/\.test\./, /\.spec\./],
  },
];

const IGNORE_FILES = [
  /node_modules/,
  /\.git\//,
  /dist\//,
  /generated\//,
  /\.local\//,
  /e2e\//,
  /scripts\/src\/rootfix-audit\.ts/,
  /scripts\/src\/no-hardcode-check\.ts/,
  /\.test\./,
  /\.spec\./,
];

interface Finding {
  file: string;
  line: number;
  description: string;
  severity: "warn" | "error";
  content: string;
}

function getDiff(): string {
  try {
    return execSync("git diff HEAD~1 --unified=0 -- '*.ts' '*.tsx'", {
      cwd: ROOT,
      encoding: "utf-8",
      maxBuffer: 10 * 1024 * 1024,
    });
  } catch {
    try {
      return execSync("git diff HEAD --unified=0 -- '*.ts' '*.tsx'", {
        cwd: ROOT,
        encoding: "utf-8",
        maxBuffer: 10 * 1024 * 1024,
      });
    } catch {
      return "";
    }
  }
}

function parseDiff(diff: string): Finding[] {
  const findings: Finding[] = [];
  if (!diff.trim()) return findings;

  const lines = diff.split("\n");
  let currentFile = "";
  let currentLine = 0;

  for (const line of lines) {
    const fileMatch = line.match(/^\+\+\+ b\/(.+)/);
    if (fileMatch) {
      currentFile = fileMatch[1];
      continue;
    }

    const hunkMatch = line.match(/^@@ -\d+(?:,\d+)? \+(\d+)/);
    if (hunkMatch) {
      currentLine = parseInt(hunkMatch[1], 10);
      continue;
    }

    if (!line.startsWith("+") || line.startsWith("+++")) continue;

    const addedLine = line.slice(1);
    currentLine++;

    if (IGNORE_FILES.some((r) => r.test(currentFile))) continue;

    for (const pattern of ANTIPATTERNS) {
      if (pattern.regex.test(addedLine)) {
        if (
          pattern.excludeFiles &&
          pattern.excludeFiles.some((r) => r.test(currentFile))
        ) {
          continue;
        }
        findings.push({
          file: currentFile,
          line: currentLine - 1,
          description: pattern.description,
          severity: pattern.severity,
          content: addedLine.trim(),
        });
      }
    }
  }

  return findings;
}

const diff = getDiff();

if (!diff.trim()) {
  console.log("✔ No recent changes to audit (no diff found).");
  process.exit(0);
}

const findings = parseDiff(diff);

const errors = findings.filter((f) => f.severity === "error");
const warnings = findings.filter((f) => f.severity === "warn");

console.log("=== Root-Fix Audit (git diff HEAD~1) ===\n");

if (findings.length === 0) {
  console.log("✔ No anti-patterns found in recent changes.");
  process.exit(0);
}

if (errors.length > 0) {
  console.error("--- Errors ---");
  for (const f of errors) {
    console.error(`ERROR: ${f.file}:${f.line} — ${f.description}`);
    console.error(`  ${f.content}\n`);
  }
}

if (warnings.length > 0) {
  console.warn("\n--- Warnings ---");
  for (const f of warnings) {
    console.warn(`WARN: ${f.file}:${f.line} — ${f.description}`);
    console.warn(`  ${f.content}\n`);
  }
}

console.log(`\nErrors: ${errors.length}, Warnings: ${warnings.length}`);

if (errors.length > 0) {
  console.error(`\n${errors.length} error(s) found — audit FAILED.`);
  process.exit(1);
} else {
  console.log("\n✔ Audit passed (warnings only).");
}
