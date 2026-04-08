export function isFieldEmpty(value: unknown): boolean {
  if (value === null || value === undefined) return true;

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed === "") return true;

    if (
      (trimmed.startsWith("[") && trimmed.endsWith("]")) ||
      (trimmed.startsWith("{") && trimmed.endsWith("}"))
    ) {
      try {
        const parsed = JSON.parse(trimmed);
        return isFieldEmpty(parsed);
      } catch {
        return false;
      }
    }

    return false;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return false;
  }

  if (Array.isArray(value)) {
    return value.length === 0 || value.every((item) => isFieldEmpty(item));
  }

  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;

    if (isTipTapEmpty(obj)) return true;

    if (isSipocEmpty(obj)) return true;

    const keys = Object.keys(obj);
    if (keys.length === 0) return true;

    return keys.every((k) => isFieldEmpty(obj[k]));
  }

  return false;
}

function isTipTapEmpty(obj: Record<string, unknown>): boolean {
  if (obj.type !== "doc" || !Array.isArray(obj.content)) return false;
  const content = obj.content as Array<Record<string, unknown>>;
  if (content.length === 0) return true;
  return content.every((node) => {
    if (node.type === "paragraph") {
      if (!node.content || (Array.isArray(node.content) && node.content.length === 0)) return true;
    }
    return false;
  });
}

function isSipocEmpty(obj: Record<string, unknown>): boolean {
  const sipocKeys = ["suppliers", "inputs", "outputs", "customers", "trigger", "process"];
  const hasSipocShape = sipocKeys.some((k) => k in obj);
  if (!hasSipocShape) return false;

  for (const key of Object.keys(obj)) {
    const val = obj[key];
    if (Array.isArray(val) && val.length > 0) return false;
    if (typeof val === "string" && val.trim() !== "") return false;
  }
  return true;
}
