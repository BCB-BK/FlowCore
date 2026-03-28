import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/dialog";
import { Badge } from "@workspace/ui/badge";
import { Card, CardContent } from "@workspace/ui/card";
import { Separator } from "@workspace/ui/separator";
import {
  User,
  Calendar,
  Tag,
  FileText,
  Shield,
  Clock,
  Hash,
} from "lucide-react";
import type { PageTypeDefinition } from "@workspace/shared/page-types";
import { PAGE_TYPE_LABELS } from "@/lib/types";

interface TemplatePreviewDialogProps {
  template: PageTypeDefinition;
  open: boolean;
  onClose: () => void;
}

const MOCK_METADATA: Record<string, Record<string, string>> = {
  core_process_overview: {
    display_code: "KP-001",
    process_owner: "Dr. Maria Weber",
    deputy: "Thomas Müller",
    valid_from: "01.01.2026",
    review_cycle_months: "12",
    confidentiality: "Intern",
    tags: "Kernprozess, Qualität, ISO 9001",
  },
  area_overview: {
    display_code: "BER-IT",
    area_lead: "Stefan Braun",
    deputy: "Lisa Hoffmann",
    valid_from: "15.03.2026",
    review_cycle_months: "12",
    confidentiality: "Intern",
    tags: "IT, Infrastruktur",
  },
  process_page_text: {
    display_code: "KP-001-P03",
    process_owner: "Anna Schmidt",
    valid_from: "01.02.2026",
    review_cycle_months: "6",
    confidentiality: "Intern",
    tags: "Teilprozess, Dokumentation",
  },
  process_page_graphic: {
    display_code: "KP-002-G01",
    process_owner: "Frank Bauer",
    valid_from: "10.01.2026",
    review_cycle_months: "12",
    confidentiality: "Intern",
    tags: "BPMN, Prozessfluss",
  },
  procedure_instruction: {
    display_code: "VA-IT-005",
    responsible: "Michael Keller",
    valid_from: "01.04.2026",
    review_cycle_months: "6",
    confidentiality: "Intern",
    tags: "Verfahren, Anweisung, IT",
  },
  use_case: {
    display_code: "UC-HR-012",
    actor: "Personalreferent",
    valid_from: "20.02.2026",
    confidentiality: "Intern",
    tags: "HR, Onboarding",
  },
  policy: {
    display_code: "RL-DS-001",
    policy_owner: "Dr. Klaus Wagner",
    approved_by: "Geschäftsführung",
    valid_from: "01.01.2026",
    review_cycle_months: "24",
    confidentiality: "Vertraulich",
    tags: "Datenschutz, DSGVO, Compliance",
  },
  role_profile: {
    display_code: "RP-QM-003",
    department: "Qualitätsmanagement",
    reports_to: "Leitung QM",
    valid_from: "01.03.2026",
    confidentiality: "Intern",
    tags: "Stellenprofil, QM",
  },
  dashboard: {
    display_code: "DB-QM-001",
    owner: "Maria Weber",
    valid_from: "01.01.2026",
    confidentiality: "Intern",
    tags: "Dashboard, KPI, Monitoring",
  },
  system_documentation: {
    display_code: "SYS-ERP-001",
    system_owner: "IT-Abteilung",
    vendor: "SAP SE",
    valid_from: "15.01.2026",
    review_cycle_months: "12",
    confidentiality: "Vertraulich",
    tags: "SAP, ERP, Systemdoku",
  },
};

