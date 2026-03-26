type DiffSegment = {
  type: "equal" | "added" | "removed";
  text: string;
};

function tokenize(text: string): string[] {
  return text.split(/(\s+)/);
}

const MAX_DIFF_TOKENS = 500;

export function computeWordDiff(oldText: string, newText: string): DiffSegment[] {
  const oldTokens = tokenize(oldText);
  const newTokens = tokenize(newText);

  if (oldTokens.length > MAX_DIFF_TOKENS || newTokens.length > MAX_DIFF_TOKENS) {
    const segments: DiffSegment[] = [];
    if (oldText) segments.push({ type: "removed", text: oldText });
    if (newText) segments.push({ type: "added", text: newText });
    return segments;
  }

  const n = oldTokens.length;
  const m = newTokens.length;

  const dp: number[][] = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0));
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      if (oldTokens[i - 1] === newTokens[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  const segments: DiffSegment[] = [];
  let i = n;
  let j = m;
  const rawSegments: DiffSegment[] = [];

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldTokens[i - 1] === newTokens[j - 1]) {
      rawSegments.push({ type: "equal", text: oldTokens[i - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      rawSegments.push({ type: "added", text: newTokens[j - 1] });
      j--;
    } else {
      rawSegments.push({ type: "removed", text: oldTokens[i - 1] });
      i--;
    }
  }

  rawSegments.reverse();

  let current: DiffSegment | null = null;
  for (const seg of rawSegments) {
    if (current && current.type === seg.type) {
      current.text += seg.text;
    } else {
      if (current) segments.push(current);
      current = { ...seg };
    }
  }
  if (current) segments.push(current);

  return segments;
}

export function formatFieldLabel(key: string): string {
  const labels: Record<string, string> = {
    title: "Titel",
    status: "Status",
    changeType: "Änderungstyp",
    versionLabel: "Versionslabel",
    reviewerId: "Prüfer",
    approverId: "Genehmiger",
    changeSummary: "Zusammenfassung",
    _editorContent: "Seiteninhalt (Editor)",
    description: "Beschreibung",
    purpose: "Zweck",
    scope: "Geltungsbereich",
    responsibilities: "Verantwortlichkeiten",
    procedure: "Vorgehensweise",
    references: "Referenzen",
    definitions: "Definitionen",
    revision_history: "Änderungshistorie",
  };
  return labels[key] || key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatArrayItem(item: unknown): string {
  if (typeof item === "string") return item;
  if (typeof item === "number" || typeof item === "boolean") return String(item);
  if (typeof item === "object" && item !== null) {
    const obj = item as Record<string, unknown>;
    if (obj.title && obj.id) return `${obj.title}`;
    if (obj.name && obj.id) return `${obj.name}`;
    if (obj.label) return String(obj.label);
    if (obj.text) return String(obj.text);
    if (obj.title) return String(obj.title);
    if (obj.name) return String(obj.name);
    if (obj.fileName) return `📎 ${obj.fileName}`;
    if (obj.url) return `🔗 ${obj.url}`;
    if (obj.type === "doc" && Array.isArray(obj.content)) {
      return extractPlainText(obj);
    }
    const keys = Object.keys(obj).filter((k) => !k.startsWith("_") && k !== "id");
    if (keys.length <= 3) {
      return keys.map((k) => `${formatFieldLabel(k)}: ${formatValueForDisplay(obj[k])}`).join(", ");
    }
  }
  return JSON.stringify(item);
}

export function formatValueForDisplay(val: unknown): string {
  if (val === null || val === undefined) return "(leer)";
  if (typeof val === "string") return val;
  if (typeof val === "number" || typeof val === "boolean") return String(val);
  if (Array.isArray(val)) {
    if (val.length === 0) return "(leer)";
    return val.map(formatArrayItem).join(", ");
  }
  if (typeof val === "object") {
    const obj = val as Record<string, unknown>;
    if (obj.type === "doc" && Array.isArray(obj.content)) {
      return extractPlainText(obj);
    }
    if (obj.fileName) return `📎 ${obj.fileName}`;
    if (obj.url && obj.title) return `🔗 ${obj.title}`;
    if (obj.title && obj.id) return String(obj.title);
    if (obj.name && obj.id) return String(obj.name);
    const entries = Object.entries(obj)
      .filter(([k]) => !k.startsWith("_") && k !== "id")
      .map(([k, v]) => `${formatFieldLabel(k)}: ${formatValueForDisplay(v)}`);
    if (entries.length <= 5) return entries.join("\n");
    return entries.slice(0, 5).join("\n") + `\n… (${entries.length - 5} weitere)`;
  }
  return String(val);
}

function extractPlainText(doc: unknown): string {
  if (!doc || typeof doc !== "object") return "";
  const node = doc as { text?: string; content?: unknown[] };
  if (node.text) return node.text;
  if (Array.isArray(node.content)) {
    return node.content.map(extractPlainText).filter(Boolean).join(" ");
  }
  return "";
}
