/**
 * Abzug der Content-API-Seitenantworten ohne HTTP — über denselben Codepfad,
 * den die Route nutzt (projectPublishedPage + formatiereSeite).
 *
 * WARUM: Für die Prüfung auf DEV ist kein Integrationsschlüssel verfügbar.
 * Der Abzug ist damit KEIN Ersatz für den HTTP-Nachweis (Reaudit T-05), aber
 * er belegt Inhalt, Felder und Verweise der Antwort.
 *
 * Aufruf: tsx src/scripts/abzug-inprocess.ts <wurzel-uuid> <zielordner>
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { sql } from "drizzle-orm";
import { db } from "@workspace/db";
import { projectPublishedPage } from "../services/copilot-content-projection.service";
import { formatiereSeite } from "../lib/content-api-page-format";

const [wurzel, ziel] = process.argv.slice(2);

async function main(): Promise<void> {
  if (!wurzel || !ziel) {
    console.error("Aufruf: abzug-inprocess.ts <wurzel-uuid> <zielordner>");
    process.exit(2);
  }
  mkdirSync(join(ziel, "seiten"), { recursive: true });
  const r = await db.execute(sql`
    WITH RECURSIVE baum AS (
      SELECT id FROM content_nodes WHERE id = ${wurzel}
      UNION ALL SELECT c.id FROM content_nodes c JOIN baum b ON c.parent_node_id = b.id)
    SELECT n.id FROM content_nodes n JOIN baum b ON b.id = n.id
    WHERE n.is_deleted = false AND n.published_revision_id IS NOT NULL`);
  const ids = ((r as unknown as { rows: { id: string }[] }).rows ?? []).map(
    (x) => x.id,
  );

  const index: Record<string, string> = {};
  for (const id of ids) {
    const p = await projectPublishedPage(id, { requireGraphAcl: false });
    if (!p) continue;
    const datei = `${id}.markdown.json`;
    writeFileSync(
      join(ziel, "seiten", datei),
      JSON.stringify(formatiereSeite(p, "markdown"), null, 2),
      "utf-8",
    );
    writeFileSync(
      join(ziel, "seiten", `${id}.full.json`),
      JSON.stringify(formatiereSeite(p, "full"), null, 2),
      "utf-8",
    );
    index[id] = datei;
  }
  writeFileSync(
    join(ziel, "index.json"),
    JSON.stringify(
      {
        art: "in-process",
        wurzel,
        erzeugt: new Date().toISOString(),
        seiten: index,
      },
      null,
      2,
    ),
    "utf-8",
  );
  console.log(`Abzug: ${Object.keys(index).length} Seiten nach ${ziel}`);
  process.exit(0);
}

main().catch((e: unknown) => {
  console.error("ABBRUCH:", e instanceof Error ? e.message : e);
  process.exit(1);
});
