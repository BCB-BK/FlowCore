/**
 * Import und Korrektur des OneCampus-Markensystems in FlowCore.
 *
 * WARUM ÜBER DIE DIENSTE UND NICHT PER SQL: `POST /content/nodes/:id/revisions`
 * und `POST /content/revisions/:id/publish` sind bewusst abgeschaltet
 * (`routes/content.ts`); der Arbeitskopie-Weg ist der einzige unterstützte
 * Schreibpfad. Nur über ihn laufen Audit-Ereignisse, die Vorbelegung der
 * Vertraulichkeit, die Relationen aus Seitenverweisen und die
 * Publikationsprüfung.
 *
 * ZWEI BETRIEBSARTEN
 *   Erstanlage (Standard): legt fehlende Seiten an und veröffentlicht sie;
 *     bereits veröffentlichte Seiten bleiben unberührt.
 *   Korrektur (`--korrektur`, Überarbeitungsauftrag FC-MSA-20260911-REV):
 *     legt KEINE Seite an. Bestehende Seiten werden über ihre ID adressiert und
 *     nur dann als neue Revision veröffentlicht, wenn sich die gebauten Inhalte
 *     oder Metadaten tatsächlich unterscheiden. Mit `--erwartete-ids` bricht der
 *     Lauf vor jedem Schreibzugriff ab, wenn eine Seite nicht die erwartete UUID
 *     hat.
 *
 * ABLAUF
 *   1. Probe: Alle Seiten werden mit Platzhalter-IDs vollständig gebaut. Jeder
 *      Fehler bricht hier ab — bevor irgendetwas geschrieben ist.
 *   2. Knoten: angelegt (Erstanlage) oder wiedergefunden (beide Arten).
 *   3. Herkunftsarchiv (optional): als Anhang an »System und Geltung«.
 *   4. Inhalte: mit den echten IDs gebaut und veröffentlicht.
 *   5. Quellenrang: jede normative Seite erhält die typisierte Beziehung
 *      `implements_policy` zu »System und Geltung«.
 *
 * VERWEISE zwischen den Paketdokumenten werden zu FlowCore-Seitenlinks
 * (`wikiLink` im Inhaltsbereich, `<a href="/node/…">` in Abschnitten). Der
 * Linktext »MS-G00 - System und Geltung« wird durch den FlowCore-Titel ersetzt.
 * Verweise auf den nicht übernommenen Migrationsbericht bleiben als Text.
 *
 * VERLUSTSICHERUNG — das Skript bricht ab, statt still etwas fallen zu lassen:
 *   - ein zugeordnetes Kapitel, eine Plattformzeile, ein Auszugssatz oder eine
 *     Profilkennung fehlt im Dokument
 *   - eine Plattformzeile ist KEINEM Abschnitt zugeordnet
 *   - ein Verweis zeigt auf eine Datei außerhalb des Bauplans
 *   - im Ergebnis stehen noch Dokumentnummern oder Links auf .md-Dateien
 *   - eine Textanpassung passt nicht genau einmal oder bleibt unangewandt
 *   - die Zeichenprobe (Buchstaben und Ziffern) findet weniger als die Quelle
 *
 * AUFRUF
 *   tsx src/scripts/import-markensystem.ts --quelle <verz> --ziel <uuid>
 *       [--actor <principal-uuid>] [--dry-run] [--korrektur]
 *       [--herkunftsarchiv <zip> --archivname <name>] [--erwartete-ids <json>]
 */
import { createHash, randomUUID } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import { basename, join, posix } from "node:path";
import MarkdownIt from "markdown-it";
import { eq, and } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  auditEventsTable,
  contentNodesTable,
  contentRelationsTable,
  contentRevisionsTable,
  mediaAssetsTable,
} from "@workspace/db/schema";
import { htmlToTiptapJson, type TiptapNode } from "@workspace/shared/rich-text";
import { createContentNode } from "../services/identity.service";
import {
  createWorkingCopy,
  updateWorkingCopy,
  submitWorkingCopy,
} from "../services/working-copy.service";
import { createRelation } from "../services/graph.service";
import {
  getDefaultProviderId,
  getDefaultStorageProvider,
} from "../services/storage.service";
import {
  BAUPLAN,
  SYSTEM_UND_GELTUNG,
  TEXTANPASSUNGEN,
  type Abschnittsquelle,
  type Seitenbauplan,
  type Seitentyp,
  type Teil,
} from "./markensystem-plan";

