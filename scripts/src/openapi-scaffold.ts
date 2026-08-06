// Traegt implementierte, aber undokumentierte Routen in die OpenAPI-Datei nach.
//
// Hintergrund (Audit-Befund B1): Die Spezifikation ist der Vertrag, aus dem
// Client und Schemata erzeugt werden. Sie deckte 162 von 265 Routen ab -- 103
// Endpunkte waren nicht Teil des Vertrags. Dieses Werkzeug erzeugt fuer jede
// fehlende Route einen vollstaendigen, aber bewusst grob typisierten Eintrag
// (Methode, Pfad, Pfadparameter, Tag) und markiert ihn als aus dem Code
// abgeleitet. Damit ist die Schnittstelle vollstaendig beschrieben und der
// Vertragspruefer kann als Gate laufen; die Verfeinerung der Schemata bleibt
// eine benannte, sichtbare Aufgabe statt einer stillen Luecke.
//
// Aufruf: pnpm --filter @workspace/scripts run openapi-scaffold [--dry-run]
import { readFileSync, writeFileSync } from "node:fs";
import {
  SPEC_PATH,
  extractSpecPaths,
  collectImplementedRoutes,
  normalizePath,
} from "./lib/route-inventory";

const DRY_RUN = process.argv.includes("--dry-run");

const METHOD_ORDER = ["get", "post", "put", "patch", "delete"];

/** Tag aus dem Dateinamen der Routendatei, z. B. graph-connector.ts. */
function tagForFile(sourceFile: string): string {
  return sourceFile.replace(/\.ts$/, "");
}