const MOCK_SECTION_CONTENT: Record<string, Record<string, string>> = {
  core_process_overview: {
    purpose:
      "Dieser Kernprozess beschreibt die übergreifende Steuerung des Qualitätsmanagements am BildungsCampus Backnang. Er umfasst die Planung, Durchführung und Bewertung aller qualitätsrelevanten Aktivitäten.",
    sipoc:
      "Supplier: Fachbereiche, Externe Auditoren | Input: Audit-Berichte, Kundenfeedback, Prozessdaten | Process: QM-Planung → Durchführung → Bewertung → Verbesserung | Output: Maßnahmenpläne, Berichte | Customer: Geschäftsführung, Fachbereiche",
    kpis: "• Kundenzufriedenheit: Ziel ≥ 85% (aktuell: 88%)\n• Audit-Abweichungen: Ziel ≤ 5 (aktuell: 3)\n• Prozessreifegrad: Ziel ≥ 3.5 (aktuell: 3.2)",
    interfaces:
      "→ HR-Prozess (Schulungsmanagement)\n→ IT-Prozess (Systemdokumentation)\n→ Compliance (Richtlinien-Review)",
    risks:
      "• Ressourcenmangel bei Audits (Mitigation: Externe Auditoren)\n• Veraltete Dokumentation (Mitigation: Review-Zyklen)",
  },
  process_page_text: {
    description:
      "Der Teilprozess beschreibt die Erfassung und Bearbeitung eingehender Qualitätsmeldungen. Jede Meldung wird klassifiziert, einem Verantwortlichen zugewiesen und innerhalb definierter Fristen bearbeitet.",
    procedure:
      "1. Qualitätsmeldung erfassen (Formular QM-F01)\n2. Klassifikation durchführen (kritisch/major/minor)\n3. Verantwortlichen zuweisen\n4. Maßnahmen definieren und umsetzen\n5. Wirksamkeit prüfen\n6. Meldung abschließen",
    responsibilities:
      "• Meldungserfassung: Alle Mitarbeiter\n• Klassifikation: QM-Beauftragter\n• Maßnahmenumsetzung: Fachbereichsleiter",
  },
  procedure_instruction: {
    purpose:
      "Diese Verfahrensanweisung regelt den Ablauf bei der Einrichtung neuer Benutzerkonten in allen IT-Systemen des BildungsCampus.",
    scope: "Gilt für alle IT-Systeme inkl. Active Directory, SAP, SharePoint.",
    procedure:
      "1. Antrag über HR-Portal einreichen\n2. Genehmigung durch Vorgesetzten\n3. IT erstellt Konten (SLA: 2 Arbeitstage)\n4. Zugangsdaten an Nutzer übergeben\n5. Erstanmeldung und Passwortänderung",
    documents:
      "• Formular IT-F003 (Zugangsantrag)\n• Checkliste IT-C001 (Kontoeinrichtung)",
  },
  policy: {
    purpose:
      "Diese Richtlinie definiert die Grundsätze und Regeln für den Umgang mit personenbezogenen Daten am BildungsCampus Backnang gemäß DSGVO.",
    scope:
      "Alle Mitarbeiter, Lehrkräfte und externe Dienstleister die personenbezogene Daten verarbeiten.",
    principles:
      "• Datenminimierung: Nur notwendige Daten erheben\n• Zweckbindung: Daten nur für definierten Zweck nutzen\n• Transparenz: Betroffene über Verarbeitung informieren\n• Integrität: Technische und organisatorische Maßnahmen",
    consequences:
      "Verstöße gegen diese Richtlinie können arbeitsrechtliche Konsequenzen nach sich ziehen.",
  },
};

function getFieldIcon(type: string) {
  switch (type) {
    case "person":
      return User;
    case "date":
      return Calendar;
    case "tags":
      return Tag;
    case "enum":
      return Shield;
    case "number":
      return Hash;
    default:
      return FileText;
  }
}

export function TemplatePreviewDialog({
  template,
  open,
  onClose,
}: TemplatePreviewDialogProps) {
  const mockMeta = MOCK_METADATA[template.type] ?? {};
  const mockContent = MOCK_SECTION_CONTENT[template.type] ?? {};
  const title = PAGE_TYPE_LABELS[template.type] || template.labelDe;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0">
        <div
          className="h-2 rounded-t-lg"
          style={{ backgroundColor: template.color }}
        />
        <div className="px-6 pt-4 pb-2">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className="text-xs font-mono">
                {mockMeta.display_code ?? "XX-000"}
              </Badge>
              <Badge variant="secondary" className="text-xs">
                Musteransicht
              </Badge>
            </div>
            <DialogTitle className="text-xl">{title}</DialogTitle>
            <DialogDescription className="sr-only">
              Musteransicht des Templates {title}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-wrap gap-x-6 gap-y-2 mt-3 text-xs text-muted-foreground">
            {template.metadataFields.slice(0, 6).map((field) => {
              const Icon = getFieldIcon(field.type);
              const value =
                mockMeta[field.key] ??
                getMockValueForType(field.type, field.label);
              return (
                <div key={field.key} className="flex items-center gap-1.5">
                  <Icon className="h-3 w-3 shrink-0" />
                  <span className="font-medium">{field.label}:</span>
                  <span>{value}</span>
                </div>
              );
            })}
          </div>

          {mockMeta.tags && (
            <div className="flex items-center gap-1.5 mt-3">
              <Tag className="h-3 w-3 text-muted-foreground" />
              <div className="flex flex-wrap gap-1">
                {mockMeta.tags.split(", ").map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-[10px]">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        <Separator />

        <div className="px-6 py-4 space-y-4">
          {template.sections.map((section) => {
            const content =
              mockContent[section.key] ??
              getDefaultSectionContent(section.label);
            return (
              <Card key={section.key} className="border-dashed">
                <CardContent className="p-4">
                  <h3 className="text-sm font-semibold flex items-center gap-2 mb-2">
                    <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                    {section.label}
                    {section.required && (
                      <span className="text-destructive text-xs">*</span>
                    )}
                  </h3>
                  <div className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
                    {content}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Separator />

        <div className="px-6 py-3 flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 rounded-b-lg">
          <Clock className="h-3 w-3" />
          <span>
            Erstellt: 15.01.2026 | Letzte Änderung: 22.03.2026 | Version 2.1 |
            Status: Veröffentlicht
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function getMockValueForType(type: string, label: string): string {
  switch (type) {
    case "person":
      return "Max Mustermann";
    case "date":
      return "01.01.2026";
    case "number":
      return "12";
    case "boolean":
      return "Ja";
    case "enum":
      return "Intern";
    case "text":
      return label.includes("Code") ? "XX-001" : "Beispieltext";
    default:
      return "—";
  }
}

function getDefaultSectionContent(label: string): string {
  return `Hier steht der Inhalt der Sektion „${label}". In einer echten Seite wird dieser Bereich mit dem Block-Editor bearbeitet und kann Texte, Tabellen, Bilder und eingebettete Medien enthalten.`;
}
