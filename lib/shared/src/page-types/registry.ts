export type TemplateType =
  | "core_process_overview"
  | "area_overview"
  | "process_page_text"
  | "process_page_graphic"
  | "procedure_instruction"
  | "use_case"
  | "policy"
  | "role_profile"
  | "dashboard"
  | "system_documentation";

export type MetadataGroupKey =
  | "identity"
  | "governance"
  | "responsibilities"
  | "validity"
  | "classification";

export interface MetadataFieldDef {
  key: string;
  label: string;
  type: "text" | "date" | "person" | "enum" | "tags" | "number" | "boolean";
  required: boolean;
  group: MetadataGroupKey;
  description?: string;
  options?: string[];
}

export interface PageTypeSection {
  key: string;
  label: string;
  description?: string;
  required: boolean;
}

export interface PageTypeDefinition {
  type: TemplateType;
  label: string;
  labelDe: string;
  description: string;
  descriptionDe: string;
  icon: string;
  color: string;
  allowedChildTypes: TemplateType[];
  metadataFields: MetadataFieldDef[];
  sections: PageTypeSection[];
  category: "process" | "documentation" | "governance" | "system";
}

const COMMON_IDENTITY_FIELDS: MetadataFieldDef[] = [
  {
    key: "display_code",
    label: "Display Code",
    type: "text",
    required: false,
    group: "identity",
    description: "Mutable display code (e.g. KP-001)",
  },
];

const COMMON_GOVERNANCE_FIELDS: MetadataFieldDef[] = [
  {
    key: "owner",
    label: "Prozesseigner",
    type: "person",
    required: true,
    group: "governance",
    description: "Verantwortlicher für den Inhalt",
  },
  {
    key: "deputy",
    label: "Stellvertreter",
    type: "person",
    required: false,
    group: "governance",
    description: "Vertretung des Prozesseigners",
  },
  {
    key: "reviewer",
    label: "Prüfer",
    type: "person",
    required: false,
    group: "governance",
    description: "Fachliche Prüfung",
  },
  {
    key: "approver",
    label: "Freigeber",
    type: "person",
    required: false,
    group: "governance",
    description: "Freigabe-Verantwortlicher",
  },
];

const COMMON_VALIDITY_FIELDS: MetadataFieldDef[] = [
  {
    key: "valid_from",
    label: "Gültig ab",
    type: "date",
    required: false,
    group: "validity",
    description: "Datum der Gültigkeit",
  },
  {
    key: "valid_until",
    label: "Gültig bis",
    type: "date",
    required: false,
    group: "validity",
  },
  {
    key: "review_cycle_months",
    label: "Prüfzyklus (Monate)",
    type: "number",
    required: false,
    group: "validity",
    description: "Regelmäßiger Prüfintervall in Monaten",
  },
  {
    key: "next_review_date",
    label: "Nächste Prüfung",
    type: "date",
    required: false,
    group: "validity",
  },
];

const COMMON_CLASSIFICATION_FIELDS: MetadataFieldDef[] = [
  {
    key: "confidentiality",
    label: "Vertraulichkeit",
    type: "enum",
    required: false,
    group: "classification",
    options: ["public", "internal", "confidential", "strictly_confidential"],
    description: "Vertraulichkeitsstufe des Dokuments",
  },
  {
    key: "tags",
    label: "Schlagwörter",
    type: "tags",
    required: false,
    group: "classification",
  },
  {
    key: "scope_area",
    label: "Geltungsbereich",
    type: "text",
    required: false,
    group: "classification",
    description: "Organisationseinheit / Bereich",
  },
];

