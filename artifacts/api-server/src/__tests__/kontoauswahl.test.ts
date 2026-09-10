/**
 * Laufzeitbeweis: Die Anmeldung verlangt eine Kontoauswahl.
 *
 * Gemeldet am 10.09.2026: Der Knopf „Mit Microsoft anmelden" führte ohne jede
 * Auswahl direkt auf `?auth_error=group_not_authorized`. Ursache war der
 * fehlende `prompt`-Parameter — Entra nimmt dann das im Browser bereits
 * angemeldete Konto. Wer zwei Konten hat (Arbeits- und Administratorkonto),
 * landet mit dem falschen hier und kommt aus der Abweisung nicht heraus.
 *
 * Der Test greift an der Stelle an, die es betrifft: Was reicht `getAuthUrl`
 * an MSAL weiter?
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const ERFASSTE_AUFRUFE: Record<string, unknown>[] = [];

vi.mock("@azure/msal-node", () => ({
  ConfidentialClientApplication: class {
    async getAuthCodeUrl(parameter: Record<string, unknown>): Promise<string> {
      ERFASSTE_AUFRUFE.push(parameter);
      return "https://login.microsoftonline.com/pruefung/authorize";
    }
  },
}));

vi.mock("../lib/config", () => ({
  appConfig: {
    entraClientId: "client",
    entraClientSecret: "geheim",
    entraTenantId: "tenant",
    entraRedirectUri: "https://example.invalid/api/auth/callback",
    entraScopes: ["openid", "profile"],
    nodeEnv: "test",
  },
}));

vi.mock("../lib/logger", () => ({
  logger: { error: () => {}, warn: () => {}, info: () => {} },
}));

beforeEach(() => {
  ERFASSTE_AUFRUFE.length = 0;
});

describe("getAuthUrl", () => {
  it("verlangt die Kontoauswahl — sonst waehlt Entra stillschweigend", async () => {
    const { getAuthUrl } = await import("../services/auth.service");
    await getAuthUrl("zustand");

    expect(ERFASSTE_AUFRUFE).toHaveLength(1);
    expect(ERFASSTE_AUFRUFE[0]?.["prompt"]).toBe("select_account");
  });

  it("reicht Scopes, Rueckleitung und Zustand unveraendert weiter", async () => {
    const { getAuthUrl } = await import("../services/auth.service");
    await getAuthUrl("zustand");

    const p = ERFASSTE_AUFRUFE[0]!;
    expect(p["scopes"]).toEqual(["openid", "profile"]);
    expect(p["redirectUri"]).toBe("https://example.invalid/api/auth/callback");
    expect(p["state"]).toBe("zustand");
  });
});
