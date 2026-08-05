import { createHash } from "node:crypto";

/**
 * Produces a stable SHA-256 hash over a JSON-serializable value.
 * Keys are sorted recursively so that the hash only changes when the
 * underlying data actually changes, not when key order differs.
 */
export function stableContentHash(value: unknown): string {
  const stable = stableStringify(value);
  return createHash("sha256").update(stable).digest("hex");
}

function stableStringify(value: unknown): string {
  if (value === null || value === undefined) return "null";
  if (typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map((v) => stableStringify(v)).join(",")}]`;
  }
  const keys = Object.keys(value as Record<string, unknown>).sort();
  const entries = keys.map(
    (k) =>
      `${JSON.stringify(k)}:${stableStringify((value as Record<string, unknown>)[k])}`,
  );
  return `{${entries.join(",")}}`;
}
