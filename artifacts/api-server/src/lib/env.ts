/**
 * Kleine Helfer, um Betriebsparameter (Limits, Timeouts) per Umgebungsvariable
 * zu übersteuern. Fällt bei fehlendem oder ungültigem Wert auf den Default
 * zurück — niemals auf 0 oder NaN.
 */
export function envInt(name: string, defaultValue: number): number {
  const raw = process.env[name];
  if (!raw) return defaultValue;
  const parsed = parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : defaultValue;
}

export function envString(name: string, defaultValue: string): string {
  const raw = process.env[name]?.trim();
  return raw ? raw : defaultValue;
}
