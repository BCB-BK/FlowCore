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
 * ABLAUF IN DREI DURCHGÄNGEN
 *   1. Probe: Alle Seiten werden mit Platzhalter-IDs vollständig gebaut. Jeder
 *      Fehler bricht hier ab — bevor irgendetwas geschrieben ist.
 *   2. Knoten: Alle Seiten werden angelegt (oder wiedergefunden). Erst jetzt
 *      stehen die IDs fest, auf die Verweise zeigen können.
 *   3. Inhalte: Mit den echten IDs neu gebaut, als Arbeitskopie eingereicht.
 *
 * VERWEISE zwischen den Paketdokumenten werden zu FlowCore-Seitenlinks
 * (`wikiLink`). Dadurch entstehen über `syncInlineWikiLinks` auch die
 * Relationen. Der Linktext »MS-G00 - System und Geltung« wird durch den
 * FlowCore-Titel ersetzt — Dateinummern gehören nicht in die Seiten.
 * Verweise auf den nicht übernommenen Migrationsbericht bleiben als Text
 * stehen, ohne Link.
 *
 * VERLUSTSICHERUNG — das Skript bricht ab, statt still etwas fallen zu lassen:
 *   - ein zugeordnetes Kapitel oder eine Plattformzeile fehlt im Dokument
 *   - eine Plattformzeile ist KEINEM Abschnitt zugeordnet
 *   - ein Verweis zeigt auf eine Datei außerhalb des Bauplans
 *   - im Ergebnis stehen noch Dokumentnummern oder Links auf .md-Dateien
 *   - die Zeichenprobe (Buchstaben und Ziffern) findet weniger als die Quelle
 *
 * AUFRUF
 *   tsx src/scripts/import-markensystem.ts --quelle <verz> --ziel <uuid> \
 *       [--actor <principal-uuid>] [--dry-run]
 */
import { readFileSync, existsSync } from "node:fs";
import { join, posix } from "node:path";
import MarkdownIt from "markdown-it";
import { eq, and } from "drizzle-orm";
import { db } from "@workspace/db";
import { contentNodesTable } from "@workspace/db/schema";
import { htmlToTiptapJson, type TiptapNode } from "@workspace/shared/rich-text";
import { createContentNode } from "../services/identity.service";
import {
  createWorkingCopy,
  updateWorkingCopy,
  submitWorkingCopy,
} from "../services/working-copy.service";
import {
  BAUPLAN,
  TEXTANPASSUNGEN,
  type Seitenbauplan,
  type Seitentyp,
} from "./markensystem-plan";

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
  kapitel: Kapitel[];
}

/** Führende Nummerierung entfernen: »## 3. Haltung: …« → »Haltung: …«. */
function ohneNummer(ueberschrift: string): string {
  return ueberschrift.replace(/^\d+\.\s*/, "").trim();
}

function enthaeltTabelle(markdown: string): boolean {
  return /^\s*\|/m.test(markdown);
}

/** Zellen einer Markdown-Tabellenzeile. */
function zellen(zeile: string): string[] {
  return zeile
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((s) => s.trim());
}

function istTrennzeile(zeile: string): boolean {
  return /^\s*\|[\s|:-]+\|\s*$/.test(zeile);
}

/** Zweispaltige Markdown-Tabelle als Zuordnung lesen (Kopfzeile inklusive). */
function tabelleAlsZuordnung(markdown: string): Map<string, string> {
  const zuordnung = new Map<string, string>();
  for (const zeile of markdown.split("\n")) {
    if (!zeile.trim().startsWith("|") || istTrennzeile(zeile)) continue;
    const spalten = zellen(zeile);
    if (spalten.length < 2) continue;
    const [schluessel, ...rest] = spalten;
    if (!schluessel) continue;
    zuordnung.set(schluessel, rest.join(" | "));
  }
  return zuordnung;
}

