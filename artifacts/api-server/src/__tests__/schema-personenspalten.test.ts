/**
 * Wacht darüber, dass Personenverweise im Datenmodell geprüft sind.
 *
 * Ein Verweis auf eine Person gehört als `uuid` mit Fremdschlüssel auf
 * `principals` modelliert. Steht er als freier Text da, kann die Datenbank
 * nichts prüfen — und es landet, was der Aufrufer schickt.
 *
 * Genau das ist passiert: In `content_nodes.owner_id` (Text, ohne
 * Fremdschlüssel) speicherte das Formular die Entra-Objektkennung statt der
 * internen. Abgefragt wurde sie später über die interne — Ergebnis: 184 von
 * 184 Verweisen unauflösbar, 873 Anfragen mit 404, und der Eigentümer einer
 * vertraulichen Seite wurde nie als solcher erkannt.
 *
 * Der Test lässt die bekannten Altlasten ausdrücklich stehen (Liste unten),
 * verhindert aber, dass **neue** ungeprüfte Personenspalten hinzukommen. Wer
 * eine Altlast repariert, streicht sie aus der Liste — dann wird der Fortschritt
 * hier sichtbar.
 */
import { describe, it, expect } from "vitest";
import { getTableConfig, type PgTable } from "drizzle-orm/pg-core";
import * as schema from "@workspace/db/schema";

/** Spaltennamen, die eine Person bezeichnen. */
function istPersonenspalte(name: string): boolean {
  if (name.endsWith("_by")) return true;
  return [
    "owner_id",
    "actor_id",
    "principal_id",
    "author_id",
    "deputy_id",
    "approver_id",
    "reviewer_id",
    "recipient_id",
    "assignee_id",
  ].includes(name);
}

/**
 * Altlasten aus der Zeit vor der Vereinheitlichung: als Text modelliert, von der
 * Datenbank ungeprüft. Diese Liste darf wachsen — aber nur nach bewusster
 * Entscheidung, nicht aus Versehen. Sie zu verkürzen ist das Ziel.
 */
const BEKANNTE_ALTLASTEN = new Set([
  "approvals.reviewer_id",
  "confidentiality_principal_access.assigned_by",
  "content_working_copies.approver_id",
  "content_working_copies.reviewer_id",
  "ai_field_profiles.updated_by",
  "ai_settings.updated_by",
  "ai_usage_logs.principal_id",
  "audit_events.actor_id",
  "backup_runs.triggered_by",
  "confidentiality_access_config.updated_by",
  "content_aliases.changed_by",
  "content_relations.created_by",
  "content_revision_events.actor_id",
  "content_revisions.author_id",
  "content_revisions.approver_id",
  "content_revisions.reviewer_id",
  "content_working_copies.author_id",
  "content_working_copies.locked_by",
  "content_working_copies.submitted_by",
  "deletion_requests.requested_by",
  "deletion_requests.reviewed_by",
  "glossary_terms.created_by",
  "media_assets.uploaded_by",
  "releases.audited_by",
  "releases.created_by",
  "releases.released_by",
  "review_workflows.initiated_by",
  "source_references.created_by",
  "source_systems.created_by",
  "system_settings.updated_by",
  "workflow_templates.created_by",
  "workflow_templates.updated_by",
  "working_copy_events.actor_id",
]);

interface Fund {
  stelle: string;
  grund: string;
}

function ungepruefdtePersonenspalten(): Fund[] {
  const funde: Fund[] = [];
  for (const wert of Object.values(schema)) {
    let config: ReturnType<typeof getTableConfig>;
    try {
      config = getTableConfig(wert as PgTable);
    } catch {
      continue; // kein Tabellenobjekt (Enum, Zod-Schema, Relation)
    }
    const fremdschluesselSpalten = new Set(
      config.foreignKeys.flatMap((fk) =>
        fk.reference().columns.map((c) => c.name),
      ),
    );
    for (const spalte of config.columns) {
      if (!istPersonenspalte(spalte.name)) continue;
      const stelle = `${config.name}.${spalte.name}`;
      const istUuid = spalte.columnType === "PgUUID";
      const hatFk = fremdschluesselSpalten.has(spalte.name);
      if (istUuid && hatFk) continue;
      funde.push({
        stelle,
        grund: !istUuid
          ? "als Text statt uuid modelliert"
          : "ohne Fremdschlüssel",
      });
    }
  }
  return funde;
}

describe("Personenverweise im Datenmodell", () => {
  it("kommen ohne neue ungeprüfte Spalten aus", () => {
    const neue = ungepruefdtePersonenspalten().filter(
      (f) => !BEKANNTE_ALTLASTEN.has(f.stelle),
    );
    const beschreibung = neue.map((f) => `${f.stelle} — ${f.grund}`).join("\n");
    expect(
      neue,
      `Diese Personenverweise kann die Datenbank nicht prüfen:\n${beschreibung}\n` +
        `Als uuid mit Fremdschlüssel auf principals modellieren — oder, wenn es ` +
        `bewusst so bleiben soll, in BEKANNTE_ALTLASTEN aufnehmen.`,
    ).toEqual([]);
  });

  it("führt content_nodes.owner_id als geprüft", () => {
    // Der Verweis, an dem die Vermischung aufgefallen ist. Fällt er zurück auf
    // Text, wäre der Fehler ohne Vorwarnung wieder möglich.
    const stellen = ungepruefdtePersonenspalten().map((f) => f.stelle);
    expect(stellen).not.toContain("content_nodes.owner_id");
  });

  it("erkennt Personenspalten überhaupt (Schutz vor stillem Leerlauf)", () => {
    // Fällt die Erkennung aus, wären die Prüfungen oben stillschweigend grün.
    const alle = ungepruefdtePersonenspalten();
    expect(alle.length).toBeGreaterThan(0);
    expect(BEKANNTE_ALTLASTEN.size).toBeGreaterThan(10);
  });
});
