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
  | "system_documentation"
  | "glossary"
  | "work_instruction"
  | "checklist"
  | "faq"
  | "interface_description"
  | "meeting_protocol"
  | "training_resource"
  | "audit_object";

export type MetadataGroupKey =
  | "identity"
  | "governance"
  | "responsibilities"
  | "validity"
  | "classification";

export type FieldRequirement = "required" | "recommended" | "conditional";

export interface MetadataFieldDef {
  key: string;
  label: string;
  type: "text" | "date" | "person" | "enum" | "tags" | "number" | "boolean";
  required: boolean;
  group: MetadataGroupKey;
  description?: string;
  options?: string[];
  requirement?: FieldRequirement;
  conditionDescription?: string;
  publishRequired?: boolean;
  errorMessage?: string;
}

export interface PageTypeSection {
  key: string;
  label: string;
  description?: string;
  helpText?: string;
  guidingQuestions?: string[];
  required: boolean;
  requirement?: FieldRequirement;
  conditionDescription?: string;
  publishRequired?: boolean;
  minContentLength?: number;
  guidedModeStep?: number;
  errorMessage?: string;
}

export interface TemplateVariant {
  key: string;
  label: string;
  description: string;
  prefilledSections?: string[];
}

export type PageTypeCategory =
  | "process"
  | "documentation"
  | "governance"
  | "system"
  | "quality"
  | "knowledge";

export interface PublicationRules {
  minimumSections: string[];
  minimumMetadata: string[];
  minSectionContentLength: number;
  customRules?: PublicationRule[];
}

export interface PublicationRule {
  id: string;
  description: string;
  check: (metadata: Record<string, unknown>, sections: Record<string, unknown>) => boolean;
  errorMessage: string;
}

export interface ValidationError {
  field: string;
  fieldLabel: string;
  message: string;
  type: "missing_required" | "content_too_short" | "invalid_format" | "custom_rule";
}

export interface ValidationWarning {
  field: string;
  fieldLabel: string;
  message: string;
  type: "recommended_empty" | "conditional_empty";
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  readinessPercentage: number;
}

export const REGISTRY_VERSION = "1.0.0";

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
  category: PageTypeCategory;
  helpText?: string;
  variants: TemplateVariant[];
  publicationRules: PublicationRules;
}

const COMMON_IDENTITY_FIELDS: MetadataFieldDef[] = [
  {
    key: "document_type",
    label: "Dokumentenart",
    type: "enum",
    required: false,
    requirement: "recommended",
    group: "identity",
    options: [
      "procedure",
      "policy",
      "guideline",
      "form",
      "checklist",
      "report",
      "specification",
      "manual",
      "record",
    ],
    description: "Art des Dokuments gemäß Dokumentenklassifikation",
    errorMessage: "Bitte wählen Sie eine Dokumentenart aus.",
  },
];

const COMMON_GOVERNANCE_FIELDS: MetadataFieldDef[] = [
  {
    key: "owner",
    label: "Prozesseigner",
    type: "person",
    required: true,
    requirement: "required",
    publishRequired: true,
    group: "governance",
    description: "Verantwortlicher für den Inhalt",
    errorMessage: "Ein Prozesseigner muss zugewiesen werden.",
  },
  {
    key: "deputy",
    label: "Stellvertreter",
    type: "person",
    required: false,
    requirement: "recommended",
    group: "governance",
    description: "Vertretung des Prozesseigners",
  },
  {
    key: "reviewer",
    label: "Prüfer",
    type: "person",
    required: false,
    requirement: "conditional",
    conditionDescription: "Erforderlich, wenn der Inhalt einen Freigabeprozess durchläuft",
    publishRequired: true,
    group: "governance",
    description: "Fachliche Prüfung",
    errorMessage: "Für die Veröffentlichung muss ein Prüfer benannt werden.",
  },
  {
    key: "approver",
    label: "Freigeber",
    type: "person",
    required: false,
    requirement: "conditional",
    conditionDescription: "Erforderlich für regulatorische oder governance-relevante Inhalte",
    group: "governance",
    description: "Freigabe-Verantwortlicher",
  },
  {
    key: "source_of_truth",
    label: "Führendes System",
    type: "text",
    required: false,
    requirement: "recommended",
    group: "governance",
    description: "System oder Quelle, die als maßgeblich gilt",
  },
];

const COMMON_VALIDITY_FIELDS: MetadataFieldDef[] = [
  {
    key: "valid_from",
    label: "Gültig ab",
    type: "date",
    required: false,
    requirement: "recommended",
    publishRequired: true,
    group: "validity",
    description: "Datum der Gültigkeit",
    errorMessage: "Bitte geben Sie ein Gültigkeitsdatum an.",
  },
  {
    key: "valid_until",
    label: "Gültig bis",
    type: "date",
    required: false,
    requirement: "conditional",
    conditionDescription: "Setzen, wenn das Dokument zeitlich befristet ist",
    group: "validity",
  },
  {
    key: "effective_date",
    label: "Inkrafttretungsdatum",
    type: "date",
    required: false,
    requirement: "conditional",
    conditionDescription: "Erforderlich für regulatorisch relevante Dokumente",
    group: "validity",
    description: "Datum, ab dem das Dokument verbindlich gilt",
  },
  {
    key: "review_cycle_months",
    label: "Prüfzyklus (Monate)",
    type: "number",
    required: false,
    requirement: "recommended",
    publishRequired: true,
    group: "validity",
    description: "Regelmäßiger Prüfintervall in Monaten",
    errorMessage: "Bitte definieren Sie einen Prüfzyklus für die Veröffentlichung.",
  },
  {
    key: "next_review_date",
    label: "Nächste Prüfung",
    type: "date",
    required: false,
    requirement: "recommended",
    group: "validity",
  },
  {
    key: "review_required_by",
    label: "Prüfung erforderlich bis",
    type: "date",
    required: false,
    requirement: "conditional",
    conditionDescription: "Automatisch gesetzt basierend auf Prüfzyklus",
    group: "validity",
    description: "Deadline für die nächste inhaltliche Prüfung",
  },
  {
    key: "last_verified_at",
    label: "Letzte Verifizierung",
    type: "date",
    required: false,
    requirement: "conditional",
    conditionDescription: "Wird bei der ersten Verifizierung gesetzt",
    group: "validity",
    description: "Datum der letzten inhaltlichen Verifizierung",
  },
  {
    key: "verification_result",
    label: "Verifizierungsergebnis",
    type: "enum",
    required: false,
    requirement: "conditional",
    conditionDescription: "Wird nach der Verifizierung gesetzt",
    group: "validity",
    options: ["current", "update_needed", "obsolete"],
    description: "Ergebnis der letzten Verifizierung",
  },
];

