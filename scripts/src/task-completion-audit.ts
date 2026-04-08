import {
  readFileSync,
  readdirSync,
  statSync,
  existsSync,
  writeFileSync,
  mkdirSync,
} from "node:fs";
import { join, resolve } from "node:path";
import { execSync, execFileSync } from "node:child_process";

const ROOT = resolve(import.meta.dirname, "../..");
const TASKS_DIR = join(ROOT, ".local/tasks");
const REGISTRY_PATH = join(ROOT, ".local/violations-registry.json");
const FAIL_THRESHOLD = 0.2;

interface SubCheck {
  name: string;
  passed: boolean;
  output: string;
}

interface AuditResult {
  timestamp: string;
  taskFile: string;
  taskTitle: string;
  termCoverage: { found: number; total: number; missing: string[] };
  subChecks: SubCheck[];
  totalViolations: number;
  violationRatio: number;
  passed: boolean;
}

interface ViolationsRegistry {
  runs: AuditResult[];
}

function findLatestTaskFile(): { path: string; title: string } | null {
  if (!existsSync(TASKS_DIR)) return null;

  const files = readdirSync(TASKS_DIR)
    .filter((f) => f.endsWith(".md"))
    .map((f) => ({
      name: f,
      path: join(TASKS_DIR, f),
      mtime: statSync(join(TASKS_DIR, f)).mtimeMs,
    }))
    .sort((a, b) => b.mtime - a.mtime);

  if (files.length === 0) return null;

  const content = readFileSync(files[0].path, "utf-8");
  const titleMatch = content.match(/^#\s+(.+)/m);
  return {
    path: files[0].name,
    title: titleMatch ? titleMatch[1].trim() : files[0].name,
  };
}

function extractKeyTerms(taskFile: string): string[] {
  const content = readFileSync(join(TASKS_DIR, taskFile), "utf-8");
  const terms: string[] = [];

  const lines = content.split("\n");
  for (const line of lines) {
    const backtickTerms = line.match(/`([^`]+)`/g);
    if (backtickTerms) {
      for (const t of backtickTerms) {
        const clean = t.replace(/`/g, "").trim();
        if (
          clean.length > 3 &&
          clean.length < 60 &&
          !clean.includes(" ") &&
          !clean.startsWith("pnpm") &&
          !clean.startsWith("npm") &&
          !clean.startsWith("#") &&
          !clean.includes("/") &&
          !clean.includes("=") &&
          !clean.endsWith(":") &&
          /^[a-zA-Z_]/.test(clean)
        ) {
          terms.push(clean);
        }
      }
    }
  }

  return [...new Set(terms)];
}

function checkTermInCodebase(term: string): boolean {
  try {
    const result = execFileSync(
      "grep",
      [
        "-rl",
        "--include=*.ts",
        "--include=*.tsx",
        term,
        "artifacts/",
        "lib/",
        "scripts/src/",
      ],
      {
        cwd: ROOT,
        encoding: "utf-8",
        timeout: 5000,
        stdio: ["pipe", "pipe", "pipe"],
      },
    );
    return result.trim().length > 0;
  } catch {
    return false;
  }
}

function runSubCheck(name: string, command: string): SubCheck {
  try {
    const output = execSync(command, {
      cwd: ROOT,
      encoding: "utf-8",
      timeout: 60000,
      stdio: ["pipe", "pipe", "pipe"],
    });
    return { name, passed: true, output: output.trim().slice(0, 500) };
  } catch (err: unknown) {
    const error = err as { stdout?: string; stderr?: string };
    const output = (error.stderr || error.stdout || "Failed").slice(0, 500);
    return { name, passed: false, output };
  }
}

function loadRegistry(): ViolationsRegistry {
  if (existsSync(REGISTRY_PATH)) {
    try {
      return JSON.parse(readFileSync(REGISTRY_PATH, "utf-8"));
    } catch {
      return { runs: [] };
    }
  }
  return { runs: [] };
}

function saveRegistry(registry: ViolationsRegistry): void {
  const dir = join(ROOT, ".local");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(REGISTRY_PATH, JSON.stringify(registry, null, 2));
}

const VALIDATOR_CHECKS: Array<{ name: string; script: string }> = [
  { name: "no-hardcode-check", script: "no-hardcode-check" },
  { name: "env-check", script: "env-check" },
  { name: "dead-import-check", script: "dead-import-check" },
  { name: "rootfix-audit", script: "rootfix-audit" },
  { name: "typecheck", script: "typecheck" },
];

const latestTask = findLatestTaskFile();
if (!latestTask) {
  console.log("No task files found in .local/tasks/. Skipping audit.");
  process.exit(0);
}

console.log("=== Task Completion Audit ===\n");
console.log(`Task: ${latestTask.title}`);
console.log(`File: ${latestTask.path}\n`);

const terms = extractKeyTerms(latestTask.path);
console.log(`Extracted ${terms.length} key term(s) to verify.\n`);

const missing: string[] = [];
let found = 0;

for (const term of terms) {
  if (checkTermInCodebase(term)) {
    found++;
  } else {
    missing.push(term);
  }
}

console.log(`Term coverage: ${found}/${terms.length}`);
if (missing.length > 0) {
  console.log(`Missing terms: ${missing.join(", ")}`);
}

console.log("\n--- Sub-Checks ---");

const subChecks: SubCheck[] = [];

for (const check of VALIDATOR_CHECKS) {
  subChecks.push(
    runSubCheck(
      check.name,
      `pnpm --filter @workspace/scripts run ${check.script}`,
    ),
  );
}

for (const check of subChecks) {
  const status = check.passed ? "PASS" : "FAIL";
  console.log(`  ${status}: ${check.name}`);
}

const failedChecks = subChecks.filter((c) => !c.passed).length;
const totalChecks = subChecks.length + 1;
const termCheckFailed =
  terms.length > 0 && found / terms.length < 0.5 ? 1 : 0;
const totalViolations = failedChecks + termCheckFailed;
const violationRatio = totalChecks > 0 ? totalViolations / totalChecks : 0;

const result: AuditResult = {
  timestamp: new Date().toISOString(),
  taskFile: latestTask.path,
  taskTitle: latestTask.title,
  termCoverage: { found, total: terms.length, missing },
  subChecks,
  totalViolations,
  violationRatio,
  passed: violationRatio <= FAIL_THRESHOLD,
};

const registry = loadRegistry();
registry.runs.push(result);
if (registry.runs.length > 50) {
  registry.runs = registry.runs.slice(-50);
}
saveRegistry(registry);

console.log(`\n--- Summary ---`);
console.log(
  `Violations: ${totalViolations}/${totalChecks}`,
);
console.log(
  `Ratio: ${(violationRatio * 100).toFixed(1)}% (threshold: ${FAIL_THRESHOLD * 100}%)`,
);
console.log(`Registry updated: ${REGISTRY_PATH}`);

if (!result.passed) {
  console.error(`\n✘ Audit FAILED — violation ratio exceeds threshold.`);
  process.exit(1);
} else {
  console.log(`\n✔ Audit PASSED.`);
}