const md = new MarkdownIt({ html: false, linkify: false, typographer: false });

// ---------------------------------------------------------------------------
// Laufzeitwerte (Stichtag, Systemprüfung, Herkunftsarchiv)
// ---------------------------------------------------------------------------

interface Archiv {
  name: string;
  sha256: string;
  url: string;
  bytes: number;
}

interface Laufzeit {
  stichtag: string;
  archiv: Archiv | null;
}

const LAUFZEIT: Laufzeit = {
  stichtag: new Date().toISOString().slice(0, 10),
  archiv: null,
};

/** ISO-Datum plus Monate, Tag am Monatsende begrenzt (wie `berechneNaechstePruefung`). */
function plusMonate(iso: string, monate: number): string {
  const [j, m, t] = iso.split("-").map(Number) as [number, number, number];
  const ziel = new Date(Date.UTC(j, m - 1 + monate, 1));
  const letzter = new Date(
    Date.UTC(ziel.getUTCFullYear(), ziel.getUTCMonth() + 1, 0),
  ).getUTCDate();
  ziel.setUTCDate(Math.min(t, letzter));
  return ziel.toISOString().slice(0, 10);
}

function deutsch(iso: string): string {
  const [j, m, t] = iso.split("-");
  return `${t}.${m}.${j}`;
}

function pruefzyklusDerSystempruefung(): number {
  const suche = (plaene: Seitenbauplan[]): number | undefined => {
    for (const p of plaene) {
      if (p.pruefzyklusMonate) return p.pruefzyklusMonate;
      const tiefer = p.kinder ? suche(p.kinder) : undefined;
      if (tiefer) return tiefer;
    }
    return undefined;
  };
  return suche(BAUPLAN) ?? 3;
}

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

interface Kontext {
  quelle: string;
  verweise: Map<string, Verweisziel>;
  nachId: Map<string, Verweisziel>;
  zaehler: Verweiszaehler;
}

const MARKDOWN_LINK = /\[([^\]]*)\]\(([^)\s]+)\)/g;
const DOKUMENTNUMMER = /\bMS-[A-Z]\d{2}\b/;
const SEITENLINK = /^\/node\/([0-9a-f-]{36})$/;

/**
 * Markdown-Links des Pakets auf FlowCore-Seiten umschreiben.
 *
 * Alle Paketlinks tragen den Text »MS-xx - <Titel des Zieldokuments>« (am
 * 11.09.2026 über alle 30 Dateien geprüft). Der FlowCore-Titel ist genau dieser
 * Dokumenttitel — der Ersatz verliert also nichts außer der Nummer. Bereits
 * umgeschriebene Seiten- und Medienlinks bleiben unverändert.
 */
