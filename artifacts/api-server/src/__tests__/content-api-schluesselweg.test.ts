/**
 * Laufzeitbeweis: Eine Content-API-Anfrage mit `X-FlowCore-Api-Key` erreicht die
 * Schlüsselprüfung, statt an der globalen Anmeldesperre zu scheitern.
 *
 * Gemeldet am 11.09.2026: Ein neu erzeugter Integrationsschlüssel lieferte bei
 * `GET /api/content/v1/scope` stets 401 »Authentication required« (35 Bytes);
 * derselbe Aufruf mit `Authorization: Bearer` erreichte die Schlüsselprüfung.
 */
import { describe, it, expect } from "vitest";
import {
  CONTENT_API_PFAD,
  istContentApiSchluesselAnfrage,
} from "../lib/integration-key-bypass";

describe("Durchlass für Content-API-Anfragen mit Integrationsschlüssel", () => {
  const schluessel = { "x-flowcore-api-key": "fc_int_beispielwert" };

  it("lässt den dokumentierten Header zu allen Datenrouten durch", () => {
    for (const pfad of [
      "/content/v1/scope",
      "/content/v1/pages",
      "/content/v1/pages/abc",
      "/content/v1/changes",
      "/content/v1/search",
      "/content/v1/glossary",
    ]) {
      expect(istContentApiSchluesselAnfrage(pfad, schluessel)).toBe(true);
    }
  });

  it("lässt ohne Header nichts durch — die Sperre bleibt für alle anderen Anfragen", () => {
    expect(istContentApiSchluesselAnfrage("/content/v1/scope", {})).toBe(false);
    expect(istContentApiSchluesselAnfrage("/content/v1/openapi.json", {})).toBe(
      false,
    );
    expect(
      istContentApiSchluesselAnfrage("/content/v1/scope", {
        "x-flowcore-api-key": "   ",
      }),
    ).toBe(false);
  });

  it("öffnet keine anderen Bereiche, auch nicht mit Header", () => {
    for (const pfad of [
      "/content/nodes/abc",
      "/content/v1",
      "/contentv1/scope",
      "/admin/backups",
      "/integration-keys",
    ]) {
      expect(istContentApiSchluesselAnfrage(pfad, schluessel)).toBe(false);
    }
    expect(CONTENT_API_PFAD).toBe("/content/v1/");
  });
});
