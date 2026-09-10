/**
 * Wacht über die ZUORDNUNG von Rumpfschema und Route — nicht nur über das
 * Schema für sich.
 *
 * Am 10.09.2026 gemeldet: „Löschen ist noch immer Fehler", jede Genehmigung in
 * der Review-Inbox endete mit 400 „Validierungsfehler". Ursache war nicht das
 * Schema, sondern seine Zuordnung: An `POST /deletion-requests/:id/review` hing
 * `CreateDeletionRequestBody` — das Schema fürs ANLEGEN, mit den Pflichtfeldern
 * `nodeId` und `reason`. Eine Prüfentscheidung schickt aber `{ decision }`.
 * Die Prüfung war damit unerfüllbar, für jeden Aufruf und jeden Benutzer.
 *
 * Das ist der dritte Fall derselben Familie (siehe `routen-rumpfpruefung.test.ts`:
 * GET /nodes/:id/revisions, POST /media/upload). Die beiden vorhandenen Wächter
 * fangen ihn nicht: Der eine prüft, dass keine Rumpfprüfung an GET/DELETE hängt,
 * der andere prüft Schemata für sich allein. Keiner prüft, ob an einer Route das
 * Schema hängt, das die Spezifikation für sie vorsieht.
 *
 * Deshalb hier beides: was das Schema zulassen muss, und dass es tatsächlich an
 * dieser Route hängt.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { ReviewDeletionRequestBody } from "@workspace/api-zod";

const hier = dirname(fileURLToPath(import.meta.url));
const ROUTE_DATEI = join(hier, "..", "routes", "deletion-requests.ts");

describe("Rumpfschema der Prüfentscheidung", () => {
  it("lässt durch, was die Oberfläche tatsächlich sendet", () => {
    // ReviewInboxPage ruft `mutateAsync({ requestId, data: { decision } })`.
    expect(
      ReviewDeletionRequestBody.safeParse({ decision: "approved" }).success,
    ).toBe(true);
    expect(
      ReviewDeletionRequestBody.safeParse({ decision: "rejected" }).success,
    ).toBe(true);
    expect(
      ReviewDeletionRequestBody.safeParse({
        decision: "rejected",
        comment: "Seite wird noch gebraucht",
      }).success,
    ).toBe(true);
  });

  it("weist unbrauchbare Entscheidungen weiterhin ab", () => {
    expect(ReviewDeletionRequestBody.safeParse({}).success).toBe(false);
    expect(
      ReviewDeletionRequestBody.safeParse({ decision: "vielleicht" }).success,
    ).toBe(false);
  });

  it("verlangt NICHT die Felder des Anlege-Schemas — genau daran scheiterte es", () => {
    // Waere hier weiterhin CreateDeletionRequestBody verdrahtet, muesste dieser
    // Rumpf abgelehnt werden, weil nodeId und reason fehlen.
    const r = ReviewDeletionRequestBody.safeParse({ decision: "approved" });
    expect(r.success).toBe(true);
  });

  it("haengt auch wirklich an der Review-Route", () => {
    const quelle = readFileSync(ROUTE_DATEI, "utf8");
    const stelle = quelle.indexOf('"/deletion-requests/:requestId/review"');
    expect(stelle, "Review-Route nicht gefunden").toBeGreaterThan(-1);

    // Der Abschnitt bis zum Beginn des Handlers traegt die Middleware-Kette.
    const kette = quelle.slice(
      stelle,
      quelle.indexOf("async (req, res)", stelle),
    );
    expect(kette).toContain("validateBody(ReviewDeletionRequestBody)");
    expect(kette).not.toContain("CreateDeletionRequestBody");
  });

  it("laesst das Anlege-Schema nicht als Altlast zurueck", () => {
    // Gemessen 10.09.2026: Die Anlege-Route prueft ihren Rumpf gar nicht
    // (`router.post("/deletion-requests", requireAuth, ...)`). Das Anlege-Schema
    // hing AUSSCHLIESSLICH an der Review-Route — nach der Korrektur darf es in
    // dieser Datei nirgends mehr vorkommen, auch nicht als ungenutzter Import.
    const quelle = readFileSync(ROUTE_DATEI, "utf8");
    expect(quelle).not.toContain("CreateDeletionRequestBody");
  });
});
