import {
  MAX_UPLOAD_BYTES_DEFAULT,
  MAX_UPLOAD_MB_DEFAULT,
} from "@workspace/shared/uploads";

/**
 * Fuer Anzeigetexte. Der Server darf sein Limit per `MAX_UPLOAD_MB`
 * uebersteuern; das Frontend kennt diese Umgebungsvariable nicht und
 * zeigt deshalb den Default. Weicht ein Betreiber davon ab, muss er den
 * Wert hier mitziehen — deshalb steht er in lib/shared und nicht doppelt.
 */
export const MAX_UPLOAD_MB = MAX_UPLOAD_MB_DEFAULT;

export const EDITOR_CONFIG = {
  allowedVideoDomains: [
    "youtube.com",
    "youtu.be",
    "vimeo.com",
    "microsoft.com",
    "sharepoint.com",
    "stream.microsoft.com",
    "loom.com",
  ],

  allowedEmbedDomains: [
    "youtube.com",
    "youtu.be",
    "vimeo.com",
    "microsoft.com",
    "sharepoint.com",
    "office.com",
    "teams.microsoft.com",
    "miro.com",
    "figma.com",
    "lucid.app",
    "draw.io",
    "diagrams.net",
    "loom.com",
    "sway.office.com",
  ],

  autosaveIntervalMs: 30000,
  maxFileSizeBytes: MAX_UPLOAD_BYTES_DEFAULT,
} as const;

export function isDomainAllowed(
  url: string,
  allowedDomains: readonly string[],
): boolean {
  try {
    const parsed = new URL(url);
    return allowedDomains.some(
      (d) => parsed.hostname === d || parsed.hostname.endsWith(`.${d}`),
    );
  } catch {
    return false;
  }
}
