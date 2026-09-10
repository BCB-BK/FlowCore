/**
 * Wacht darüber, dass an einer Route das Rumpfschema IHRER Operation hängt.
 *
 * WAS DAMIT ABGEFANGEN WIRD: Am 10.09.2026 hing an
 * `POST /content/deletion-requests/{id}/review` das Schema fürs ANLEGEN einer
 * Löschanfrage — mit den Pflichtfeldern `nodeId` und `reason`. Die Oberfläche
 * sendet `{ decision }`. Jede Genehmigung endete mit 400 „Validierungsfehler",
 * für jeden Benutzer, seit die Prüfung eingebaut wurde.
 *
 * Es war der dritte Fall dieser Familie (`routen-rumpfpruefung.test.ts` nennt
 * die beiden früheren). Die vorhandenen Wächter fangen ihn nicht: Der eine
 * prüft, dass keine Rumpfprüfung an GET/DELETE hängt, der andere prüft
 * Schemata für sich allein. Keiner prüfte die ZUORDNUNG.
 *
 * DER BEZUG IST DIE `operationId`, NICHT DER SCHEMANAME IN DER SPEZIFIKATION.
 * Orval benennt das erzeugte Zod-Rumpfschema deterministisch nach der
 * operationId: `reviewDeletionRequest` → `ReviewDeletionRequestBody`. Der Name
 * des Spec-Schemas taugt nicht als Bezug, weil dort geteilte Komponenten stehen
 * dürfen — `PATCH /tags/{id}` verweist auf `CreateTag`, und das ist richtig so.
 *
 * GEPRÜFT WIRD NUR, WAS AUS `@workspace/api-zod` KOMMT. Definiert eine
 * Routendatei ihr Schema selbst (`DryRunBody`, `SearchBody` …), ist das bewusste
 * Handarbeit ohne Bezug zur Spezifikation und geht diesen Wächter nichts an.
 *
 * Der Test liest Quelltexte statt der laufenden App — so schlägt er auch bei
 * Routen an, die keine eigene Testabdeckung haben.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const hier = dirname(fileURLToPath(import.meta.url));
const WURZEL = join(hier, "..", "..", "..", "..");
const ROUTEN = join(hier, "..", "routes");
const SPEC = join(WURZEL, "lib/api-spec/openapi.yaml");
const ZOD = join(WURZEL, "lib/api-zod/src/generated/api.ts");

/** Parameternamen vereinheitlichen: die Route schreibt `:id`, die Spezifikation
 *  `{workingCopyId}` — gemeint ist dieselbe Stelle. */
function normal(pfad: string): string {
  return pfad.replace(/\{[^}]+\}/g, "{_}").replace(/\/+$/, "") || "/";
}

interface Bindung {
  datei: string;
  methode: string;
  pfad: string;
  schema: string;
}

function sammleBindungen(): Bindung[] {
  const index = readFileSync(join(ROUTEN, "index.ts"), "utf8");

  const dateiJeRouter = new Map<string, string>();
  for (const m of index.matchAll(
    /import\s*\{([^}]+)\}\s*from\s*"\.\/([^"]+)"/g,
  )) {
    for (const teil of m[1]!.split(",")) {
      const name = teil
        .trim()
        .split(/\s+as\s+/)
        .pop()!
        .trim();
      if (name) dateiJeRouter.set(name, `${m[2]}.ts`);
    }
  }

  const praefixJeDatei = new Map<string, string>();
  for (const m of index.matchAll(
    /router\.use\(\s*(?:"([^"]*)"\s*,\s*)?([A-Za-z0-9_]+Router)\s*\)/g,
  )) {
    const datei = dateiJeRouter.get(m[2]!);
    if (datei) praefixJeDatei.set(datei, m[1] ?? "");
  }

  const ergebnis: Bindung[] = [];
  for (const datei of readdirSync(ROUTEN).filter((d) => d.endsWith(".ts"))) {
    if (datei === "index.ts") continue;
    const praefix = praefixJeDatei.get(datei);
    if (praefix === undefined) continue;

    const quelle = readFileSync(join(ROUTEN, datei), "utf8");
    const routerVar = quelle.match(
      /(?:const|let)\s+(\w+)\s*(?::\s*\w+)?\s*=\s*Router\(\)/,
    );
    if (!routerVar) continue;

    const ausZod = new Set<string>();
    for (const im of quelle.matchAll(
      /import\s*\{([^}]+)\}\s*from\s*"@workspace\/api-zod"/g,
    )) {
      for (const teil of im[1]!.split(",")) {
        const name = teil
          .trim()
          .split(/\s+as\s+/)
          .pop()!
          .trim();
        if (name) ausZod.add(name);
      }
    }

    const re = new RegExp(
      `${routerVar[1]}\\.(post|put|patch)\\(\\s*\\n?\\s*"([^"]+)"([\\s\\S]{0,700}?)(?:async\\s*\\(|\\)\\s*;)`,
      "g",
    );
    for (const m of quelle.matchAll(re)) {
      const v = m[3]!.match(/validateBody\(\s*([A-Za-z0-9_]+)\s*\)/);
      if (!v) continue;
      if (!ausZod.has(v[1]!)) continue;
      ergebnis.push({
        datei,
        methode: m[1]!.toUpperCase(),
        pfad: normal(`${praefix}${m[2]}`.replace(/:(\w+)/g, "{$1}")),
        schema: v[1]!,
      });
    }
  }
  return ergebnis;
}

