/**
 * Wacht darüber, dass die Rumpfprüfung nur dort hängt, wo sie erfüllbar ist.
 *
 * Hintergrund: `validateBody` prüft `req.body` gegen ein Zod-Schema. Eine
 * GET- oder DELETE-Anfrage führt keinen Rumpf mit — `req.body` ist dort leer
 * oder undefiniert. Hängt die Prüfung trotzdem an einer solchen Route und
 * verlangt ihr Schema ein Pflichtfeld, antwortet die Route **immer** mit 400,
 * für jeden Aufruf und jeden Benutzer.
 *
 * Genau das passierte mit `GET /nodes/:id/revisions`: dort landete das Schema
 * `CreateRevisionBody` (Pflichtfeld `title`) der abgeschalteten POST-Route.
 * Die Revisionsliste kam nie beim Browser an. Folge: Cluster-Zuordnungen
 * wurden nicht mehr angezeigt, Seiteninhalte blieben leer und die
 * Einreichen-Ansicht fand keine Vorversion zum Vergleich.
 *
 * Dieselbe Familie traf danach `POST /media/upload`: dort verlangte das
 * generierte `UploadMediaBody` das Feld `file` als `File`-Instanz. Das
 * beschreibt, was der Browser absendet — auf dem Server nimmt busboy den
 * Datei-Teil aber aus dem Rumpf heraus, `req.body` trägt nur die Textfelder.
 * Die Prüfung war unerfüllbar, jeder Bild-Upload endete mit 400.
 *
 * Der Test prüft die Quelltexte statt der laufenden App — so schlägt er auch
 * dann an, wenn die betroffene Route keine eigene Testabdeckung hat.
 */
import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const hier = dirname(fileURLToPath(import.meta.url));
const routenVerzeichnis = join(hier, "..", "routes");
/** Die von Orval erzeugten Zod-Schemas (SSOT: openapi.yaml). */
const generierteSchemas = join(
  hier,
  "..",
  "..",
  "..",
  "..",
  "lib",
  "api-zod",
  "src",
  "generated",
  "api.ts",
);

/** Methoden, die per HTTP keinen Anfrage-Rumpf tragen. */
const OHNE_RUMPF = ["get", "delete"];

interface Fund {
  datei: string;
  methode: string;
  pfad: string;
}

function routenMitRumpfpruefung(): Fund[] {
  const funde: Fund[] = [];
  for (const datei of readdirSync(routenVerzeichnis).filter((d) =>
    d.endsWith(".ts"),
  )) {
    const quelle = readFileSync(join(routenVerzeichnis, datei), "utf-8");
    const registrierung =
      /router\d*\.(get|post|put|patch|delete)\(\s*"([^"]*)"/g;
    let treffer: RegExpExecArray | null;
    const stellen: { methode: string; pfad: string; start: number }[] = [];
    while ((treffer = registrierung.exec(quelle)) !== null) {
      stellen.push({
        methode: treffer[1],
        pfad: treffer[2],
        start: treffer.index,
      });
    }
    stellen.forEach((stelle, i) => {
      const ende =
        i + 1 < stellen.length ? stellen[i + 1].start : quelle.length;
      const block = quelle.slice(stelle.start, ende);
      if (
        OHNE_RUMPF.includes(stelle.methode) &&
        block.includes("validateBody(")
      ) {
        funde.push({
          datei,
          methode: stelle.methode.toUpperCase(),
          pfad: stelle.pfad,
        });
      }
    });
  }
  return funde;
}

/**
 * Namen der generierten Schemas, die eine Datei-Instanz verlangen.
 *
 * Solche Schemas beschreiben das Browser-Formular. Serverseitig kann `req.body`
 * sie nie erfüllen, weil der Multipart-Parser den Datei-Teil vorher herausnimmt.
 */
function schemasMitDateifeld(): Set<string> {
  const quelle = readFileSync(generierteSchemas, "utf-8");
  const namen = new Set<string>();
  const definition =
    /export const (\w+) = zod\s*\.object\(\{([\s\S]*?)\n\}\);/g;
  let treffer: RegExpExecArray | null;
  while ((treffer = definition.exec(quelle)) !== null) {
    if (/instanceof\(\s*File\s*\)/.test(treffer[2])) namen.add(treffer[1]);
  }
  return namen;
}

/** Alle `validateBody(X)`-Aufrufe je Routendatei, mit Schemanamen X. */
function gepruefteSchemas(): { datei: string; schema: string }[] {
  const treffer: { datei: string; schema: string }[] = [];
  for (const datei of readdirSync(routenVerzeichnis).filter((d) =>
    d.endsWith(".ts"),
  )) {
    const quelle = readFileSync(join(routenVerzeichnis, datei), "utf-8");
    const aufruf = /validateBody\(\s*(\w+)\s*\)/g;
    let stelle: RegExpExecArray | null;
    while ((stelle = aufruf.exec(quelle)) !== null) {
      treffer.push({ datei, schema: stelle[1] });
    }
  }
  return treffer;
}

describe("Rumpfprüfung an den Routen", () => {
  it("hängt an keiner GET- oder DELETE-Route", () => {
    const funde = routenMitRumpfpruefung();
    const beschreibung = funde
      .map((f) => `${f.datei}: ${f.methode} ${f.pfad}`)
      .join("\n");
    expect(
      funde,
      `Diese Routen tragen keinen Anfrage-Rumpf, prüfen aber einen:\n${beschreibung}`,
    ).toEqual([]);
  });

  it("verlangt an keiner Route ein Datei-Feld im Rumpf", () => {
    const mitDatei = schemasMitDateifeld();
    const funde = gepruefteSchemas().filter((t) => mitDatei.has(t.schema));
    const beschreibung = funde
      .map(
        (f) =>
          `${f.datei}: validateBody(${f.schema}) — ${f.schema} verlangt eine File-Instanz, die serverseitig nie in req.body steht`,
      )
      .join("\n");
    expect(
      funde,
      `Diese Prüfungen sind unerfüllbar und lassen die Route immer mit 400 antworten:\n${beschreibung}`,
    ).toEqual([]);
  });

  it("erkennt Datei-Schemas überhaupt (Schutz vor einem stillen Leerlauf des Tests)", () => {
    // Fällt die Erkennung aus — etwa weil Orval seine Ausgabe umformatiert —,
    // wäre der Test oben stillschweigend grün, ohne noch etwas zu bewachen.
    expect(schemasMitDateifeld().size).toBeGreaterThan(0);
  });

  it("findet die Routen überhaupt (Schutz vor einem stillen Leerlauf des Tests)", () => {
    const dateien = readdirSync(routenVerzeichnis).filter((d) =>
      d.endsWith(".ts"),
    );
    const mitValidate = dateien.filter((d) =>
      readFileSync(join(routenVerzeichnis, d), "utf-8").includes(
        "validateBody(",
      ),
    );
    expect(dateien.length).toBeGreaterThan(5);
    expect(mitValidate.length).toBeGreaterThan(0);
  });
});
