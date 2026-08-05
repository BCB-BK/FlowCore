/**
 * Tests der Sitzungstoken-Verschlüsselung (Audit-Befund A3).
 *
 * Das delegierte Graph-Token trägt `Sites.Read.All`. Wenn diese
 * Verschlüsselung ausfällt oder still auf Klartext zurückfällt, steht das
 * Token wieder offen in der Datenbank. Die Tests decken deshalb ausdrücklich
 * auch die Ablehnungsfälle ab.
 */
import { describe, it, expect, vi, beforeAll } from "vitest";

// Die Konfiguration liest beim Import Umgebungsvariablen und würde ohne diese
// Werte den Start verweigern.
beforeAll(() => {
  vi.stubEnv("NODE_ENV", "test");
  vi.stubEnv("PORT", "5099");
  vi.stubEnv("DATABASE_URL", "postgres://test/test");
  vi.stubEnv("SESSION_SECRET", "test-session-secret-0123456789abcdef");
});

const laden = async () => await import("../src/lib/session-crypto");

const TOKEN =
  "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.beispielhafter-nutzdatenteil.signaturteil";

describe("encryptToken / decryptToken", () => {
  it("liefert nach dem Rundlauf exakt den Ausgangswert", async () => {
    const { encryptToken, decryptToken } = await laden();
    expect(decryptToken(encryptToken(TOKEN))).toBe(TOKEN);
  });

  it("enthält den Klartext nicht im Chiffrat", async () => {
    const { encryptToken } = await laden();
    const chiffre = encryptToken(TOKEN);
    expect(chiffre).not.toContain("beispielhafter-nutzdatenteil");
    expect(chiffre).not.toContain(TOKEN);
  });

  it("erzeugt bei gleichem Eingabewert unterschiedliche Chiffrate (Zufalls-IV)", async () => {
    const { encryptToken } = await laden();
    expect(encryptToken(TOKEN)).not.toBe(encryptToken(TOKEN));
  });

  it("verwirft ein manipuliertes Chiffrat, statt Unsinn zu liefern", async () => {
    const { encryptToken, decryptToken } = await laden();
    const chiffre = encryptToken(TOKEN);
    const verdreht = chiffre.slice(0, -4) + "AAAA";
    expect(decryptToken(verdreht)).toBeUndefined();
  });

  it("verwirft einen manipulierten Authentifizierungs-Tag", async () => {
    const { encryptToken, decryptToken } = await laden();
    const [iv, , daten] = encryptToken(TOKEN).split(".");
    const falscherTag = Buffer.alloc(16, 7).toString("base64url");
    expect(decryptToken([iv, falscherTag, daten].join("."))).toBeUndefined();
  });

  it("verwirft Klartext-Altbestände statt sie durchzureichen", async () => {
    const { decryptToken } = await laden();
    expect(decryptToken("eyJhbGciOiJIUzI1NiJ9.klartext.alt")).toBeUndefined();
  });

  it("behandelt fehlende Werte als kein Token", async () => {
    const { decryptToken } = await laden();
    expect(decryptToken(undefined)).toBeUndefined();
    expect(decryptToken("")).toBeUndefined();
  });

  it("erhält Sonderzeichen und Umlaute", async () => {
    const { encryptToken, decryptToken } = await laden();
    const wert = "äöüß <>&\"' \\n\\t ünïcödé 😀";
    expect(decryptToken(encryptToken(wert))).toBe(wert);
  });
});

describe("setGraphToken / getGraphToken", () => {
  it("legt verschlüsselt ab und liest wieder aus", async () => {
    const { setGraphToken, getGraphToken } = await laden();
    const sitzung: { graphAccessTokenEnc?: string } = {};
    setGraphToken(sitzung, TOKEN);
    expect(sitzung.graphAccessTokenEnc).toBeDefined();
    expect(sitzung.graphAccessTokenEnc).not.toContain(TOKEN);
    expect(getGraphToken(sitzung)).toBe(TOKEN);
  });

  it("liefert einen leeren String, wenn keine Sitzung vorliegt", async () => {
    const { getGraphToken } = await laden();
    expect(getGraphToken(undefined)).toBe("");
    expect(getGraphToken({})).toBe("");
  });
});
