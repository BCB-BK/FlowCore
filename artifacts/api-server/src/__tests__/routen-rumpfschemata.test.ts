/**
 * Haelt fest, was die Rumpfschemata der zuvor nur grob beschriebenen Endpunkte
 * zulassen muessen (Audit-Befund B2, Nacharbeit).
 *
 * Diese sieben Endpunkte pruefen ihren Rumpf seit jeher von Hand
 * (`typeof x !== "string"` und aehnlich). Beim Nachruesten der deklarativen
 * Pruefung darf sich das Verhalten nicht verschieben: Ein Aufruf, den die
 * Route bisher annahm, muss weiter durchkommen. Sonst entsteht genau der
 * Ausfall, den die Rumpfpruefung an GET /nodes/:id/revisions ausgeloest hat
 * (siehe routen-rumpfpruefung.test.ts).
 *
 * Je Endpunkt stehen deshalb beide Seiten im Test: Rumpf-Formen, die die Route
 * heute akzeptiert, und solche, die sie heute schon mit 400 ablehnt.
 */
import { describe, it, expect } from "vitest";
import {
  PostTokensBody,
  PutAdminSystemSettingsByKeyBody,
  PostConfidentialityConfigAssignBody,
  PostMediaImportSharepointBody,
  PostMediaValidateEmbedBody,
  PutRbacSodConfigByRuleKeyBody,
  PostPrincipalsByIdDelegationsBody,
} from "@workspace/api-zod";

// Je Endpunkt: was die Route heute AKZEPTIERT und was sie heute schon mit 400 ABLEHNT.
const faelle = [
  [
    "POST /tokens",
    PostTokensBody,
    [
      { name: "Mein Token" },
      { name: "x", expiresAt: "2027-01-01T00:00:00Z" },
      { name: "x", expiresAt: null },
    ],
    [{}, { expiresAt: "2027-01-01" }, { name: 5 }],
  ],
  [
    "PUT /admin/system-settings/:key",
    PutAdminSystemSettingsByKeyBody,
    [{ value: "an" }, { value: "" }],
    [{}, { value: true }],
  ],
  [
    "POST /confidentiality-config/assign",
    PostConfidentialityConfigAssignBody,
    [{ level: "internal", principalId: "p1" }],
    [{ level: "internal" }, { principalId: "p1" }, {}],
  ],
  [
    "POST /media/import-sharepoint",
    PostMediaImportSharepointBody,
    [
      { driveId: "d", itemId: "i", filename: "f.pdf" },
      { driveId: "d", itemId: "i", filename: "f.pdf", nodeId: "n" },
    ],
    [{ driveId: "d", itemId: "i" }, {}],
  ],
  [
    "POST /media/validate-embed",
    PostMediaValidateEmbedBody,
    [{ url: "https://a.example" }],
    [{}, { url: 1 }],
  ],
  [
    "PUT /rbac/sod-config/:ruleKey",
    PutRbacSodConfigByRuleKeyBody,
    [{ isEnabled: true }, { isEnabled: false }],
    [{}, { isEnabled: "ja" }],
  ],
  [
    "POST /principals/:id/delegations",
    PostPrincipalsByIdDelegationsBody,
    [
      { deputyId: "d", startsAt: "2026-01-01" },
      {
        deputyId: "d",
        startsAt: "2026-01-01",
        endsAt: null,
        scope: null,
        reason: null,
      },
      {
        deputyId: "d",
        startsAt: "2026-01-01",
        endsAt: "2026-02-01",
        scope: "all",
        reason: "Urlaub",
      },
    ],
    [{ deputyId: "d" }, { startsAt: "2026-01-01" }, {}],
  ],
] as const;

describe("B2: neue Rumpfschemata bilden das bisherige Verhalten ab", () => {
  for (const [name, schema, gueltig, ungueltig] of faelle) {
    it(`${name}`, () => {
      for (const b of gueltig) {
        const r = schema.safeParse(b);
        expect(
          r.success,
          `haette akzeptiert werden muessen: ${JSON.stringify(b)}`,
        ).toBe(true);
      }
      for (const b of ungueltig) {
        const r = schema.safeParse(b);
        expect(
          r.success,
          `haette abgelehnt werden muessen: ${JSON.stringify(b)}`,
        ).toBe(false);
      }
      console.log(
        `  ${name}: ${gueltig.length} gueltig akzeptiert, ${ungueltig.length} ungueltig abgelehnt`,
      );
    });
  }
});
