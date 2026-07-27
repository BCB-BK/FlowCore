/**
 * Build-Kennung der ausgelieferten Anwendung.
 *
 * Commit-Kürzel und Commit-Datum werden von Vite zur Build-Zeit eingebettet
 * (siehe `define` in vite.config.ts). Damit ist in jeder Umgebung eindeutig
 * erkennbar, welcher Codestand tatsächlich läuft — verlässlicher als eine
 * manuell gepflegte Versionsnummer, die beim Deployen nicht mitwandert.
 */
declare const __BUILD_COMMIT__: string;
declare const __BUILD_DATE__: string;

export const BUILD_COMMIT: string =
  typeof __BUILD_COMMIT__ === "string" ? __BUILD_COMMIT__ : "";

export const BUILD_DATE: string =
  typeof __BUILD_DATE__ === "string" ? __BUILD_DATE__ : "";

/** Kurzform für die Anzeige, z.B. „27.07.2026 · ecf242d". */
export function formatBuildLabel(): string {
  const parts: string[] = [];
  const date = BUILD_DATE ? new Date(BUILD_DATE) : null;
  if (date && !Number.isNaN(date.getTime())) {
    parts.push(
      date.toLocaleDateString("de-DE", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }),
    );
  }
  if (BUILD_COMMIT) parts.push(BUILD_COMMIT);
  return parts.join(" · ");
}

/** Vollständige Angabe für Tooltips und Fehlermeldungen. */
export function formatBuildTooltip(): string {
  const date = BUILD_DATE ? new Date(BUILD_DATE) : null;
  const when =
    date && !Number.isNaN(date.getTime())
      ? date.toLocaleString("de-DE", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "unbekannt";
  return BUILD_COMMIT
    ? `Stand: ${when} · Commit ${BUILD_COMMIT}`
    : `Stand: ${when}`;
}