export const PAGE_TYPE_REGISTRY: Record<TemplateType, PageTypeDefinition> = {
  core_process_overview: {
    type: "core_process_overview",
    label: "Core Process Overview",
    labelDe: "Kernprozess-Übersicht",
    description:
      "Top-level overview of a core business process with SIPOC, KPIs, and interfaces",
    descriptionDe:
      "Übersicht eines Kernprozesses mit SIPOC, KPIs und Schnittstellen",
    icon: "Workflow",
    color: "hsl(145, 76%, 38%)",
    category: "process",
    allowedChildTypes: [
      "process_page_text",
      "process_page_graphic",
      "procedure_instruction",
      "use_case",
      "role_profile",
      "system_documentation",
    ],
    metadataFields: [
      ...COMMON_IDENTITY_FIELDS,
      ...COMMON_GOVERNANCE_FIELDS,
      ...COMMON_VALIDITY_FIELDS,
      ...COMMON_CLASSIFICATION_FIELDS,
    ],
    sections: [
      {
        key: "overview",
        label: "Übersicht",
        description: "Zweck & Geltungsbereich",
        required: true,
      },
      {
        key: "sipoc",
        label: "SIPOC",
        description: "Suppliers, Inputs, Process, Outputs, Customers",
        required: false,
      },
      { key: "kpis", label: "KPIs & Kennzahlen", required: false },
      { key: "compliance", label: "Normbezug & Compliance", required: false },
      { key: "children", label: "Untergeordnete Prozesse", required: false },
    ],
  },

  area_overview: {
    type: "area_overview",
    label: "Area Overview",
    labelDe: "Bereichsübersicht",
    description: "Overview of an organizational area or department",
    descriptionDe: "Übersicht eines Organisationsbereichs oder einer Abteilung",
    icon: "Building2",
    color: "hsl(200, 70%, 45%)",
    category: "documentation",
    allowedChildTypes: [
      "core_process_overview",
      "process_page_text",
      "policy",
      "role_profile",
      "dashboard",
      "system_documentation",
    ],
    metadataFields: [
      ...COMMON_IDENTITY_FIELDS,
      ...COMMON_GOVERNANCE_FIELDS,
      ...COMMON_VALIDITY_FIELDS,
      ...COMMON_CLASSIFICATION_FIELDS,
    ],
    sections: [
      { key: "description", label: "Beschreibung", required: true },
      { key: "structure", label: "Aufbauorganisation", required: false },
      { key: "children", label: "Zugehörige Seiten", required: false },
    ],
  },

  process_page_text: {
    type: "process_page_text",
    label: "Process Page (Text)",
    labelDe: "Prozessseite (Text)",
    description: "Text-based process documentation with procedure steps",
    descriptionDe: "Textbasierte Prozessdokumentation mit Verfahrensschritten",
    icon: "FileText",
    color: "hsl(220, 60%, 50%)",
    category: "process",
    allowedChildTypes: ["procedure_instruction", "use_case"],
    metadataFields: [
      ...COMMON_IDENTITY_FIELDS,
      ...COMMON_GOVERNANCE_FIELDS,
      ...COMMON_VALIDITY_FIELDS,
      ...COMMON_CLASSIFICATION_FIELDS,
    ],
    sections: [
      {
        key: "procedure",
        label: "Ablauf",
        description: "Verfahrensschritte & RACI",
        required: true,
      },
      {
        key: "interfaces",
        label: "Schnittstellen",
        description: "Systeme & Dokumente",
        required: false,
      },
    ],
  },

  process_page_graphic: {
    type: "process_page_graphic",
    label: "Process Page (Graphic)",
    labelDe: "Prozessseite (Grafik)",
    description: "Graphic/swimlane process documentation",
    descriptionDe: "Grafische Prozessdokumentation mit Swimlane-Diagramm",
    icon: "GitBranchPlus",
    color: "hsl(260, 50%, 55%)",
    category: "process",
    allowedChildTypes: ["procedure_instruction", "use_case"],
    metadataFields: [
      ...COMMON_IDENTITY_FIELDS,
      ...COMMON_GOVERNANCE_FIELDS,
      ...COMMON_VALIDITY_FIELDS,
      ...COMMON_CLASSIFICATION_FIELDS,
    ],
    sections: [
      {
        key: "diagram",
        label: "Diagramm",
        description: "Swimlane-Darstellung",
        required: true,
      },
      { key: "description", label: "Erläuterung", required: false },
    ],
  },

  procedure_instruction: {
    type: "procedure_instruction",
    label: "Procedure Instruction",
    labelDe: "Verfahrensanweisung",
    description: "Detailed step-by-step work instruction",
    descriptionDe: "Detaillierte Schritt-für-Schritt Verfahrensanweisung",
    icon: "ListChecks",
    color: "hsl(30, 80%, 50%)",
    category: "process",
    allowedChildTypes: [],
    metadataFields: [
      ...COMMON_IDENTITY_FIELDS,
      ...COMMON_GOVERNANCE_FIELDS,
      ...COMMON_VALIDITY_FIELDS,
      ...COMMON_CLASSIFICATION_FIELDS,
      {
        key: "document_number",
        label: "Dokumentennummer",
        type: "text",
        required: false,
        group: "identity",
        description: "Formale Dokumentennummer (z.B. VA-001)",
      },
    ],
    sections: [
      {
        key: "scope",
        label: "Geltungsbereich",
        description: "Zweck & Geltungsbereich",
        required: true,
      },
      {
        key: "procedure",
        label: "Durchführung",
        description: "Schritte & Verantwortlichkeiten",
        required: true,
      },
      { key: "documents", label: "Mitgeltende Unterlagen", required: false },
    ],
  },

  use_case: {
    type: "use_case",
    label: "Use Case",
    labelDe: "Use Case",
    description: "Use case documentation with actors, flows, and conditions",
    descriptionDe:
      "Use-Case-Dokumentation mit Akteuren, Abläufen und Bedingungen",
    icon: "Users",
    color: "hsl(180, 50%, 45%)",
    category: "documentation",
    allowedChildTypes: [],
    metadataFields: [
      ...COMMON_IDENTITY_FIELDS,
      ...COMMON_GOVERNANCE_FIELDS,
      ...COMMON_CLASSIFICATION_FIELDS,
    ],
    sections: [
      {
        key: "main",
        label: "Use Case",
        description: "Akteur, Haupt-/Alternativabläufe, Bedingungen",
        required: true,
      },
    ],
  },

  policy: {
    type: "policy",
    label: "Policy",
    labelDe: "Richtlinie / Policy",
    description: "Policy document with purpose, scope, and enforcement",
    descriptionDe:
      "Richtliniendokument mit Zweck, Geltungsbereich und Durchsetzung",
    icon: "Shield",
    color: "hsl(0, 60%, 50%)",
    category: "governance",
    allowedChildTypes: ["procedure_instruction"],
    metadataFields: [
      ...COMMON_IDENTITY_FIELDS,
      ...COMMON_GOVERNANCE_FIELDS,
      ...COMMON_VALIDITY_FIELDS,
      ...COMMON_CLASSIFICATION_FIELDS,
      {
        key: "regulation_reference",
        label: "Normbezug",
        type: "text",
        required: false,
        group: "classification",
        description: "Referenz auf Norm oder Gesetz (z.B. ISO 9001, DSGVO)",
      },
    ],
    sections: [
      { key: "purpose", label: "Zweck", required: true },
      { key: "scope", label: "Geltungsbereich", required: true },
      { key: "policy_text", label: "Richtlinientext", required: true },
      { key: "enforcement", label: "Durchsetzung", required: false },
    ],
  },

  role_profile: {
    type: "role_profile",
    label: "Role Profile",
    labelDe: "Rollen-/Stellenprofil",
    description:
      "Role profile with responsibilities, qualifications, and authority",
    descriptionDe:
      "Rollenprofil mit Verantwortlichkeiten, Qualifikationen und Befugnissen",
    icon: "UserCog",
    color: "hsl(320, 50%, 50%)",
    category: "governance",
    allowedChildTypes: [],
    metadataFields: [
      ...COMMON_IDENTITY_FIELDS,
      {
        key: "owner",
        label: "Verantwortlicher",
        type: "person",
        required: true,
        group: "governance",
      },
      ...COMMON_CLASSIFICATION_FIELDS,
    ],
    sections: [
      {
        key: "role_definition",
        label: "Rollendefinition",
        description: "Name & Einordnung",
        required: true,
      },
      {
        key: "responsibilities",
        label: "Verantwortlichkeiten",
        required: true,
      },
      { key: "qualifications", label: "Qualifikationen", required: false },
      { key: "authority", label: "Befugnisse", required: false },
    ],
  },

  dashboard: {
    type: "dashboard",
    label: "Dashboard",
    labelDe: "Dashboard",
    description: "Dashboard with configurable widgets and KPI overview",
    descriptionDe: "Dashboard mit konfigurierbaren Widgets und KPI-Übersicht",
    icon: "LayoutDashboard",
    color: "hsl(280, 50%, 55%)",
    category: "system",
    allowedChildTypes: [],
    metadataFields: [
      ...COMMON_IDENTITY_FIELDS,
      {
        key: "owner",
        label: "Verantwortlicher",
        type: "person",
        required: false,
        group: "governance",
      },
      ...COMMON_CLASSIFICATION_FIELDS,
    ],
    sections: [
      {
        key: "widgets",
        label: "Widgets",
        description: "Dashboard-Konfiguration",
        required: false,
      },
      { key: "description", label: "Beschreibung", required: false },
    ],
  },

  system_documentation: {
    type: "system_documentation",
    label: "System Documentation",
    labelDe: "Systemdokumentation",
    description:
      "IT system documentation with interfaces, data objects, and access rights",
    descriptionDe:
      "IT-Systemdokumentation mit Schnittstellen, Datenobjekten und Zugriffsrechten",
    icon: "Server",
    color: "hsl(200, 40%, 50%)",
    category: "system",
    allowedChildTypes: [],
    metadataFields: [
      ...COMMON_IDENTITY_FIELDS,
      ...COMMON_GOVERNANCE_FIELDS,
      ...COMMON_VALIDITY_FIELDS,
      ...COMMON_CLASSIFICATION_FIELDS,
      {
        key: "system_owner",
        label: "Systemverantwortlicher",
        type: "person",
        required: false,
        group: "governance",
      },
      {
        key: "environment",
        label: "Umgebung",
        type: "enum",
        required: false,
        group: "classification",
        options: ["production", "staging", "development", "test"],
      },
    ],
    sections: [
      { key: "system_info", label: "Systeminformationen", required: true },
      { key: "interfaces", label: "Schnittstellen", required: false },
      { key: "data_objects", label: "Datenobjekte", required: false },
      { key: "access_rights", label: "Zugriffsrechte", required: false },
    ],
  },
};

