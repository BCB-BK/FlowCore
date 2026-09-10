/**
 * Einmaliger Import des OneCampus-Markensystems nach FlowCore.
 *
 * WARUM ÜBER DIE DIENSTE UND NICHT PER SQL: `POST /content/nodes/:id/revisions`
 * und `POST /content/revisions/:id/publish` sind bewusst abgeschaltet
 * (`routes/content.ts`); der Arbeitskopie-Weg ist der einzige unterstützte
 * Schreibpfad. Nur über ihn laufen Audit-Ereignisse, die Vorbelegung der
 * Vertraulichkeit, `syncInlineWikiLinks` und die Publikationsprüfung. Die
 * älteren Importskripte unter `scripts/src/` umgehen das mit direktem SQL und
 * verdoppeln dabei sogar die Display-Code-Vergabe — dieser Weg wird hier nicht
 * wiederholt.
 *
 * VERÖFFENTLICHUNG OHNE ZWEITE PERSON: Für `brand_profile`, `policy` und
 * `doc_registry` ist kein Workflow zugeordnet, und die Standardvorlage ist
 * inaktiv. `isWorkflowActiveForPageType` liefert damit false, und
 * `submitWorkingCopy` veröffentlicht selbst (`autoPublishWorkingCopy`). Es wird
 * nichts abgeschaltet und kein `setup_mode` gesetzt.
 *
 * VERLUSTSICHERUNG — das Skript bricht ab, statt still etwas fallen zu lassen:
 *   - ein zugeordnetes Kapitel fehlt im Dokument
 *   - eine zugeordnete Plattformzeile fehlt
 *   - eine Plattformzeile ist KEINEM Abschnitt zugeordnet
 *   - ein zugeordnetes Kapitel enthält eine Tabelle (Abschnittsfelder können
 *     keine Tabellen — `RichSectionEditor` lädt kein Tabellenmodul)
 *
 * AUFRUF
 *   tsx src/scripts/import-markensystem.ts --quelle <verz> --ziel <uuid> \
 *       --actor <principal-uuid> [--dry-run]
 */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import MarkdownIt from "markdown-it";
import { eq, and } from "drizzle-orm";
import { db } from "@workspace/db";
import { contentNodesTable } from "@workspace/db/schema";
import { htmlToTiptapJson } from "@workspace/shared/rich-text";
import { createContentNode } from "../services/identity.service";
import {
  createWorkingCopy,
  updateWorkingCopy,
  submitWorkingCopy,
} from "../services/working-copy.service";
import { BAUPLAN, type Seitenbauplan } from "./markensystem-plan";

const md = new MarkdownIt({ html: false, linkify: false, typographer: false });

// ---------------------------------------------------------------------------
// Dokument lesen
// ---------------------------------------------------------------------------

interface Kapitel {
  /** Überschrift ohne führende Nummerierung. */
  titel: string;
  /** Markdown-Rumpf ohne die Überschriftenzeile. */
  roh: string;
}

interface Dokument {
  /** H1-Zeile. */
  titel: string;
  /** Kopftabelle »Dokumentdaten«: Beschriftung → Wert. */
  dokumentdaten: Map<string, string>;
  /** Rohtext der Kopftabelle, für den Anhang im Inhaltsbereich. */
  dokumentdatenRoh: string;
  kapitel: Kapitel[];
}

/** Führende Nummerierung entfernen: »## 3. Haltung: …" → »Haltung: …". */
function ohneNummer(ueberschrift: string): string {
  return ueberschrift.replace(/^\d+\.\s*/, "").trim();
}

function enthaeltTabelle(markdown: string): boolean {
  return /^\s*\|/m.test(markdown);
}

/** Zweispaltige Markdown-Tabelle als Zuordnung lesen. */
function tabelleAlsZuordnung(markdown: string): Map<string, string> {
  const zuordnung = new Map<string, string>();
  for (const zeile of markdown.split("\n")) {
    if (!zeile.trim().startsWith("|")) continue;
    if (/^\s*\|[\s|:-]+\|\s*$/.test(zeile)) continue; // Trennzeile
    const spalten = zeile
      .split("|")
      .slice(1, -1)
      .map((s) => s.trim());
    if (spalten.length < 2) continue;
    const [schluessel, ...rest] = spalten;
    if (!schluessel) continue;
    zuordnung.set(schluessel, rest.join(" | "));
  }
  return zuordnung;
}

