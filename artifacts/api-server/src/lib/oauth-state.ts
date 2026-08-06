/**
 * Signierter OAuth-State für den Anmeldevorgang.
 *
 * Der State schützt gegen Login-CSRF: Er wird beim Start der Anmeldung
 * erzeugt, signiert an Microsoft mitgegeben und im Rückruf geprüft. Zusätzlich
 * bindet die Route den enthaltenen Nonce an die Browser-Sitzung, sodass ein
 * fremder, aber gültig signierter State nicht genügt.
 *
 * Aus `routes/auth.ts` herausgelöst, damit die Signaturlogik unabhängig von
 * Express geprüft werden kann (Audit-Befund A5 — es gab dafür keinen Test).
 *
 * Format: `<nonce>.<zeitstempel-base36>.<hmac-base64url>`
 */
import { createHmac, timingSafeEqual } from "crypto";

/** Gültigkeitsdauer eines State — danach ist eine neue Anmeldung nötig. */
export const STATE_MAX_AGE_MS = 10 * 60 * 1000;

export function signOAuthState(
  nonce: string,
  secret: string,
  jetzt: number = Date.now(),
): string {
  const ts = jetzt.toString(36);
  const payload = `${nonce}.${ts}`;
  const sig = createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

export function verifyOAuthState(
  state: string,
  secret: string,
  jetzt: number = Date.now(),
): boolean {
  const parts = state.split(".");
  if (parts.length !== 3) return false;

  const [nonce, ts, sig] = parts as [string, string, string];
  const payload = `${nonce}.${ts}`;
  const expected = createHmac("sha256", secret)
    .update(payload)
    .digest("base64url");

  // Zeitkonstanter Vergleich: ein byteweise abbrechender Vergleich verraet
  // über die Laufzeit, wie viele Zeichen stimmen (Audit-Befund C1).
  const a = Buffer.from(sig, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;

  const created = parseInt(ts, 36);
  if (Number.isNaN(created)) return false;
  // Auch in der Zukunft liegende Zeitstempel ablehnen — sie deuten auf einen
  // manipulierten oder mit fremder Uhr erzeugten State hin.
  if (created > jetzt + 60_000) return false;
  if (jetzt - created > STATE_MAX_AGE_MS) return false;

  return true;
}

/** Liefert den Nonce-Anteil eines State, ohne ihn zu prüfen. */
export function nonceAusState(state: string): string | undefined {
  const teil = state.split(".")[0];
  return teil && teil.length > 0 ? teil : undefined;
}