const COMMON_CLASSIFICATION_FIELDS: MetadataFieldDef[] = [
  {
    key: "confidentiality",
    label: "Vertraulichkeit",
    type: "enum",
    required: false,
    requirement: "recommended",
    publishRequired: true,
    group: "classification",
    options: ["public", "internal", "confidential", "strictly_confidential"],
    description: "Vertraulichkeitsstufe des Dokuments",
    errorMessage: "Bitte stufen Sie die Vertraulichkeit ein.",
  },
  {
    key: "risk_level",
    label: "Risikoeinstufung",
    type: "enum",
    required: false,
    requirement: "recommended",
    group: "classification",
    options: ["low", "medium", "high", "critical"],
    description: "Risikoeinstufung bei Nichtbeachtung oder Ausfall",
  },
  {
    key: "tags",
    label: "Schlagwörter",
    type: "tags",
    required: false,
    requirement: "recommended",
    group: "classification",
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
    helpText:
      "Erstellen Sie eine Kernprozess-Übersicht, um einen übergeordneten Geschäftsprozess zu dokumentieren. Füllen Sie die SIPOC-Tabelle aus, definieren Sie KPIs und verknüpfen Sie zugehörige Teilprozesse.",
    allowedChildTypes: [
      "process_page_text",
      "process_page_graphic",
      "procedure_instruction",
      "work_instruction",
      "use_case",
      "role_profile",
      "system_documentation",
      "interface_description",
      "checklist",
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
        label: "Zweck & Geltungsbereich",
        description: "Warum existiert dieser Prozess und wer ist betroffen?",
        helpText:
          "Beschreiben Sie den Zweck des Prozesses, seinen Geltungsbereich und die relevanten Organisationseinheiten.",
        guidingQuestions: [
          "Welches Geschäftsziel unterstützt dieser Prozess?",
          "Für welche Bereiche/Standorte gilt er?",
          "Welche Ergebnisse liefert der Prozess?",
        ],
        required: true,
        requirement: "required",
        publishRequired: true,
        minContentLength: 50,
        guidedModeStep: 1,
        errorMessage: "Bitte beschreiben Sie den Zweck und Geltungsbereich des Prozesses.",
      },
      {
        key: "sipoc",
        label: "SIPOC",
        description: "Suppliers, Inputs, Process, Outputs, Customers",
        helpText:
          "Definieren Sie die SIPOC-Elemente, um den Prozess auf oberster Ebene zu beschreiben.",
        guidingQuestions: [
          "Wer liefert die Eingaben (Suppliers)?",
          "Welche Eingaben werden benötigt (Inputs)?",
          "Was sind die Hauptschritte (Process)?",
          "Was wird produziert (Outputs)?",
          "Wer erhält die Ergebnisse (Customers)?",
        ],
        required: true,
        requirement: "required",
        publishRequired: true,
        minContentLength: 30,
        guidedModeStep: 2,
        errorMessage: "Bitte füllen Sie die SIPOC-Analyse aus.",
      },
      {
        key: "kpis",
        label: "KPIs & Kennzahlen",
        description: "Messbare Erfolgsindikatoren",
        helpText:
          "Definieren Sie die Kennzahlen, mit denen der Prozesserfolg gemessen wird.",
        guidingQuestions: [
          "Wie wird die Prozessleistung gemessen?",
          "Welche Zielwerte gelten?",
          "Wie häufig wird gemessen?",
        ],
        required: false,
        requirement: "recommended",
        publishRequired: true,
        guidedModeStep: 3,
        errorMessage: "Es wird empfohlen, mindestens einen KPI zu definieren.",
      },
      {
        key: "compliance",
        label: "Normbezug & Compliance",
        description: "Regulatorische Anforderungen und Normreferenzen",
        helpText:
          "Listen Sie relevante Normen, Gesetze und regulatorische Anforderungen auf.",
        guidingQuestions: [
          "Welche Normen (ISO, DIN) sind relevant?",
          "Welche gesetzlichen Anforderungen bestehen?",
          "Gibt es branchenspezifische Vorgaben?",
        ],
        required: false,
        requirement: "recommended",
        guidedModeStep: 4,
      },
      {
        key: "risks",
        label: "Prozessrisiken",
        description: "Identifizierte Risiken und Gegenmaßnahmen",
        helpText:
          "Dokumentieren Sie die wesentlichen Risiken des Prozesses und deren Gegenmaßnahmen.",
        guidingQuestions: [
          "Was kann bei diesem Prozess schiefgehen?",
          "Welche Gegenmaßnahmen sind etabliert?",
          "Wie hoch ist die Eintrittswahrscheinlichkeit?",
        ],
        required: false,
        requirement: "recommended",
        guidedModeStep: 5,
      },
      { key: "children", label: "Untergeordnete Prozesse", required: false, requirement: "conditional", conditionDescription: "Wenn Teilprozesse existieren" },
    ],
    publicationRules: {
      minimumSections: ["overview", "sipoc"],
      minimumMetadata: ["owner"],
      minSectionContentLength: 30,
    },
    variants: [
      {
        key: "blank",
        label: "Leer",
        description:
          "Leere Kernprozess-Übersicht ohne vorausgefüllte Abschnitte",
      },
      {
        key: "standard",
        label: "Standard",
        description:
          "Übersicht mit vorbereiteten Abschnitten für SIPOC, KPIs und Compliance",
        prefilledSections: ["overview", "sipoc", "kpis", "compliance"],
      },
      {
        key: "full",
        label: "Vollständig",
        description:
          "Alle Abschnitte inkl. Risiken vorausgefüllt",
        prefilledSections: ["overview", "sipoc", "kpis", "compliance", "risks"],
      },
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
    helpText:
      "Nutzen Sie die Bereichsübersicht, um Abteilungen oder Organisationseinheiten zu dokumentieren. Beschreiben Sie Aufgaben, Aufbauorganisation und verknüpfen Sie relevante Prozesse.",
    allowedChildTypes: [
      "core_process_overview",
      "process_page_text",
      "policy",
      "role_profile",
      "dashboard",
      "system_documentation",
      "faq",
      "training_resource",
    ],
    metadataFields: [
      ...COMMON_IDENTITY_FIELDS,
      ...COMMON_GOVERNANCE_FIELDS,
      ...COMMON_VALIDITY_FIELDS,
      ...COMMON_CLASSIFICATION_FIELDS,
    ],
    sections: [
      {
        key: "description",
        label: "Beschreibung",
        description: "Aufgaben und Zuständigkeiten des Bereichs",
        helpText:
          "Beschreiben Sie die Kernaufgaben, den Auftrag und die Zuständigkeiten des Bereichs.",
        guidingQuestions: [
          "Was ist der Auftrag des Bereichs?",
          "Welche Kernaufgaben hat der Bereich?",
          "Wie ordnet sich der Bereich in die Gesamtorganisation ein?",
        ],
        required: true,
        requirement: "required",
        publishRequired: true,
        minContentLength: 50,
        guidedModeStep: 1,
        errorMessage: "Bitte beschreiben Sie die Aufgaben und Zuständigkeiten des Bereichs.",
      },
      {
        key: "structure",
        label: "Aufbauorganisation",
        description: "Organisatorischer Aufbau und Rollenverteilung",
        helpText:
          "Beschreiben Sie den organisatorischen Aufbau, Teams und Verantwortlichkeiten.",
        guidingQuestions: [
          "Welche Teams/Gruppen gibt es?",
          "Wer leitet den Bereich?",
          "Wie viele Mitarbeitende sind zugeordnet?",
        ],
        required: false,
        requirement: "recommended",
        guidedModeStep: 2,
      },
      {
        key: "interfaces",
        label: "Schnittstellen",
        description: "Zusammenarbeit mit anderen Bereichen",
        helpText:
          "Dokumentieren Sie die wichtigsten Schnittstellen zu anderen Bereichen.",
        guidingQuestions: [
          "Mit welchen Bereichen wird eng zusammengearbeitet?",
          "Welche Leistungen werden ausgetauscht?",
        ],
        required: false,
        requirement: "recommended",
        guidedModeStep: 3,
      },
      { key: "children", label: "Zugehörige Seiten", required: false, requirement: "conditional", conditionDescription: "Wenn zugehörige Seiten existieren" },
    ],
    publicationRules: {
      minimumSections: ["description"],
      minimumMetadata: ["owner"],
      minSectionContentLength: 30,
    },
    variants: [
      {
        key: "blank",
        label: "Leer",
        description: "Leere Bereichsübersicht",
      },
      {
        key: "standard",
        label: "Standard",
        description: "Mit Beschreibung und Aufbauorganisation",
        prefilledSections: ["description", "structure"],
      },
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
    helpText:
      "Dokumentieren Sie einen Prozessablauf als Textbeschreibung mit Verfahrensschritten, Zuständigkeiten und zugehörigen Dokumenten.",
    allowedChildTypes: [
      "procedure_instruction",
      "work_instruction",
      "use_case",
      "checklist",
    ],
    metadataFields: [
      ...COMMON_IDENTITY_FIELDS,
      ...COMMON_GOVERNANCE_FIELDS,
      ...COMMON_VALIDITY_FIELDS,
      ...COMMON_CLASSIFICATION_FIELDS,
      {
        key: "process_type",
        label: "Prozessart",
        type: "enum",
        required: false,
        group: "classification",
        options: ["core", "support", "management"],
        description: "Art des Prozesses (Kern-, Unterstützungs- oder Managementprozess)",
      },
    ],
    sections: [
      {
        key: "trigger",
        label: "Auslöser & Eingaben",
        description: "Was löst den Prozess aus und welche Eingaben werden benötigt?",
        helpText:
          "Beschreiben Sie die Auslöser (Trigger) und die notwendigen Eingaben für den Prozessstart.",
        guidingQuestions: [
          "Was startet den Prozess?",
          "Welche Unterlagen/Daten werden benötigt?",
          "Gibt es Vorbedingungen?",
        ],
        required: false,
      },
      {
        key: "procedure",
        label: "Ablauf",
        description: "Verfahrensschritte & RACI",
        helpText:
          "Beschreiben Sie die einzelnen Schritte des Prozesses mit Verantwortlichkeiten (RACI).",
        guidingQuestions: [
          "Welche Schritte werden in welcher Reihenfolge ausgeführt?",
          "Wer ist für jeden Schritt verantwortlich?",
          "Welche Entscheidungspunkte gibt es?",
        ],
        required: true,
      },
      {
        key: "outputs",
        label: "Ergebnisse & Ausgaben",
        description: "Was liefert der Prozess als Ergebnis?",
        helpText:
          "Beschreiben Sie die Ergebnisse und Dokumente, die der Prozess erzeugt.",
        guidingQuestions: [
          "Welche Dokumente/Daten werden erzeugt?",
          "Wer erhält die Ergebnisse?",
          "Welche Qualitätskriterien gelten?",
        ],
        required: false,
      },
      {
        key: "interfaces",
        label: "Schnittstellen",
        description: "Systeme & Dokumente",
        helpText:
          "Listen Sie die IT-Systeme, Formulare und Dokumente auf, die im Prozess verwendet werden.",
        required: false,
        requirement: "recommended",
        guidedModeStep: 4,
      },
    ],
    publicationRules: {
      minimumSections: ["procedure"],
      minimumMetadata: ["owner"],
      minSectionContentLength: 30,
    },
    variants: [
      {
        key: "blank",
        label: "Leer",
        description: "Leere textbasierte Prozessseite",
      },
      {
        key: "standard",
        label: "Standard",
        description: "Mit Ablauf und Schnittstellenabschnitt",
        prefilledSections: ["procedure", "interfaces"],
      },
      {
        key: "detailed",
        label: "Detailliert",
        description: "Alle Abschnitte inkl. Auslöser und Ergebnisse",
        prefilledSections: ["trigger", "procedure", "outputs", "interfaces"],
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
    helpText:
      "Erstellen Sie eine grafische Prozessdarstellung mit Swimlane-Diagramm. Ideal für Prozesse, die visuell besser verständlich sind als in Textform.",
    allowedChildTypes: [
      "procedure_instruction",
      "work_instruction",
      "use_case",
    ],
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
        helpText:
          "Erstellen oder verlinken Sie ein Swimlane-Diagramm. Benennen Sie die Rollen/Bereiche in den Bahnen.",
        guidingQuestions: [
          "Welche Rollen/Bereiche sind beteiligt (Swimlanes)?",
          "Welche Aktivitäten werden in welcher Reihenfolge ausgeführt?",
          "Wo gibt es Entscheidungspunkte?",
        ],
        required: true,
      },
      {
        key: "description",
        label: "Erläuterung",
        description: "Textuelle Beschreibung zum Diagramm",
        helpText:
          "Ergänzen Sie die grafische Darstellung um textuelle Erläuterungen zu Besonderheiten.",
        required: false,
      },
      {
        key: "legend",
        label: "Legende & Symbole",
        description: "Erklärung der verwendeten Symbole und Farben",
        required: false,
        requirement: "recommended",
        guidedModeStep: 3,
      },
    ],
    publicationRules: {
      minimumSections: ["diagram"],
      minimumMetadata: ["owner"],
      minSectionContentLength: 20,
    },
    variants: [
      {
        key: "blank",
        label: "Leer",
        description: "Leere grafische Prozessseite",
      },
      {
        key: "swimlane",
        label: "Swimlane",
        description: "Vorlage mit Swimlane-Diagramm und Erläuterung",
        prefilledSections: ["diagram", "description"],
      },
    ],
  },

  procedure_instruction: {
    type: "procedure_instruction",
    label: "Procedure Instruction",
    labelDe: "Verfahrensanweisung",
    description:
      "Detailed procedure instruction with scope, triggers, responsibilities, risks, and related documents",
    descriptionDe:
      "Detaillierte Verfahrensanweisung mit Geltungsbereich, Auslösern, Verantwortlichkeiten, Risiken und mitgeltenden Unterlagen",
    icon: "ListChecks",
    color: "hsl(30, 80%, 50%)",
    category: "process",
    helpText:
      "Erstellen Sie eine detaillierte Verfahrensanweisung nach QM-Standard. Definieren Sie Zweck, Geltungsbereich, Auslöser, Ablauf, Verantwortlichkeiten, Schnittstellen, Risiken und mitgeltende Unterlagen.",
    allowedChildTypes: ["work_instruction", "checklist"],
    metadataFields: [
      ...COMMON_IDENTITY_FIELDS,
      ...COMMON_GOVERNANCE_FIELDS,
      ...COMMON_VALIDITY_FIELDS,
      ...COMMON_CLASSIFICATION_FIELDS,
      {
        key: "document_number",
        label: "Dokumentennummer",
        type: "text",
        required: true,
        group: "identity",
        description: "Formale Dokumentennummer (z.B. VA-001)",
      },
      {
        key: "revision_number",
        label: "Revisionsnummer",
        type: "text",
        required: false,
        group: "identity",
        description: "Aktuelle Revisionsnummer des Dokuments",
      },
    ],
    sections: [
      {
        key: "purpose",
        label: "Zweck",
        description: "Zweck und Ziel der Verfahrensanweisung",
        helpText:
          "Beschreiben Sie, warum diese Verfahrensanweisung existiert und welches Ziel sie verfolgt.",
        guidingQuestions: [
          "Was soll mit dieser Verfahrensanweisung sichergestellt werden?",
          "Welches übergeordnete Ziel wird unterstützt?",
        ],
        required: true,
      },
      {
        key: "scope",
        label: "Geltungsbereich",
        description: "Für wen und wo gilt diese Anweisung?",
        helpText:
          "Definieren Sie, für welche Bereiche, Standorte und Personen diese Anweisung gilt.",
        guidingQuestions: [
          "Für welche Organisationseinheiten gilt die Anweisung?",
          "Gibt es Ausnahmen?",
          "Gilt sie standortübergreifend?",
        ],
        required: true,
      },
      {
        key: "trigger",
        label: "Auslöser & Vorbedingungen",
        description: "Was löst das Verfahren aus?",
        helpText:
          "Beschreiben Sie die Ereignisse oder Bedingungen, die das Verfahren auslösen.",
        guidingQuestions: [
          "Welches Ereignis startet das Verfahren?",
          "Welche Voraussetzungen müssen erfüllt sein?",
          "Welche Eingaben werden benötigt?",
        ],
        required: false,
      },
      {
        key: "inputs",
        label: "Eingaben & Voraussetzungen",
        description: "Benötigte Dokumente, Daten und Ressourcen",
        helpText:
          "Listen Sie alle Eingaben auf, die für die Durchführung benötigt werden.",
        guidingQuestions: [
          "Welche Dokumente werden benötigt?",
          "Welche Daten müssen vorliegen?",
          "Welche Ressourcen/Werkzeuge sind erforderlich?",
        ],
        required: false,
      },
      {
        key: "procedure",
        label: "Ablaufbeschreibung",
        description: "Schrittweise Durchführung mit Verantwortlichkeiten",
        helpText:
          "Beschreiben Sie den Ablauf Schritt für Schritt. Geben Sie für jeden Schritt die Verantwortlichkeit an (Wer? Was? Wie? Womit?).",
        guidingQuestions: [
          "Welche Schritte werden in welcher Reihenfolge ausgeführt?",
          "Wer ist für jeden Schritt verantwortlich (R), wer wird informiert (I)?",
          "Welche Entscheidungen müssen getroffen werden?",
          "Welche Ergebnisse liefert jeder Schritt?",
        ],
        required: true,
      },
      {
        key: "responsibilities",
        label: "Verantwortlichkeiten (RACI)",
        description: "Responsible, Accountable, Consulted, Informed",
        helpText:
          "Ordnen Sie die Rollen und Verantwortlichkeiten nach dem RACI-Modell zu.",
        guidingQuestions: [
          "Wer führt die Tätigkeit aus (Responsible)?",
          "Wer trägt die Gesamtverantwortung (Accountable)?",
          "Wer muss konsultiert werden (Consulted)?",
          "Wer muss informiert werden (Informed)?",
        ],
        required: true,
      },
      {
        key: "interfaces",
        label: "Schnittstellen & Systeme",
        description: "Beteiligte IT-Systeme und organisatorische Schnittstellen",
        helpText:
          "Dokumentieren Sie die IT-Systeme und organisatorischen Schnittstellen, die im Verfahren genutzt werden.",
        guidingQuestions: [
          "Welche IT-Systeme werden verwendet?",
          "Welche Daten werden ausgetauscht?",
          "Welche anderen Prozesse sind betroffen?",
        ],
        required: false,
      },
      {
        key: "outputs",
        label: "Ergebnisse & Ausgaben",
        description: "Was wird durch das Verfahren erzeugt?",
        helpText:
          "Beschreiben Sie die Ergebnisse und Nachweise, die das Verfahren liefert.",
        guidingQuestions: [
          "Welche Dokumente/Nachweise werden erzeugt?",
          "Wer erhält die Ergebnisse?",
          "Wie werden die Ergebnisse archiviert?",
        ],
        required: false,
      },
      {
        key: "risks",
        label: "Risiken & Maßnahmen",
        description: "Identifizierte Risiken und Gegenmaßnahmen",
        helpText:
          "Listen Sie Risiken auf, die bei der Durchführung auftreten können, und definieren Sie Gegenmaßnahmen.",
        guidingQuestions: [
          "Was kann schiefgehen?",
          "Welche Gegenmaßnahmen sind etabliert?",
          "Wie wird das Restrisiko bewertet?",
        ],
        required: false,
      },
      {
        key: "kpis",
        label: "Kennzahlen & Messung",
        description: "Prozesskennzahlen zur Erfolgsmessung",
        helpText:
          "Definieren Sie Kennzahlen, um die Wirksamkeit des Verfahrens zu messen.",
        guidingQuestions: [
          "Wie wird die Einhaltung gemessen?",
          "Welche Zielwerte gelten?",
          "Wie häufig wird gemessen?",
        ],
        required: false,
      },
      {
        key: "documents",
        label: "Mitgeltende Unterlagen",
        description: "Referenzierte Dokumente, Normen und Formulare",
        helpText:
          "Listen Sie alle Dokumente auf, die für dieses Verfahren relevant sind.",
        guidingQuestions: [
          "Welche Normen/Standards sind referenziert?",
          "Welche Formulare werden verwendet?",
          "Welche anderen Verfahrensanweisungen sind verknüpft?",
        ],
        required: false,
      },
      {
        key: "changelog",
        label: "Änderungshistorie",
        description: "Dokumentierte Änderungen mit Datum und Verantwortlichem",
        helpText:
          "Führen Sie eine Übersicht der wesentlichen Änderungen an diesem Dokument.",
        required: false,
        requirement: "recommended",
        guidedModeStep: 12,
      },
    ],
    publicationRules: {
      minimumSections: ["purpose", "scope", "procedure", "responsibilities"],
      minimumMetadata: ["owner", "document_number"],
      minSectionContentLength: 30,
    },
    variants: [
      {
        key: "blank",
        label: "Leer",
        description: "Leere Verfahrensanweisung",
      },
      {
        key: "standard",
        label: "Standard",
        description: "Kernabschnitte: Zweck, Geltungsbereich, Ablauf, Verantwortlichkeiten",
        prefilledSections: ["purpose", "scope", "procedure", "responsibilities", "documents"],
      },
      {
        key: "detailed",
        label: "Vollständig (QM)",
        description: "Alle Abschnitte nach QM-Standard vorstrukturiert",
        prefilledSections: [
          "purpose",
          "scope",
          "trigger",
          "inputs",
          "procedure",
          "responsibilities",
          "interfaces",
          "outputs",
          "risks",
          "kpis",
          "documents",
          "changelog",
        ],
      },
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
    helpText:
      "Beschreiben Sie einen konkreten Anwendungsfall mit Akteuren, Vor-/Nachbedingungen, Normalablauf und Alternativabläufen.",
    allowedChildTypes: [],
    metadataFields: [
      ...COMMON_IDENTITY_FIELDS,
      ...COMMON_GOVERNANCE_FIELDS,
      ...COMMON_CLASSIFICATION_FIELDS,
    ],
    sections: [
      {
        key: "actors",
        label: "Akteure",
        description: "Beteiligte Personen und Systeme",
        helpText: "Wer sind die primären und sekundären Akteure?",
        guidingQuestions: [
          "Wer löst den Use Case aus?",
          "Welche weiteren Akteure sind beteiligt?",
        ],
        required: true,
      },
      {
        key: "preconditions",
        label: "Vorbedingungen",
        description: "Was muss erfüllt sein, bevor der Use Case startet?",
        required: true,
      },
      {
        key: "main_flow",
        label: "Normalablauf",
        description: "Schrittweiser Ablauf im Erfolgsfall",
        helpText:
          "Beschreiben Sie den Ablauf Schritt für Schritt, wenn alles wie geplant verläuft.",
        guidingQuestions: [
          "Was passiert in welcher Reihenfolge?",
          "Welche Daten werden verarbeitet?",
        ],
        required: true,
      },
      {
        key: "alternative_flows",
        label: "Alternativabläufe",
        description: "Abweichungen vom Normalablauf",
        helpText: "Beschreiben Sie Varianten und Sonderfälle.",
        required: false,
      },
      {
        key: "postconditions",
        label: "Nachbedingungen",
        description: "Was gilt nach erfolgreicher Durchführung?",
        required: false,
        requirement: "recommended",
        guidedModeStep: 5,
      },
    ],
    publicationRules: {
      minimumSections: ["actors", "preconditions", "main_flow"],
      minimumMetadata: ["owner"],
      minSectionContentLength: 20,
    },
    variants: [
      {
        key: "standard",
        label: "Standard",
        description: "Use Case mit vorstrukturierten Abschnitten",
        prefilledSections: [
          "actors",
          "preconditions",
          "main_flow",
          "alternative_flows",
          "postconditions",
        ],
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
    helpText:
      "Erstellen Sie eine Richtlinie mit klarem Zweck, Geltungsbereich, Richtlinientext und Durchsetzungsmaßnahmen. Verknüpfen Sie bei Bedarf Verfahrensanweisungen.",
    allowedChildTypes: ["procedure_instruction", "work_instruction", "checklist"],
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
      {
        key: "compliance_category",
        label: "Compliance-Kategorie",
        type: "enum",
        required: false,
        group: "classification",
        options: [
          "data_protection",
          "information_security",
          "quality_management",
          "occupational_safety",
          "environmental",
          "financial",
          "general",
        ],
        description: "Zuordnung zu einem Compliance-Bereich",
      },
    ],
    sections: [
      {
        key: "purpose",
        label: "Zweck",
        description: "Warum existiert diese Richtlinie?",
        helpText:
          "Erklären Sie den Zweck und das Ziel der Richtlinie.",
        guidingQuestions: [
          "Welches Problem wird adressiert?",
          "Was soll die Richtlinie sicherstellen?",
        ],
        required: true,
      },
      {
        key: "scope",
        label: "Geltungsbereich",
        description: "Für wen und wo gilt die Richtlinie?",
        helpText:
          "Definieren Sie, für welche Personen, Bereiche und Standorte die Richtlinie gilt.",
        guidingQuestions: [
          "Wer muss die Richtlinie befolgen?",
          "Gibt es Ausnahmen?",
        ],
        required: true,
      },
      {
        key: "definitions",
        label: "Begriffe & Definitionen",
        description: "Klärung zentraler Begriffe",
        helpText:
          "Definieren Sie Fachbegriffe, die für das Verständnis der Richtlinie wichtig sind.",
        required: false,
      },
      {
        key: "policy_text",
        label: "Richtlinientext",
        description: "Die eigentlichen Regelungen",
        helpText:
          "Formulieren Sie die verbindlichen Regelungen klar und eindeutig.",
        guidingQuestions: [
          "Was genau wird geregelt?",
          "Welche Handlungen sind vorgeschrieben oder verboten?",
          "Welche Ausnahmen sind zulässig?",
        ],
        required: true,
      },
      {
        key: "enforcement",
        label: "Durchsetzung & Konsequenzen",
        description: "Maßnahmen bei Nichteinhaltung",
        helpText:
          "Beschreiben Sie, wie die Einhaltung überwacht wird und welche Konsequenzen bei Verstößen gelten.",
        guidingQuestions: [
          "Wie wird die Einhaltung überprüft?",
          "Welche Konsequenzen drohen bei Verstößen?",
          "Wer ist für die Durchsetzung verantwortlich?",
        ],
        required: false,
      },
      {
        key: "references",
        label: "Referenzen & mitgeltende Dokumente",
        description: "Verknüpfte Normen, Gesetze und Dokumente",
        required: false,
        requirement: "recommended",
        guidedModeStep: 6,
      },
    ],
    publicationRules: {
      minimumSections: ["purpose", "scope", "policy_text"],
      minimumMetadata: ["owner"],
      minSectionContentLength: 30,
    },
    variants: [
      {
        key: "blank",
        label: "Leer",
        description: "Leere Richtlinie",
      },
      {
        key: "full",
        label: "Vollständig",
        description: "Alle Pflichtabschnitte vorstrukturiert",
        prefilledSections: [
          "purpose",
          "scope",
          "definitions",
          "policy_text",
          "enforcement",
          "references",
        ],
      },
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
    helpText:
      "Definieren Sie ein Rollenprofil mit Aufgabenbeschreibung, Verantwortlichkeiten, erforderlichen Qualifikationen und Befugnissen.",
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
      {
        key: "department",
        label: "Abteilung / Bereich",
        type: "text",
        required: false,
        group: "classification",
        description: "Zugehöriger Organisationsbereich",
      },
      {
        key: "reports_to",
        label: "Berichtet an",
        type: "person",
        required: false,
        group: "governance",
        description: "Direkte Vorgesetzte / fachliche Leitung",
      },
    ],
    sections: [
      {
        key: "role_definition",
        label: "Rollendefinition",
        description: "Name, Einordnung & Stellenziel",
        helpText:
          "Beschreiben Sie die Rolle, ihre Einordnung in die Organisation und das Stellenziel.",
        guidingQuestions: [
          "Wie lautet die offizielle Bezeichnung?",
          "Wo ist die Rolle organisatorisch angesiedelt?",
          "Was ist das Hauptziel der Rolle?",
        ],
        required: true,
      },
      {
        key: "responsibilities",
        label: "Aufgaben & Verantwortlichkeiten",
        description: "Kernaufgaben und Verantwortungsbereiche",
        helpText:
          "Listen Sie die Hauptaufgaben und Verantwortungsbereiche der Rolle auf.",
        guidingQuestions: [
          "Welche Kernaufgaben hat die Rolle?",
          "Für welche Ergebnisse ist sie verantwortlich?",
          "Welche Prozesse werden verantwortet?",
        ],
        required: true,
      },
      {
        key: "qualifications",
        label: "Qualifikationen & Anforderungen",
        description: "Fachliche und persönliche Anforderungen",
        helpText:
          "Beschreiben Sie die erforderlichen Qualifikationen, Ausbildungen und Erfahrungen.",
        guidingQuestions: [
          "Welche Ausbildung wird vorausgesetzt?",
          "Welche Berufserfahrung ist erforderlich?",
          "Welche Zertifizierungen sind notwendig?",
        ],
        required: false,
      },
      {
        key: "authority",
        label: "Befugnisse",
        description: "Entscheidungs- und Handlungsbefugnisse",
        helpText:
          "Definieren Sie die Entscheidungs- und Handlungsbefugnisse der Rolle.",
        guidingQuestions: [
          "Welche Entscheidungen darf die Rolle treffen?",
          "Welche Budgetverantwortung besteht?",
          "Welche Weisungsbefugnisse gibt es?",
        ],
        required: false,
      },
      {
        key: "interfaces",
        label: "Zusammenarbeit & Schnittstellen",
        description: "Interne und externe Kooperationspartner",
        helpText:
          "Dokumentieren Sie die wichtigsten Kooperationsbeziehungen.",
        guidingQuestions: [
          "Mit wem arbeitet die Rolle eng zusammen?",
          "Welche externen Kontakte bestehen?",
        ],
        required: false,
        requirement: "recommended",
        guidedModeStep: 5,
      },
    ],
    publicationRules: {
      minimumSections: ["role_definition", "responsibilities"],
      minimumMetadata: ["owner"],
      minSectionContentLength: 30,
    },
    variants: [
      {
        key: "blank",
        label: "Leer",
        description: "Leeres Rollenprofil",
      },
      {
        key: "standard",
        label: "Standard",
        description: "Vollständiges Profil mit allen Abschnitten",
        prefilledSections: [
          "role_definition",
          "responsibilities",
          "qualifications",
          "authority",
          "interfaces",
        ],
      },
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
    helpText:
      "Erstellen Sie ein Dashboard mit konfigurierbaren Widgets für KPI-Übersichten, Prozesskennzahlen und Statusanzeigen.",
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
      { key: "description", label: "Beschreibung", required: false, requirement: "recommended" },
    ],
    publicationRules: {
      minimumSections: ["widgets"],
      minimumMetadata: [],
      minSectionContentLength: 10,
    },
    variants: [
      {
        key: "standard",
        label: "Standard",
        description: "Standard-Dashboard mit Widgets und Beschreibung",
        prefilledSections: ["widgets", "description"],
      },
    ],
  },

  glossary: {
    type: "glossary",
    label: "Glossary",
    labelDe: "Glossar",
    description: "Glossary page with term definitions and synonyms",
    descriptionDe:
      "Glossarseite mit Begriffsdefinitionen, Synonymen und Abkürzungen",
    icon: "BookOpen",
    color: "hsl(280, 50%, 55%)",
    category: "documentation",
    helpText:
      "Erstellen und verwalten Sie Glossareinträge mit Definitionen, Synonymen und Verknüpfungen zu relevanten Wiki-Seiten.",
    allowedChildTypes: [],
    metadataFields: [
      ...COMMON_IDENTITY_FIELDS,
      ...COMMON_GOVERNANCE_FIELDS,
      ...COMMON_CLASSIFICATION_FIELDS,
    ],
    sections: [
      {
        key: "terms",
        label: "Begriffe",
        description: "Glossarbegriffe und Definitionen",
        helpText:
          "Pflegen Sie die Begriffe alphabetisch mit Definition, Kontext und ggf. Synonymen.",
        required: true,
        requirement: "required",
        publishRequired: true,
        minContentLength: 20,
        guidedModeStep: 1,
        errorMessage: "Bitte definieren Sie mindestens einen Glossarbegriff.",
      },
    ],
    publicationRules: {
      minimumSections: ["terms"],
      minimumMetadata: ["owner"],
      minSectionContentLength: 20,
    },
    variants: [
      {
        key: "blank",
        label: "Leer",
        description: "Leere Glossarseite",
      },
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
    helpText:
      "Dokumentieren Sie ein IT-System mit Schnittstellen, Datenobjekten, Zugriffsrechten und technischen Details.",
    allowedChildTypes: ["interface_description"],
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
      {
        key: "system_criticality",
        label: "Systemkritikalität",
        type: "enum",
        required: false,
        group: "classification",
        options: ["mission_critical", "business_critical", "standard", "non_critical"],
        description: "Einstufung der Geschäftskritikalität des Systems",
      },
    ],
    sections: [
      {
        key: "system_info",
        label: "Systeminformationen",
        description: "Grundlegende Systembeschreibung",
        helpText:
          "Beschreiben Sie das System, seinen Zweck, die eingesetzte Technologie und den Betriebsstatus.",
        guidingQuestions: [
          "Was ist der Zweck des Systems?",
          "Welche Technologie wird eingesetzt?",
          "Wie ist der aktuelle Betriebsstatus?",
        ],
        required: true,
      },
      {
        key: "architecture",
        label: "Architektur & Komponenten",
        description: "Technische Architektur und Systemkomponenten",
        helpText:
          "Beschreiben Sie die Systemarchitektur, wichtige Komponenten und deren Zusammenwirken.",
        required: false,
      },
      {
        key: "interfaces",
        label: "Schnittstellen",
        description: "Ein- und ausgehende Schnittstellen",
        helpText:
          "Dokumentieren Sie alle Schnittstellen zu anderen Systemen.",
        guidingQuestions: [
          "Welche Systeme sind angebunden?",
          "Welche Daten werden ausgetauscht?",
          "Welches Protokoll wird verwendet?",
        ],
        required: false,
      },
      {
        key: "data_objects",
        label: "Datenobjekte",
        description: "Verwaltete Daten und Datenmodell",
        required: false,
      },
      {
        key: "access_rights",
        label: "Zugriffsrechte & Berechtigungen",
        description: "Rollen- und Berechtigungskonzept",
        helpText:
          "Beschreiben Sie das Berechtigungskonzept und die verschiedenen Zugriffsrollen.",
        required: false,
      },
      {
        key: "operations",
        label: "Betrieb & Wartung",
        description: "Betriebskonzept, SLA und Wartungsfenster",
        helpText:
          "Dokumentieren Sie SLAs, Wartungsfenster und Betriebsprozeduren.",
        required: false,
        requirement: "recommended",
        guidedModeStep: 6,
      },
    ],
    publicationRules: {
      minimumSections: ["system_info"],
      minimumMetadata: ["owner"],
      minSectionContentLength: 30,
    },
    variants: [
      {
        key: "blank",
        label: "Leer",
        description: "Leere Systemdokumentation",
      },
      {
        key: "detailed",
        label: "Detailliert",
        description: "Alle Abschnitte vorstrukturiert",
        prefilledSections: [
          "system_info",
          "architecture",
          "interfaces",
          "data_objects",
          "access_rights",
          "operations",
        ],
      },
    ],
  },

  work_instruction: {
    type: "work_instruction",
    label: "Work Instruction",
    labelDe: "Arbeitsanweisung",
    description:
      "Detailed step-by-step work instruction for specific tasks at the workplace",
    descriptionDe:
      "Detaillierte Schritt-für-Schritt-Arbeitsanweisung für konkrete Tätigkeiten am Arbeitsplatz",
    icon: "ClipboardCheck",
    color: "hsl(35, 85%, 48%)",
    category: "process",
    helpText:
      "Erstellen Sie eine Arbeitsanweisung für eine konkrete Tätigkeit. Im Unterschied zur Verfahrensanweisung beschreibt die Arbeitsanweisung das ‚Wie' auf Arbeitsplatzebene.",
    allowedChildTypes: ["checklist"],
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
        description: "Formale Dokumentennummer (z.B. AA-001)",
      },
      {
        key: "workplace",
        label: "Arbeitsplatz / Einsatzort",
        type: "text",
        required: false,
        group: "classification",
        description: "Konkreter Arbeitsplatz oder Einsatzort",
      },
    ],
    sections: [
      {
        key: "purpose",
        label: "Zweck",
        description: "Warum existiert diese Arbeitsanweisung?",
        helpText:
          "Beschreiben Sie kurz den Zweck und das Ziel dieser Arbeitsanweisung.",
        required: true,
      },
      {
        key: "scope",
        label: "Geltungsbereich",
        description: "Für wen und wo gilt diese Anweisung?",
        required: true,
      },
      {
        key: "safety",
        label: "Sicherheitshinweise",
        description: "Arbeitsschutz und Sicherheitsvorgaben",
        helpText:
          "Listen Sie alle relevanten Sicherheitshinweise und Schutzmaßnahmen auf.",
        guidingQuestions: [
          "Welche Schutzausrüstung ist erforderlich?",
          "Welche Gefahren bestehen?",
          "Welche Notfallmaßnahmen gelten?",
        ],
        required: false,
      },
      {
        key: "materials",
        label: "Werkzeuge & Materialien",
        description: "Benötigte Werkzeuge, Materialien und Hilfsmittel",
        helpText:
          "Listen Sie alle benötigten Werkzeuge und Materialien auf.",
        required: false,
      },
      {
        key: "steps",
        label: "Arbeitsschritte",
        description: "Detaillierte Schritt-für-Schritt-Anleitung",
        helpText:
          "Beschreiben Sie jeden Arbeitsschritt klar und verständlich. Verwenden Sie kurze Sätze und aktive Formulierungen.",
        guidingQuestions: [
          "Was genau muss in welcher Reihenfolge getan werden?",
          "Worauf muss besonders geachtet werden?",
          "Was sind typische Fehlerquellen?",
        ],
        required: true,
      },
      {
        key: "quality_criteria",
        label: "Qualitätskriterien",
        description: "Prüfmerkmale und Akzeptanzkriterien",
        helpText:
          "Definieren Sie, woran erkennbar ist, dass die Arbeit korrekt ausgeführt wurde.",
        required: false,
      },
      {
        key: "documents",
        label: "Mitgeltende Unterlagen",
        description: "Referenzierte Dokumente und Formulare",
        required: false,
        requirement: "recommended",
        guidedModeStep: 7,
      },
    ],
    publicationRules: {
      minimumSections: ["purpose", "scope", "steps"],
      minimumMetadata: ["owner"],
      minSectionContentLength: 30,
    },
    variants: [
      {
        key: "blank",
        label: "Leer",
        description: "Leere Arbeitsanweisung",
      },
      {
        key: "standard",
        label: "Standard",
        description: "Kernabschnitte vorstrukturiert",
        prefilledSections: ["purpose", "scope", "steps", "quality_criteria"],
      },
      {
        key: "safety",
        label: "Mit Sicherheitshinweisen",
        description: "Inkl. Sicherheitshinweise und Materialien",
        prefilledSections: [
          "purpose",
          "scope",
          "safety",
          "materials",
          "steps",
          "quality_criteria",
          "documents",
        ],
      },
    ],
  },

  checklist: {
    type: "checklist",
    label: "Checklist / Form Template",
    labelDe: "Checkliste / Formularvorlage",
    description:
      "Structured checklist or form template with checkable items and sections",
    descriptionDe:
      "Strukturierte Checkliste oder Formularvorlage mit Prüfpunkten und Abschnitten",
    icon: "CheckSquare",
    color: "hsl(160, 60%, 40%)",
    category: "quality",
    helpText:
      "Erstellen Sie eine Checkliste oder Formularvorlage mit strukturierten Prüfpunkten. Ideal für wiederkehrende Prüfungen, Audits und standardisierte Abläufe.",
    allowedChildTypes: [],
    metadataFields: [
      ...COMMON_IDENTITY_FIELDS,
      ...COMMON_GOVERNANCE_FIELDS,
      ...COMMON_VALIDITY_FIELDS,
      ...COMMON_CLASSIFICATION_FIELDS,
      {
        key: "checklist_type",
        label: "Checklistenart",
        type: "enum",
        required: false,
        group: "classification",
        options: ["inspection", "audit", "onboarding", "maintenance", "safety", "process", "general"],
        description: "Art der Checkliste",
      },
      {
        key: "frequency",
        label: "Durchführungshäufigkeit",
        type: "enum",
        required: false,
        group: "validity",
        options: ["once", "daily", "weekly", "monthly", "quarterly", "yearly", "as_needed"],
        description: "Wie häufig muss die Checkliste durchgeführt werden?",
      },
    ],
    sections: [
      {
        key: "purpose",
        label: "Zweck & Anwendung",
        description: "Wann und wofür wird diese Checkliste eingesetzt?",
        helpText:
          "Beschreiben Sie den Einsatzzweck und den Kontext der Checkliste.",
        required: true,
      },
      {
        key: "instructions",
        label: "Anleitung",
        description: "Hinweise zur Durchführung",
        helpText:
          "Geben Sie Hinweise zur korrekten Durchführung der Checkliste.",
        required: false,
      },
      {
        key: "checklist_items",
        label: "Prüfpunkte",
        description: "Die eigentlichen Prüf-/Checklisten-Punkte",
        helpText:
          "Listen Sie alle Prüfpunkte auf. Jeder Punkt sollte eindeutig und überprüfbar sein.",
        guidingQuestions: [
          "Was genau muss geprüft/erledigt werden?",
          "In welcher Reihenfolge?",
          "Was ist das erwartete Ergebnis?",
        ],
        required: true,
      },
      {
        key: "completion_criteria",
        label: "Abschlusskriterien",
        description: "Wann gilt die Checkliste als vollständig abgeschlossen?",
        required: false,
        requirement: "recommended",
        guidedModeStep: 4,
      },
    ],
    publicationRules: {
      minimumSections: ["purpose", "checklist_items"],
      minimumMetadata: ["owner"],
      minSectionContentLength: 20,
    },
    variants: [
      {
        key: "blank",
        label: "Leer",
        description: "Leere Checkliste",
      },
      {
        key: "standard",
        label: "Standard",
        description: "Checkliste mit Zweck und Prüfpunkten",
        prefilledSections: ["purpose", "checklist_items"],
      },
      {
        key: "audit",
        label: "Audit-Checkliste",
        description: "Vollständige Audit-Checkliste mit Anleitung",
        prefilledSections: [
          "purpose",
          "instructions",
          "checklist_items",
          "completion_criteria",
        ],
      },
    ],
  },

  faq: {
    type: "faq",
    label: "FAQ / Knowledge Article",
    labelDe: "FAQ / Wissensartikel",
    description:
      "Frequently asked questions or knowledge article for self-service",
    descriptionDe:
      "Häufig gestellte Fragen oder Wissensartikel zur Selbsthilfe",
    icon: "HelpCircle",
    color: "hsl(45, 80%, 48%)",
    category: "knowledge",
    helpText:
      "Erstellen Sie einen FAQ- oder Wissensartikel. Ideal für häufig gestellte Fragen, Anleitungen und Erklärungen, die als Selbsthilfe dienen.",
    allowedChildTypes: [],
    metadataFields: [
      ...COMMON_IDENTITY_FIELDS,
      ...COMMON_GOVERNANCE_FIELDS,
      ...COMMON_VALIDITY_FIELDS,
      ...COMMON_CLASSIFICATION_FIELDS,
      {
        key: "target_audience",
        label: "Zielgruppe",
        type: "text",
        required: false,
        group: "classification",
        description: "An wen richtet sich dieser Artikel?",
      },
      {
        key: "article_type",
        label: "Artikelart",
        type: "enum",
        required: false,
        group: "classification",
        options: ["faq", "how_to", "explanation", "troubleshooting", "best_practice"],
        description: "Art des Wissensartikels",
      },
    ],
    sections: [
      {
        key: "summary",
        label: "Zusammenfassung",
        description: "Kurze Zusammenfassung des Themas",
        helpText:
          "Beschreiben Sie in 2-3 Sätzen, worum es in diesem Artikel geht.",
        required: true,
      },
      {
        key: "content",
        label: "Inhalt / Fragen & Antworten",
        description: "Hauptinhalt mit Fragen und Antworten oder Erklärungen",
        helpText:
          "Bei FAQ: Listen Sie Fragen und Antworten auf. Bei Wissensartikeln: Strukturieren Sie den Inhalt logisch.",
        guidingQuestions: [
          "Welche Fragen werden am häufigsten gestellt?",
          "Was muss der Leser wissen?",
          "Welche Schritte sind erforderlich?",
        ],
        required: true,
      },
      {
        key: "related_topics",
        label: "Verwandte Themen",
        description: "Links zu verwandten Artikeln und Prozessen",
        required: false,
        requirement: "recommended",
        guidedModeStep: 3,
      },
    ],
    publicationRules: {
      minimumSections: ["summary", "content"],
      minimumMetadata: ["owner"],
      minSectionContentLength: 20,
    },
    variants: [
      {
        key: "faq",
        label: "FAQ",
        description: "Häufig gestellte Fragen",
        prefilledSections: ["summary", "content"],
      },
      {
        key: "knowledge_article",
        label: "Wissensartikel",
        description: "Strukturierter Wissensartikel",
        prefilledSections: ["summary", "content", "related_topics"],
      },
    ],
  },

  interface_description: {
    type: "interface_description",
    label: "Interface Description",
    labelDe: "Schnittstellenbeschreibung",
    description:
      "Technical or organizational interface description between systems or departments",
    descriptionDe:
      "Technische oder organisatorische Schnittstellenbeschreibung zwischen Systemen oder Bereichen",
    icon: "ArrowLeftRight",
    color: "hsl(210, 55%, 52%)",
    category: "system",
    helpText:
      "Dokumentieren Sie eine Schnittstelle zwischen zwei Systemen oder Organisationseinheiten. Beschreiben Sie Datenflüsse, Protokolle und Verantwortlichkeiten.",
    allowedChildTypes: [],
    metadataFields: [
      ...COMMON_IDENTITY_FIELDS,
      ...COMMON_GOVERNANCE_FIELDS,
      ...COMMON_VALIDITY_FIELDS,
      ...COMMON_CLASSIFICATION_FIELDS,
      {
        key: "interface_type",
        label: "Schnittstellenart",
        type: "enum",
        required: false,
        group: "classification",
        options: ["api", "file_transfer", "database", "message_queue", "manual", "organizational"],
        description: "Art der Schnittstelle",
      },
      {
        key: "source_system",
        label: "Quellsystem",
        type: "text",
        required: false,
        group: "identity",
        description: "Lieferndes System / Bereich",
      },
      {
        key: "target_system",
        label: "Zielsystem",
        type: "text",
        required: false,
        group: "identity",
        description: "Empfangendes System / Bereich",
      },
    ],
    sections: [
      {
        key: "overview",
        label: "Übersicht",
        description: "Zweck und Kontext der Schnittstelle",
        helpText:
          "Beschreiben Sie den Zweck der Schnittstelle und ihren Kontext im Gesamtsystem.",
        guidingQuestions: [
          "Warum existiert diese Schnittstelle?",
          "Welche Geschäftsprozesse unterstützt sie?",
        ],
        required: true,
      },
      {
        key: "data_flow",
        label: "Datenfluss",
        description: "Welche Daten werden in welche Richtung übertragen?",
        helpText:
          "Beschreiben Sie die Datenobjekte und den Datenfluss detailliert.",
        guidingQuestions: [
          "Welche Daten werden übertragen?",
          "In welche Richtung fließen die Daten?",
          "Welches Format haben die Daten?",
        ],
        required: true,
      },
      {
        key: "protocol",
        label: "Protokoll & Technik",
        description: "Technisches Protokoll, Format und Verbindungsdetails",
        helpText:
          "Dokumentieren Sie die technischen Details der Schnittstelle.",
        required: false,
      },
      {
        key: "error_handling",
        label: "Fehlerbehandlung",
        description: "Verhalten bei Fehlern und Wiederanlauf",
        helpText:
          "Beschreiben Sie, wie Fehler erkannt, protokolliert und behoben werden.",
        required: false,
      },
      {
        key: "sla",
        label: "SLA & Verfügbarkeit",
        description: "Service Level Agreements und Verfügbarkeitsanforderungen",
        required: false,
      },
      {
        key: "responsibilities",
        label: "Verantwortlichkeiten",
        description: "Wer ist für welche Seite der Schnittstelle verantwortlich?",
        required: false,
        requirement: "recommended",
        guidedModeStep: 6,
      },
    ],
    publicationRules: {
      minimumSections: ["overview", "data_flow"],
      minimumMetadata: ["owner"],
      minSectionContentLength: 20,
    },
    variants: [
      {
        key: "blank",
        label: "Leer",
        description: "Leere Schnittstellenbeschreibung",
      },
      {
        key: "technical",
        label: "Technisch",
        description: "Technische Schnittstelle mit Protokolldetails",
        prefilledSections: [
          "overview",
          "data_flow",
          "protocol",
          "error_handling",
          "sla",
        ],
      },
      {
        key: "organizational",
        label: "Organisatorisch",
        description: "Organisatorische Schnittstelle zwischen Bereichen",
        prefilledSections: ["overview", "data_flow", "responsibilities"],
      },
    ],
  },

  meeting_protocol: {
    type: "meeting_protocol",
    label: "Meeting / Decision Protocol",
    labelDe: "Meeting- / Entscheidungsprotokoll",
    description:
      "Structured meeting minutes with agenda, decisions, and action items",
    descriptionDe:
      "Strukturiertes Besprechungsprotokoll mit Agenda, Entscheidungen und Maßnahmen",
    icon: "MessageSquare",
    color: "hsl(270, 50%, 55%)",
    category: "documentation",
    helpText:
      "Erstellen Sie ein Besprechungsprotokoll mit Agenda, Teilnehmern, Ergebnissen, Entscheidungen und Maßnahmen. Ideal für Projekt-, Lenkungs- und Gremiumssitzungen.",
    allowedChildTypes: [],
    metadataFields: [
      ...COMMON_IDENTITY_FIELDS,
      {
        key: "owner",
        label: "Protokollführer",
        type: "person",
        required: true,
        group: "governance",
        description: "Person, die das Protokoll führt",
      },
      {
        key: "meeting_date",
        label: "Sitzungsdatum",
        type: "date",
        required: true,
        group: "validity",
        description: "Datum der Besprechung",
      },
      {
        key: "meeting_type",
        label: "Sitzungsart",
        type: "enum",
        required: false,
        group: "classification",
        options: [
          "project_meeting",
          "steering_committee",
          "team_meeting",
          "board_meeting",
          "workshop",
          "review",
          "retrospective",
          "other",
        ],
        description: "Art der Besprechung",
      },
      ...COMMON_CLASSIFICATION_FIELDS,
    ],
    sections: [
      {
        key: "participants",
        label: "Teilnehmer",
        description: "Anwesende und entschuldigte Teilnehmer",
        helpText:
          "Listen Sie alle Teilnehmer auf und kennzeichnen Sie entschuldigte Abwesende.",
        required: true,
      },
      {
        key: "agenda",
        label: "Tagesordnung",
        description: "Geplante Tagesordnungspunkte",
        helpText:
          "Listen Sie die Tagesordnungspunkte auf.",
        required: true,
      },
      {
        key: "discussion",
        label: "Besprechungspunkte",
        description: "Ergebnisse und Diskussion zu den Tagesordnungspunkten",
        helpText:
          "Dokumentieren Sie die Diskussion und Ergebnisse zu jedem Tagesordnungspunkt.",
        required: true,
      },
      {
        key: "decisions",
        label: "Entscheidungen",
        description: "Getroffene Entscheidungen mit Begründung",
        helpText:
          "Dokumentieren Sie alle Entscheidungen klar und eindeutig.",
        guidingQuestions: [
          "Was wurde entschieden?",
          "Mit welcher Begründung?",
          "War die Entscheidung einstimmig?",
        ],
        required: false,
      },
      {
        key: "action_items",
        label: "Maßnahmen / ToDos",
        description: "Vereinbarte Maßnahmen mit Verantwortlichem und Termin",
        helpText:
          "Dokumentieren Sie alle vereinbarten Maßnahmen mit Verantwortlichem und Fälligkeitsdatum.",
        guidingQuestions: [
          "Was ist zu tun?",
          "Wer ist verantwortlich?",
          "Bis wann?",
        ],
        required: false,
      },
      {
        key: "next_meeting",
        label: "Nächster Termin",
        description: "Datum und Ort der nächsten Sitzung",
        required: false,
        requirement: "recommended",
        guidedModeStep: 6,
      },
    ],
    publicationRules: {
      minimumSections: ["participants", "agenda", "discussion"],
      minimumMetadata: ["owner", "meeting_date"],
      minSectionContentLength: 10,
    },
    variants: [
      {
        key: "blank",
        label: "Leer",
        description: "Leeres Protokoll",
      },
      {
        key: "standard",
        label: "Standard",
        description: "Standardprotokoll mit allen Kernabschnitten",
        prefilledSections: [
          "participants",
          "agenda",
          "discussion",
          "decisions",
          "action_items",
        ],
      },
      {
        key: "decision",
        label: "Entscheidungsprotokoll",
        description: "Fokus auf Entscheidungen und Maßnahmen",
        prefilledSections: ["participants", "decisions", "action_items"],
      },
    ],
  },

  training_resource: {
    type: "training_resource",
    label: "Training Resource",
    labelDe: "Schulung / Lernressource",
    description:
      "Training material, learning resource, or onboarding documentation",
    descriptionDe:
      "Schulungsmaterial, Lernressource oder Einarbeitungsunterlage",
    icon: "GraduationCap",
    color: "hsl(190, 60%, 45%)",
    category: "knowledge",
    helpText:
      "Erstellen Sie Schulungsmaterial oder Lernressourcen. Ideal für Einarbeitungspläne, Schulungsunterlagen und Wissenstransfer.",
    allowedChildTypes: ["checklist", "faq"],
    metadataFields: [
      ...COMMON_IDENTITY_FIELDS,
      ...COMMON_GOVERNANCE_FIELDS,
      ...COMMON_VALIDITY_FIELDS,
      ...COMMON_CLASSIFICATION_FIELDS,
      {
        key: "target_audience",
        label: "Zielgruppe",
        type: "text",
        required: true,
        group: "classification",
        description: "An wen richtet sich die Schulung?",
      },
      {
        key: "training_type",
        label: "Schulungsart",
        type: "enum",
        required: false,
        group: "classification",
        options: [
          "onboarding",
          "skill_training",
          "compliance_training",
          "certification",
          "refresher",
          "self_study",
        ],
        description: "Art der Schulung",
      },
      {
        key: "duration_minutes",
        label: "Dauer (Minuten)",
        type: "number",
        required: false,
        group: "identity",
        description: "Geschätzte Dauer in Minuten",
      },
      {
        key: "difficulty_level",
        label: "Schwierigkeitsgrad",
        type: "enum",
        required: false,
        group: "classification",
        options: ["beginner", "intermediate", "advanced"],
        description: "Vorausgesetztes Wissensniveau",
      },
    ],
    sections: [
      {
        key: "objectives",
        label: "Lernziele",
        description: "Was sollen die Teilnehmer nach der Schulung können?",
        helpText:
          "Definieren Sie messbare Lernziele nach dem SMART-Prinzip.",
        guidingQuestions: [
          "Was soll der Teilnehmer nach der Schulung wissen?",
          "Was soll er können?",
          "Wie wird der Lernerfolg überprüft?",
        ],
        required: true,
      },
      {
        key: "prerequisites",
        label: "Voraussetzungen",
        description: "Erforderliche Vorkenntnisse und Vorbereitungen",
        required: false,
      },
      {
        key: "content",
        label: "Schulungsinhalt",
        description: "Gliederung und Inhalte der Schulung",
        helpText:
          "Strukturieren Sie den Schulungsinhalt in logische Abschnitte.",
        guidingQuestions: [
          "Welche Themen werden behandelt?",
          "In welcher Reihenfolge?",
          "Welche Methoden werden eingesetzt?",
        ],
        required: true,
      },
      {
        key: "exercises",
        label: "Übungen & Praxisbeispiele",
        description: "Praktische Übungen und Beispiele zur Vertiefung",
        required: false,
      },
      {
        key: "assessment",
        label: "Lernkontrolle",
        description: "Methoden zur Überprüfung des Lernerfolgs",
        helpText:
          "Beschreiben Sie, wie der Lernerfolg überprüft wird (Test, Praxisnachweis, etc.).",
        required: false,
      },
      {
        key: "materials",
        label: "Materialien & Ressourcen",
        description: "Benötigte und ergänzende Materialien",
        required: false,
        requirement: "recommended",
        guidedModeStep: 6,
      },
    ],
    publicationRules: {
      minimumSections: ["objectives", "content"],
      minimumMetadata: ["owner", "target_audience"],
      minSectionContentLength: 30,
    },
    variants: [
      {
        key: "blank",
        label: "Leer",
        description: "Leere Schulungsressource",
      },
      {
        key: "training",
        label: "Schulung",
        description: "Strukturierte Schulungsunterlage",
        prefilledSections: ["objectives", "content", "exercises", "assessment"],
      },
      {
        key: "onboarding",
        label: "Einarbeitung",
        description: "Einarbeitungsplan mit Checkliste",
        prefilledSections: [
          "objectives",
          "prerequisites",
          "content",
          "materials",
        ],
      },
    ],
  },

  audit_object: {
    type: "audit_object",
    label: "Audit / Control Object",
    labelDe: "Kontroll- / Prüfobjekt",
    description:
      "Audit finding, control measure, or quality checkpoint documentation",
    descriptionDe:
      "Audit-Feststellung, Kontrollmaßnahme oder Qualitätsprüfpunkt-Dokumentation",
    icon: "SearchCheck",
    color: "hsl(340, 55%, 50%)",
    category: "quality",
    helpText:
      "Dokumentieren Sie ein Kontroll- oder Prüfobjekt. Verwenden Sie diesen Typ für Audit-Feststellungen, Kontrollmaßnahmen und Qualitätsprüfpunkte.",
    allowedChildTypes: ["checklist"],
    metadataFields: [
      ...COMMON_IDENTITY_FIELDS,
      ...COMMON_GOVERNANCE_FIELDS,
      ...COMMON_VALIDITY_FIELDS,
      ...COMMON_CLASSIFICATION_FIELDS,
      {
        key: "audit_type",
        label: "Prüfart",
        type: "enum",
        required: false,
        group: "classification",
        options: [
          "internal_audit",
          "external_audit",
          "management_review",
          "self_assessment",
          "spot_check",
          "routine_check",
        ],
        description: "Art der Prüfung / des Audits",
      },
      {
        key: "severity",
        label: "Schweregrad",
        type: "enum",
        required: false,
        group: "classification",
        options: ["critical", "major", "minor", "observation", "improvement"],
        description: "Schweregrad der Feststellung",
      },
      {
        key: "due_date",
        label: "Fälligkeitsdatum",
        type: "date",
        required: false,
        group: "validity",
        description: "Frist für die Maßnahmenumsetzung",
      },
    ],
    sections: [
      {
        key: "finding",
        label: "Feststellung",
        description: "Was wurde festgestellt?",
        helpText:
          "Beschreiben Sie die Feststellung sachlich und nachvollziehbar.",
        guidingQuestions: [
          "Was genau wurde festgestellt?",
          "Wo wurde es festgestellt?",
          "Welche Anforderung ist betroffen?",
        ],
        required: true,
      },
      {
        key: "evidence",
        label: "Nachweise",
        description: "Belege und Evidenz für die Feststellung",
        helpText:
          "Dokumentieren Sie die Nachweise, auf denen die Feststellung basiert.",
        required: true,
      },
      {
        key: "root_cause",
        label: "Ursachenanalyse",
        description: "Warum ist das Problem aufgetreten?",
        helpText:
          "Analysieren Sie die Ursache(n) der Feststellung (z.B. mit 5-Why, Ishikawa).",
        guidingQuestions: [
          "Was ist die Grundursache?",
          "Warum konnte es passieren?",
          "Ist es ein systemisches Problem?",
        ],
        required: false,
      },
      {
        key: "corrective_action",
        label: "Korrekturmaßnahme",
        description: "Sofortmaßnahme zur Behebung",
        helpText:
          "Beschreiben Sie die Maßnahme, mit der das Problem behoben wird.",
        guidingQuestions: [
          "Was wird sofort unternommen?",
          "Wer ist verantwortlich?",
          "Bis wann wird die Maßnahme umgesetzt?",
        ],
        required: false,
      },
      {
        key: "preventive_action",
        label: "Vorbeugemaßnahme",
        description: "Maßnahme zur Verhinderung des Wiederauftretens",
        helpText:
          "Beschreiben Sie Maßnahmen, die ein Wiederauftreten verhindern sollen.",
        required: false,
      },
      {
        key: "effectiveness_check",
        label: "Wirksamkeitsprüfung",
        description: "Wie wird die Wirksamkeit der Maßnahme überprüft?",
        helpText:
          "Definieren Sie, wie und wann die Wirksamkeit der Maßnahmen überprüft wird.",
        required: false,
        requirement: "recommended",
        guidedModeStep: 6,
      },
    ],
    publicationRules: {
      minimumSections: ["finding", "evidence"],
      minimumMetadata: ["owner"],
      minSectionContentLength: 20,
    },
    variants: [
      {
        key: "blank",
        label: "Leer",
        description: "Leeres Prüfobjekt",
      },
      {
        key: "audit_finding",
        label: "Audit-Feststellung",
        description: "Vollständige Audit-Feststellung mit Maßnahmenplan",
        prefilledSections: [
          "finding",
          "evidence",
          "root_cause",
          "corrective_action",
          "preventive_action",
          "effectiveness_check",
        ],
      },
      {
        key: "quality_check",
        label: "Qualitätsprüfung",
        description: "Qualitätsprüfpunkt mit Feststellung und Korrektur",
        prefilledSections: ["finding", "evidence", "corrective_action"],
      },
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
      total += 2;
      const val = sectionData[section.key];
      if (val !== undefined && val !== null && val !== "") {
        const strVal = typeof val === "string" ? val : JSON.stringify(val);
        filled++;
        if (strVal.length >= 20) {
          filled++;
        } else {
          missing.push(`${section.label} (Inhalt zu kurz)`);
        }
      } else {
        missing.push(section.label);
      }
    }
  }

  const hasOwner =
    metadata.owner !== undefined &&
    metadata.owner !== null &&
    metadata.owner !== "";
  const requiredSections = def.sections.filter((s) => s.required);
  const filledRequiredSections = requiredSections.filter((s) => {
    const val = sectionData[s.key];
    return val !== undefined && val !== null && val !== "";
  });

  if (
    !hasOwner &&
    def.metadataFields.some((f) => f.key === "owner" && f.required)
  ) {
    if (!missing.includes("Prozesseigner") && !missing.includes("Verantwortlicher") && !missing.includes("Protokollführer")) {
      missing.push("Prozesseigner");
      total++;
    }
  }

  if (
    requiredSections.length > 0 &&
    filledRequiredSections.length === requiredSections.length
  ) {
    total++;
    filled++;
  }

  const percentage = total === 0 ? 100 : Math.round((filled / total) * 100);
  return { total, filled, percentage, missing };
}

export const PAGE_TYPE_CATEGORIES: Record<
  PageTypeCategory,
  { label: string; labelDe: string; icon: string }
> = {
  process: { label: "Processes", labelDe: "Prozesse", icon: "Workflow" },
  documentation: {
    label: "Documentation",
    labelDe: "Dokumentation",
    icon: "FileText",
  },
  governance: { label: "Governance", labelDe: "Governance", icon: "Shield" },
  system: { label: "Systems", labelDe: "Systeme", icon: "Server" },
  quality: {
    label: "Quality & Audit",
    labelDe: "Qualität & Audit",
    icon: "SearchCheck",
  },
  knowledge: {
    label: "Knowledge",
    labelDe: "Wissen & Schulung",
    icon: "GraduationCap",
  },
};

function isNonEmpty(val: unknown): boolean {
  if (val === undefined || val === null) return false;
  if (typeof val === "string") return val.trim().length > 0;
  if (Array.isArray(val)) return val.length > 0;
  if (typeof val === "object") return Object.keys(val as Record<string, unknown>).length > 0;
  return true;
}

function contentLength(val: unknown): number {
  if (val === undefined || val === null) return 0;
  if (typeof val === "string") return val.trim().length;
  if (typeof val === "object") return JSON.stringify(val).length;
  return String(val).length;
}

export function validateForPublication(
  type: string,
  metadata: Record<string, unknown>,
  sectionData: Record<string, unknown>,
): ValidationResult {
  const def = getPageType(type);
  if (!def) {
    return { valid: false, errors: [{ field: "type", fieldLabel: "Seitentyp", message: `Unbekannter Seitentyp: ${type}`, type: "invalid_format" }], warnings: [], readinessPercentage: 0 };
  }

  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  const rules = def.publicationRules;

  for (const metaKey of rules.minimumMetadata) {
    const field = def.metadataFields.find((f) => f.key === metaKey);
    if (!field) continue;
    if (!isNonEmpty(metadata[metaKey])) {
      errors.push({
        field: metaKey,
        fieldLabel: field.label,
        message: field.errorMessage ?? `„${field.label}" ist ein Pflichtfeld für die Veröffentlichung.`,
        type: "missing_required",
      });
    }
  }

  for (const field of def.metadataFields) {
    if (field.publishRequired && !rules.minimumMetadata.includes(field.key)) {
      if (!isNonEmpty(metadata[field.key])) {
        errors.push({
          field: field.key,
          fieldLabel: field.label,
          message: field.errorMessage ?? `„${field.label}" muss für die Veröffentlichung ausgefüllt werden.`,
          type: "missing_required",
        });
      }
    }
  }

  for (const sectionKey of rules.minimumSections) {
    const section = def.sections.find((s) => s.key === sectionKey);
    if (!section) continue;
    const val = sectionData[sectionKey];
    if (!isNonEmpty(val)) {
      errors.push({
        field: sectionKey,
        fieldLabel: section.label,
        message: section.errorMessage ?? `Der Abschnitt „${section.label}" muss für die Veröffentlichung ausgefüllt werden.`,
        type: "missing_required",
      });
    } else {
      const minLen = section.minContentLength ?? rules.minSectionContentLength;
      if (contentLength(val) < minLen) {
        errors.push({
          field: sectionKey,
          fieldLabel: section.label,
          message: `Der Abschnitt „${section.label}" ist zu kurz (mindestens ${minLen} Zeichen erforderlich).`,
          type: "content_too_short",
        });
      }
    }
  }

  for (const section of def.sections) {
    if (section.publishRequired && !rules.minimumSections.includes(section.key)) {
      if (!isNonEmpty(sectionData[section.key])) {
        errors.push({
          field: section.key,
          fieldLabel: section.label,
          message: section.errorMessage ?? `Der Abschnitt „${section.label}" muss für die Veröffentlichung ausgefüllt werden.`,
          type: "missing_required",
        });
      }
    }
  }

  if (rules.customRules) {
    for (const rule of rules.customRules) {
      if (!rule.check(metadata, sectionData)) {
        errors.push({
          field: rule.id,
          fieldLabel: rule.description,
          message: rule.errorMessage,
          type: "custom_rule",
        });
      }
    }
  }

  for (const field of def.metadataFields) {
    if (field.requirement === "recommended" && !field.publishRequired && !isNonEmpty(metadata[field.key])) {
      warnings.push({
        field: field.key,
        fieldLabel: field.label,
        message: `„${field.label}" wird empfohlen, ist aber nicht zwingend erforderlich.`,
        type: "recommended_empty",
      });
    }
    if (field.requirement === "conditional" && !field.publishRequired && !isNonEmpty(metadata[field.key])) {
      warnings.push({
        field: field.key,
        fieldLabel: field.label,
        message: field.conditionDescription
          ? `„${field.label}": ${field.conditionDescription}`
          : `„${field.label}" kann unter bestimmten Bedingungen erforderlich sein.`,
        type: "conditional_empty",
      });
    }
  }

  for (const section of def.sections) {
    if (
      section.requirement === "recommended" &&
      !section.publishRequired &&
      !rules.minimumSections.includes(section.key) &&
      !isNonEmpty(sectionData[section.key])
    ) {
      warnings.push({
        field: section.key,
        fieldLabel: section.label,
        message: `Der Abschnitt „${section.label}" wird empfohlen.`,
        type: "recommended_empty",
      });
    }
  }

  const allEnforcedFieldKeys = new Set<string>();
  for (const k of rules.minimumMetadata) allEnforcedFieldKeys.add(`meta:${k}`);
  for (const k of rules.minimumSections) allEnforcedFieldKeys.add(`section:${k}`);
  for (const f of def.metadataFields) {
    if (f.publishRequired && !rules.minimumMetadata.includes(f.key)) allEnforcedFieldKeys.add(`meta:${f.key}`);
  }
  for (const s of def.sections) {
    if (s.publishRequired && !rules.minimumSections.includes(s.key)) allEnforcedFieldKeys.add(`section:${s.key}`);
  }
  if (rules.customRules) {
    for (const r of rules.customRules) allEnforcedFieldKeys.add(`rule:${r.id}`);
  }
  const totalEnforced = allEnforcedFieldKeys.size;
  const failedFieldKeys = new Set<string>();
  for (const e of errors) {
    if (e.type === "custom_rule") {
      failedFieldKeys.add(`rule:${e.field}`);
    } else if (rules.minimumSections.includes(e.field) || def.sections.some((s) => s.key === e.field)) {
      failedFieldKeys.add(`section:${e.field}`);
    } else {
      failedFieldKeys.add(`meta:${e.field}`);
    }
  }
  const passedEnforced = totalEnforced - failedFieldKeys.size;
  const readinessPercentage = totalEnforced === 0 ? 100 : Math.round((Math.max(0, passedEnforced) / totalEnforced) * 100);

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    readinessPercentage,
  };
}

