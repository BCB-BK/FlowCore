/**
 * Durchlass der globalen Anmeldesperre für Anfragen mit Integrationsschlüssel.
 *
 * WARUM: Vor allen API-Routen steht in `app.ts` eine Sperre, die nur Sitzung,
 * `Authorization: Bearer …` und die Copilot-Connector-Pfade durchlässt. Die
 * Content-API ist aber mit dem Header `X-FlowCore-Api-Key` dokumentiert
 * (OpenAPI, Fehlermeldung von `requireIntegrationKey`). Solche Anfragen scheiterten
 * mit »Authentication required«, bevor der Schlüssel überhaupt geprüft wurde —
 * jeder Integrationsschlüssel wirkte ungültig, »Zuletzt genutzt« blieb leer
 * (gemeldet am 11.09.2026, Schlüssel »Markenprofile«). Beim Copilot-Connector
 * war derselbe Fehler bereits aufgetreten und dort mit einer Pfad-Ausnahme behoben.
 *
 * GRENZE: Durchgelassen wird nur, wer an `/content/v1/…` fragt UND den Header
 * mitschickt. Die eigentliche Prüfung (Schlüssel, Ablauf, IP-Freigabe, Limit)
 * macht weiterhin `requireIntegrationKey` an jeder Datenroute. Ohne Header gilt
 * die Sperre unverändert — auch für `/content/v1/openapi.json`.
 */
export const CONTENT_API_PFAD = "/content/v1/";

export function istContentApiSchluesselAnfrage(
  pfad: string,
  header: Record<string, string | string[] | undefined>,
): boolean {
  const wert = header["x-flowcore-api-key"];
  return (
    pfad.startsWith(CONTENT_API_PFAD) &&
    typeof wert === "string" &&
    wert.trim().length > 0
  );
}
