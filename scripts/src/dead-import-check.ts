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

interface ParsedImport {
  lineStart: number;
  lineEnd: number;
  symbols: string[];
  fullStatement: string;
}

function parseImports(content: string): ParsedImport[] {
  const lines = content.split("\n");
  const imports: ParsedImport[] = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed.startsWith("import ")) {
      i++;
      continue;
    }

    if (trimmed.startsWith("import '") || trimmed.startsWith('import "')) {
      i++;
      continue;
    }

    let fullStatement = trimmed;
    let lineEnd = i;

    while (!fullStatement.includes(" from ") && lineEnd < lines.length - 1) {
      lineEnd++;
      fullStatement += " " + lines[lineEnd].trim();
    }

    const symbols: string[] = [];

    const namespaceMatch = fullStatement.match(
      /import\s+\*\s+as\s+(\w+)\s+from/,
    );
    if (namespaceMatch) {
      symbols.push(namespaceMatch[1]);
    }

    const namedMatch = fullStatement.match(
      /import\s+(?:type\s+)?(?:\{([^}]+)\}|(\w+)(?:\s*,\s*\{([^}]+)\})?)\s+from/,
    );
    if (namedMatch && !namespaceMatch) {
      if (namedMatch[1]) {
        for (const part of namedMatch[1].split(",")) {
          const cleaned = part.trim().replace(/^type\s+/, "");
          if (!cleaned) continue;
          const asMatch = cleaned.match(/\w+\s+as\s+(\w+)/);
          const sym = asMatch ? asMatch[1] : cleaned;
          if (sym && sym !== "" && sym !== "type") symbols.push(sym);
        }
      }
      if (namedMatch[2]) {
        symbols.push(namedMatch[2]);
      }
      if (namedMatch[3]) {
        for (const part of namedMatch[3].split(",")) {
          const cleaned = part.trim().replace(/^type\s+/, "");
          if (!cleaned) continue;
          const asMatch = cleaned.match(/\w+\s+as\s+(\w+)/);
          const sym = asMatch ? asMatch[1] : cleaned;
          if (sym && sym !== "" && sym !== "type") symbols.push(sym);
        }
      }
    }

    if (symbols.length > 0) {
      imports.push({
        lineStart: i,
        lineEnd,
        symbols,
        fullStatement: fullStatement.slice(0, 120),
      });
    }

    i = lineEnd + 1;
  }

  return imports;
}

function checkFile(filePath: string): void {
  const content = readFileSync(filePath, "utf-8");
  const lines = content.split("\n");
  const imports = parseImports(content);

  for (const imp of imports) {
    const afterImports = lines.slice(imp.lineEnd + 1).join("\n");
    const beforeImport = lines.slice(0, imp.lineStart).join("\n");

    for (const sym of imp.symbols) {
      const usageRegex = new RegExp(
        `\\b${sym.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`,
      );
      if (!usageRegex.test(afterImports) && !usageRegex.test(beforeImport)) {
        const rel = relative(ROOT, filePath);
        deadImports.push({
          file: rel,
          line: imp.lineStart + 1,
          symbol: sym,
          statement: imp.fullStatement,
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
    // skip
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
