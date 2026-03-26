export type {
  ContentNode,
  AuthUser,
  ContentTemplate,
  PageTypeDefinition,
  MetadataFieldDef,
  PageTypeSection,
} from "@workspace/api-client-react";

export {
  PAGE_TYPE_REGISTRY,
  getPageType,
  getAllowedChildTypes,
  getMetadataGroups,
  calculateCompleteness,
  METADATA_GROUP_LABELS,
  PAGE_TYPE_CATEGORIES,
} from "@workspace/shared/page-types";

export type {
  TemplateType,
  MetadataGroupKey,
  PageTypeCategory,
} from "@workspace/shared/page-types";

export const PAGE_TYPE_LABELS: Record<string, string> = {
  core_process_overview: "Kernprozess-Übersicht",
  area_overview: "Bereichsübersicht",
  process_page_text: "Prozessseite (Text)",
  process_page_graphic: "Prozessseite (Grafik)",
  procedure_instruction: "Verfahrensanweisung",
  use_case: "Use Case",
  policy: "Richtlinie / Policy",
  role_profile: "Rollen-/Stellenprofil",
  dashboard: "Dashboard",
  system_documentation: "Systemdokumentation",
  glossary: "Glossar",
  work_instruction: "Arbeitsanweisung",
  checklist: "Checkliste / Formularvorlage",
  faq: "FAQ / Wissensartikel",
  interface_description: "Schnittstellenbeschreibung",
  meeting_protocol: "Meeting- / Entscheidungsprotokoll",
  training_resource: "Schulung / Lernressource",
  audit_object: "Kontroll- / Prüfobjekt",
};

export const STATUS_LABELS: Record<string, string> = {
  draft: "Entwurf",
  in_review: "In Prüfung",
  approved: "Genehmigt",
  published: "Veröffentlicht",
  archived: "Archiviert",
  deleted: "Gelöscht",
};

export const STATUS_COLORS: Record<string, string> = {
  draft: "bg-yellow-100 text-yellow-800",
  in_review: "bg-blue-100 text-blue-800",
  approved: "bg-emerald-100 text-emerald-800",
  published: "bg-green-100 text-green-800",
  archived: "bg-gray-100 text-gray-600",
  deleted: "bg-red-100 text-red-800",
};

export const PAGE_TYPE_ICON_MAP: Record<string, string> = {
  core_process_overview: "Workflow",
  area_overview: "Building2",
  process_page_text: "FileText",
  process_page_graphic: "GitBranchPlus",
  procedure_instruction: "ListChecks",
  use_case: "Users",
  policy: "Shield",
  role_profile: "UserCog",
  dashboard: "LayoutDashboard",
  system_documentation: "Server",
  glossary: "BookOpen",
  work_instruction: "ClipboardCheck",
  checklist: "CheckSquare",
  faq: "HelpCircle",
  interface_description: "ArrowLeftRight",
  meeting_protocol: "MessageSquare",
  training_resource: "GraduationCap",
  audit_object: "SearchCheck",
};

export const CONFIDENTIALITY_LABELS: Record<string, string> = {
  public: "Öffentlich",
  internal: "Intern",
  confidential: "Vertraulich",
  strictly_confidential: "Streng vertraulich",
};

export const ENUM_LABELS: Record<string, Record<string, string>> = {
  confidentiality: {
    public: "Öffentlich",
    internal: "Intern",
    confidential: "Vertraulich",
    strictly_confidential: "Streng vertraulich",
  },
  document_type: {
    procedure: "Verfahrensanweisung",
    policy: "Richtlinie",
    guideline: "Leitfaden",
    form: "Formular",
    checklist: "Checkliste",
    report: "Bericht",
    specification: "Spezifikation",
    manual: "Handbuch",
    record: "Aufzeichnung",
  },
  risk_level: {
    low: "Niedrig",
    medium: "Mittel",
    high: "Hoch",
    critical: "Kritisch",
  },
  verification_result: {
    current: "Aktuell",
    update_needed: "Aktualisierung nötig",
    obsolete: "Veraltet",
  },
  process_type: {
    core: "Kernprozess",
    support: "Unterstützungsprozess",
    management: "Managementprozess",
  },
};
