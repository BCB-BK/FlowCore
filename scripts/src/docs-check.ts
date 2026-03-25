import { existsSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "../..");

const REQUIRED_DOCS = [
  "docs/00-INDEX.md",
  "docs/01-ARCHITECTURE.md",
  "docs/96-AGENT-PLAYBOOK.md",
  "CHANGELOG.md",
  "replit.md",
];

let missing = 0;

for (const doc of REQUIRED_DOCS) {
  const fullPath = resolve(ROOT, doc);
  if (!existsSync(fullPath)) {
    console.error(`MISSING: ${doc}`);
    missing++;
  } else {
    console.log(`OK: ${doc}`);
  }
}

if (missing > 0) {
  console.error(`\n${missing} required document(s) missing.`);
  process.exit(1);
} else {
  console.log("\nAll required documents present.");
}
