/**
 * C-01 (Reaudit FC-RA-20260911): operative Versionsbindung klarstellen.
 *
 * WARUM: 18 Seiten binden interne Verweise sprachlich an „Version 1.0 dieses
 * Pakets“, während der native Link auf die veröffentlichte FlowCore-Seite
 * zeigt. Eine Redaktion oder ein Client kann nicht erkennen, ob die
 * Herkunftsfassung oder die freigegebene FlowCore-Revision gemeint ist.
 *
 * WAS GENAU: Ersetzt werden nur die 35 operativen Nennungen — der Satz in
 * „System und Geltung“ und der Zusatz in den B2B-Verweisblöcken. Historische
 * Angaben (Änderungsverlauf 1.0, `meta.quellfassung`, Herkunftsarchiv) bleiben
 * unverändert. Jede geänderte Seite erhält zusätzlich eine Zeile im
 * Änderungsverlauf. Ein Strukturvergleich belegt, dass sonst nichts am
 * gespeicherten Text abweicht (Abnahme C-A4).
 *
 * Aufruf:
 *   tsx src/scripts/versionsbindung-klarstellen.ts --wurzel <uuid>
 *     [--erwartete-ids <json>] [--actor <uuid>] [--datum TT.MM.JJJJ]
 *     [--protokoll <datei>] [--dry-run]
 */
import { readFileSync, writeFileSync } from "node:fs";
import { and, eq, desc } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  contentNodesTable,
  contentRevisionsTable,
  contentWorkingCopiesTable,
  contentRelationsTable,
} from "@workspace/db/schema";
import {
  createWorkingCopy,
  updateWorkingCopy,
  submitWorkingCopy,
} from "../services/working-copy.service";
import { stableContentHash } from "../lib/content-hash";

const OWNER_PRINCIPAL = "c911a9df-b47c-4539-9d26-c106825968b6";

const ALT_SUG = "Interne Verweise dieses Pakets beziehen sich auf Version 1.0.";
const NEU_SUG =
  "Operative Verweise richten sich nach der inhaltlich freigegebenen und veröffentlichten FlowCore-Revision der referenzierten Seite. Für einen Export oder Produktionsauftrag werden Seiten-UUID, tatsächlich verwendete Revision und Inhaltshash dokumentiert. Die historische Herkunftsfassung 1.0 vom 09.09.2026 wird separat geführt.";
const ALT_B2B = "Version 1.0 dieses Pakets";
const NEU_B2B =
  "inhaltlich freigegebene, veröffentlichte FlowCore-Revision; die konkret verwendete Revision wird im Export- bzw. Auftragsmanifest ausgewiesen";
const VERMERK =
  "Pflegeklarstellung nach Reaudit FC-RA-20260911 (C-01): operative Verweise richten sich nach der inhaltlich freigegebenen, veröffentlichten FlowCore-Revision; Herkunftsfassung 1.0 vom 09.09.2026 und Markeninhalte unverändert.";
const ZUSAMMENFASSUNG =
  "Pflegeklarstellung Versionsbindung (Reaudit FC-RA-20260911, C-01), Freigabe Tobias Wenninger";
const B2B_TITEL = [
  "Gemeinsame B2B-Zielgruppenprofile",
  "Gemeinsamer B2B-Kommunikationsstandard",
];

interface Knoten {
  type?: string;
  attrs?: Record<string, unknown>;
  content?: Knoten[];
  text?: string;
}
type Felder = Record<string, unknown>;

function argument(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
}

/** Pfade, an denen sich zwei JSON-Bäume unterscheiden. */
function unterschiede(a: unknown, b: unknown, pfad = ""): string[] {
  if (a === b) return [];
  if (Array.isArray(a) && Array.isArray(b)) {
    const aus: string[] = [];
    for (let i = 0; i < Math.max(a.length, b.length); i++) {
      aus.push(...unterschiede(a[i], b[i], `${pfad}/${i}`));
    }
    return aus;
  }
  if (a && b && typeof a === "object" && typeof b === "object") {
    const schluessel = new Set([
      ...Object.keys(a as object),
      ...Object.keys(b as object),
    ]);
    const aus: string[] = [];
    for (const k of schluessel) {
      aus.push(
        ...unterschiede(
          (a as Record<string, unknown>)[k],
          (b as Record<string, unknown>)[k],
          `${pfad}/${k}`,
        ),
      );
    }
    return aus;
  }
  return [pfad];
}

