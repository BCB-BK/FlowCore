/**
 * Tests der Rollen- und Rechtematrix.
 *
 * Diese Funktionen entscheiden, wer was sehen und tun darf. Sie sind rein
 * (keine Datenbank), lassen sich also vollständig prüfen — und genau das
 * fehlte bisher (Audit-Befund A5).
 */
import { describe, it, expect, vi, beforeAll } from "vitest";

beforeAll(() => {
  vi.stubEnv("NODE_ENV", "test");
  vi.stubEnv("PORT", "5099");
  vi.stubEnv("DATABASE_URL", "postgres://test/test");
  vi.stubEnv("SESSION_SECRET", "test-session-secret-0123456789abcdef");
});

const laden = async () => await import("../services/rbac.service");

describe("Rollen-Rechte-Matrix", () => {
  it("weist jeder Rolle mindestens ein Recht zu", async () => {
    const { getRolePermissionMatrix } = await laden();
    const matrix = getRolePermissionMatrix();
    expect(Object.keys(matrix).length).toBeGreaterThan(0);
    for (const [rolle, rechte] of Object.entries(matrix)) {
      expect(Array.isArray(rechte), `Rolle ${rolle}`).toBe(true);
      expect(rechte.length, `Rolle ${rolle} ohne Rechte`).toBeGreaterThan(0);
    }
  });

  it("gibt für dieselbe Rolle stabil dieselben Rechte zurück", async () => {
    const { getPermissionsForRole, getRolePermissionMatrix } = await laden();
    const rollen = Object.keys(getRolePermissionMatrix());
    for (const rolle of rollen) {
      const a = getPermissionsForRole(rolle as never);
      const b = getPermissionsForRole(rolle as never);
      expect(a).toEqual(b);
    }
  });

  it("enthält keine doppelten Rechte je Rolle", async () => {
    const { getRolePermissionMatrix } = await laden();
    for (const [rolle, rechte] of Object.entries(getRolePermissionMatrix())) {
      expect(new Set(rechte).size, `Rolle ${rolle} hat Dubletten`).toBe(
        rechte.length,
      );
    }
  });

  it("gibt der Leserolle keine verwaltenden Rechte", async () => {
    const { getPermissionsForRole } = await laden();
    const viewer = getPermissionsForRole("viewer");
    for (const verboten of [
      "manage_permissions",
      "manage_settings",
      "manage_users",
    ]) {
      expect(viewer, `viewer darf ${verboten} nicht haben`).not.toContain(
        verboten,
      );
    }
  });
});

describe("Sichtbarkeit in der Suche", () => {
  it("liefert für jede Rolle eine definierte Sichtbarkeit", async () => {
    const { getSearchVisibilityForRole, getRolePermissionMatrix } =
      await laden();
    for (const rolle of Object.keys(getRolePermissionMatrix())) {
      const sicht = getSearchVisibilityForRole(rolle as never);
      expect(
        ["all", "include_review", "published_only"],
        `Rolle ${rolle} -> ${sicht}`,
      ).toContain(sicht);
    }
  });

  it("beschränkt die Leserolle auf veröffentlichte Inhalte", async () => {
    const { getSearchVisibilityForRole } = await laden();
    expect(getSearchVisibilityForRole("viewer")).toBe("published_only");
  });
});

describe("Regelschlüssel der Funktionstrennung", () => {
  it("erkennt bekannte Schlüssel", async () => {
    const { getSodRules, isValidSodRuleKey } = await laden();
    const schluessel = Object.keys(getSodRules());
    expect(schluessel.length).toBeGreaterThan(0);
    for (const k of schluessel) {
      expect(isValidSodRuleKey(k), `Schlüssel ${k}`).toBe(true);
    }
  });

  it("weist unbekannte Schlüssel ab", async () => {
    const { isValidSodRuleKey } = await laden();
    for (const k of ["", "beliebig", "__proto__", "constructor"]) {
      expect(isValidSodRuleKey(k), `Schlüssel ${k}`).toBe(false);
    }
  });
});