function leseDokument(pfad: string): Dokument {
  const zeilen = readFileSync(pfad, "utf-8").split("\n");

  const titelZeile = zeilen.find((z) => z.startsWith("# ")) ?? "";
  const titel = titelZeile.replace(/^#\s*/, "").trim();

  // Kopftabelle: der Tabellenblock vor dem ersten "## ".
  const ersteUeberschrift = zeilen.findIndex((z) => z.startsWith("## "));
  const kopfBereich = zeilen
    .slice(0, ersteUeberschrift === -1 ? zeilen.length : ersteUeberschrift)
    .filter((z) => z.trim().startsWith("|"));
  const dokumentdaten = tabelleAlsZuordnung(kopfBereich.join("\n"));
  // Erste Zeile ist die Kopfzeile der Tabelle (»Dokumentdaten | Stand«).
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

  return { titel, dokumentdaten, kapitel };
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
// Verweise und Dokumentnummern
// ---------------------------------------------------------------------------

interface Verweisziel {
  id: string;
  titel: string;
  typ: Seitentyp;
}

interface Verweiszaehler {
  seitenlinks: number;
  ohneLink: number;
}

const MARKDOWN_LINK = /\[([^\]]*)\]\(([^)\s]+)\)/g;
const DOKUMENTNUMMER = /\bMS-[A-Z]\d{2}\b/;
const SEITENLINK = /^\/node\/([0-9a-f-]{36})$/;

/**
 * Markdown-Links des Pakets auf FlowCore-Seiten umschreiben.
 *
 * Alle Paketlinks tragen den Text »MS-xx - <Titel des Zieldokuments>« (am
 * 11.09.2026 über alle 30 Dateien geprüft). Der FlowCore-Titel ist genau dieser
 * Dokumenttitel — der Ersatz verliert also nichts außer der Nummer.
 */
function schreibeVerweise(
  markdown: string,
  datei: string,
  verweise: Map<string, Verweisziel>,
  zaehler: Verweiszaehler,
): string {
  return markdown.replace(MARKDOWN_LINK, (ganz, text: string, ziel: string) => {
    if (/^(https?:|mailto:)/i.test(ziel)) return ganz;
    const pfad = posix.normalize(
      posix.join(posix.dirname(datei), ziel.split("#")[0]!),
    );
    if (pfad.startsWith("migration/")) {
      zaehler.ohneLink += 1;
      return text;
    }
    const treffer = verweise.get(pfad);
    if (!treffer) {
      throw new ImportFehler(
        datei,
        `Verweis auf Datei außerhalb des Bauplans: ${ziel}`,
      );
    }
    zaehler.seitenlinks += 1;
    const anzeige = DOKUMENTNUMMER.test(text) ? treffer.titel : text;
    return `[${anzeige}](/node/${treffer.id})`;
  });
}

/**
 * Spalte »ID« aus Tabellen entfernen, wenn sie nur Dokumentnummern trägt
 * (Dokumentlandkarte in »System und Geltung«). Die Nachbarspalte verlinkt
 * dasselbe Dokument, es geht also nur die Nummer verloren.
 */
function ohneNummernspalte(markdown: string): string {
  const zeilen = markdown.split("\n");
  const aus: string[] = [];
  let i = 0;
  while (i < zeilen.length) {
    if (!zeilen[i]!.trim().startsWith("|")) {
      aus.push(zeilen[i]!);
      i += 1;
      continue;
    }
    const block: string[] = [];
    while (i < zeilen.length && zeilen[i]!.trim().startsWith("|")) {
      block.push(zeilen[i]!);
      i += 1;
    }
    const tabelle = block.map(zellen);
    const nurNummern =
      tabelle[0]?.[0] === "ID" &&
      tabelle.length > 2 &&
      tabelle.slice(2).every((z) => /^MS-[A-Z]\d{2}$/.test(z[0] ?? ""));
    if (!nurNummern) {
      aus.push(...block);
      continue;
    }
    aus.push(...tabelle.map((z) => `| ${z.slice(1).join(" | ")} |`));
  }
  return aus.join("\n");
}

