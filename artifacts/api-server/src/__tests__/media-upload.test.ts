/**
 * Laufzeitbeweis für POST /media/upload: ein echter Multipart-Request muss
 * durch die Middleware-Kette bis in den Handler kommen.
 *
 * Der Wächter in `routen-rumpfpruefung.test.ts` liest Quelltexte. Dieser Test
 * schickt tatsächlich Daten: echtes busboy, echtes `validateBody`, echtes
 * Zod-Schema. Nur die Aussenwelt (Datenbank, Ablage, Anmeldung) ist ersetzt.
 *
 * Hintergrund: An der Route hing `validateBody(UploadMediaBody)`. Jenes Schema
 * verlangt `file` als `File`-Instanz — was der Browser sendet, nicht was auf
 * dem Server ankommt: busboy nimmt den Datei-Teil aus dem Rumpf heraus, in
 * `req.body` bleiben nur die Textfelder. Jeder Upload endete mit 400.
 */
import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import type { Server } from "node:http";

const HOCHGELADEN: Record<string, unknown>[] = [];

// Die echte Konfiguration erzwingt in Produktion Pflichtvariablen (ENTRA_*).
// Der Test braucht davon nur `nodeEnv` für die Fehleraufbereitung.
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

vi.mock("../services/storage.service", () => ({
  getDefaultStorageProvider: async () => ({
    upload: async (storageKey: string, buffer: Buffer) => ({
      storageKey,
      sizeBytes: buffer.length,
    }),
  }),
  getDefaultProviderId: async () => "00000000-0000-4000-8000-0000000000ff",
  getStorageProviderById: async () => ({ download: async () => ({}) }),
  getStorageProvider: () => ({ download: async () => ({}) }),
}));

vi.mock("@workspace/db", () => {
  const kette = (senke: Record<string, unknown>[]) => ({
    values: (werte: Record<string, unknown>) => {
      senke.push(werte);
      return {
        returning: async () => [{ id: "asset-1", ...werte }],
      };
    },
  });
  return {
    db: {
      transaction: async (
        fn: (tx: { insert: () => unknown }) => Promise<unknown>,
      ) => fn({ insert: () => kette(HOCHGELADEN) }),
      select: () => ({
        from: () => ({ where: async () => [] }),
      }),
    },
  };
});

vi.mock("@workspace/db/schema", () => ({
  mediaAssetsTable: {},
  mediaAssetUsagesTable: {},
  auditEventsTable: {},
}));

vi.mock("../services/rbac.service", () => ({
  hasPermission: async () => true,
}));
vi.mock("../services/confidentiality.service", () => ({
  checkConfidentialityAccess: async () => ({ allowed: true }),
}));
vi.mock("../services/sharepoint.service", () => ({
  getDriveItemContent: async () => null,
}));
vi.mock("../lib/session-crypto", () => ({ getGraphToken: () => "" }));
vi.mock("../lib/logger", () => ({
  logger: { error: () => {}, warn: () => {}, info: () => {} },
}));
vi.mock("../lib/env", () => ({
  envInt: (_n: string, standard: number) => standard,
}));

let server: Server;
let basis: string;

beforeAll(async () => {
  const express = (await import("express")).default;
  const router = (await import("../routes/media")).default;
  const app = express();
  app.use("/api/media", router);
  await new Promise<void>((fertig) => {
    server = app.listen(0, "127.0.0.1", () => fertig());
  });
  const adresse = server.address();
  const port = typeof adresse === "object" && adresse ? adresse.port : 0;
  basis = `http://127.0.0.1:${port}`;
});

afterAll(async () => {
  await new Promise<void>((fertig) => server.close(() => fertig()));
});

function formular(felder: Record<string, string> = {}): FormData {
  const daten = new FormData();
  // Ein winziges, gültiges PNG (1x1, transparent).
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
    "base64",
  );
  daten.append("file", new Blob([png], { type: "image/png" }), "pruefung.png");
  for (const [name, wert] of Object.entries(felder)) daten.append(name, wert);
  return daten;
}

describe("POST /media/upload", () => {
  it("nimmt ein Bild an (der Fall, der in Produktion mit 400 scheiterte)", async () => {
    const antwort = await fetch(`${basis}/api/media/upload`, {
      method: "POST",
      body: formular(),
    });
    const rumpf = await antwort.json();
    expect(
      antwort.status,
      `Erwartet 201, kam ${antwort.status}: ${JSON.stringify(rumpf)}`,
    ).toBe(201);
    expect(rumpf.classification).toBe("image");
    expect(rumpf.url).toMatch(/^\/api\/media\/files\//);
  });

  it("nimmt die Textfelder des Formulars mit", async () => {
    HOCHGELADEN.length = 0;
    const antwort = await fetch(`${basis}/api/media/upload`, {
      method: "POST",
      body: formular({
        altText: "Ein Bild",
        caption: "Bildunterschrift",
        nodeId: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      }),
    });
    expect(antwort.status).toBe(201);
    const gespeichert = HOCHGELADEN.find((w) => "altText" in w);
    expect(gespeichert?.altText).toBe("Ein Bild");
    expect(gespeichert?.caption).toBe("Bildunterschrift");
    expect(gespeichert?.nodeId).toBe("3fa85f64-5717-4562-b3fc-2c963f66afa6");
  });

  it("weist eine unsinnige nodeId weiterhin ab", async () => {
    const antwort = await fetch(`${basis}/api/media/upload`, {
      method: "POST",
      body: formular({ nodeId: "keine-uuid" }),
    });
    expect(antwort.status).toBe(400);
  });

  it("weist einen Aufruf ohne Datei weiterhin ab", async () => {
    const leer = new FormData();
    leer.append("altText", "ohne Datei");
    const antwort = await fetch(`${basis}/api/media/upload`, {
      method: "POST",
      body: leer,
    });
    expect(antwort.status).toBe(400);
    expect((await antwort.json()).error).toBe("No file provided");
  });
});
