/**
 * Obergrenze fuer Datei-Uploads — eine Zahl fuer Frontend und Server.
 *
 * Vorher hielten `editor-config.ts`, `routes/media.ts` und zwei fest
 * verdrahtete Meldungstexte den Wert unabhaengig voneinander. Eine Anhebung
 * musste an fuenf Stellen nachgezogen werden und blieb dabei zwangslaeufig
 * irgendwo stehen (der SharePoint-Import meldete noch "max 50 MB", als das
 * Limit laengst hoeher lag). Server duerfen den Wert weiterhin per
 * `MAX_UPLOAD_MB` uebersteuern — dieser Default gilt, solange das nicht
 * geschieht.
 *
 * Beim Anheben mitziehen: nginx begrenzt den Rumpf zusaetzlich
 * (`client_max_body_size`, Vhosts `flowcore-dev`/`flowcore-prod`). Ein Wert
 * oberhalb davon endet in einem 413 aus dem Reverse-Proxy, den die Anwendung
 * nie zu sehen bekommt und deshalb auch nicht verstaendlich melden kann.
 */
export const MAX_UPLOAD_MB_DEFAULT = 100;

export const MAX_UPLOAD_BYTES_DEFAULT = MAX_UPLOAD_MB_DEFAULT * 1024 * 1024;

/** Einheitlicher Meldungstext fuer zu grosse Dateien — Frontend wie Server. */
export function fileTooLargeMessage(maxMb: number): string {
  return `Datei zu groß (maximal ${maxMb} MB)`;
}