function textZelle(text: string): Knoten {
  return {
    type: "tableCell",
    content: [{ type: "paragraph", content: [{ type: "text", text }] }],
  };
}

/** Änderungsverlauf: die eine Tabelle mit Kopfzeile Version | Datum | Änderung. */
function verlaufstabelle(doc: Knoten): Knoten {
  const treffer = (doc.content ?? []).filter((block) => {
    if (block.type !== "table") return false;
    const kopf = (block.content?.[0]?.content ?? []).map((z) =>
      (z.content?.[0]?.content ?? []).map((t) => t.text ?? "").join(""),
    );
    return (
      kopf.length === 3 &&
      kopf[0] === "Version" &&
      kopf[1] === "Datum" &&
      kopf[2] === "Änderung"
    );
  });
  if (treffer.length !== 1) {
    throw new Error(
      `Änderungsverlauf nicht eindeutig gefunden (${treffer.length} Tabellen)`,
    );
  }
  return treffer[0]!;
}

interface Fundstelle {
  pfad: string;
  alt: string;
  neu: string;
}

async function main(): Promise<void> {
  const wurzel = argument("wurzel");
  const actorId = argument("actor") ?? OWNER_PRINCIPAL;
  const trocken = process.argv.includes("--dry-run");
  const protokollPfad = argument("protokoll");
  const erwarteteSeiten = Number(argument("erwartet-seiten") ?? 18);
  const erwarteteFundstellen = Number(argument("erwartet-fundstellen") ?? 35);
  const datum =
    argument("datum") ??
    new Intl.DateTimeFormat("de-DE", {
      timeZone: "Europe/Berlin",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date());
  if (!wurzel) {
    console.error(
      "Aufruf: versionsbindung-klarstellen.ts --wurzel <uuid> [...]",
    );
    process.exit(2);
  }

  const baum = await db.execute(sql`
    WITH RECURSIVE baum AS (
      SELECT id FROM content_nodes WHERE id = ${wurzel}
      UNION ALL SELECT c.id FROM content_nodes c JOIN baum b ON c.parent_node_id = b.id)
    SELECT n.id, n.title FROM content_nodes n JOIN baum b ON b.id = n.id
    WHERE n.is_deleted = false AND n.published_revision_id IS NOT NULL
    ORDER BY n.created_at`);
  const seiten = (baum as unknown as { rows: { id: string; title: string }[] })
    .rows;

  // B2B-Quellen: über den Titel gefunden, danach als UUID festgenagelt.
  const b2b: Record<string, string> = {};
  for (const titel of B2B_TITEL) {
    const treffer = seiten.filter((s) => s.title === titel);
    if (treffer.length !== 1) {
      throw new Error(
        `»${titel}« ist im Teilbaum nicht eindeutig (${treffer.length} Seiten)`,
      );
    }
    b2b[titel] = treffer[0]!.id;
  }
  const b2bIds = new Set(Object.values(b2b));
  console.log(
    `B2B-Quellen: ${Object.entries(b2b)
      .map(([t, id]) => `${t} → ${id}`)
      .join(" | ")}`,
  );

  const erwartetPfad = argument("erwartete-ids");
  if (erwartetPfad) {
    const erwartet = JSON.parse(readFileSync(erwartetPfad, "utf-8")) as Record<
      string,
      string
    >;
    const abweichung = Object.entries(erwartet).filter(
      ([titel, uuid]) => seiten.find((s) => s.title === titel)?.id !== uuid,
    );
    if (abweichung.length > 0) {
      throw new Error(
        `UUID-Abgleich fehlgeschlagen: ${abweichung.map(([t]) => t).join(", ")}`,
      );
    }
    console.log(
      `UUID-Abgleich: ${Object.keys(erwartet).length} erwartete Seiten bestätigt.`,
    );
  }

  const protokoll: Record<string, unknown>[] = [];
  let fundstellenGesamt = 0;

  for (const seite of seiten) {
    const [knoten] = await db
      .select()
      .from(contentNodesTable)
      .where(eq(contentNodesTable.id, seite.id));
    const [revision] = await db
      .select()
      .from(contentRevisionsTable)
      .where(eq(contentRevisionsTable.id, knoten!.publishedRevisionId!));
    const alt = JSON.parse(
      JSON.stringify(revision!.structuredFields ?? {}),
    ) as Felder;
    const neu = JSON.parse(JSON.stringify(alt)) as Felder;
    const fundstellen: Fundstelle[] = [];

    // 1. Inhaltsbereich: Zusatz hinter einem B2B-Verweis, Satz in System und Geltung
    const doc = neu._editorContent as Knoten | undefined;
    if (doc) {
      const lauf = (n: Knoten, pfad: string): void => {
        const kinder = n.content ?? [];
        kinder.forEach((kind, i) => {
          const kindPfad = `${pfad}/content/${i}`;
          if (kind.type === "text" && typeof kind.text === "string") {
            const vorher = kinder[i - 1];
            const nachB2B =
              vorher?.type === "wikiLink" &&
              b2bIds.has(String(vorher.attrs?.nodeId ?? ""));
            if (nachB2B && kind.text.includes(ALT_B2B)) {
              const altText = kind.text;
              kind.text = altText.replace(ALT_B2B, NEU_B2B);
              fundstellen.push({
                pfad: kindPfad,
                alt: altText,
                neu: kind.text,
              });
            } else if (kind.text.includes(ALT_SUG)) {
              const altText = kind.text;
              kind.text = altText.replace(ALT_SUG, NEU_SUG);
              fundstellen.push({
                pfad: kindPfad,
                alt: altText,
                neu: kind.text,
              });
            }
          }
          lauf(kind, kindPfad);
        });
      };
      lauf(doc, "/_editorContent");
    }

    // 2. Abschnittsfelder (HTML): derselbe Zusatz hinter einem B2B-Link
    for (const [k, v] of Object.entries(neu)) {
      if (k.startsWith("_") || typeof v !== "string") continue;
      const muster = new RegExp(
        `(<a href="/node/(?:${[...b2bIds].join("|")})"[^>]*>[^<]*</a>), ${ALT_B2B}`,
        "g",
      );
      if (!muster.test(v)) continue;
      const neuerWert = v.replace(
        new RegExp(
          `(<a href="/node/(?:${[...b2bIds].join("|")})"[^>]*>[^<]*</a>), ${ALT_B2B}`,
          "g",
        ),
        `$1, ${NEU_B2B}`,
      );
      const treffer = v.split(`, ${ALT_B2B}`).length - 1;
      neu[k] = neuerWert;
      fundstellen.push({
        pfad: `/${k}`,
        alt: `${treffer}× », ${ALT_B2B}«`,
        neu: `${treffer}× », ${NEU_B2B}«`,
      });
    }

    if (fundstellen.length === 0) continue;
    const fundstellenZahl = fundstellen.reduce(
      (summe, f) =>
        summe +
        (f.alt.startsWith("1×") || !/^\d+×/.exec(f.alt)
          ? 1
          : Number(/^(\d+)×/.exec(f.alt)![1])),
      0,
    );
    fundstellenGesamt += fundstellenZahl;

    // 3. Beweis vor dem Änderungsvermerk: Nur die Fundstellen unterscheiden sich
    const textPfade = unterschiede(alt, neu);
    const unerwartet = textPfade.filter(
      (pfad) =>
        !fundstellen.some(
          (f) => pfad === f.pfad || pfad.startsWith(`${f.pfad}/`),
        ),
    );
    if (unerwartet.length > 0) {
      throw new Error(
        `${seite.title}: unerwartete Textänderung an ${unerwartet.slice(0, 3).join(", ")}`,
      );
    }

    // 4. Änderungsvermerk im Änderungsverlauf
    const [letzte] = await db
      .select({ revisionNo: contentRevisionsTable.revisionNo })
      .from(contentRevisionsTable)
      .where(eq(contentRevisionsTable.nodeId, seite.id))
      .orderBy(desc(contentRevisionsTable.revisionNo))
      .limit(1);
    const neueRevision = (letzte?.revisionNo ?? 0) + 1;
    const tabelle = verlaufstabelle(neu._editorContent as Knoten);
    tabelle.content = [
      ...(tabelle.content ?? []),
      {
        type: "tableRow",
        content: [
          textZelle(`${neueRevision}.0 (FlowCore)`),
          textZelle(datum),
          textZelle(VERMERK),
        ],
      },
    ];

    const eintrag = {
      id: seite.id,
      titel: seite.title,
      revisionAlt: revision!.revisionNo,
      versionAlt: revision!.versionLabel,
      revisionNeu: neueRevision,
      versionNeu: `${neueRevision}.0`,
      fundstellen,
      fundstellenZahl,
      geaenderteTextstellen: textPfade.length,
      verlaufszeile: `${neueRevision}.0 (FlowCore) | ${datum} | ${VERMERK}`,
      unerwarteteTextaenderungen: unerwartet.length,
      contentHashAlt: stableContentHash({
        content: revision!.content ?? null,
        structuredFields: revision!.structuredFields ?? null,
        title: revision!.title,
        versionLabel: revision!.versionLabel ?? null,
      }),
      contentHashNeu: null as string | null,
    };

    // 5. Veröffentlichen über den Arbeitskopie-Weg
    if (!trocken) {
      const [offene] = await db
        .select({ id: contentWorkingCopiesTable.id })
        .from(contentWorkingCopiesTable)
        .where(
          and(
            eq(contentWorkingCopiesTable.nodeId, seite.id),
            eq(contentWorkingCopiesTable.status, "draft"),
          ),
        );
      if (offene) {
        throw new Error(
          `${seite.title}: offene Arbeitskopie vorhanden — bitte zuerst klären`,
        );
      }
      const vorherRelationen = await db
        .select({ typ: contentRelationsTable.relationType })
        .from(contentRelationsTable)
        .where(eq(contentRelationsTable.sourceNodeId, seite.id));

      const { workingCopy } = await createWorkingCopy({
        nodeId: seite.id,
        authorId: actorId,
      });
      await updateWorkingCopy(
        workingCopy!.id,
        {
          title: revision!.title,
          content: (revision!.content ?? {}) as Record<string, unknown>,
          structuredFields: neu,
          changeType: "editorial",
          changeSummary: ZUSAMMENFASSUNG,
        },
        actorId,
      );
      await submitWorkingCopy(
        workingCopy!.id,
        { changeType: "editorial", changeSummary: ZUSAMMENFASSUNG },
        actorId,
      );

      const [knotenNeu] = await db
        .select()
        .from(contentNodesTable)
        .where(eq(contentNodesTable.id, seite.id));
      const [revNeu] = await db
        .select()
        .from(contentRevisionsTable)
        .where(eq(contentRevisionsTable.id, knotenNeu!.publishedRevisionId!));
      if (revNeu!.revisionNo !== neueRevision) {
        throw new Error(
          `${seite.title}: erwartete Revision ${neueRevision}, veröffentlicht wurde ${revNeu!.revisionNo}`,
        );
      }
      const rest = unterschiede(neu, revNeu!.structuredFields);
      if (rest.length > 0) {
        throw new Error(
          `${seite.title}: gespeicherter Stand weicht ab (${rest.slice(0, 3).join(", ")})`,
        );
      }
      const nachherRelationen = await db
        .select({ typ: contentRelationsTable.relationType })
        .from(contentRelationsTable)
        .where(eq(contentRelationsTable.sourceNodeId, seite.id));
      if (vorherRelationen.length !== nachherRelationen.length) {
        throw new Error(
          `${seite.title}: Beziehungen verändert (${vorherRelationen.length} → ${nachherRelationen.length})`,
        );
      }
      eintrag.contentHashNeu = stableContentHash({
        content: revNeu!.content ?? null,
        structuredFields: revNeu!.structuredFields ?? null,
        title: revNeu!.title,
        versionLabel: revNeu!.versionLabel ?? null,
      });
    }

    protokoll.push(eintrag);
    console.log(
      `${trocken ? "Probe" : "Veröffentlicht"}: ${seite.title} — ${fundstellenZahl} Fundstelle(n), Revision ${eintrag.revisionAlt} → ${eintrag.revisionNeu}`,
    );
  }

  console.log(
    `\nSeiten: ${protokoll.length} (erwartet ${erwarteteSeiten}) · Fundstellen: ${fundstellenGesamt} (erwartet ${erwarteteFundstellen})`,
  );
  if (protokollPfad) {
    writeFileSync(
      protokollPfad,
      JSON.stringify(
        {
          auftrag: "FC-RA-20260911 / C-01",
          datum,
          trockenlauf: trocken,
          b2bQuellen: b2b,
          seiten: protokoll,
        },
        null,
        2,
      ),
      "utf-8",
    );
    console.log(`Protokoll: ${protokollPfad}`);
  }
  if (
    protokoll.length !== erwarteteSeiten ||
    fundstellenGesamt !== erwarteteFundstellen
  ) {
    throw new Error(
      "Abweichung von den erwarteten Zahlen — nichts weiter verarbeiten, Ursache klären.",
    );
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