/** Angewandte Einträge aus `TEXTANPASSUNGEN`, je Durchgang von `baueAlle` gezählt. */
let angewandteAnpassungen = new Set<string>();

/** Entschiedene Wortlautänderungen anwenden — fail-closed, siehe `TEXTANPASSUNGEN`. */
function passeTextAn(dok: Dokument, datei: string): Dokument {
  const anpassungen = TEXTANPASSUNGEN.filter((a) => a.datei === datei);
  if (anpassungen.length === 0) return dok;
  const kapitel = dok.kapitel.map((k) => ({ ...k }));
  for (const a of anpassungen) {
    const treffer = kapitel.filter((k) => k.roh.includes(a.alt));
    const [ziel] = treffer;
    if (!ziel || treffer.length !== 1 || ziel.roh.split(a.alt).length !== 2) {
      throw new ImportFehler(
        datei,
        `Textanpassung nicht eindeutig anwendbar: "${a.alt.slice(0, 60)}…"`,
      );
    }
    ziel.roh = ziel.roh.replace(a.alt, () => a.neu);
    angewandteAnpassungen.add(a.alt);
  }
  return { ...dok, kapitel };
}

function bereiteVor(
  dok: Dokument,
  datei: string,
  verweise: Map<string, Verweisziel>,
  zaehler: Verweiszaehler,
): Dokument {
  const dokumentdaten = new Map<string, string>();
  for (const [k, v] of dok.dokumentdaten) {
    dokumentdaten.set(k, schreibeVerweise(v, datei, verweise, zaehler));
  }
  return {
    titel: dok.titel,
    dokumentdaten,
    kapitel: dok.kapitel.map((k) => ({
      titel: k.titel,
      roh: schreibeVerweise(ohneNummernspalte(k.roh), datei, verweise, zaehler),
    })),
  };
}

// ---------------------------------------------------------------------------
// Umwandlung
// ---------------------------------------------------------------------------

function mdZuHtml(markdown: string): string {
  return md.render(markdown).trim();
}

/** Text mit Link auf `/node/<id>` → FlowCore-Seitenlink (`wikiLink`). */
function mitSeitenlinks(
  knoten: TiptapNode,
  nachId: Map<string, Verweisziel>,
): TiptapNode {
  if (!knoten.content) return knoten;
  return {
    ...knoten,
    content: knoten.content.map((kind) => {
      const href = kind.marks?.find((m) => m.type === "link")?.attrs?.href;
      const treffer = typeof href === "string" ? SEITENLINK.exec(href) : null;
      if (kind.type === "text" && treffer) {
        const ziel = nachId.get(treffer[1]!);
        if (!ziel) throw new Error(`Seitenlink ohne bekanntes Ziel: ${href}`);
        return {
          type: "wikiLink",
          attrs: {
            nodeId: ziel.id,
            title: kind.text ?? ziel.titel,
            displayCode: null,
            templateType: ziel.typ,
          },
        };
      }
      return mitSeitenlinks(kind, nachId);
    }),
  };
}

function mdZuTiptap(
  markdown: string,
  nachId: Map<string, Verweisziel>,
): TiptapNode {
  return mitSeitenlinks(htmlToTiptapJson(mdZuHtml(markdown)), nachId);
}

/** Kapitel im Dokument suchen (Teiltreffer, damit Doppelpunkt-Titel greifen). */
function findeKapitel(dok: Dokument, gesucht: string): Kapitel | undefined {
  return dok.kapitel.find(
    (k) => k.titel === gesucht || k.titel.startsWith(gesucht),
  );
}

// ---------------------------------------------------------------------------
// Seiteninhalte bauen
// ---------------------------------------------------------------------------

