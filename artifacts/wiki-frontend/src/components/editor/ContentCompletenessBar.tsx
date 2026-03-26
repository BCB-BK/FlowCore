import { useMemo } from "react";
import type { Editor } from "@tiptap/react";
import {
  CheckCircle2,
  AlertTriangle,
  Info,
  ImageIcon,
  FileText,
  Heading1,
  List,
} from "lucide-react";

interface ContentCompletenessBarProps {
  editor: Editor;
  parentTemplateType?: string;
}

interface ContentCheck {
  label: string;
  passed: boolean;
  icon: typeof CheckCircle2;
  severity: "required" | "recommended";
}

function analyzeContent(editor: Editor, templateType?: string): ContentCheck[] {
  const doc = editor.state.doc;
  const checks: ContentCheck[] = [];

  let hasH1 = false;
  let hasH2 = false;
  let paragraphCount = 0;
  let hasImage = false;
  let hasMedia = false;
  let totalTextLength = 0;
  let emptyHeadings = 0;

  doc.descendants((node) => {
    if (node.type.name === "heading") {
      const level = node.attrs.level as number;
      if (level === 1) hasH1 = true;
      if (level === 2) hasH2 = true;
      if (node.textContent.trim().length === 0) emptyHeadings++;
    }
    if (node.type.name === "paragraph") {
      paragraphCount++;
      totalTextLength += node.textContent.length;
    }
    if (node.type.name === "image") hasImage = true;
    if (
      node.type.name === "videoBlock" ||
      node.type.name === "fileBlock" ||
      node.type.name === "galleryBlock" ||
      node.type.name === "diagramBlock"
    )
      hasMedia = true;
  });

  checks.push({
    label: "Hauptüberschrift vorhanden",
    passed: hasH1,
    icon: Heading1,
    severity: "required",
  });

  checks.push({
    label: "Inhalt strukturiert (Unterüberschriften)",
    passed: hasH2,
    icon: List,
    severity: "recommended",
  });

  checks.push({
    label: "Ausreichend Textinhalt",
    passed: totalTextLength > 50,
    icon: FileText,
    severity: "required",
  });

  if (emptyHeadings > 0) {
    checks.push({
      label: `${emptyHeadings} leere Überschrift(en)`,
      passed: false,
      icon: AlertTriangle,
      severity: "required",
    });
  }

  if (templateType === "process" || templateType === "howto") {
    checks.push({
      label: "Medien/Diagramme vorhanden",
      passed: hasImage || hasMedia,
      icon: ImageIcon,
      severity: "recommended",
    });
  }

  return checks;
}

const SECTION_SUGGESTIONS: Record<string, string[]> = {
  process: [
    "Ziel & Geltungsbereich",
    "Voraussetzungen",
    "Prozessschritte",
    "Verantwortlichkeiten",
    "Ergebnisse & Kennzahlen",
  ],
  howto: [
    "Einleitung",
    "Voraussetzungen",
    "Schritt-für-Schritt-Anleitung",
    "Häufige Fehler",
    "Weiterführende Links",
  ],
  policy: [
    "Geltungsbereich",
    "Regelungen",
    "Ausnahmen",
    "Zuständigkeiten",
    "Inkrafttreten",
  ],
  default: [
    "Einleitung",
    "Hauptteil",
    "Zusammenfassung",
  ],
};

export function ContentCompletenessBar({
  editor,
  parentTemplateType,
}: ContentCompletenessBarProps) {
  const checks = useMemo(
    () => analyzeContent(editor, parentTemplateType),
    [editor, parentTemplateType, editor.state.doc],
  );

  const requiredChecks = checks.filter((c) => c.severity === "required");
  const passedRequired = requiredChecks.filter((c) => c.passed).length;
  const totalRequired = requiredChecks.length;
  const allPassed = checks.every((c) => c.passed);

  const completenessPercent =
    totalRequired > 0 ? Math.round((passedRequired / totalRequired) * 100) : 100;

  const suggestions = SECTION_SUGGESTIONS[parentTemplateType || "default"] || SECTION_SUGGESTIONS.default;

  const existingHeadings = new Set<string>();
  editor.state.doc.descendants((node) => {
    if (node.type.name === "heading") {
      existingHeadings.add(node.textContent.trim().toLowerCase());
    }
  });

  const missingSections = suggestions.filter(
    (s) => !existingHeadings.has(s.toLowerCase()),
  );

  const handleInsertSection = (sectionName: string) => {
    editor
      .chain()
      .focus()
      .insertContent([
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: sectionName }] },
        { type: "paragraph" },
      ])
      .run();
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        {allPassed ? (
          <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
        ) : completenessPercent >= 50 ? (
          <Info className="h-3.5 w-3.5 text-yellow-600" />
        ) : (
          <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
        )}
        <div className="flex items-center gap-1.5 flex-1">
          <div className="h-1.5 flex-1 max-w-24 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                allPassed
                  ? "bg-green-500"
                  : completenessPercent >= 50
                    ? "bg-yellow-500"
                    : "bg-red-500"
              }`}
              style={{ width: `${completenessPercent}%` }}
            />
          </div>
          <span className="text-[10px]">
            {allPassed ? "Vollständig" : `${completenessPercent}%`}
          </span>
        </div>
        {!allPassed && (
          <div className="flex items-center gap-1 flex-wrap">
            {checks
              .filter((c) => !c.passed)
              .slice(0, 2)
              .map((c) => (
                <span
                  key={c.label}
                  className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] ${
                    c.severity === "required"
                      ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                      : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300"
                  }`}
                >
                  {c.label}
                </span>
              ))}
          </div>
        )}
      </div>

      {missingSections.length > 0 && !allPassed && (
        <div className="flex items-center gap-1 flex-wrap">
          <span className="text-[10px] text-muted-foreground">Vorschläge:</span>
          {missingSections.slice(0, 3).map((section) => (
            <button
              key={section}
              onClick={() => handleInsertSection(section)}
              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] bg-primary/5 text-primary hover:bg-primary/10 transition-colors"
            >
              + {section}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
