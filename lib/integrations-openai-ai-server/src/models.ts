/**
 * Zentrale Modell-Defaults für alle OpenAI-Integrationen.
 * Per Umgebungsvariable übersteuerbar, damit Modellwechsel/Deprecations
 * keine Code-Änderung erfordern.
 */
function envModel(name: string, defaultValue: string): string {
  const raw = process.env[name]?.trim();
  return raw ? raw : defaultValue;
}

export const AI_DEFAULT_TEXT_MODEL = envModel("AI_DEFAULT_MODEL", "gpt-5.2");
export const AI_IMAGE_MODEL = envModel("AI_IMAGE_MODEL", "gpt-image-1");
export const AI_AUDIO_MODEL = envModel("AI_AUDIO_MODEL", "gpt-audio");
export const AI_TRANSCRIBE_MODEL = envModel(
  "AI_TRANSCRIBE_MODEL",
  "gpt-4o-mini-transcribe",
);
