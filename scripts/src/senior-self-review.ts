import { execSync, execFileSync } from "node:child_process";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "../..");

function run(cmd: string): string {
  try {
    return execSync(cmd, {
      cwd: ROOT,
      encoding: "utf-8",
      timeout: 15000,
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();
  } catch {
    return "";
  }
}

function getChangedFiles(): string[] {
  const staged = run(
    "git diff --name-only HEAD~1 HEAD 2>/dev/null || git diff --name-only --cached",
  );
  const unstaged = run("git diff --name-only");
  const all = [
    ...new Set([...staged.split("\n"), ...unstaged.split("\n")]),
  ].filter(
    (f) => f.trim().length > 0 && (f.endsWith(".ts") || f.endsWith(".tsx")),
  );
  return all;
}

function countImporters(filePath: string): { count: number; files: string[] } {
  const baseName =
    filePath
      .split("/")
      .pop()
      ?.replace(/\.(tsx?)$/, "") ?? "";
  if (!baseName) return { count: 0, files: [] };
  try {
    const result = execFileSync(
      "grep",
      [
        "-rl",
        "--include=*.ts",
        "--include=*.tsx",
        baseName,
        "artifacts/",
        "lib/",
        "scripts/src/",
      ],
      {
        cwd: ROOT,
        encoding: "utf-8",
        timeout: 8000,
        stdio: ["pipe", "pipe", "pipe"],
      },
    );
    const files = result
      .trim()
      .split("\n")
      .filter((f) => f.length > 0 && !f.endsWith(filePath.split("/").pop()!));
    return { count: files.length, files: files.slice(0, 5) };
  } catch {
    return { count: 0, files: [] };
  }
}

const changedFiles = getChangedFiles();

const divider = "─".repeat(60);

console.log(`\n${divider}`);
console.log("  SENIOR SELF-REVIEW CHECKLISTE (AGENTS.md R6)");
console.log(divider);

console.log("\n📁 Automatisch erkannte geänderte Dateien:\n");
if (changedFiles.length === 0) {
  console.log(
    "  (keine geänderten .ts/.tsx-Dateien erkannt — manuell auflisten)",
  );
} else {
  for (const f of changedFiles) {
    const { count, files } = countImporters(f);
    const importerInfo =
      count > 0
        ? ` → importiert von ${count} Datei(en): ${files.join(", ")}`
        : " → keine direkten Importer gefunden";
    console.log(`  • ${f}${importerInfo}`);
  }
}

console.log(`\n${divider}`);
console.log(
  "  FELDER ZUM AUSFÜLLEN (in der User-Antwort als Markdown-Block)\n",
);

const template = `## Senior Self-Review

### 1. Gelesene Dateien
<!-- Liste der gelesenen Dateien (Pfade) -->
-

### 2. Geänderte Dateien
<!-- Pfad + 1-Zeilen-Begründung pro Datei -->
-

### 3. Referenz-Suche
<!-- rg-Befehl + Ergebnis: was importiert/nutzt das Geänderte? -->
Befehl: \`rg "<Symbol>" artifacts/ lib/\`
Ergebnis:

### 4. Root-Cause-Beleg
<!-- Warum ist das die Ursache und nicht ein Symptom? -->


### 5. Empirische Verifikation
<!-- Welche Logs/Counts/E2E-Läufe belegen den Erfolg? -->


### 6. Floskel-Selbstkritik
<!-- Welche Hedging-Phrase hätte ein Skeptiker bemängelt? Wenn keine: "Keine Hedging-Phrase verwendet." -->
`;

console.log(template);

console.log(divider);
console.log("  ERINNERUNGEN\n");
console.log(
  "  R1 — Hast du ALLE betroffenen Dateien geprüft (nicht nur die offensichtlichen)?",
);
console.log("  R2 — Jede 'Es funktioniert'-Aussage nur nach Logs/E2E belegt?");
console.log("  R5 — openapi.yaml geändert? → Orval-Codegen laufen lassen.");
console.log(
  "       lib/db/src/schema/ geändert? → pnpm --filter @workspace/db push.",
);
console.log(
  "  R7 — Wurden Labels/Texte direkt in SSOT (registry.ts) geändert, nicht in Komponenten?",
);
console.log(`\n${divider}\n`);
