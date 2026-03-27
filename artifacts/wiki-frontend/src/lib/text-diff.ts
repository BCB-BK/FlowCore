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
    governance: "Governance-Felder",
    overview: "Zweck & Geltungsbereich",
    process_steps: "Prozessschritte & Phasen",
    sipoc: "SIPOC",
    sub_processes: "Unterprozesse & Detailseiten",
    kpis: "KPIs & Kennzahlen",
    interfaces_systems: "Schnittstellen & Systeme",
    compliance: "Normbezug & Compliance",
    risks: "Prozessrisiken",
    structure: "Aufbauorganisation",
    interfaces: "Schnittstellen",
    terms: "Begriffe",
    items: "Prüfpunkte",
    questions: "Fragen & Antworten",
    competencies: "Kompetenzen",
    role_description: "Rollenbeschreibung",
    scenario: "Szenario",
    actors: "Akteure",
    preconditions: "Vorbedingungen",
    postconditions: "Nachbedingungen",
    exceptions: "Ausnahmen",
    flow: "Ablauf",
    principles: "Grundsätze",
    rules: "Regeln",
    consequences: "Konsequenzen",
    materials: "Materialien",
    steps: "Schritte",
    safety: "Sicherheit",
    quality_criteria: "Qualitätskriterien",
    categories: "Kategorien",
    instructions: "Anweisungen",
    process_description: "Prozessbeschreibung",
    process_diagram: "Prozessdiagramm",
    flowchart: "Flussdiagramm",
    raci: "RACI-Matrix",
    procedure_steps: "Verfahrensschritte",
    documents: "Dokumente",
  };
  return labels[key] || key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export type CompoundType = "sipoc_cards" | "raci_matrix" | "qa_repeater" | "term_repeater" | "check_items" | "competency_areas";

export function detectCompoundType(val: unknown): CompoundType | null {
  if (typeof val === "string") {
    try {
      const parsed = JSON.parse(val);
      return detectCompoundType(parsed);
    } catch {
      return null;
    }
  }
  if (!val || typeof val !== "object") return null;

  if (!Array.isArray(val)) {
    const obj = val as Record<string, unknown>;
    const sipocKeys = ["suppliers", "inputs", "process", "outputs", "customers"];
    const hasSipocKey = sipocKeys.some((k) => k in obj && (typeof obj[k] === "string" || Array.isArray(obj[k])));
    if (hasSipocKey) return "sipoc_cards";

    if ("roles" in obj && Array.isArray(obj.roles)
      && "entries" in obj && Array.isArray(obj.entries)) {
      return "raci_matrix";
    }
    return null;
  }

  if (val.length === 0) return null;
  const first = val[0];
  if (!first || typeof first !== "object") return null;
  const f = first as Record<string, unknown>;

  if ("question" in f && "answer" in f) return "qa_repeater";
  if ("term" in f && "definition" in f) return "term_repeater";
  if ("text" in f && typeof f.text === "string" && !("question" in f) && !("term" in f) && !("area" in f)) return "check_items";
  if ("area" in f && "tasks" in f) return "competency_areas";

  return null;
}

interface SipocData {
  suppliers?: string;
  inputs?: string;
  process?: string;
  outputs?: string;
  customers?: string;
}

interface RaciData {
  roles: string[];
  entries: Array<{ activity: string; assignments: Record<string, string> }>;
}

export function formatCompoundForDisplay(val: unknown, compoundType: CompoundType): string {
  let data = val;
  if (typeof val === "string") {
    try { data = JSON.parse(val); } catch { return val; }
  }
  if (!data || typeof data !== "object") return formatValueForDisplay(val);

  try {
    switch (compoundType) {
      case "sipoc_cards": {
        const sipoc = data as SipocData;
        const parts: string[] = [];
        const fmt = (label: string, v: unknown) => {
          if (typeof v === "string" && v.trim()) return `${label}: ${v.trim()}`;
          if (Array.isArray(v) && v.length > 0) return `${label}: ${v.map((item) => (typeof item === "object" && item ? ((item as Record<string, unknown>).title || (item as Record<string, unknown>).description || JSON.stringify(item)) : String(item))).join(", ")}`;
          return null;
        };
        const s = fmt("S", sipoc.suppliers); if (s) parts.push(s);
        const i = fmt("I", sipoc.inputs); if (i) parts.push(i);
        const p = fmt("P", sipoc.process); if (p) parts.push(p);
        const o = fmt("O", sipoc.outputs); if (o) parts.push(o);
        const c = fmt("C", sipoc.customers); if (c) parts.push(c);
        return parts.length > 0 ? parts.join("\n") : "(leer)";
      }
      case "raci_matrix": {
        const raci = data as RaciData;
        if (!Array.isArray(raci.entries) || raci.entries.length === 0) return "(leer)";
        const header = `Rollen: ${Array.isArray(raci.roles) ? raci.roles.join(", ") : "(keine)"}`;
        const rows = raci.entries.map((e) => {
          if (!e || typeof e !== "object") return "(ungültiger Eintrag)";
          const assigns = Object.entries(e.assignments || {}).filter(([, v]) => v).map(([role, v]) => `${role}=${v}`).join(", ");
          return `${e.activity || "(ohne Aktivität)"}: ${assigns || "(keine Zuordnung)"}`;
        });
        return [header, ...rows].join("\n");
      }
      case "qa_repeater": {
        if (!Array.isArray(data) || data.length === 0) return "(leer)";
        return data.map((item, i) => {
          if (!item || typeof item !== "object") return `${i + 1}. (ungültiger Eintrag)`;
          const q = (item as Record<string, unknown>).question;
          const a = (item as Record<string, unknown>).answer;
          return `${i + 1}. F: ${typeof q === "string" ? q : "(leer)"}\n   A: ${typeof a === "string" ? a : "(leer)"}`;
        }).join("\n");
      }
      case "term_repeater": {
        if (!Array.isArray(data) || data.length === 0) return "(leer)";
        return data.map((item) => {
          if (!item || typeof item !== "object") return "(ungültiger Eintrag)";
          const obj = item as Record<string, unknown>;
          let line = `${typeof obj.term === "string" ? obj.term : "(leer)"}: ${typeof obj.definition === "string" ? obj.definition : "(leer)"}`;
          if (typeof obj.synonyms === "string" && obj.synonyms.trim()) line += ` (Syn: ${obj.synonyms})`;
          return line;
        }).join("\n");
      }
      case "check_items": {
        if (!Array.isArray(data) || data.length === 0) return "(leer)";
        return data.map((item, i) => {
          if (!item || typeof item !== "object") return `${i + 1}. (ungültiger Eintrag)`;
          const obj = item as Record<string, unknown>;
          let line = `${i + 1}. ${typeof obj.text === "string" ? obj.text : "(leer)"}`;
          if (typeof obj.category === "string" && obj.category.trim()) line += ` [${obj.category}]`;
          if (typeof obj.note === "string" && obj.note.trim()) line += ` – ${obj.note}`;
          return line;
        }).join("\n");
      }
      case "competency_areas": {
        if (!Array.isArray(data) || data.length === 0) return "(leer)";
        return data.map((item) => {
          if (!item || typeof item !== "object") return "(ungültiger Eintrag)";
          const obj = item as Record<string, unknown>;
          const area = typeof obj.area === "string" ? obj.area : "(leer)";
          const tasks = typeof obj.tasks === "string" ? obj.tasks : "(keine Aufgaben)";
          return `${area}: ${tasks}`;
        }).join("\n");
      }
      default:
        return formatValueForDisplay(val);
    }
  } catch {
    return formatValueForDisplay(val);
  }
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