function operationIds(): Map<string, string> {
  const karte = new Map<string, string>();
  let pfad: string | null = null;
  let methode: string | null = null;
  for (const zeile of readFileSync(SPEC, "utf8").split("\n")) {
    let m: RegExpMatchArray | null;
    if ((m = zeile.match(/^ {2}(\/[^\s:]*):\s*$/))) {
      pfad = normal(m[1]!);
      methode = null;
      continue;
    }
    if (pfad && (m = zeile.match(/^ {4}(get|post|put|patch|delete):\s*$/))) {
      methode = m[1]!.toUpperCase();
      continue;
    }
    if (methode && (m = zeile.match(/^ {6}operationId:\s*(\S+)\s*$/))) {
      karte.set(`${methode} ${pfad}`, m[1]!);
      methode = null;
    }
  }
  return karte;
}

const bindungen = sammleBindungen();
const opIds = operationIds();
const zodNamen = new Set(
  [
    ...readFileSync(ZOD, "utf8").matchAll(
      /^export const ([A-Za-z0-9_]+) = zod\./gm,
    ),
  ].map((m) => m[1]!),
);

describe("Zuordnung von Rumpfschema und Route", () => {
  it("prüft an jeder Route das Schema ihrer eigenen Operation", () => {
    const verstoesse: string[] = [];
    for (const b of bindungen) {
      const op = opIds.get(`${b.methode} ${b.pfad}`);
      if (!op) continue; // eigener Fall, siehe naechster Test
      const erwartet = `${op.charAt(0).toUpperCase()}${op.slice(1)}Body`;
      if (!zodNamen.has(erwartet)) continue;
      if (b.schema !== erwartet) {
        verstoesse.push(
          `${b.methode} ${b.pfad} (${b.datei}): prüft ${b.schema}, ` +
            `erwartet ${erwartet} (operationId ${op})`,
        );
      }
    }
    expect(
      verstoesse,
      "Diese Routen prüfen gegen das Schema einer FREMDEN Operation:\n" +
        verstoesse.join("\n"),
    ).toEqual([]);
  });

  it("findet zu jeder Bindung eine Operation in der Spezifikation", () => {
    const ohne = bindungen
      .filter((b) => !opIds.get(`${b.methode} ${b.pfad}`))
      .map((b) => `${b.methode} ${b.pfad} (${b.datei})`);
    expect(
      ohne,
      "Diese Routen nutzen ein erzeugtes Schema, stehen aber nicht in der " +
        "Spezifikation — dann kann niemand pruefen, ob es das richtige ist:\n" +
        ohne.join("\n"),
    ).toEqual([]);
  });

  it("findet die Bindungen überhaupt (Schutz vor einem stillen Leerlauf)", () => {
    // Bei einer Umbenennung von `validateBody` oder einem Umbau der
    // Routendateien liefe der Test sonst gruen, ohne etwas zu pruefen.
    expect(bindungen.length).toBeGreaterThanOrEqual(10);
    expect(opIds.size).toBeGreaterThan(50);
    expect(zodNamen.size).toBeGreaterThan(50);
  });

  it("erkennt eine falsche Zuordnung überhaupt (Gegenprobe)", () => {
    // Der Fall vom 10.09.2026, kuenstlich nachgestellt: Wuerde an der
    // Review-Route das Anlege-Schema haengen, muesste der Wächter anschlagen.
    const op = opIds.get("POST /content/deletion-requests/{_}/review");
    expect(op, "Review-Operation nicht in der Spezifikation").toBe(
      "reviewDeletionRequest",
    );
    const erwartet = "ReviewDeletionRequestBody";
    expect(zodNamen.has(erwartet)).toBe(true);
    expect(erwartet).not.toBe("CreateDeletionRequestBody");
  });
});