export const ALL_TEMPLATE_TYPES = Object.keys(
  PAGE_TYPE_REGISTRY,
) as TemplateType[];

export function getPageType(type: string): PageTypeDefinition | undefined {
  return PAGE_TYPE_REGISTRY[type as TemplateType];
}

export function getAllowedChildTypes(parentType: string): TemplateType[] {
  const def = getPageType(parentType);
  return def?.allowedChildTypes ?? ALL_TEMPLATE_TYPES;
}

export function getMetadataGroups(
  type: string,
): Record<MetadataGroupKey, MetadataFieldDef[]> {
  const def = getPageType(type);
  if (!def)
    return {
      identity: [],
      governance: [],
      responsibilities: [],
      validity: [],
      classification: [],
    };

  const groups: Record<MetadataGroupKey, MetadataFieldDef[]> = {
    identity: [],
    governance: [],
    responsibilities: [],
    validity: [],
    classification: [],
  };

  for (const field of def.metadataFields) {
    groups[field.group].push(field);
  }

  return groups;
}

export const METADATA_GROUP_LABELS: Record<MetadataGroupKey, string> = {
  identity: "Identifikation",
  governance: "Governance & Verantwortung",
  responsibilities: "Zuständigkeiten",
  validity: "Gültigkeit & Prüfzyklus",
  classification: "Klassifikation & Schlagwörter",
};