export function validateForDraft(
  type: string,
  metadata: Record<string, unknown>,
  _sectionData: Record<string, unknown>,
): ValidationResult {
  const def = getPageType(type);
  if (!def) {
    return { valid: false, errors: [{ field: "type", fieldLabel: "Seitentyp", message: `Unbekannter Seitentyp: ${type}`, type: "invalid_format" }], warnings: [], readinessPercentage: 0 };
  }

  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  for (const field of def.metadataFields) {
    if (field.required && !isNonEmpty(metadata[field.key])) {
      errors.push({
        field: field.key,
        fieldLabel: field.label,
        message: field.errorMessage ?? `„${field.label}" ist ein Pflichtfeld.`,
        type: "missing_required",
      });
    }
  }

  const totalRequired = def.metadataFields.filter((f) => f.required).length;
  const filledRequired = totalRequired - errors.length;
  const readinessPercentage = totalRequired === 0 ? 100 : Math.round((filledRequired / totalRequired) * 100);

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    readinessPercentage,
  };
}

export function getGuidedSections(type: string): PageTypeSection[] {
  const def = getPageType(type);
  if (!def) return [];

  return [...def.sections]
    .filter((s) => s.guidedModeStep !== undefined)
    .sort((a, b) => (a.guidedModeStep ?? 999) - (b.guidedModeStep ?? 999));
}