function pascal(segment: string): string {
  return segment
    .split(/[-_]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

/** Eindeutige, lesbare operationId aus Methode und Pfad. */
function operationId(method: string, path: string, taken: Set<string>): string {
  const parts = path.split("/").filter(Boolean);
  let name = method.toLowerCase();
  for (const part of parts) {
    const param = part.match(/^\{(.+)\}$/);
    name += param ? `By${pascal(param[1])}` : pascal(part);
  }
  let candidate = name;
  let n = 2;
  while (taken.has(candidate)) {
    candidate = `${name}${n++}`;
  }
  taken.add(candidate);
  return candidate;
}

/** Pfadparameter in der Reihenfolge ihres Auftretens. */
function pathParams(path: string): string[] {
  return [...path.matchAll(/\{([^}]+)\}/g)].map((m) => m[1]);
}

function buildOperation(
  method: string,
  path: string,
  tag: string,
  opId: string,
): string[] {
  const lines: string[] = [];
  const m = method.toLowerCase();
  lines.push(`    ${m}:`);
  lines.push(`      operationId: ${opId}`);
  lines.push(`      tags: [${tag}]`);
  lines.push(`      summary: ${method} ${path}`);
  lines.push(
    "      description: >-",
    "        Aus der Implementierung abgeleitet. Methode, Pfad und Pfadparameter",
    "        sind belegt; Anfrage- und Antwortschema sind noch nicht ausdetailliert",
    "        und beschreiben den Endpunkt daher nur grob.",
  );

  const params = pathParams(path);
  if (params.length > 0) {
    lines.push("      parameters:");
    for (const param of params) {
      lines.push(`        - name: ${param}`);
      lines.push("          in: path");
      lines.push("          required: true");
      lines.push("          schema:");
      lines.push("            type: string");
    }
  }

  if (["post", "put", "patch"].includes(m)) {
    lines.push("      requestBody:");
    lines.push("        required: false");
    lines.push("        content:");
    lines.push("          application/json:");
    lines.push("            schema:");
    lines.push("              type: object");
    lines.push("              additionalProperties: true");
  }

  lines.push("      responses:");
  if (m === "delete") {
    lines.push('        "204":');
    lines.push("          description: Deleted");
  }
  lines.push('        "200":');
  lines.push("          description: Success");
  lines.push("          content:");
  lines.push("            application/json:");
  lines.push("              schema:");
  lines.push("                type: object");
  lines.push("                additionalProperties: true");
  lines.push('        "401":');
  lines.push("          description: Not authenticated");
  lines.push('        "403":');
  lines.push("          description: Not authorised");

  return lines;
}

// --- Bestand ermitteln -----------------------------------------------------

const specPaths = extractSpecPaths();
const documented = new Map<string, Set<string>>();
for (const [path, methods] of specPaths) {
  const norm = normalizePath(path);
  if (!documented.has(norm)) documented.set(norm, new Set());
  for (const method of methods) documented.get(norm)!.add(method);
}

const missing = collectImplementedRoutes().filter((route) => {
  const methods = documented.get(normalizePath(route.path));
  return !methods || !methods.has(route.method);
});

console.log("=== OpenAPI-Nachtrag ===\n");

if (missing.length === 0) {
  console.log("Keine undokumentierten Routen -- nichts zu tun.");
  process.exit(0);
}

// Nach Pfad gruppieren, damit ein Pfad einen einzigen Eintrag bekommt.
const byPath = new Map<string, { method: string; tag: string }[]>();
for (const route of missing) {
  if (!byPath.has(route.path)) byPath.set(route.path, []);
  byPath.get(route.path)!.push({
    method: route.method,
    tag: tagForFile(route.sourceFile),
  });
}

const spec = readFileSync(SPEC_PATH, "utf-8");
const takenIds = new Set<string>(
  [...spec.matchAll(/^\s*operationId:\s*(\w+)/gm)].map((m) => m[1]),
);

const block: string[] = [
  "",
  "  # --- Aus der Implementierung nachgetragen (Audit-Befund B1) ---------------",
  "  # Diese Endpunkte waren implementiert, aber nicht Teil des Vertrags. Die",
  "  # Eintraege sind vollstaendig in Methode, Pfad und Pfadparametern, aber grob",
  "  # in den Schemata. Sie zu verfeinern ist offene Nacharbeit -- sichtbar hier,",
  "  # statt unsichtbar als Luecke.",
];

for (const path of [...byPath.keys()].sort()) {
  const entries = byPath
    .get(path)!
    .sort(
      (a, b) =>
        METHOD_ORDER.indexOf(a.method.toLowerCase()) -
        METHOD_ORDER.indexOf(b.method.toLowerCase()),
    );
  block.push("", `  ${path}:`);
  for (const entry of entries) {
    block.push(
      ...buildOperation(
        entry.method,
        path,
        entry.tag,
        operationId(entry.method, path, takenIds),
      ),
    );
  }
}

// Fehlende Tags oben ergaenzen, damit die Datei in sich stimmig bleibt.
const usedTags = new Set(missing.map((r) => tagForFile(r.sourceFile)));
const declaredTags = new Set(
  [...spec.matchAll(/^ {2}- name:\s*(\S+)/gm)].map((m) => m[1]),
);
const newTags = [...usedTags].filter((t) => !declaredTags.has(t)).sort();

// --- Einfuegen -------------------------------------------------------------

// Ende des paths-Abschnitts zeilenweise bestimmen: der naechste Schluessel auf
// oberster Ebene (components:, security:, ...). Nur so landet der Nachtrag
// wirklich am Ende des Abschnitts und nicht irgendwo dazwischen.
const specLines = spec.split("\n");
const pathsLine = specLines.findIndex((line) => /^paths:\s*$/.test(line));
if (pathsLine === -1) {
  console.error("Kein paths-Abschnitt in der Spezifikation gefunden.");
  process.exit(1);
}
let endLine = specLines.length;
for (let i = pathsLine + 1; i < specLines.length; i++) {
  if (/^[A-Za-z]/.test(specLines[i])) {
    endLine = i;
    break;
  }
}

// Leerzeilen am Ende des Abschnitts abschneiden, Nachtrag anhaengen.
let tail = endLine;
while (tail > pathsLine + 1 && specLines[tail - 1].trim() === "") tail--;

let updated = [
  ...specLines.slice(0, tail),
  ...block,
  "",
  ...specLines.slice(endLine),
].join("\n");

if (newTags.length > 0) {
  const tagLines = newTags
    .map((t) => `  - name: ${t}\n    description: ${t} operations`)
    .join("\n");
  updated = updated.replace(/^(tags:\n)/m, `$1${tagLines}\n`);
}

console.log(
  `Nachzutragen: ${missing.length} Route(n) auf ${byPath.size} Pfad(en).`,
);
if (newTags.length > 0) {
  console.log(`Neue Tags: ${newTags.join(", ")}`);
}

if (DRY_RUN) {
  console.log("\n--- Probelauf, nichts geschrieben ---");
  console.log(block.slice(0, 40).join("\n"));
  process.exit(0);
}

writeFileSync(SPEC_PATH, updated);
console.log(`\nGeschrieben: ${SPEC_PATH}`);
console.log(
  "Jetzt `pnpm --filter @workspace/api-spec run codegen` ausfuehren.",
);