function schreibeVerweise(
  markdown: string,
  datei: string,
  kontext: Pick<Kontext, "verweise" | "zaehler">,
): string {
  return markdown.replace(MARKDOWN_LINK, (ganz, text: string, ziel: string) => {
    if (/^(https?:|mailto:|\/node\/|\/api\/)/i.test(ziel)) return ganz;
    const pfad = posix.normalize(
      posix.join(posix.dirname(datei), ziel.split("#")[0]!),
    );
    if (pfad.startsWith("migration/")) {
      kontext.zaehler.ohneLink += 1;
      return text;
    }
    const treffer = kontext.verweise.get(pfad);
    if (!treffer) {
      throw new ImportFehler(
        datei,
        `Verweis auf Datei außerhalb des Bauplans: ${ziel}`,
      );
    }
    kontext.zaehler.seitenlinks += 1;
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

function mitPlatzhaltern(text: string, datei: string): string {
  const a = LAUFZEIT.archiv;
  if (/\{ARCHIV_(NAME|SHA256)\}/.test(text) && !a) {
    throw new ImportFehler(
      datei,
      "Textanpassung verlangt das Herkunftsarchiv — Aufruf mit --herkunftsarchiv",
    );
  }
  return text
    .replaceAll("{STICHTAG_DE}", deutsch(LAUFZEIT.stichtag))
    .replaceAll(
      "{NAECHSTE_SYSTEMPRUEFUNG_DE}",
      deutsch(plusMonate(LAUFZEIT.stichtag, pruefzyklusDerSystempruefung())),
    )
    .replaceAll("{ARCHIV_NAME}", a?.name ?? "")
    .replaceAll("{ARCHIV_SHA256}", a?.sha256 ?? "");
}

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
    const neu = mitPlatzhaltern(a.neu, datei);
    ziel.roh = ziel.roh.replace(a.alt, () => neu);
    angewandteAnpassungen.add(a.alt);
  }
  return { ...dok, kapitel };
}

function bereiteVor(dok: Dokument, datei: string, kontext: Kontext): Dokument {
  const dokumentdaten = new Map<string, string>();
  for (const [k, v] of dok.dokumentdaten) {
    dokumentdaten.set(k, schreibeVerweise(v, datei, kontext));
  }
  return {
    titel: dok.titel,
    dokumentdaten,
    kapitel: dok.kapitel.map((k) => ({
      titel: k.titel,
      roh: schreibeVerweise(ohneNummernspalte(k.roh), datei, kontext),
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

/** Datenzeilen einer Tabelle (ohne Kopf- und Trennzeile) als Zellenlisten. */
function tabellenzeilen(kapitel: Kapitel): string[][] {
  return nurTabelle(kapitel.roh)
    .split("\n")
    .filter((z) => !istTrennzeile(z))
    .slice(1)
    .map(zellen);
}

/** Einfache Abschnittsquelle in geordnete Teile übersetzen (bisherige Reihenfolge). */
function alsTeile(quelle: Abschnittsquelle): Teil[] {
  if (quelle.teile) return quelle.teile;
  return [
    ...(quelle.plattform?.length
      ? [{ art: "plattform", zeilen: quelle.plattform } as Teil]
      : []),
    ...(quelle.kapitel ?? []).map(
      (titel) => ({ art: "kapitel", titel }) as Teil,
    ),
    ...(quelle.kapitelAlsListe ?? []).map(
      (titel) => ({ art: "kapitelAlsListe", titel }) as Teil,
    ),
    ...(quelle.dokumentdaten?.length
      ? [
          {
            art: "dokumentdaten",
            zeilen: quelle.dokumentdaten.map((z) => [z, z]),
          } as Teil,
        ]
      : []),
  ];
}

function baueMarkenprofil(
  dokRoh: Dokument,
  dok: Dokument,
  plan: Seitenbauplan,
  datei: string,
  kontext: Kontext,
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

  const kapitelOderFehler = (d: Dokument, titel: string): Kapitel => {
    const k = findeKapitel(d, titel);
    if (!k)
      throw new ImportFehler(datei, `zugeordnetes Kapitel fehlt: "${titel}"`);
    return k;
  };

  const baueTeil = (teil: Teil): string => {
    switch (teil.art) {
      case "plattform":
        return teil.zeilen
          .map((zeile) => {
            const wert = plattform.get(zeile);
            if (wert === undefined) {
              throw new ImportFehler(
                datei,
                `zugeordnete Plattformzeile fehlt: "${zeile}"`,
              );
            }
            verbrauchtePlattform.add(zeile);
            return `**${zeile}:** ${wert}`;
          })
          .join("\n\n");
      case "kapitel": {
        const k = kapitelOderFehler(dok, teil.titel);
        verbrauchteKapitel.add(k.titel);
        const kopf = `### ${teil.praefix ? `${teil.praefix}: ` : ""}${k.titel}`;
        // Abschnittsfelder können keine Tabellen (`RichSectionEditor` lädt kein
        // Tabellenmodul): Prosa in den Abschnitt, Tabelle in den Inhaltsbereich.
        if (enthaeltTabelle(k.roh) && k !== plattformKapitel) {
          const prosa = ohneTabelle(k.roh);
          if (!prosa) {
            throw new ImportFehler(
              datei,
              `Kapitel "${k.titel}" besteht nur aus einer Tabelle — Zuordnung anpassen.`,
            );
          }
          geteilteKapitel.set(k.titel, nurTabelle(k.roh));
          return `${kopf}\n\n${prosa}`;
        }
        const rumpf =
          k === plattformKapitel ? ohneTabelle(k.roh) : k.roh.trim();
        return `${kopf}\n\n${rumpf}`;
      }
      case "kapitelAlsListe": {
        const k = kapitelOderFehler(dok, teil.titel);
        verbrauchteKapitel.add(k.titel);
        const liste = tabelleAlsAbsaetze(datei, k, entfallen);
        const prosa = ohneTabelle(k.roh);
        return `### ${k.titel}\n\n${liste}${prosa ? `\n\n${prosa}` : ""}`;
      }
      case "dokumentdaten":
        return teil.zeilen
          .map(([quelle, anzeige]) => {
            const wert = dok.dokumentdaten.get(quelle);
            if (wert === undefined) {
              throw new ImportFehler(
                datei,
                `zugeordnete Dokumentdaten-Zeile fehlt: "${quelle}"`,
              );
            }
            return `**${anzeige}:** ${wert}`;
          })
          .join("\n\n");
      case "ueberschrift":
        return `### ${teil.text}`;
      case "text":
        return teil.markdown;
      case "tabellenspalteAlsListe": {
        const k = kapitelOderFehler(dok, teil.kapitel);
        const punkte = tabellenzeilen(k).map((z) => z[teil.spalte] ?? "");
        if (punkte.length === 0 || punkte.some((p) => !p)) {
          throw new ImportFehler(
            datei,
            `Kapitel "${k.titel}": Tabellenspalte ${teil.spalte} leer oder unvollständig`,
          );
        }
        return `${teil.einleitung}\n\n${punkte.map((p) => `- ${p}`).join("\n")}`;
      }
      case "tabelleAlsKontextliste": {
        const k = kapitelOderFehler(dok, teil.kapitel);
        const zeilen = tabellenzeilen(k);
        if (zeilen.length === 0) {
          throw new ImportFehler(datei, `Kapitel "${k.titel}": keine Tabelle`);
        }
        return zeilen
          .map(
            (z) =>
              `**${z[teil.beschriftung]}:** ${z[teil.beschreibung]} Führende Anwendung: ${z[teil.anwendung]}`,
          )
          .join("\n\n");
      }
      case "profilListe": {
        const text = readFileSync(join(kontext.quelle, teil.datei), "utf-8");
        const muster = new RegExp(
          `^## (?:\\d+\\.\\s*)?(${teil.kennung}-P\\d+) - (.+)$`,
          "gm",
        );
        const profile = [...text.matchAll(muster)].map(
          (m) => `- ${m[1]}: ${m[2]!.trim()}`,
        );
        if (profile.length === 0) {
          throw new ImportFehler(
            datei,
            `keine Profile ${teil.kennung}-P… in ${teil.datei}`,
          );
        }
        return `${teil.einleitung}\n\n${profile.join("\n")}`;
      }
      case "auszuege":
        return teil.saetze
          .map(({ kapitel, satz }) => {
            const k = kapitelOderFehler(dokRoh, kapitel);
            if (k.roh.split(satz).length !== 2) {
              throw new ImportFehler(
                datei,
                `Auszug nicht genau einmal in Kapitel "${k.titel}": "${satz.slice(0, 60)}…"`,
              );
            }
            return `- ${satz} — Kapitel „${k.titel}“`;
          })
          .join("\n");
    }
  };

  for (const [schluessel, quelle] of Object.entries(zuordnung)) {
    const markdown = schreibeVerweise(
      alsTeile(quelle).map(baueTeil).filter(Boolean).join("\n\n").trim(),
      datei,
      kontext,
    );
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

  // Einordnungen im Inhaltsbereich müssen auf ein dort stehendes Kapitel treffen.
  for (const titel of Object.keys(plan.inhaltPraefix ?? {})) {
    const k = kapitelOderFehler(dok, titel);
    if (verbrauchteKapitel.has(k.titel)) {
      throw new ImportFehler(
        datei,
        `Kapitel "${k.titel}" hat eine Einordnung im Inhaltsbereich, steht aber in einem Abschnitt`,
      );
    }
  }

  // Inhaltsbereich: alles, was kein Abschnitt aufgenommen hat.
  const rest: string[] = [];
  for (const k of dok.kapitel) {
    const praefix = plan.inhaltPraefix?.[k.titel];
    const kopf = `## ${praefix ? `${praefix}: ` : ""}${k.titel}`;
    const tabellenteil = geteilteKapitel.get(k.titel);
    if (tabellenteil) {
      rest.push(`${kopf}\n\n${tabellenteil}`);
      continue;
    }
    if (verbrauchteKapitel.has(k.titel)) continue;
    if (k === plattformKapitel) {
      const prosa = ohneTabelle(k.roh);
      if (prosa) rest.push(`${kopf}\n\n${prosa}`);
      continue;
    }
    rest.push(`${kopf}\n\n${k.roh.trim()}`);
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
    editorContent: mdZuTiptap(rest.join("\n\n"), kontext.nachId),
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
  // Pflichtfeld der Vorlage; die Leseansicht zeigt es nicht, und der Volltext
  // für Export und KI lässt es aus, sobald ein Inhaltsbereich existiert. Es
  // bleibt als gekennzeichneter Auszug (AP-03).
  const kernKapitel = (prosaKapitel[1] ?? prosaKapitel[0])!;
  const kern = ohneTabelle(kernKapitel.roh);

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
  const auszug = `*Auszug aus Kapitel „${kernKapitel.titel}“ – der vollständige Richtlinientext steht im Inhaltsbereich dieser Seite.*\n\n${kern}`;

  return {
    abschnitte: {
      purpose: mdZuHtml(zweck),
      scope: mdZuHtml(geltung),
      policy_text: mdZuHtml(auszug),
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

function baueMetadaten(
  plan: Seitenbauplan,
  marke: string | undefined,
  dok: Dokument | null,
): Record<string, unknown> {
  const zyklus = plan.pruefzyklusMonate ?? 12;
  const meta: Record<string, unknown> = {
    owner: OWNER_PRINCIPAL,
    owner_display: OWNER_NAME,
    confidentiality: "internal",
    valid_from: LAUFZEIT.stichtag,
    review_cycle_months: zyklus,
    next_review_date: plusMonate(LAUFZEIT.stichtag, zyklus),
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

/**
 * Verweisliste »Referenzen & mitgeltende Dokumente« (AP-03, 5.2 und Abschnitt 12):
 * normative Seiten verweisen auf »System und Geltung« als Quellenrang;
 * »System und Geltung« selbst trägt das externe Herkunftsarchiv.
 */
function verweisliste(
  plan: Seitenbauplan,
  verweise: Map<string, Verweisziel>,
): string | undefined {
  if (!plan.datei) return undefined;
  if (plan.datei === SYSTEM_UND_GELTUNG) {
    const a = LAUFZEIT.archiv;
    if (!a) return undefined;
    return JSON.stringify([
      {
        type: "upload",
        title: `Externes Herkunftsarchiv: ${a.name} (SHA-256 ${a.sha256})`,
        url: a.url,
      },
    ]);
  }
  const sug = verweise.get(SYSTEM_UND_GELTUNG);
  if (!sug)
    throw new ImportFehler(plan.datei, "System und Geltung fehlt im Bauplan");
  return JSON.stringify([
    {
      type: "node",
      title: "System und Geltung – Quellenrang und Anwendung",
      url: `/node/${sug.id}`,
      nodeId: sug.id,
      templateType: sug.typ,
    },
  ]);
}

function baueSeite(e: Eintrag, kontext: Omit<Kontext, "zaehler">): Seitenstand {
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

  const pfad = join(kontext.quelle, plan.datei);
  if (!existsSync(pfad))
    throw new ImportFehler(plan.datei, "Datei nicht gefunden");
  const k: Kontext = { ...kontext, zaehler: { seitenlinks: 0, ohneLink: 0 } };
  const dokRoh = passeTextAn(leseDokument(pfad), plan.datei);
  const dok = bereiteVor(dokRoh, plan.datei, k);
  const inhalt =
    plan.typ === "brand_profile"
      ? baueMarkenprofil(dokRoh, dok, plan, plan.datei, k)
      : bauePolicy(dok, plan.datei, kontext.nachId);

  const references = verweisliste(plan, kontext.verweise);
  const structuredFields: Record<string, unknown> = {
    ...inhalt.abschnitte,
    ...(references ? { references } : {}),
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
      `  Verweise: ${k.zaehler.seitenlinks} Seitenlinks · ${k.zaehler.ohneLink} Quellenangaben ohne Link`,
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
    const stand = baueSeite(e, { quelle, verweise, nachId });
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
  korrektur: boolean;
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
    if (opt.korrektur) {
      throw new ImportFehler(
        e.plan.titel,
        "Seite nicht gefunden — im Korrekturlauf wird keine Seite angelegt",
      );
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
        details: {
          quelle: "markensystem-import",
          datei: e.plan.datei ?? null,
        },
      },
    );
    neu += 1;
  }
  return neu;
}

/** JSON mit sortierten Schlüsseln — für den Vergleich gebauter und gespeicherter Stände. */
function stabil(wert: unknown): string {
  if (Array.isArray(wert)) return `[${wert.map(stabil).join(",")}]`;
  if (wert && typeof wert === "object") {
    const o = wert as Record<string, unknown>;
    return `{${Object.keys(o)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${stabil(o[k])}`)
      .join(",")}}`;
  }
  return JSON.stringify(wert ?? null);
}

/** Nur die Schlüssel vergleichen, die der Import setzt — Dienste ergänzen eigene. */
function unterscheidetSich(
  gebaut: Record<string, unknown>,
  gespeichert: unknown,
): boolean {
  const g = (gespeichert ?? {}) as Record<string, unknown>;
  return Object.keys(gebaut).some((k) => stabil(gebaut[k]) !== stabil(g[k]));
}

function korrekturHinweis(plan: Seitenbauplan): string {
  const basis = "Korrektur nach Audit FC-MSA-20260911";
  if (plan.datei === SYSTEM_UND_GELTUNG) {
    return `${basis}: Quellenanweisungen (AP-04), Freigabestatus (AP-05), Herkunftsarchiv, Lesekontrakt (AP-03)`;
  }
  if (plan.pruefzyklusMonate) {
    return `${basis}: quartalsweise Systemprüfung (AP-06), Quellenrang und Lesekontrakt (AP-03)`;
  }
  if (plan.typ === "brand_profile") {
    return `${basis}: Feldzuordnung (AP-01), Seitenbeziehungen (AP-02), Quellenrang und Lesekontrakt (AP-03)`;
  }
  return `${basis}: Quellenrang und Auszugskennzeichnung (AP-03)`;
}

type Schreibergebnis = "neu" | "korrigiert" | "unverändert";

async function schreibeSeite(
  e: Eintrag,
  stand: Seitenstand,
  opt: Optionen,
): Promise<Schreibergebnis> {
  const [knoten] = await db
    .select({ publishedRevisionId: contentNodesTable.publishedRevisionId })
    .from(contentNodesTable)
    .where(eq(contentNodesTable.id, e.id));
  const veroeffentlicht = knoten?.publishedRevisionId ?? null;

  if (veroeffentlicht) {
    if (!opt.korrektur || e.plan.typ === "doc_registry") return "unverändert";
    const [rev] = await db
      .select({
        content: contentRevisionsTable.content,
        structuredFields: contentRevisionsTable.structuredFields,
      })
      .from(contentRevisionsTable)
      .where(eq(contentRevisionsTable.id, veroeffentlicht));
    if (
      rev &&
      !unterscheidetSich(stand.content, rev.content) &&
      !unterscheidetSich(stand.structuredFields, rev.structuredFields)
    ) {
      return "unverändert";
    }
  }

  const zusammenfassung = veroeffentlicht
    ? korrekturHinweis(e.plan)
    : "Erstanlage aus dem Markensystem-Paket V1.0 vom 09.09.2026";
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
      changeSummary: zusammenfassung,
    },
    opt.actorId,
  );
  await submitWorkingCopy(
    workingCopy.id,
    { changeType: "major", changeSummary: zusammenfassung },
    opt.actorId,
  );
  return veroeffentlicht ? "korrigiert" : "neu";
}

/** Herkunftsarchiv als Anhang an »System und Geltung« — über denselben Speicherweg wie der Upload. */
async function hinterlegeArchiv(
  pfad: string,
  name: string,
  sugId: string,
  opt: Optionen,
): Promise<Archiv> {
  const puffer = readFileSync(pfad);
  const sha256 = createHash("sha256").update(puffer).digest("hex");
  const [vorhanden] = await db
    .select({
      storageKey: mediaAssetsTable.storageKey,
      sizeBytes: mediaAssetsTable.sizeBytes,
    })
    .from(mediaAssetsTable)
    .where(
      and(
        eq(mediaAssetsTable.nodeId, sugId),
        eq(mediaAssetsTable.originalFilename, name),
        eq(mediaAssetsTable.isDeleted, false),
      ),
    );
  if (vorhanden) {
    if (Number(vorhanden.sizeBytes) !== puffer.length) {
      throw new ImportFehler(
        name,
        `Anhang vorhanden, aber Größe ${vorhanden.sizeBytes} ≠ ${puffer.length} Bytes — nicht dasselbe Archiv`,
      );
    }
    return {
      name,
      sha256,
      url: `/api/media/files/${vorhanden.storageKey}`,
      bytes: puffer.length,
    };
  }

  const provider = await getDefaultStorageProvider();
  const providerId = await getDefaultProviderId();
  const schluessel = `${randomUUID()}.zip`;
  const ergebnis = await provider.upload(schluessel, puffer, {
    mimeType: "application/zip",
    originalFilename: name,
  });
  await db.transaction(async (tx) => {
    const [asset] = await tx
      .insert(mediaAssetsTable)
      .values({
        filename: schluessel,
        originalFilename: name,
        mimeType: "application/zip",
        sizeBytes: ergebnis.sizeBytes,
        storageKey: ergebnis.storageKey,
        storageProviderId: providerId,
        altText: null,
        caption: `Externes Herkunftsarchiv des Markensystems (SHA-256 ${sha256})`,
        classification: "archive",
        nodeId: sugId,
        sourceUrl: null,
        sourceLibrary: null,
        sourcePath: null,
        uploadedBy: opt.actorId,
      })
      .returning();
    await tx.insert(auditEventsTable).values({
      eventType: "content",
      action: "media_uploaded",
      actorId: opt.actorId,
      resourceType: "media_asset",
      resourceId: asset!.id,
      details: {
        filename: name,
        mimeType: "application/zip",
        sha256,
        quelle: "markensystem-korrektur",
      },
    });
  });
  return {
    name,
    sha256,
    url: `/api/media/files/${ergebnis.storageKey}`,
    bytes: puffer.length,
  };
}

/** AP-03, 5.2: typisierte Beziehung jeder normativen Seite zu »System und Geltung«. */
async function bindeAnSystemUndGeltung(
  eintraege: Eintrag[],
  opt: Optionen,
): Promise<number> {
  const sug = eintraege.find((e) => e.plan.datei === SYSTEM_UND_GELTUNG);
  if (!sug) throw new Error("System und Geltung fehlt im Bauplan");
  let neu = 0;
  for (const e of eintraege) {
    if (!e.plan.datei || e.plan.datei === SYSTEM_UND_GELTUNG) continue;
    const [vorhanden] = await db
      .select({ id: contentRelationsTable.id })
      .from(contentRelationsTable)
      .where(
        and(
          eq(contentRelationsTable.sourceNodeId, e.id),
          eq(contentRelationsTable.targetNodeId, sug.id),
          eq(contentRelationsTable.relationType, "implements_policy"),
        ),
      );
    if (vorhanden) continue;
    await createRelation(
      {
        sourceNodeId: e.id,
        targetNodeId: sug.id,
        relationType: "implements_policy",
        description: "Quellenrang und Anwendung: System und Geltung",
        createdBy: opt.actorId,
      },
      {
        eventType: "content",
        action: "relation_created",
        actorId: opt.actorId,
        resourceType: "content_relation",
        details: {
          quelle: "markensystem-korrektur",
          auftrag: "FC-MSA-20260911-REV",
        },
      },
    );
    neu += 1;
  }
  return neu;
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
  const korrektur = process.argv.includes("--korrektur");
  const archivPfad = argument("herkunftsarchiv");
  const archivName =
    argument("archivname") ?? (archivPfad ? basename(archivPfad) : "");
  const erwartetPfad = argument("erwartete-ids");

  if (!quelle || !ziel) {
    console.error(
      "Aufruf: tsx src/scripts/import-markensystem.ts --quelle <verzeichnis> --ziel <knoten-uuid> [--actor <uuid>] [--dry-run] [--korrektur] [--herkunftsarchiv <zip> --archivname <name>] [--erwartete-ids <json>]",
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

  if (archivPfad) {
    if (!existsSync(archivPfad)) {
      console.error(`Herkunftsarchiv nicht gefunden: ${archivPfad}`);
      process.exit(1);
    }
    const puffer = readFileSync(archivPfad);
    LAUFZEIT.archiv = {
      name: archivName,
      sha256: createHash("sha256").update(puffer).digest("hex"),
      url: "/api/media/files/(Probe)",
      bytes: puffer.length,
    };
  }

  console.log(
    `${trocken ? "TROCKENLAUF" : korrektur ? "KORREKTUR" : "IMPORT"} — Ziel: ${zielKnoten.title}\n` +
      `Quelle: ${quelle}\nVerantwortlich: ${OWNER_NAME} · Gültig ab: ${LAUFZEIT.stichtag}` +
      (LAUFZEIT.archiv
        ? `\nHerkunftsarchiv: ${LAUFZEIT.archiv.name} · SHA-256 ${LAUFZEIT.archiv.sha256}`
        : "") +
      "\n",
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
  const opt: Optionen = { quelle, ziel, actorId, korrektur };
  const neu = await ordneKnotenZu(eintraege, opt);

  if (erwartetPfad) {
    const erwartet = JSON.parse(readFileSync(erwartetPfad, "utf-8")) as Record<
      string,
      string
    >;
    const abweichung = Object.entries(erwartet).filter(
      ([titel, uuid]) =>
        eintraege.find((e) => e.plan.titel === titel)?.id !== uuid,
    );
    if (abweichung.length > 0) {
      console.error(
        `\nABBRUCH vor dem Schreiben — UUIDs weichen ab: ${abweichung.map(([t]) => t).join(", ")}`,
      );
      process.exit(1);
    }
    console.log(
      `UUID-Abgleich: ${Object.keys(erwartet).length} erwartete Seiten bestätigt.`,
    );
  }

  // 3. Herkunftsarchiv.
  if (archivPfad) {
    const sug = eintraege.find((e) => e.plan.datei === SYSTEM_UND_GELTUNG)!;
    LAUFZEIT.archiv = await hinterlegeArchiv(
      archivPfad,
      archivName,
      sug.id,
      opt,
    );
    console.log(`Herkunftsarchiv hinterlegt: ${LAUFZEIT.archiv.url}`);
  }

  // 4. Inhalte mit den echten IDs bauen und veröffentlichen.
  const staende = baueAlle(eintraege, quelle, false);
  const ergebnis: Record<Schreibergebnis, string[]> = {
    neu: [],
    korrigiert: [],
    unverändert: [],
  };
  for (let i = 0; i < eintraege.length; i++) {
    const e = eintraege[i]!;
    ergebnis[await schreibeSeite(e, staende[i]!, opt)].push(e.plan.titel);
  }

  // 5. Quellenrang als typisierte Beziehung.
  const bindungen = await bindeAnSystemUndGeltung(eintraege, opt);

  console.log(
    `Fertig: ${neu} Knoten neu angelegt · ${ergebnis.neu.length} Seiten erstmals veröffentlicht · ` +
      `${ergebnis.korrigiert.length} als neue Revision korrigiert · ${ergebnis.unverändert.length} unverändert · ` +
      `${bindungen} Quellenrang-Beziehungen neu.`,
  );
  if (ergebnis.korrigiert.length) {
    console.log(`Korrigiert: ${ergebnis.korrigiert.join(" | ")}`);
  }
  process.exit(0);
}

main().catch((fehler: unknown) => {
  console.error(
    "\nABBRUCH:",
    fehler instanceof Error ? fehler.message : fehler,
  );
  process.exit(1);
});
