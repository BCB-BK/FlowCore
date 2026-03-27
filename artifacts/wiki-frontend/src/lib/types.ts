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
  REGISTRY_VERSION,
  getPageType,
  getAllowedChildTypes,
  getMetadataGroups,
  calculateCompleteness,
  validateForPublication,
  validateForDraft,
  getGuidedSections,
  getPublicationReadiness,
  getFieldsByRequirement,
  getSectionsByRequirement,
  getDisplayProfile,
  getDisplayIdPrefix,
  getPageTypesByDisplayProfile,
  METADATA_GROUP_LABELS,
  PAGE_TYPE_CATEGORIES,
  DISPLAY_PROFILE_LABELS,
} from "@workspace/shared/page-types";

export type {
  TemplateType,
  MetadataGroupKey,
  PageTypeCategory,
  DisplayProfile,
  FieldRequirement,
  PublicationRules,
  ValidationError,
  ValidationWarning,
  ValidationResult,
} from "@workspace/shared/page-types";

import { PAGE_TYPE_REGISTRY as _PTR } from "@workspace/shared/page-types";

export const PAGE_TYPE_LABELS: Record<string, string> = Object.fromEntries(
  Object.values(_PTR).map((def) => [def.type, def.labelDe]),
);

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

export const PAGE_TYPE_ICON_MAP: Record<string, string> = Object.fromEntries(
  Object.values(_PTR).map((def) => [def.type, def.icon]),
);

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
