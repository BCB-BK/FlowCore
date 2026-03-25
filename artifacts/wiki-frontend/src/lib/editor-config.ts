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
  maxFileSizeBytes: 50 * 1024 * 1024,
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
