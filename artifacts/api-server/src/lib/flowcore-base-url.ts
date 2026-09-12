/**
 * Öffentliche Basis-URL dieser FlowCore-Installation.
 *
 * Eigene Einheit, weil sowohl die Projektion als auch das Antwortformat der
 * Content-API sie brauchen: Wurzelrelative Links (`/node/…`, `/api/media/…`)
 * werden für externe Verbraucher dagegen aufgelöst (Reaudit FC-RA-20260911,
 * T-03 — genau eine verbindliche Auflösungsvariante).
 */
export const FLOWCORE_BASE_URL =
  process.env["APP_PUBLIC_URL"]?.replace(/\/$/, "") ||
  "https://flowcore.bildungscampus-backnang.de";
