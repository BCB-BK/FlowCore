/**
 * Laufzeitbeweis für die Prüfentscheidung: Ein echter Aufruf muss durch die
 * Middleware-Kette bis in den Handler kommen.
 *
 * Der Wächter in `review-rumpfschema.test.ts` liest Quelltexte. Dieser Test
 * schickt tatsächlich eine Anfrage — echtes `validateBody`, echtes Zod-Schema,
 * echte Route. Nur die Aussenwelt (Datenbank, Anmeldung, Rechte) ist ersetzt.
 *
 * Hintergrund: An der Route hing das Schema fürs ANLEGEN einer Löschanfrage
 * (Pflichtfelder `nodeId`, `reason`). Die Oberfläche sendet `{ decision }`.
 * Jede Genehmigung endete mit 400 „Validierungsfehler" — gemeldet 10.09.2026.
 *
 * DIE PROBE: Die Datenbank liefert hier bewusst KEINE Löschanfrage zurück. Ein
 * Aufruf, der die Rumpfprüfung passiert, endet deshalb mit **404**. Kommt
 * stattdessen 400, hängt wieder das falsche Schema an der Route — genau der
 * gemeldete Fehler.
 */
import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import type { Server } from "node:http";

vi.mock("../lib/config", () => ({ appConfig: { nodeEnv: "test" } }));

vi.mock("../middlewares/require-auth", () => ({
  requireAuth: (
    req: { user?: unknown },
    _res: unknown,
    next: () => void,
  ): void => {
    req.user = {
      principalId: "00000000-0000-4000-8000-000000000001",
      externalId: "pruefung",
      displayName: "Prüfung",
      email: "pruefung@example.invalid",
    };
    next();
  },
}));

vi.mock("../middlewares/require-permission", () => ({
  requirePermission: () => (_req: unknown, _res: unknown, next: () => void) =>
    next(),
}));

vi.mock("../services/rbac.service", () => ({
  hasPermission: async () => true,
}));

vi.mock("../lib/logger", () => ({
  logger: { error: () => {}, warn: () => {}, info: () => {} },
}));

// Die Auswahl liefert absichtlich nichts — siehe DIE PROBE im Kopf.
vi.mock("@workspace/db", () => ({
  db: {
    select: () => ({
      from: () => ({
        where: async () => [],
        leftJoin: () => ({ where: async () => [] }),
        orderBy: async () => [],
      }),
    }),
  },
  pool: {},
}));

vi.mock("@workspace/db/schema", () => ({
  deletionRequestsTable: { id: "id", nodeId: "node_id", status: "status" },
  contentNodesTable: {},
  principalsTable: {},
  auditEventsTable: {},
}));

let server: Server;
let basis: string;

beforeAll(async () => {
  const express = (await import("express")).default;
  const { deletionRequestsRouter } =
    await import("../routes/deletion-requests");
  const app = express();
  app.use(express.json());
  app.use("/api/content", deletionRequestsRouter);
  await new Promise<void>((fertig) => {
    server = app.listen(0, "127.0.0.1", () => fertig());
  });
  const adresse = server.address();
  const port = typeof adresse === "object" && adresse ? adresse.port : 0;
  basis = `http://127.0.0.1:${port}`;
});

afterAll(async () => {
  if (server) await new Promise<void>((fertig) => server.close(() => fertig()));
});

const ANFRAGE_ID = "3fa85f64-5717-4562-b3fc-2c963f66afa6";

async function entscheide(rumpf: unknown): Promise<{
  status: number;
  rumpf: Record<string, unknown>;
}> {
  const antwort = await fetch(
    `${basis}/api/content/deletion-requests/${ANFRAGE_ID}/review`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(rumpf),
    },
  );
  return {
    status: antwort.status,
    rumpf: (await antwort.json()) as Record<string, unknown>,
  };
}

describe("POST /deletion-requests/:id/review", () => {
  it("nimmt { decision } an — der Fall, der in Produktion mit 400 scheiterte", async () => {
    const a = await entscheide({ decision: "approved" });
    expect(
      a.status,
      `Erwartet 404 (Rumpfpruefung passiert), kam ${a.status}: ${JSON.stringify(a.rumpf)}`,
    ).toBe(404);
  });

  it("nimmt auch eine Ablehnung mit Kommentar an", async () => {
    const a = await entscheide({
      decision: "rejected",
      comment: "Seite wird noch gebraucht",
    });
    expect(a.status).toBe(404);
  });

  it("weist einen leeren Rumpf weiterhin mit 400 ab", async () => {
    const a = await entscheide({});
    expect(a.status).toBe(400);
  });

  it("weist eine unbekannte Entscheidung weiterhin mit 400 ab", async () => {
    const a = await entscheide({ decision: "vielleicht" });
    expect(a.status).toBe(400);
  });
});
