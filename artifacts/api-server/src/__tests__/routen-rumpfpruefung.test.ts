/**
 * Wacht darüber, dass die Rumpfprüfung nur an schreibenden Routen hängt.
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
 * Der Test prüft die Quelltexte statt der laufenden App — so schlägt er auch
 * dann an, wenn die betroffene Route keine eigene Testabdeckung hat.
 */
import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const routenVerzeichnis = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "routes",
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
