if (typeof globalThis.global === "undefined") {
  (globalThis as Record<string, unknown>).global = globalThis;
}
