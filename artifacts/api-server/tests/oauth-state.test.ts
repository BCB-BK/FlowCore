/**
 * Tests der OAuth-State-Signatur.
 *
 * Der State ist der Schutz gegen Login-CSRF. Fällt die Prüfung aus, kann ein
 * Angreifer einen Anmeldevorgang mit eigenem Konto in fremdem Browser
 * abschließen. Entsprechend werden hier nicht nur der Gutfall, sondern vor
 * allem die Ablehnungsgründe geprüft.
 */
import { describe, it, expect } from "vitest";
import {
  signOAuthState,
  verifyOAuthState,
  nonceAusState,
  STATE_MAX_AGE_MS,
} from "../src/lib/oauth-state";

const SECRET = "test-secret-nur-fuer-diesen-lauf-0123456789";
const NONCE = "11111111-2222-3333-4444-555555555555";

describe("signOAuthState", () => {
  it("erzeugt drei durch Punkt getrennte Teile", () => {
    const state = signOAuthState(NONCE, SECRET);
    expect(state.split(".")).toHaveLength(3);
  });

  it("stellt den Nonce voran, damit die Route ihn gegen die Sitzung prüfen kann", () => {
    const state = signOAuthState(NONCE, SECRET);
    expect(nonceAusState(state)).toBe(NONCE);
  });
});

describe("verifyOAuthState", () => {
  it("akzeptiert einen frisch erzeugten State", () => {
    const jetzt = 1_700_000_000_000;
    const state = signOAuthState(NONCE, SECRET, jetzt);
    expect(verifyOAuthState(state, SECRET, jetzt)).toBe(true);
  });

  it("lehnt einen State mit falschem Geheimnis ab", () => {
    const state = signOAuthState(NONCE, SECRET);
    expect(verifyOAuthState(state, "anderes-geheimnis")).toBe(false);
  });

  it("lehnt eine manipulierte Signatur ab", () => {
    const state = signOAuthState(NONCE, SECRET);
    const verdreht = state.slice(0, -1) + (state.endsWith("A") ? "B" : "A");
    expect(verifyOAuthState(verdreht, SECRET)).toBe(false);
  });

  it("lehnt einen manipulierten Nonce ab (Signatur deckt ihn mit ab)", () => {
    const jetzt = 1_700_000_000_000;
    const state = signOAuthState(NONCE, SECRET, jetzt);
    const teile = state.split(".");
    const gefaelscht = [
      "99999999-2222-3333-4444-555555555555",
      teile[1],
      teile[2],
    ].join(".");
    expect(verifyOAuthState(gefaelscht, SECRET, jetzt)).toBe(false);
  });

  it("lehnt einen abgelaufenen State ab", () => {
    const erzeugt = 1_700_000_000_000;
    const state = signOAuthState(NONCE, SECRET, erzeugt);
    const zuSpaet = erzeugt + STATE_MAX_AGE_MS + 1;
    expect(verifyOAuthState(state, SECRET, zuSpaet)).toBe(false);
  });

  it("akzeptiert einen State kurz vor Ablauf", () => {
    const erzeugt = 1_700_000_000_000;
    const state = signOAuthState(NONCE, SECRET, erzeugt);
    const knapp = erzeugt + STATE_MAX_AGE_MS - 1000;
    expect(verifyOAuthState(state, SECRET, knapp)).toBe(true);
  });

  it("lehnt einen State mit Zeitstempel aus der Zukunft ab", () => {
    const zukunft = 1_700_000_000_000 + 10 * 60 * 1000;
    const state = signOAuthState(NONCE, SECRET, zukunft);
    expect(verifyOAuthState(state, SECRET, 1_700_000_000_000)).toBe(false);
  });

  it("lehnt Werte mit falscher Teileanzahl ab", () => {
    expect(verifyOAuthState("nur.zwei", SECRET)).toBe(false);
    expect(verifyOAuthState("a.b.c.d", SECRET)).toBe(false);
    expect(verifyOAuthState("", SECRET)).toBe(false);
  });

  it("lehnt einen unlesbaren Zeitstempel ab", () => {
    const state = signOAuthState(NONCE, SECRET);
    const teile = state.split(".");
    expect(
      verifyOAuthState([teile[0], "!!!", teile[2]].join("."), SECRET),
    ).toBe(false);
  });
});
