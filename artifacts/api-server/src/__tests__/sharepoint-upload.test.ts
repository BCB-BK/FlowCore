/**
 * Laufzeitbeweis für den gestückelten SharePoint-Upload.
 *
 * Hintergrund: Bis zur Anhebung der Grenze auf 100 MB ging jede Datei über
 * einen einzigen PUT auf `/content`. Für grosse Dateien sieht Microsoft Graph
 * stattdessen eine Upload-Session mit Stückelung vor. Da SharePoint die aktive
 * Standard-Ablage ist, laufen ab 4 MB nun **alle** Uploads über den neuen Weg —
 * auch solche, die vorher schon funktionierten. Genau deshalb wird er hier
 * gegen ein nachgebildetes Graph-API geprüft: Stückgrenzen, Content-Range,
 * Abschluss-Antwort und das Aufräumen nach einem Fehler.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const GRAPH_AUFRUFE: string[] = [];
let SITZUNGS_ANTWORT: unknown = { uploadUrl: "https://sp.invalid/session/1" };

vi.mock("@microsoft/microsoft-graph-client", () => ({
  Client: {
    init: () => ({
      api: (pfad: string) => {
        GRAPH_AUFRUFE.push(pfad);
        return {
          post: async () => SITZUNGS_ANTWORT,
          putStream: async () => ({ webUrl: "https://sp.invalid/einfach" }),
        };
      },
    }),
  },
}));

vi.mock("../lib/logger", () => ({
  logger: { error: () => {}, warn: () => {}, info: () => {} },
}));

interface StueckAufruf {
  range: string | undefined;
  laenge: number;
  methode: string;
}

const STUECKE: StueckAufruf[] = [];
const originalFetch = globalThis.fetch;

/** Ein Vorgang: 2 MiB Stücke, damit der Test schnell bleibt. */
function ruesteFetch(
  abschlussNach: number,
  fehlerBei: number | null = null,
): void {
  let gesehen = 0;
  globalThis.fetch = (async (url: unknown, init: RequestInit = {}) => {
    const ziel = String(url);

    // Token-Abruf bei Entra.
    if (ziel.includes("login.microsoftonline.com")) {
      return new Response(JSON.stringify({ access_token: "token" }), {
        status: 200,
      });
    }

    if (init.method === "DELETE") {
      STUECKE.push({ range: undefined, laenge: 0, methode: "DELETE" });
      return new Response(null, { status: 204 });
    }

    const kopf = new Headers(init.headers as Record<string, string>);
    const koerper = init.body as Uint8Array;
    gesehen += 1;
    STUECKE.push({
      range: kopf.get("Content-Range") ?? undefined,
      laenge: koerper.byteLength,
      methode: init.method ?? "?",
    });

    if (fehlerBei !== null && gesehen === fehlerBei) {
      return new Response("Dienst nicht erreichbar", { status: 503 });
    }
    if (gesehen >= abschlussNach) {
      return new Response(
        JSON.stringify({ webUrl: "https://sp.invalid/fertig" }),
        { status: 201 },
      );
    }
    return new Response(null, { status: 202 });
  }) as typeof fetch;
}

const KONFIG = {
  siteId: "site",
  driveId: "drive",
  basePath: "Medien",
  tenantId: "tenant",
  clientId: "client",
  clientSecret: "geheim",
};

async function ladeAnbieter() {
  const { SharePointStorageProvider } =
    await import("../services/sharepoint-storage.service");
  return new SharePointStorageProvider(KONFIG);
}

beforeEach(() => {
  GRAPH_AUFRUFE.length = 0;
  STUECKE.length = 0;
  SITZUNGS_ANTWORT = { uploadUrl: "https://sp.invalid/session/1" };
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("SharePoint-Upload", () => {
  it("nimmt kleine Dateien weiterhin über den einfachen PUT (kein Verhaltenswechsel)", async () => {
    ruesteFetch(1);
    const anbieter = await ladeAnbieter();
    const ergebnis = await anbieter.upload("klein.png", Buffer.alloc(1024, 1), {
      mimeType: "image/png",
      originalFilename: "klein.png",
    });

    expect(GRAPH_AUFRUFE.some((p) => p.endsWith("/content"))).toBe(true);
    expect(GRAPH_AUFRUFE.some((p) => p.endsWith("/createUploadSession"))).toBe(
      false,
    );
    expect(ergebnis.url).toBe("https://sp.invalid/einfach");
    expect(ergebnis.sizeBytes).toBe(1024);
  });

  it("stückelt grosse Dateien lückenlos und meldet die richtigen Bereiche", async () => {
    // 25 MiB bei 10 MiB Stückgrösse: 10 + 10 + 5.
    const gesamt = 25 * 1024 * 1024;
    ruesteFetch(3);
    const anbieter = await ladeAnbieter();
    const ergebnis = await anbieter.upload(
      "gross.mp4",
      Buffer.alloc(gesamt, 7),
      {
        mimeType: "video/mp4",
        originalFilename: "gross.mp4",
      },
    );

    expect(GRAPH_AUFRUFE.some((p) => p.endsWith("/createUploadSession"))).toBe(
      true,
    );
    expect(STUECKE.map((s) => s.range)).toEqual([
      `bytes 0-10485759/${gesamt}`,
      `bytes 10485760-20971519/${gesamt}`,
      `bytes 20971520-${gesamt - 1}/${gesamt}`,
    ]);
    // Summe der Stücke muss exakt die Datei ergeben — kein Byte doppelt, keines fehlt.
    expect(STUECKE.reduce((s, t) => s + t.laenge, 0)).toBe(gesamt);
    expect(STUECKE.every((s) => s.methode === "PUT")).toBe(true);
    expect(ergebnis.url).toBe("https://sp.invalid/fertig");
    expect(ergebnis.sizeBytes).toBe(gesamt);
  });

  it("bricht bei einem fehlgeschlagenen Stück ab und räumt die Sitzung ab", async () => {
    ruesteFetch(3, 2);
    const anbieter = await ladeAnbieter();

    await expect(
      anbieter.upload("gross.mp4", Buffer.alloc(25 * 1024 * 1024, 7), {
        mimeType: "video/mp4",
        originalFilename: "gross.mp4",
      }),
    ).rejects.toThrow(/503/);

    // Nach dem gescheiterten zweiten Stück darf kein drittes mehr folgen,
    // und die angefangene Sitzung muss verworfen werden.
    expect(STUECKE.filter((s) => s.methode === "PUT")).toHaveLength(2);
    expect(STUECKE.some((s) => s.methode === "DELETE")).toBe(true);
  });

  it("meldet einen Fehler, wenn Graph keine uploadUrl liefert", async () => {
    SITZUNGS_ANTWORT = {};
    ruesteFetch(1);
    const anbieter = await ladeAnbieter();

    await expect(
      anbieter.upload("gross.mp4", Buffer.alloc(25 * 1024 * 1024, 7), {
        mimeType: "video/mp4",
        originalFilename: "gross.mp4",
      }),
    ).rejects.toThrow(/uploadUrl/);
  });
});