export function getPublicationReadiness(
  type: string,
  metadata: Record<string, unknown>,
  sectionData: Record<string, unknown>,
): { ready: boolean; percentage: number; missingRequired: string[]; missingRecommended: string[] } {
  const result = validateForPublication(type, metadata, sectionData);
  return {
    ready: result.valid,
    percentage: result.readinessPercentage,
    missingRequired: result.errors.map((e) => e.fieldLabel),
    missingRecommended: result.warnings.filter((w) => w.type === "recommended_empty").map((w) => w.fieldLabel),
  };
}

export function getFieldsByRequirement(
  type: string,
): { required: MetadataFieldDef[]; recommended: MetadataFieldDef[]; conditional: MetadataFieldDef[] } {
  const def = getPageType(type);
  if (!def) return { required: [], recommended: [], conditional: [] };

  const required: MetadataFieldDef[] = [];
  const recommended: MetadataFieldDef[] = [];
  const conditional: MetadataFieldDef[] = [];

  for (const field of def.metadataFields) {
    const req = field.requirement ?? (field.required ? "required" : "recommended");
    if (req === "required") required.push(field);
    else if (req === "recommended") recommended.push(field);
    else conditional.push(field);
  }

  return { required, recommended, conditional };
}

export function getSectionsByRequirement(
  type: string,
): { required: PageTypeSection[]; recommended: PageTypeSection[]; conditional: PageTypeSection[] } {
  const def = getPageType(type);
  if (!def) return { required: [], recommended: [], conditional: [] };

  const required: PageTypeSection[] = [];
  const recommended: PageTypeSection[] = [];
  const conditional: PageTypeSection[] = [];

  for (const section of def.sections) {
    const req = section.requirement ?? (section.required ? "required" : "recommended");
    if (req === "required") required.push(section);
    else if (req === "recommended") recommended.push(section);
    else conditional.push(section);
  }

  return { required, recommended, conditional };
}
