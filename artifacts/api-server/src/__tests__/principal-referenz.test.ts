/**
 * Personenangaben aus dem Formular müssen auf die interne Kennung vereinheitlicht
 * werden, bevor sie gespeichert werden.
 *
 * Hintergrund: `GET /principals/graph/people` liefert zweierlei im selben Feld
 * `id` — bei einem Treffer aus Microsoft Graph die Entra-Objektkennung, beim
 * Rückfall auf den lokalen Bestand die interne Kennung. Was ankommt, hängt
 * allein daran, ob Graph gerade antwortet. Ungeprüft gespeichert zeigt der Wert
 * später ins Leere: In Produktion waren 184 von 184 Eigentümerverweisen
 * unauflösbar, 873 Abfragen endeten mit 404, und der Eigentümer einer
 * vertraulichen Seite wurde nie als solcher erkannt.
 *
 * Die Datenbank ist ersetzt: `antworten` gibt der Reihe nach zurück, was die
 * Abfragen liefern sollen — erst die Suche nach der internen Kennung, dann die
 * nach der Entra-Kennung.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const INTERN = "11111111-1111-4111-8111-111111111111";
const ENTRA = "22222222-2222-4222-8222-222222222222";
const UNBEKANNT = "33333333-3333-4333-8333-333333333333";

let antworten: Record<string, unknown>[][] = [];
let abfragen = 0;
let graphPerson: Record<string, unknown> | null = null;
const angelegt: Record<string, unknown>[] = [];

vi.mock("../lib/config", () => ({ appConfig: { nodeEnv: "test" } }));
vi.mock("../lib/logger", () => ({
  logger: { warn: () => {}, error: () => {}, info: () => {} },
}));

vi.mock("@workspace/db", () => ({
  db: {
    select: () => ({
      from: () => ({
        where: async () => {
          abfragen += 1;
          return antworten.shift() ?? [];
        },
      }),
    }),
    insert: () => ({
      values: (werte: Record<string, unknown>) => {
        angelegt.push(werte);
        return { returning: async () => [{ id: "neu-angelegt" }] };
      },
    }),
    update: () => ({ set: () => ({ where: async () => undefined }) }),
  },
}));

vi.mock("@workspace/db/schema", () => ({
  principalsTable: {},
  roleAssignmentsTable: {},
  confidentialityPrincipalAccessTable: {},
}));

vi.mock("../services/graph-client.service", () => ({
  getPersonById: async () => graphPerson,
}));

const { resolvePrincipalReference } =
  await import("../services/principal.service");

beforeEach(() => {
  antworten = [];
  abfragen = 0;
  graphPerson = null;
  angelegt.length = 0;
});

describe("resolvePrincipalReference", () => {
  it("gibt für eine leere Angabe null zurück", async () => {
    expect(await resolvePrincipalReference(null)).toBeNull();
    expect(await resolvePrincipalReference(undefined)).toBeNull();
    expect(await resolvePrincipalReference("   ")).toBeNull();
    expect(abfragen).toBe(0);
  });

  it("weist einen Freitext ab, ohne die Datenbank zu fragen", async () => {
    // Ohne Formprüfung liefe der Wert in einen Postgres-Typfehler statt in eine
    // saubere Ablehnung.
    expect(await resolvePrincipalReference("Frau Müller")).toBeNull();
    expect(abfragen).toBe(0);
  });

  it("reicht eine bereits interne Kennung unverändert durch", async () => {
    antworten = [[{ id: INTERN }]];
    expect(await resolvePrincipalReference(INTERN)).toBe(INTERN);
  });

  it("löst eine Entra-Kennung auf die interne Kennung auf", async () => {
    antworten = [[], [{ id: INTERN }]];
    expect(await resolvePrincipalReference(ENTRA)).toBe(INTERN);
  });

  it("gibt null zurück, wenn die Person nirgends bekannt ist", async () => {
    antworten = [[], []];
    expect(await resolvePrincipalReference(UNBEKANNT)).toBeNull();
  });

  it("fragt Graph nur, wenn ein Zugriffstoken vorliegt", async () => {
    antworten = [[], []];
    graphPerson = { displayName: "Neue Person", mail: "neu@example.invalid" };
    // ohne Token: kein Anlegen
    expect(await resolvePrincipalReference(UNBEKANNT)).toBeNull();
    expect(angelegt).toHaveLength(0);
  });

  it("legt eine in Graph bekannte, lokal unbekannte Person an", async () => {
    // 1. interne Suche, 2. externe Suche, 3. upsertPrincipal sucht erneut
    antworten = [[], [], []];
    graphPerson = {
      displayName: "Neue Person",
      mail: "neu@example.invalid",
      userPrincipalName: "neu@example.invalid",
    };
    expect(await resolvePrincipalReference(UNBEKANNT, "token")).toBe(
      "neu-angelegt",
    );
    expect(angelegt[0]).toMatchObject({
      externalId: UNBEKANNT,
      externalProvider: "entra",
      displayName: "Neue Person",
    });
  });
});
