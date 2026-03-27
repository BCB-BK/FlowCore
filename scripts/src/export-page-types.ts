import { writeFileSync } from "fs";
import { PAGE_TYPE_REGISTRY, PAGE_TYPE_CATEGORIES, REGISTRY_VERSION, METADATA_GROUP_LABELS } from "../../lib/shared/src/page-types/registry.js";

const output = {
  _meta: {
    exportedAt: new Date().toISOString(),
    registryVersion: REGISTRY_VERSION,
    totalPageTypes: Object.keys(PAGE_TYPE_REGISTRY).length,
    purpose: "FlowCore Enterprise Wiki – Page Type Registry Export for AI Audit",
  },
  categories: PAGE_TYPE_CATEGORIES,
  metadataGroupLabels: METADATA_GROUP_LABELS,
  pageTypes: PAGE_TYPE_REGISTRY,
};

const outPath = "page-types-export.json";
writeFileSync(outPath, JSON.stringify(output, null, 2), "utf-8");
console.log(`Exported ${Object.keys(PAGE_TYPE_REGISTRY).length} page types to ${outPath}`);
