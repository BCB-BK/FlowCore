/**
 * Cluster 10 (optional): Microsoft Search "Result Type" display prep.
 *
 * Microsoft Graph external connections do not expose a universal, tenant-
 * independent API to register a custom search result layout — result
 * types / display templates for Microsoft Search and Copilot Studio are
 * configured per-tenant in the Search & Intelligence admin center (or via
 * the beta `search/resultTemplates` surface, which is not GA and not
 * reliably available on every tenant). Rather than fabricate a fake
 * "success" for something we cannot verify programmatically, this module
 * documents and exposes the exact field mapping an admin needs to wire up
 * manually, following the same honest-blocker pattern used in
 * graph-readiness.service.ts (`not_checkable`).
 */

export interface SearchResultTemplateField {
  label: string;
  schemaProperty: string;
  description: string;
}

export interface SearchResultTemplatePrep {
  status: "manual_setup_required";
  reason: string;
  fields: SearchResultTemplateField[];
  adminCenterUrl: string;
}

const FIELDS: SearchResultTemplateField[] = [
  { label: "Titel", schemaProperty: "title", description: "Seiten- bzw. Glossartitel" },
  { label: "Kurzbeschreibung", schemaProperty: "summary", description: "Kurzfassung des Inhalts (nur Seiten)" },
  { label: "FlowCore-ID", schemaProperty: "immutableId", description: "Stabile FlowCore-Kennung (displayCode bei Glossarbegriffen)" },
  { label: "Version", schemaProperty: "version", description: "Versionsbezeichner der veröffentlichten Revision" },
  { label: "Owner", schemaProperty: "owner", description: "Verantwortlicher Fachbereich/Person" },
  { label: "ReviewDue", schemaProperty: "reviewDue", description: "Fälligkeitsdatum der nächsten Review" },
  { label: "SourceUrl", schemaProperty: "sourceUrl", description: "Link zurück auf die FlowCore-Quelle" },
];

/**
 * Returns the field mapping an admin should use when configuring a
 * Microsoft Search Result Type / Adaptive Card for this connection. This
 * is documentation-as-data, not a live Graph API call — there is nothing
 * to "check" here, so it always returns the same honest manual-setup
 * status rather than pretending to have registered anything.
 */
export function getSearchResultTemplatePrep(): SearchResultTemplatePrep {
  return {
    status: "manual_setup_required",
    reason:
      "Microsoft Search Result Types werden im Search & Intelligence Admin Center pro Tenant konfiguriert; es gibt keine verlässliche, tenant-unabhängige Graph-API, um dies automatisiert zu registrieren.",
    fields: FIELDS,
    adminCenterUrl: "https://admin.microsoft.com/AdminPortal/Home#/MicrosoftSearch/resultTypes",
  };
}
