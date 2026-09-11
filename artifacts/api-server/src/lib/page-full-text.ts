/**
 * Kanonischer Volltext einer Seite für Export, Content-API, Copilot, Graph und KI.
 *
 * WARUM: Bis zum Audit FC-MSA-20260911 (Befund F03) trug der Export-Text nur
 * den Inhaltsbereich (`_editorContent`). Die Abschnittsfelder eines
 * Markenprofils fehlten darin vollständig; bei Richtlinien fehlten Zweck und
 * Geltungsbereich. Wer über eine Schnittstelle las, bekam weniger als ein
 * Mensch in der Leseansicht.
 *
 * LESEKONTRAKT:
 *   1. Textabschnitte des Seitentyps in Registry-Reihenfolge, jeweils mit ihrer
 *      Beschriftung als Überschrift. Leere Abschnitte entfallen.
 *   2. Danach der Inhaltsbereich unter derselben Überschrift wie in der
 *      Leseansicht (`getContentHeading`), Tabellen mit Kopfzeile.
 *   3. `policy_text` ist bei Richtlinien mit Inhaltsbereich ein Auszug; der
 *      Volltext steht im Inhaltsbereich. Der Auszug wird deshalb nicht noch
 *      einmal ausgegeben — auch nicht stillschweigend als »die Richtlinie«.
 *   4. Widget-Daten, die als JSON gespeichert sind (Verweislisten, RACI …),
 *      gehören nicht in den Fließtext; sie werden an ihrer Stelle geführt.
 */
import { getContentHeading, getPageType } from "@workspace/shared/page-types";
import { htmlToTiptapJson } from "@workspace/shared/rich-text";
import {
  serializeProseMirrorContent,
  type ProseMirrorSerializationResult,
} from "./prosemirror-serializer";

export interface PageFullText {
  plaintext: string;
  markdown: string;
  /** Serialisierung nur des Inhaltsbereichs (Medien, verlinkte Seiten). */
  editor: ProseMirrorSerializationResult;
}

/** Ein Abschnittswert, der als Fließtext zählt (HTML oder Klartext, kein JSON). */
export function istTextAbschnitt(wert: unknown): wert is string {
  if (typeof wert !== "string" || wert.trim() === "") return false;
  const kopf = wert.trimStart()[0];
  if (kopf !== "{" && kopf !== "[") return true;
  try {
    JSON.parse(wert);
    return false;
  } catch {
    return true;
  }
}

export function buildPageFullText(
  templateType: string,
  structuredFields: Record<string, unknown> | null | undefined,
  editorDoc: Record<string, unknown> | null,
): PageFullText {
  const felder = structuredFields ?? {};
  const editor = serializeProseMirrorContent(editorDoc);
  const hatInhaltsbereich = editor.plaintext.trim().length > 0;

  const klartext: string[] = [];
  const markdown: string[] = [];
  for (const abschnitt of getPageType(templateType)?.sections ?? []) {
    const wert = felder[abschnitt.key];
    if (!istTextAbschnitt(wert)) continue;
    if (
      templateType === "policy" &&
      abschnitt.key === "policy_text" &&
      hatInhaltsbereich
    ) {
      continue;
    }
    const s = serializeProseMirrorContent(
      htmlToTiptapJson(wert) as unknown as Record<string, unknown>,
    );
    if (!s.plaintext.trim()) continue;
    klartext.push(`${abschnitt.label}\n${s.plaintext}`);
    markdown.push(`# ${abschnitt.label}\n\n${s.markdown}`);
  }

  if (hatInhaltsbereich) {
    const ueberschrift = getContentHeading(templateType);
    klartext.push(`${ueberschrift}\n${editor.plaintext}`);
    markdown.push(`# ${ueberschrift}\n\n${editor.markdown}`);
  }

  return {
    plaintext: klartext.join("\n\n"),
    markdown: markdown.join("\n\n"),
    editor,
  };
}
