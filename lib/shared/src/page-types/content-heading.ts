/**
 * Überschrift des Inhaltsbereichs je Seitentyp.
 *
 * HERKUNFT: Die Zuordnung stand gleichlautend in `NodeDetail.tsx` und
 * `WorkingCopyEditorPage.tsx`. Der Volltext für Export, Suche und KI braucht
 * dieselbe Überschrift (Audit FC-MSA-20260911, AP-03) — deshalb eine Quelle
 * für Leseansicht, Editor und Server.
 */
export const CONTENT_HEADING_MAP: Readonly<Record<string, string>> = {
  policy: "Richtlinientext",
  procedure_instruction: "Ablaufbeschreibung",
  work_instruction: "Arbeitsschritte",
  meeting_protocol: "Entscheidungen",
  training_resource: "Schulungsinhalt",
  use_case: "Normalablauf",
};

export function getContentHeading(templateType: string): string {
  return CONTENT_HEADING_MAP[templateType] ?? "Inhalt";
}
