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

const IGNORE_FILES = new Set(["vite-env.d.ts", "env.d.ts"]);

interface DeadImport {
  file: string;
  line: number;
  symbol: string;
  statement: string;
}

const deadImports: DeadImport[] = [];

function checkFile(filePath: string): void {
  const content = readFileSync(filePath, "utf-8");
  const lines = content.split("\n");

  const importPattern =
    /^import\s+(?:type\s+)?(?:\{([^}]+)\}|(\w+)(?:\s*,\s*\{([^}]+)\})?)\s+from\s+['"][^'"]+['"]/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (!trimmed.startsWith("import ")) continue;
    if (trimmed.startsWith("import '") || trimmed.startsWith('import "'))
      continue;

    const match = trimmed.match(importPattern);
    if (!match) continue;

    const symbols: string[] = [];

    if (match[1]) {
      for (const part of match[1].split(",")) {
        const cleaned = part.trim().replace(/^type\s+/, "");
        const asMatch = cleaned.match(/\w+\s+as\s+(\w+)/);
        const sym = asMatch ? asMatch[1] : cleaned;
        if (sym && sym !== "") symbols.push(sym);
      }
    }

    if (match[2]) {
      symbols.push(match[2]);
    }

    if (match[3]) {
      for (const part of match[3].split(",")) {
        const cleaned = part.trim().replace(/^type\s+/, "");
        const asMatch = cleaned.match(/\w+\s+as\s+(\w+)/);
        const sym = asMatch ? asMatch[1] : cleaned;
        if (sym && sym !== "") symbols.push(sym);
      }
    }

    const afterImports = lines.slice(i + 1).join("\n");
    const beforeImport = lines.slice(0, i).join("\n");

    for (const sym of symbols) {
      if (!sym || sym === "type") continue;
      const usageRegex = new RegExp(`\\b${sym.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`);
      if (!usageRegex.test(afterImports) && !usageRegex.test(beforeImport)) {
        const rel = relative(ROOT, filePath);
        deadImports.push({
          file: rel,
          line: i + 1,
          symbol: sym,
          statement: trimmed.slice(0, 100),
        });
      }
    }
  }
}

function scanDir(dir: string): void {
  for (const entry of readdirSync(dir)) {
    if (IGNORE_DIRS.has(entry)) continue;
    if (IGNORE_FILES.has(entry)) continue;
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      scanDir(fullPath);
    } else if (EXTENSIONS.has(extname(entry))) {
      checkFile(fullPath);
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

if (deadImports.length > 0) {
  console.error("=== Dead Imports ===\n");
  for (const d of deadImports) {
    console.error(`DEAD: ${d.file}:${d.line} — "${d.symbol}"`);
    console.error(`  ${d.statement}\n`);
  }
  console.error(`\n${deadImports.length} dead import(s) found.`);
  process.exit(1);
} else {
  console.log("✔ No dead imports found.");
}
