/**
 * Microsoft Graph External Connection schema definitions (Cluster 4).
 * https://learn.microsoft.com/en-us/graph/connecting-external-content-manage-schema
 *
 * Every FlowCore item (page or glossary term) is projected as a Graph
 * `externalItem` with these properties. Properties are shared between the
 * two item types; glossary-specific properties are additive.
 */
export type GraphPropertyType =
  | "String"
  | "Int64"
  | "Double"
  | "Boolean"
  | "DateTime"
  | "StringCollection";

export interface GraphSchemaProperty {
  name: string;
  type: GraphPropertyType;
  isSearchable?: boolean;
  isRetrievable?: boolean;
  isQueryable?: boolean;
  isRefinable?: boolean;
  labels?: string[];
}

/** Common properties present on every externalItem (pages and glossary terms). */
export const COMMON_SCHEMA_PROPERTIES: GraphSchemaProperty[] = [
  { name: "title", type: "String", isSearchable: true, isRetrievable: true, isQueryable: true, labels: ["title"] },
  { name: "sourceUrl", type: "String", isRetrievable: true, labels: ["url"] },
  { name: "nodeId", type: "String", isRetrievable: true, isQueryable: true },
  { name: "immutableId", type: "String", isRetrievable: true, isQueryable: true },
  { name: "displayCode", type: "String", isRetrievable: true, isQueryable: true, isRefinable: true },
  { name: "itemType", type: "String", isRetrievable: true, isQueryable: true, isRefinable: true },
  { name: "pageType", type: "String", isRetrievable: true, isQueryable: true, isRefinable: true },
  { name: "status", type: "String", isRetrievable: true, isQueryable: true, isRefinable: true },
  { name: "version", type: "String", isRetrievable: true },
  { name: "revision", type: "Int64", isRetrievable: true },
  { name: "owner", type: "String", isRetrievable: true, isQueryable: true },
  { name: "contentOwner", type: "String", isRetrievable: true },
  { name: "reviewer", type: "String", isRetrievable: true },
  { name: "validFrom", type: "DateTime", isRetrievable: true },
  { name: "reviewDue", type: "DateTime", isRetrievable: true, isRefinable: true },
  { name: "brandScope", type: "StringCollection", isRetrievable: true, isQueryable: true, isRefinable: true },
  { name: "agentScope", type: "StringCollection", isRetrievable: true, isQueryable: true, isRefinable: true },
  { name: "authorityLevel", type: "String", isRetrievable: true, isQueryable: true, isRefinable: true, labels: ["authors"] },
  { name: "sourcePriority", type: "Int64", isRetrievable: true, isRefinable: true },
  { name: "confidentiality", type: "String", isRetrievable: true, isQueryable: true, isRefinable: true },
  { name: "decisionStatus", type: "String", isRetrievable: true, isQueryable: true, isRefinable: true },
  { name: "tags", type: "StringCollection", isSearchable: true, isRetrievable: true, isQueryable: true, isRefinable: true },
  { name: "relations", type: "StringCollection", isRetrievable: true },
  { name: "lastModifiedAt", type: "DateTime", isRetrievable: true, isRefinable: true, labels: ["lastModifiedDateTime"] },
  { name: "publishedAt", type: "DateTime", isRetrievable: true, labels: ["createdDateTime"] },
  { name: "contentHash", type: "String", isRetrievable: true },
];

/** Additional properties required for glossary term externalItems. */
export const GLOSSARY_SCHEMA_PROPERTIES: GraphSchemaProperty[] = [
  { name: "term", type: "String", isSearchable: true, isRetrievable: true, isQueryable: true },
  { name: "definition", type: "String", isSearchable: true, isRetrievable: true },
  { name: "synonyms", type: "StringCollection", isSearchable: true, isRetrievable: true, isQueryable: true },
  { name: "relatedTerms", type: "StringCollection", isRetrievable: true, isQueryable: true },
];

export const REQUIRED_PAGE_PROPERTY_NAMES = [
  "title",
  "sourceUrl",
  "nodeId",
  "immutableId",
  "displayCode",
  "itemType",
  "pageType",
  "status",
  "version",
  "revision",
  "authorityLevel",
  "sourcePriority",
] as const;

export const REQUIRED_GLOSSARY_PROPERTY_NAMES = [
  "title",
  "sourceUrl",
  "nodeId",
  "itemType",
  "status",
  "term",
  "definition",
] as const;