interface Seiteninhalt {
  abschnitte: Record<string, string>;
  editorContent: TiptapNode;
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
 * Zeichen für die Verlustprobe: nur Buchstaben und Ziffern. Satzzeichen der
 * Markdown-Syntax (`|`, `*`, `#`) ändern sich beim Umordnen zwangsläufig; der
 * Wortlaut muss erhalten bleiben.
 */
function zeichen(text: string): number {
  return text.replace(/[^\p{L}\p{N}]/gu, "").length;
}

function ohneUeberschriften(text: string): string {
  return text
    .split("\n")
    .filter((z) => !z.trimStart().startsWith("#"))
    .join("\n");
}

/**
 * Vergleicht, was aus den Kapiteln in Abschnitte und Inhaltsbereich gewandert
 * ist. Überschriften zählen nicht mit; bewusst entfallene Tabellenköpfe
 * (»Element | Festlegung«) werden abgezogen und im Bericht genannt. Weniger im
 * Ziel als in der Quelle ist ein Abbruchgrund, keine Warnung.
 */
function pruefeVerlust(
  datei: string,
  dok: Dokument,
  verbraucht: string[],
  entfallen: string[],
): string {
  const quelle =
    dok.kapitel.reduce((n, k) => n + zeichen(ohneUeberschriften(k.roh)), 0) -
    zeichen(entfallen.join(""));
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
  const hinweis = entfallen.length
    ? ` · entfallene Tabellenköpfe: ${entfallen.join(", ")}`
    : "";
  return `  Verlustprobe: Quelle ${quelle}, Ziel ${ziel} Zeichen${hinweis}`;
}

/** Zweispaltige Tabelle als »**Feld:** Wert«-Absätze; die Kopfzeile entfällt. */
function tabelleAlsAbsaetze(
  datei: string,
  kapitel: Kapitel,
  entfallen: string[],
): string {
  const tabelle = nurTabelle(kapitel.roh);
  const breite = tabelle
    .split("\n")
    .filter((z) => !istTrennzeile(z))
    .map((z) => zellen(z).length);
  if (breite.some((b) => b !== 2)) {
    throw new ImportFehler(
      datei,
      `Kapitel "${kapitel.titel}": nur zweispaltige Tabellen lassen sich als Liste übernehmen`,
    );
  }
  const zuordnung = tabelleAlsZuordnung(tabelle);
  const [kopf] = zuordnung.entries();
  if (kopf) {
    entfallen.push(kopf[0], kopf[1]);
    zuordnung.delete(kopf[0]);
  }
  return [...zuordnung]
    .map(([feld, wert]) => `**${feld}:** ${wert}`)
    .join("\n\n");
}

function baueMarkenprofil(
  dok: Dokument,
  plan: Seitenbauplan,
  datei: string,
  nachId: Map<string, Verweisziel>,
): Seiteninhalt {
  const zuordnung = plan.abschnitte!;
  const abschnitte: Record<string, string> = {};
  const bericht: string[] = [];
  /** Alles, was tatsächlich irgendwo gelandet ist — Grundlage der Verlustprobe. */
  const verbraucht: string[] = [];
  const entfallen: string[] = [];

  // Plattformtabelle = erste Tabelle in den Kapiteln.
  const plattformKapitel = dok.kapitel.find((k) => enthaeltTabelle(k.roh));
  const plattform = plattformKapitel
    ? tabelleAlsZuordnung(nurTabelle(plattformKapitel.roh))
    : new Map<string, string>();
  const [plattformKopf] = plattform.entries();
  if (plattformKopf) {
    entfallen.push(plattformKopf[0], plattformKopf[1]);
    plattform.delete(plattformKopf[0]);
  }

  const verbrauchteKapitel = new Set<string>();
  const verbrauchtePlattform = new Set<string>();
  /** Kapiteltitel -> Tabellenteil, der in den Inhaltsbereich muss. */
  const geteilteKapitel = new Map<string, string>();

  const kapitelOderFehler = (titel: string): Kapitel => {
    const k = findeKapitel(dok, titel);
    if (!k)
      throw new ImportFehler(datei, `zugeordnetes Kapitel fehlt: "${titel}"`);
    return k;
  };

  for (const [schluessel, quelle] of Object.entries(zuordnung)) {
    const teile: string[] = [];

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

    for (const kapitelTitel of quelle.kapitel ?? []) {
      const k = kapitelOderFehler(kapitelTitel);
      verbrauchteKapitel.add(k.titel);
      // Abschnittsfelder können keine Tabellen (`RichSectionEditor` lädt kein
      // Tabellenmodul). Enthält ein zugeordnetes Kapitel eine, wird es
      // aufgeteilt: Prosa in den Abschnitt, Tabelle in den Inhaltsbereich.
      if (enthaeltTabelle(k.roh) && k !== plattformKapitel) {
        const prosa = ohneTabelle(k.roh);
        if (!prosa) {
          throw new ImportFehler(
            datei,
            `Kapitel "${k.titel}" besteht nur aus einer Tabelle — Zuordnung anpassen.`,
          );
        }
        geteilteKapitel.set(k.titel, nurTabelle(k.roh));
        teile.push(`### ${k.titel}\n\n${prosa}`);
        continue;
      }
      // Die Plattformtabelle selbst ist über ihre Zeilen verteilt; hier zählt
      // nur die Prosa des Kapitels.
      const rumpf = k === plattformKapitel ? ohneTabelle(k.roh) : k.roh.trim();
      teile.push(`### ${k.titel}\n\n${rumpf}`);
    }

    for (const kapitelTitel of quelle.kapitelAlsListe ?? []) {
      const k = kapitelOderFehler(kapitelTitel);
      verbrauchteKapitel.add(k.titel);
      const liste = tabelleAlsAbsaetze(datei, k, entfallen);
      const prosa = ohneTabelle(k.roh);
      teile.push(`### ${k.titel}\n\n${liste}${prosa ? `\n\n${prosa}` : ""}`);
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
    const tabellenteil = geteilteKapitel.get(k.titel);
    if (tabellenteil) {
      rest.push(`## ${k.titel}\n\n${tabellenteil}`);
      continue;
    }
    if (verbrauchteKapitel.has(k.titel)) continue;
    if (k === plattformKapitel) {
      const prosa = ohneTabelle(k.roh);
      if (prosa) rest.push(`## ${k.titel}\n\n${prosa}`);
      continue;
    }
    rest.push(`## ${k.titel}\n\n${k.roh.trim()}`);
  }

  for (const [titel] of geteilteKapitel) {
    bericht.push(
      `  geteilt: "${titel}" — Prosa in den Abschnitt, Tabelle in den Inhaltsbereich`,
    );
  }
  bericht.push(`  Inhaltsbereich: ${rest.length} Kapitel`);
  verbraucht.push(...rest);
  bericht.push(pruefeVerlust(datei, dok, verbraucht, entfallen));
  return {
    abschnitte,
    editorContent: mdZuTiptap(rest.join("\n\n"), nachId),
    bericht,
  };
}

function bauePolicy(
  dok: Dokument,
  datei: string,
  nachId: Map<string, Verweisziel>,
): Seiteninhalt {
  const prosaKapitel = dok.kapitel.filter(
    (k) => ohneTabelle(k.roh).length > 40,
  );
  if (prosaKapitel.length === 0) {
    throw new ImportFehler(
      datei,
      "kein Kapitel mit auswertbarer Prosa gefunden",
    );
  }

  // Zweck als Kurzangabe: der erste Absatz — das ganze Kapitel steht ohnehin
  // im Inhaltsbereich direkt darunter.
  const zweck = ohneTabelle(prosaKapitel[0]!.roh)
    .split(/\n\s*\n/)[0]!
    .trim();
  const geltung =
    dok.dokumentdaten.get("Geltung") ??
    dok.dokumentdaten.get("Zuständigkeit") ??
    "";
  // Pflichtfeld der Vorlage; die Leseansicht zeigt es nicht (layout-engine
  // `policyConfig`). Der vollständige Text steht im Inhaltsbereich.
  const kern = ohneTabelle((prosaKapitel[1] ?? prosaKapitel[0])!.roh);

  if (zweck.length < 30)
    throw new ImportFehler(
      datei,
      `Abschnitt »Zweck« bliebe unter 30 Zeichen: "${zweck}"`,
    );
  if (geltung.length < 30) {
    throw new ImportFehler(
      datei,
      `Abschnitt »Geltungsbereich« bliebe unter 30 Zeichen: "${geltung}"`,
    );
  }
  if (kern.length < 30)
    throw new ImportFehler(
      datei,
      "Abschnitt »Richtlinientext« bliebe unter 30 Zeichen",
    );

  const koerper = dok.kapitel.map((k) => `## ${k.titel}\n\n${k.roh.trim()}`);

  return {
    abschnitte: {
      purpose: mdZuHtml(zweck),
      scope: mdZuHtml(geltung),
      policy_text: mdZuHtml(kern),
    },
    editorContent: mdZuTiptap(koerper.join("\n\n"), nachId),
    bericht: [
      `  Zweck ${zweck.length} · Geltung ${geltung.length} Zeichen · Inhaltsbereich ${koerper.length} Kapitel`,
      pruefeVerlust(datei, dok, koerper, []),
    ],
  };
}

// ---------------------------------------------------------------------------
// Metadaten
// ---------------------------------------------------------------------------

/** Aktives Konto Tobias Wenninger; das zweite gleichnamige ist inaktiv. */
const OWNER_PRINCIPAL = "c911a9df-b47c-4539-9d26-c106825968b6";
const OWNER_EXTERN = "44cda332-3634-4c7e-b0ed-d39c9d16bc92";
const OWNER_NAME = "Tobias Wenninger";
/** Gültig ab dem Tag der Veröffentlichung — dasselbe Datum setzt der Dienst an der Revision. */
const STICHTAG = new Date().toISOString().slice(0, 10);

function baueMetadaten(
  plan: Seitenbauplan,
  marke: string | undefined,
  dok: Dokument | null,
): Record<string, unknown> {
  const meta: Record<string, unknown> = {
    owner: OWNER_PRINCIPAL,
    owner_display: OWNER_NAME,
    confidentiality: "internal",
    valid_from: STICHTAG,
    review_cycle_months: 12,
    source_of_truth: "FlowCore",
    templateVariant: plan.typ === "brand_profile" ? "full" : "blank",
    tags: ["Markensystem", "Markenführung", ...(marke ? [marke] : [])],
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
// Durchgänge
// ---------------------------------------------------------------------------

interface Eintrag {
  plan: Seitenbauplan;
  /** Index des Elterneintrags; -1 = Zielknoten. */
  eltern: number;
  sortOrder: number;
  tiefe: number;
  /** Marke der Seite oder des nächsten Vorfahren — für die Schlagwörter. */
  marke?: string;
  id: string;
}

interface Seitenstand {
  content: Record<string, unknown>;
  structuredFields: Record<string, unknown>;
  bericht: string[];
}

function platzhalterId(index: number): string {
  return `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`;
}

function sammleEintraege(
  plaene: Seitenbauplan[],
  eltern: number,
  tiefe: number,
  marke: string | undefined,
  aus: Eintrag[],
): Eintrag[] {
  plaene.forEach((plan, sortOrder) => {
    const eigeneMarke = plan.markenname ?? marke;
    const index = aus.length;
    aus.push({
      plan,
      eltern,
      sortOrder,
      tiefe,
      marke: eigeneMarke,
      id: platzhalterId(index),
    });
    if (plan.kinder?.length) {
      sammleEintraege(plan.kinder, index, tiefe + 1, eigeneMarke, aus);
    }
  });
  return aus;
}

/** Fail-closed: Nummern und Dateilinks dürfen im Ergebnis nicht mehr vorkommen. */
function pruefeErgebnis(datei: string, felder: Record<string, unknown>): void {
  const text = JSON.stringify(felder);
  const nummer = DOKUMENTNUMMER.exec(text);
  if (nummer)
    throw new ImportFehler(datei, `Dokumentnummer im Ergebnis: ${nummer[0]}`);
  // Nur Linkziele zählen: Dateinamen im Fließtext (`…/00-grundregeln.md`) sind Inhalt.
  const hrefs: string[] = [];
  const sammle = (wert: unknown): void => {
    if (typeof wert === "string") {
      for (const m of wert.matchAll(/href="([^"]*)"/g)) hrefs.push(m[1] ?? "");
    } else if (Array.isArray(wert)) {
      wert.forEach(sammle);
    } else if (wert && typeof wert === "object") {
      const o = wert as Record<string, unknown>;
      if (typeof o.href === "string") hrefs.push(o.href);
      Object.values(o).forEach(sammle);
    }
  };
  sammle(felder);
  const dateilink = hrefs.find((h) => /\.md(#|$)/.test(h));
  if (dateilink) {
    throw new ImportFehler(
      datei,
      `Link auf .md-Datei im Ergebnis: ${dateilink}`,
    );
  }
}

function baueSeite(
  e: Eintrag,
  quelle: string,
  verweise: Map<string, Verweisziel>,
  nachId: Map<string, Verweisziel>,
): Seitenstand {
  const { plan } = e;
  if (!plan.datei) {
    if (!plan.beschreibung)
      throw new ImportFehler(plan.titel, "Behälter ohne Beschreibung");
    return {
      content: baueMetadaten(plan, e.marke, null),
      structuredFields: {
        description: mdZuHtml(plan.beschreibung),
        confidentiality: "internal",
      },
      bericht: [],
    };
  }

  const pfad = join(quelle, plan.datei);
  if (!existsSync(pfad))
    throw new ImportFehler(plan.datei, "Datei nicht gefunden");
  const zaehler: Verweiszaehler = { seitenlinks: 0, ohneLink: 0 };
  const dok = bereiteVor(
    passeTextAn(leseDokument(pfad), plan.datei),
    plan.datei,
    verweise,
    zaehler,
  );
  const inhalt =
    plan.typ === "brand_profile"
      ? baueMarkenprofil(dok, plan, plan.datei, nachId)
      : bauePolicy(dok, plan.datei, nachId);

  const structuredFields = {
    ...inhalt.abschnitte,
    _editorContent: inhalt.editorContent,
    confidentiality: "internal",
  };
  pruefeErgebnis(plan.datei, structuredFields);

  return {
    content: baueMetadaten(plan, e.marke, dok),
    structuredFields,
    bericht: [
      ...inhalt.bericht,
      ...TEXTANPASSUNGEN.filter((a) => a.datei === plan.datei).map(
        (a) => `  Textanpassung: ${a.grund}`,
      ),
      `  Verweise: ${zaehler.seitenlinks} Seitenlinks · ${zaehler.ohneLink} Quellenangaben ohne Link`,
    ],
  };
}

function baueAlle(
  eintraege: Eintrag[],
  quelle: string,
  ausgeben: boolean,
): Seitenstand[] {
  const nachId = new Map<string, Verweisziel>();
  const verweise = new Map<string, Verweisziel>();
  for (const e of eintraege) {
    const ziel = { id: e.id, titel: e.plan.titel, typ: e.plan.typ };
    nachId.set(e.id, ziel);
    if (e.plan.datei) verweise.set(e.plan.datei, ziel);
  }
  angewandteAnpassungen = new Set<string>();
  const staende = eintraege.map((e) => {
    const stand = baueSeite(e, quelle, verweise, nachId);
    if (ausgeben) {
      const einzug = "  ".repeat(e.tiefe);
      console.log(
        `${einzug}${e.plan.titel}  [${e.plan.typ}]${e.plan.datei ? "  ← " + e.plan.datei : ""}`,
      );
      stand.bericht.forEach((z) => console.log(`${einzug}${z}`));
    }
    return stand;
  });
  const offen = TEXTANPASSUNGEN.find((a) => !angewandteAnpassungen.has(a.alt));
  if (offen) {
    throw new ImportFehler(offen.datei, "Textanpassung wurde nicht angewandt");
  }
  return staende;
}

interface Optionen {
  quelle: string;
  ziel: string;
  actorId: string;
}

async function ordneKnotenZu(
  eintraege: Eintrag[],
  opt: Optionen,
): Promise<number> {
  let neu = 0;
  for (const e of eintraege) {
    const elternId = e.eltern === -1 ? opt.ziel : eintraege[e.eltern]!.id;
    const [vorhanden] = await db
      .select({ id: contentNodesTable.id })
      .from(contentNodesTable)
      .where(
        and(
          eq(contentNodesTable.parentNodeId, elternId),
          eq(contentNodesTable.title, e.plan.titel),
          eq(contentNodesTable.isDeleted, false),
        ),
      );
    if (vorhanden) {
      e.id = vorhanden.id;
      continue;
    }
    e.id = await createContentNode(
      {
        title: e.plan.titel,
        templateType: e.plan.typ,
        parentNodeId: elternId,
        ownerId: OWNER_EXTERN,
        sortOrder: e.sortOrder,
      },
      {
        eventType: "content",
        action: "node_created",
        actorId: opt.actorId,
        resourceType: "content_node",
        details: { quelle: "markensystem-import", datei: e.plan.datei ?? null },
      },
    );
    neu += 1;
  }
  return neu;
}

async function schreibeSeite(
  e: Eintrag,
  stand: Seitenstand,
  opt: Optionen,
): Promise<boolean> {
  const [knoten] = await db
    .select({ publishedRevisionId: contentNodesTable.publishedRevisionId })
    .from(contentNodesTable)
    .where(eq(contentNodesTable.id, e.id));
  if (knoten?.publishedRevisionId) return false;

  const { workingCopy } = await createWorkingCopy({
    nodeId: e.id,
    authorId: opt.actorId,
  });
  await updateWorkingCopy(
    workingCopy.id,
    {
      title: e.plan.titel,
      content: stand.content,
      structuredFields: stand.structuredFields,
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
  return true;
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
      `Quelle: ${quelle}\nVerantwortlich: ${OWNER_NAME} · Gültig ab: ${STICHTAG}\n`,
  );

  // 1. Probe mit Platzhalter-IDs — bricht ab, bevor etwas geschrieben ist.
  const eintraege = sammleEintraege(BAUPLAN, -1, 1, undefined, []);
  baueAlle(eintraege, quelle, true);
  console.log(`\nProbe bestanden: ${eintraege.length} Seiten.`);
  if (trocken) {
    console.log("Trockenlauf beendet — nichts geschrieben.");
    process.exit(0);
  }

  // 2. Knoten anlegen oder wiederfinden.
  const opt: Optionen = { quelle, ziel, actorId };
  const neu = await ordneKnotenZu(eintraege, opt);

  // 3. Inhalte mit den echten IDs bauen und veröffentlichen.
  const staende = baueAlle(eintraege, quelle, false);
  let veroeffentlicht = 0;
  for (let i = 0; i < eintraege.length; i++) {
    if (await schreibeSeite(eintraege[i]!, staende[i]!, opt))
      veroeffentlicht += 1;
  }

  console.log(
    `Fertig: ${neu} Knoten neu angelegt, ${veroeffentlicht} Seiten veröffentlicht, ` +
      `${eintraege.length - veroeffentlicht} waren bereits veröffentlicht.`,
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