export function calculateCompleteness(
  type: string,
  metadata: Record<string, unknown>,
  sectionData: Record<string, unknown>,
): { total: number; filled: number; percentage: number; missing: string[] } {
  const def = getPageType(type);
  if (!def) return { total: 0, filled: 0, percentage: 100, missing: [] };

  const missing: string[] = [];
  let total = 0;
  let filled = 0;

  for (const field of def.metadataFields) {
    if (field.required) {
      total++;
      const val = metadata[field.key];
      if (val !== undefined && val !== null && val !== "") {
        filled++;
      } else {
        missing.push(field.label);
      }
    }
  }

  for (const section of def.sections) {
    if (section.required) {
      total++;
      const val = sectionData[section.key];
      if (val !== undefined && val !== null && val !== "") {
        filled++;
      } else {
        missing.push(section.label);
      }
    }
  }

  const percentage = total === 0 ? 100 : Math.round((filled / total) * 100);
  return { total, filled, percentage, missing };
}

export const PAGE_TYPE_CATEGORIES = {
  process: { label: "Prozesse", labelDe: "Prozesse", icon: "Workflow" },
  documentation: {
    label: "Documentation",
    labelDe: "Dokumentation",
    icon: "FileText",
  },
  governance: { label: "Governance", labelDe: "Governance", icon: "Shield" },
  system: { label: "Systems", labelDe: "Systeme", icon: "Server" },
} as const;
