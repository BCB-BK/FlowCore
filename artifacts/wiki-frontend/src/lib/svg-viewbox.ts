/**
 * Ersatz-viewBox fuer SVG-Dateien, die keine mitbringen.
 *
 * Hintergrund: Exporte aus Miro, Visio und Draw.io tragen haeufig nur
 * `width`/`height` in Pixeln. Ohne `viewBox` kennt der Browser kein
 * Benutzerkoordinatensystem — sobald die Anzeige `width`/`height` auf 100 %
 * setzt (was jeder Zoom-Viewer tut), kann die Grafik nicht mehr eingepasst
 * werden und bleibt ausschnittsweise stehen. Genau dieser Fall wurde aus dem
 * Testbetrieb gemeldet.
 */

/**
 * Laengenangabe eines SVG-Wurzelelements in eine blanke Zahl ueberfuehren
 * ("1600", "1600px", " 423.3mm ", "100%").
 *
 * Prozentwerte liefern bewusst `null`: sie beziehen sich auf den Elternrahmen
 * und sagen nichts ueber das Seitenverhaeltnis der Grafik aus.
 */
export function svgLaenge(wert: string | null | undefined): number | null {
  if (!wert) return null;
  const roh = wert.trim();
  if (roh.endsWith("%")) return null;
  const zahl = parseFloat(roh);
  return Number.isFinite(zahl) && zahl > 0 ? zahl : null;
}

/**
 * Baut aus `width`/`height` eine viewBox. Fuer das Einpassen zaehlt nur das
 * Verhaeltnis von Breite zu Hoehe — solange beide dieselbe Einheit tragen, ist
 * die Einheit selbst ohne Belang.
 *
 * Liefert `null`, wenn sich keine belastbaren Masse ermitteln lassen; dann
 * bleibt die Grafik unveraendert.
 */
export function viewBoxAusMassen(
  width: string | null | undefined,
  height: string | null | undefined,
): string | null {
  const breite = svgLaenge(width);
  const hoehe = svgLaenge(height);
  if (!breite || !hoehe) return null;
  return `0 0 ${breite} ${hoehe}`;
}
