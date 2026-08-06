/**
 * Verschlüsselung des Graph-Zugriffstokens in der Sitzung.
 *
 * Hintergrund (Audit-Befund A3): Das delegierte Microsoft-Graph-Token wurde
 * im Klartext in der Sitzung abgelegt. Im Produktivbetrieb liegen Sitzungen in
 * der Tabelle `user_sessions` — das Token stand damit unverschlüsselt in der
 * Datenbank und in jedem Datenbank-Abzug. Es trägt `User.Read` und
 * `Sites.Read.All`; wer die Tabelle lesen kann, kann bis zum Ablauf im Namen
 * der Benutzer auf SharePoint zugreifen.
 *
 * Das Token wird weiterhin gebraucht (delegierte Graph-Aufrufe für
 * Quellverweise, Medienimport, Personensuche), deshalb wird es nicht entfernt,
 * sondern vor dem Ablegen mit AES-256-GCM verschlüsselt.
 *
 * Schlüsselableitung: scrypt über `SESSION_SECRET`. Damit hängt der Schlüssel
 * am ohnehin umgebungseigenen Geheimnis — PROD und DEV haben verschiedene
 * `SESSION_SECRET`, also auch verschiedene Schlüssel. Eine Rotation des
 * `SESSION_SECRET` entwertet die abgelegten Token; das ist gewollt, denn sie
 * entwertet ohnehin bereits alle Sitzungen.
 *
 * GCM liefert die Integritätsprüfung mit: ein manipulierter Sitzungsdatensatz
 * lässt sich nicht entschlüsseln, statt stillschweigend Unsinn zu liefern.
 */
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
} from "crypto";
import { appConfig } from "./config";
import { logger } from "./logger";

const ALGORITHMUS = "aes-256-gcm";
// Fester Salt: Der Schlüssel muss über Prozessneustarts hinweg stabil sein,
// sonst wären nach jedem Neustart alle abgelegten Token unlesbar. Die
// Vertraulichkeit hängt an SESSION_SECRET, nicht am Salt.
const SALT = "flowcore.session.graph-token.v1";
const IV_LAENGE = 12;
const TAG_LAENGE = 16;

let schluessel: Buffer | null = null;

function getSchluessel(): Buffer {
  if (!schluessel) {
    schluessel = scryptSync(appConfig.sessionSecret, SALT, 32);
  }
  return schluessel;
}

/** Verschlüsselt einen Token-String zu "iv.tag.ciphertext" (base64url). */
export function encryptToken(klartext: string): string {
  const iv = randomBytes(IV_LAENGE);
  const cipher = createCipheriv(ALGORITHMUS, getSchluessel(), iv);
  const daten = Buffer.concat([
    cipher.update(klartext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return [
    iv.toString("base64url"),
    tag.toString("base64url"),
    daten.toString("base64url"),
  ].join(".");
}

/**
 * Entschlüsselt einen zuvor abgelegten Token.
 * Liefert `undefined`, wenn der Wert fehlt, beschädigt ist oder mit einem
 * anderen Schlüssel erzeugt wurde — der Aufrufer behandelt das wie "kein
 * Token vorhanden" und fordert gegebenenfalls eine neue Anmeldung an.
 */
export function decryptToken(
  gespeichert: string | undefined,
): string | undefined {
  if (!gespeichert) return undefined;
  const teile = gespeichert.split(".");
  if (teile.length !== 3) {
    // Kein erwartetes Format — etwa ein Altbestand im Klartext. Bewusst nicht
    // durchreichen: Klartext-Token sollen nach der Umstellung nicht mehr
    // verwendet werden.
    logger.warn("Graph-Token in unerwartetem Format, wird verworfen");
    return undefined;
  }
  try {
    const [ivB64, tagB64, datenB64] = teile as [string, string, string];
    const iv = Buffer.from(ivB64, "base64url");
    const tag = Buffer.from(tagB64, "base64url");
    if (iv.length !== IV_LAENGE || tag.length !== TAG_LAENGE) return undefined;

    const decipher = createDecipheriv(ALGORITHMUS, getSchluessel(), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([
      decipher.update(Buffer.from(datenB64, "base64url")),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    // Falscher Schlüssel oder manipulierte Daten.
    logger.warn("Graph-Token liess sich nicht entschluesseln, wird verworfen");
    return undefined;
  }
}

/** Minimale Sicht auf die Sitzung — hält die Aufrufstellen unabhängig vom Typ. */
export interface TokenSitzung {
  graphAccessTokenEnc?: string | undefined;
}

/** Legt das Token verschlüsselt in der Sitzung ab. */
export function setGraphToken(sitzung: TokenSitzung, token: string): void {
  sitzung.graphAccessTokenEnc = encryptToken(token);
}

/** Liest das Token aus der Sitzung; leerer String, wenn keins verfügbar ist. */
export function getGraphToken(sitzung: TokenSitzung | undefined): string {
  return decryptToken(sitzung?.graphAccessTokenEnc) ?? "";
}