function leseDokument(pfad: string): Dokument {
  const roh = readFileSync(pfad, "utf-8");
  const zeilen = roh.split("\n");

  const titelZeile = zeilen.find((z) => z.startsWith("# ")) ?? "";
  const titel = titelZeile.replace(/^#\s*/, "").trim();

  // Kopftabelle: der erste zusammenhängende Tabellenblock vor dem ersten "## ".
  const ersteUeberschrift = zeilen.findIndex((z) => z.startsWith("## "));
  const kopfBereich = zeilen
    .slice(0, ersteUeberschrift === -1 ? zeilen.length : ersteUeberschrift)
    .filter((z) => z.trim().startsWith("|"));
  const dokumentdaten = tabelleAlsZuordnung(kopfBereich.join("\n"));
  // Erste Zeile ist die Kopfzeile der Tabelle (»Dokumentdaten | Stand").
  const ersterSchluessel = [...dokumentdaten.keys()][0];
  if (ersterSchluessel) dokumentdaten.delete(ersterSchluessel);

  const kapitel: Kapitel[] = [];
  let aktuell: Kapitel | null = null;
  for (
    let i = ersteUeberschrift === -1 ? zeilen.length : ersteUeberschrift;
    i < zeilen.length;
    i++
  ) {
    const z = zeilen[i]!;
    if (z.startsWith("## ")) {
      if (aktuell) kapitel.push(aktuell);
      aktuell = { titel: ohneNummer(z.replace(/^##\s*/, "")), roh: "" };
      continue;
    }
    if (aktuell) aktuell.roh += z + "\n";
  }
  if (aktuell) kapitel.push(aktuell);

  return {
    titel,
    dokumentdaten,
    dokumentdatenRoh: kopfBereich.join("\n"),
    kapitel,
  };
}

// ---------------------------------------------------------------------------
// Umwandlung
// ---------------------------------------------------------------------------

function mdZuHtml(markdown: string): string {
  return md.render(markdown).trim();
}

function mdZuTiptap(markdown: string): unknown {
  return htmlToTiptapJson(mdZuHtml(markdown));
}

/** Kapitel im Dokument suchen (Teiltreffer, damit Doppelpunkt-Titel greifen). */
function findeKapitel(dok: Dokument, gesucht: string): Kapitel | undefined {
  return dok.kapitel.find(
    (k) => k.titel === gesucht || k.titel.startsWith(gesucht),
  );
}

// ---------------------------------------------------------------------------
// Fehler mit Fundstelle
// ---------------------------------------------------------------------------

class ImportFehler extends Error {
  constructor(datei: string, was: string) {
    super(`${datei}: ${was}`);
  }
}

// ---------------------------------------------------------------------------
// Seiteninhalte bauen
// ---------------------------------------------------------------------------

interface Seiteninhalt {
  abschnitte: Record<string, string>;
  editorContent: unknown;
  /** Für den Bericht: was wohin ging. */
  bericht: string[];
}

/** Tabellenzeilen aus einem Kapitel entfernen — übrig bleibt die Prosa. */
function ohneTabelle(markdown: string): string {
  return markdown
    .split("\n")
    .filter((z) => !z.trim().startsWith("|"))
    .join("\n")
    .trim();
}

function nurTabelle(markdown: string): string {
  return markdown
    .split("\n")
    .filter((z) => z.trim().startsWith("|"))
    .join("\n")
    .trim();
}

/**
 * Zeichenzahl ohne Leerraum — Grundlage der Verlustprobe. Leerraum wird
 * normiert, weil Zeilenumbrueche beim Zusammensetzen zwangslaeufig anders
 * fallen; alles andere muss erhalten bleiben.
 */
function zeichen(text: string): number {
  return text.replace(/\s+/g, "").length;
}

/**
 * Vergleicht, was aus der Quelle in Abschnitte und Inhaltsbereich gewandert
 * ist. Weniger im Ziel als in der Quelle heisst: es ist etwas verloren
 * gegangen. Das ist ein Abbruchgrund, keine Warnung.
 */
function pruefeVerlust(
  datei: string,
  dok: Dokument,
  verbraucht: string[],
): string {
  // Verglichen wird der FLIESSTEXT, nicht die Ueberschriften: Ein Kapitel, das
  // in einen Abschnitt wandert, verliert seine Ueberschrift an die Beschriftung
  // des Abschnitts. Das ist kein Verlust, sondern der Zweck der Vorlage.
  const ohneUeberschriften = (t: string) =>
    t
      .split("\n")
      .filter((z) => !z.trimStart().startsWith("#"))
      .join("\n");

  const quelle =
    zeichen(ohneUeberschriften(dok.dokumentdatenRoh)) +
    dok.kapitel.reduce((n, k) => n + zeichen(ohneUeberschriften(k.roh)), 0);
  const ziel = verbraucht.reduce(
    (n, t) => n + zeichen(ohneUeberschriften(t)),
    0,
  );
  if (ziel < quelle) {
    throw new ImportFehler(
      datei,
      `Verlustprobe fehlgeschlagen: Quelle ${quelle} Zeichen, Ziel ${ziel} Zeichen ` +
        `(${quelle - ziel} fehlen). Der Import bricht ab, statt Inhalt zu verlieren.`,
    );
  }
  return `  Verlustprobe: Quelle ${quelle}, Ziel ${ziel} Zeichen`;
}

const DOKUMENTDATEN_UEBERSCHRIFT = "Dokumentdaten der Quellfassung";

function baueMarkenprofil(
  dok: Dokument,
  plan: Seitenbauplan,
  datei: string,
): Seiteninhalt {
  const zuordnung = plan.abschnitte!;
  const abschnitte: Record<string, string> = {};
  const bericht: string[] = [];
  /** Alles, was tatsaechlich irgendwo gelandet ist — Grundlage der Verlustprobe. */
  const verbraucht: string[] = [];

  // Plattformtabelle = erste Tabelle in den Kapiteln.
  const plattformKapitel = dok.kapitel.find((k) => enthaeltTabelle(k.roh));
  const plattform = plattformKapitel
    ? tabelleAlsZuordnung(nurTabelle(plattformKapitel.roh))
    : new Map<string, string>();
  const kopfzeile = [...plattform.keys()][0];
  if (kopfzeile) plattform.delete(kopfzeile);

  const verbrauchteKapitel = new Set<string>();
  const verbrauchtePlattform = new Set<string>();
  /** Kapiteltitel -> Tabellenteil, der in den Inhaltsbereich muss. */
  const geteilteKapitel = new Map<string, string>();

  for (const [schluessel, quelle] of Object.entries(zuordnung)) {
    const teile: string[] = [];

    for (const kapitelTitel of quelle.kapitel ?? []) {
      const k = findeKapitel(dok, kapitelTitel);
      if (!k)
        throw new ImportFehler(
          datei,
          `zugeordnetes Kapitel fehlt: "${kapitelTitel}"`,
        );

      // Abschnittsfelder koennen keine Tabellen (`RichSectionEditor` laedt kein
      // Tabellenmodul). Enthaelt ein zugeordnetes Kapitel eine, wird es
      // aufgeteilt: Prosa in den Abschnitt, Tabelle in den Inhaltsbereich.
      // Nichts geht verloren, und die Aufteilung steht im Bericht.
      if (enthaeltTabelle(k.roh)) {
        const prosa = ohneTabelle(k.roh);
        if (!prosa) {
          throw new ImportFehler(
            datei,
            `Kapitel "${k.titel}" ist Abschnitt "${schluessel}" zugeordnet, besteht aber nur aus einer Tabelle. ` +
              `Ein Abschnittsfeld kann davon nichts darstellen — Zuordnung anpassen.`,
          );
        }
        geteilteKapitel.set(k.titel, nurTabelle(k.roh));
        verbrauchteKapitel.add(k.titel);
        teile.push(prosa);
        continue;
      }

      verbrauchteKapitel.add(k.titel);
      teile.push(k.roh.trim());
    }

    for (const zeile of quelle.plattform ?? []) {
      const wert = plattform.get(zeile);
      if (wert === undefined) {
        throw new ImportFehler(
          datei,
          `zugeordnete Plattformzeile fehlt: "${zeile}"`,
        );
      }
      verbrauchtePlattform.add(zeile);
      teile.push(`**${zeile}:** ${wert}`);
    }

    for (const zeile of quelle.dokumentdaten ?? []) {
      const wert = dok.dokumentdaten.get(zeile);
      if (wert === undefined) {
        throw new ImportFehler(
          datei,
          `zugeordnete Dokumentdaten-Zeile fehlt: "${zeile}"`,
        );
      }
      teile.push(`**${zeile}:** ${wert}`);
    }

    const markdown = teile.join("\n\n").trim();
    if (!markdown)
      throw new ImportFehler(datei, `Abschnitt "${schluessel}" bliebe leer`);
    abschnitte[schluessel] = mdZuHtml(markdown);
    verbraucht.push(markdown);
    bericht.push(`  ${schluessel.padEnd(22)} ${markdown.length} Zeichen`);
  }

  // Verlustschutz: jede Plattformzeile muss verbraucht sein.
  const uebrig = [...plattform.keys()].filter(
    (k) => !verbrauchtePlattform.has(k),
  );
  if (uebrig.length > 0) {
    throw new ImportFehler(
      datei,
      `Plattformzeilen ohne Zuordnung: ${uebrig.join(", ")}. Ohne Zuordnung gingen sie verloren.`,
    );
  }

  // Inhaltsbereich: alles, was kein Abschnitt aufgenommen hat.
  const rest: string[] = [];
  for (const k of dok.kapitel) {
    if (k === plattformKapitel) {
      const prosa = ohneTabelle(k.roh);
      if (prosa) rest.push(`## ${k.titel}\n\n${prosa}`);
      continue;
    }
    const tabellenteil = geteilteKapitel.get(k.titel);
    if (tabellenteil) {
      rest.push(`## ${k.titel}\n\n${tabellenteil}`);
      continue;
    }
    if (verbrauchteKapitel.has(k.titel)) continue;
    rest.push(`## ${k.titel}\n\n${k.roh.trim()}`);
  }
  rest.push(`## ${DOKUMENTDATEN_UEBERSCHRIFT}\n\n${dok.dokumentdatenRoh}`);

  for (const [titel] of geteilteKapitel) {
    bericht.push(
      `  geteilt: "${titel}" — Prosa in den Abschnitt, Tabelle in den Inhaltsbereich`,
    );
  }
  bericht.push(`  Inhaltsbereich: ${rest.length} Abschnitt(e)`);
  verbraucht.push(...rest);
  bericht.push(pruefeVerlust(datei, dok, verbraucht));
  return { abschnitte, editorContent: mdZuTiptap(rest.join("\n\n")), bericht };
}

function bauePolicy(dok: Dokument, datei: string): Seiteninhalt {
  const prosaKapitel = dok.kapitel.filter(
    (k) => ohneTabelle(k.roh).length > 40,
  );
  if (prosaKapitel.length === 0) {
    throw new ImportFehler(
      datei,
      "kein Kapitel mit auswertbarer Prosa gefunden",
    );
  }

  const zweck = ohneTabelle(prosaKapitel[0]!.roh);
  const geltung =
    dok.dokumentdaten.get("Geltung") ??
    dok.dokumentdaten.get("Zuständigkeit") ??
    dok.dokumentdaten.get("Status") ??
    "";
  const kern = ohneTabelle((prosaKapitel[1] ?? prosaKapitel[0])!.roh);

  if (zweck.length < 30)
    throw new ImportFehler(datei, "Abschnitt »Zweck« bliebe unter 30 Zeichen");
  if (geltung.length < 30) {
    throw new ImportFehler(
      datei,
      `Abschnitt »Geltungsbereich« bliebe unter 30 Zeichen (Kopftabelle: "${geltung}")`,
    );
  }
  if (kern.length < 30)
    throw new ImportFehler(
      datei,
      "Abschnitt »Richtlinientext« bliebe unter 30 Zeichen",
    );

  // Vollständiges Dokument im Inhaltsbereich, Kopftabelle ans Ende.
  const koerper = dok.kapitel.map((k) => `## ${k.titel}\n\n${k.roh.trim()}`);
  koerper.push(`## ${DOKUMENTDATEN_UEBERSCHRIFT}\n\n${dok.dokumentdatenRoh}`);

  const bericht = [
    `  purpose ${zweck.length} · scope ${geltung.length} · policy_text ${kern.length} Zeichen`,
    `  Inhaltsbereich: ${koerper.length} Kapitel (vollständig, mit Tabellen)`,
  ];
  // Die Abschnitte sind Auszuege aus dem Koerper; fuer die Verlustprobe zaehlt
  // deshalb allein der Inhaltsbereich — er traegt das vollstaendige Dokument.
  bericht.push(pruefeVerlust(datei, dok, koerper));

  return {
    abschnitte: {
      purpose: mdZuHtml(zweck),
      scope: mdZuHtml(geltung),
      policy_text: mdZuHtml(kern),
    },
    editorContent: mdZuTiptap(koerper.join("\n\n")),
    bericht,
  };
}

// ---------------------------------------------------------------------------
// Metadaten
// ---------------------------------------------------------------------------

/** Aktives Konto Tobias Wenninger; das zweite gleichnamige ist inaktiv. */
const OWNER_PRINCIPAL = "c911a9df-b47c-4539-9d26-c106825968b6";
const OWNER_EXTERN = "44cda332-3634-4c7e-b0ed-d39c9d16bc92";
const OWNER_NAME = "Tobias Wenninger";
const PAKET_STAND = "2026-09-09";

function baueMetadaten(
  plan: Seitenbauplan,
  dok: Dokument | null,
): Record<string, unknown> {
  const meta: Record<string, unknown> = {
    owner: OWNER_PRINCIPAL,
    owner_display: OWNER_NAME,
    confidentiality: "internal",
    valid_from: PAKET_STAND,
    review_cycle_months: 12,
    source_of_truth: "FlowCore",
    templateVariant: plan.typ === "brand_profile" ? "full" : "blank",
    tags: [
      "Markensystem",
      "Markenführung",
      ...(plan.markenname ? [plan.markenname] : []),
    ],
  };
  if (plan.typ === "brand_profile") {
    meta.brand_name = plan.markenname;
    meta.brand_level = plan.markenebene;
  }
  if (dok) {
    const version = dok.dokumentdaten.get("Version / Datum");
    if (version) meta.quellfassung = version;
  }
  return meta;
}

// ---------------------------------------------------------------------------
// Anlegen
// ---------------------------------------------------------------------------

interface Optionen {
  quelle: string;
  actorId: string;
  trocken: boolean;
}

let angelegt = 0;
let uebersprungen = 0;

async function findeVorhandene(
  elternId: string,
  titel: string,
): Promise<string | null> {
  const [treffer] = await db
    .select({ id: contentNodesTable.id })
    .from(contentNodesTable)
    .where(
      and(
        eq(contentNodesTable.parentNodeId, elternId),
        eq(contentNodesTable.title, titel),
        eq(contentNodesTable.isDeleted, false),
      ),
    );
  return treffer?.id ?? null;
}

async function legeSeiteAn(
  plan: Seitenbauplan,
  elternId: string,
  sortOrder: number,
  opt: Optionen,
  tiefe: number,
): Promise<string | null> {
  const einzug = "  ".repeat(tiefe);

  let inhalt: Seiteninhalt | null = null;
  let dok: Dokument | null = null;
  if (plan.datei) {
    const pfad = join(opt.quelle, plan.datei);
    if (!existsSync(pfad))
      throw new ImportFehler(plan.datei, "Datei nicht gefunden");
    dok = leseDokument(pfad);
    inhalt =
      plan.typ === "brand_profile"
        ? baueMarkenprofil(dok, plan, plan.datei)
        : bauePolicy(dok, plan.datei);
  }

  console.log(
    `${einzug}${plan.titel}  [${plan.typ}]${plan.datei ? "  ← " + plan.datei : ""}`,
  );
  if (inhalt) inhalt.bericht.forEach((z) => console.log(`${einzug}${z}`));

  if (opt.trocken) return null;

  const vorhanden = await findeVorhandene(elternId, plan.titel);
  if (vorhanden) {
    console.log(`${einzug}  (vorhanden, übersprungen)`);
    uebersprungen += 1;
    return vorhanden;
  }

  const knotenId = await createContentNode(
    {
      title: plan.titel,
      templateType: plan.typ,
      parentNodeId: elternId,
      ownerId: OWNER_EXTERN,
      sortOrder,
    },
    {
      eventType: "content",
      action: "node_created",
      actorId: opt.actorId,
      resourceType: "content_node",
      details: { quelle: "markensystem-import", datei: plan.datei ?? null },
    },
  );

  const { workingCopy } = await createWorkingCopy({
    nodeId: knotenId,
    authorId: opt.actorId,
  });
  await updateWorkingCopy(
    workingCopy.id,
    {
      title: plan.titel,
      content: baueMetadaten(plan, dok),
      structuredFields: {
        ...(inhalt?.abschnitte ?? {}),
        ...(inhalt ? { _editorContent: inhalt.editorContent } : {}),
        confidentiality: "internal",
      },
      changeType: "major",
      changeSummary:
        "Erstanlage aus dem Markensystem-Paket V1.0 vom 09.09.2026",
    },
    opt.actorId,
  );
  await submitWorkingCopy(
    workingCopy.id,
    { changeType: "major", changeSummary: "Erstanlage Markensystem V1.0" },
    opt.actorId,
  );

  angelegt += 1;
  return knotenId;
}

async function gehe(
  plaene: Seitenbauplan[],
  elternId: string,
  opt: Optionen,
  tiefe: number,
): Promise<void> {
  for (let i = 0; i < plaene.length; i++) {
    const plan = plaene[i]!;
    const id = await legeSeiteAn(plan, elternId, i, opt, tiefe);
    if (plan.kinder?.length) {
      if (opt.trocken) {
        await gehe(plan.kinder, elternId, opt, tiefe + 1);
      } else if (id) {
        await gehe(plan.kinder, id, opt, tiefe + 1);
      }
    }
  }
}

// ---------------------------------------------------------------------------

function argument(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? undefined : process.argv[i + 1];
}

async function main(): Promise<void> {
  const quelle = argument("quelle");
  const ziel = argument("ziel");
  const actorId = argument("actor") ?? OWNER_PRINCIPAL;
  const trocken = process.argv.includes("--dry-run");

  if (!quelle || !ziel) {
    console.error(
      "Aufruf: tsx src/scripts/import-markensystem.ts --quelle <verzeichnis> --ziel <knoten-uuid> [--actor <uuid>] [--dry-run]",
    );
    process.exit(2);
  }

  const [zielKnoten] = await db
    .select({ id: contentNodesTable.id, title: contentNodesTable.title })
    .from(contentNodesTable)
    .where(eq(contentNodesTable.id, ziel));
  if (!zielKnoten) {
    console.error(`Zielknoten ${ziel} nicht gefunden.`);
    process.exit(1);
  }

  console.log(
    `${trocken ? "TROCKENLAUF" : "IMPORT"} — Ziel: ${zielKnoten.title}\n` +
      `Quelle: ${quelle}\nVerantwortlich: ${OWNER_NAME}\n`,
  );

  await gehe(BAUPLAN, ziel, { quelle, actorId, trocken }, 1);

  console.log(
    trocken
      ? "\nTrockenlauf beendet — nichts geschrieben."
      : `\nFertig: ${angelegt} Seiten angelegt, ${uebersprungen} übersprungen.`,
  );
  process.exit(0);
}

main().catch((fehler: unknown) => {
  console.error(
    "\nABBRUCH:",
    fehler instanceof Error ? fehler.message : fehler,
  );
  process.exit(1);
});
