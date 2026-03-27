import { db } from "@workspace/db";
import {
  aiSettingsTable,
  aiUsageLogsTable,
  aiFieldProfilesTable,
  contentNodesTable,
  contentRevisionsTable,
} from "@workspace/db/schema";
import { eq, and, sql, ilike } from "drizzle-orm";
import { logger } from "../lib/logger";
import type { Response } from "express";
import {
  hasPermission,
  getHighestRole,
  getSearchVisibilityForRole,
  type WikiRole,
} from "./rbac.service";
import type { OpenAI } from "@workspace/integrations-openai-ai-server";

let _openaiClient: OpenAI | null = null;

async function getOpenAI(): Promise<OpenAI> {
  if (!_openaiClient) {
    const hasKey =
      process.env.OPENAI_API_KEY || process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
    if (!hasKey) {
      throw new Error(
        "OpenAI integration is not configured. Set OPENAI_API_KEY.",
      );
    }
    const mod = await import("@workspace/integrations-openai-ai-server");
    _openaiClient = mod.openai;
  }
  return _openaiClient!;
}

export type SourceType = "wiki" | "connector" | "web";

export interface AiSource {
  nodeId: string;
  title: string;
  displayCode: string;
  templateType: string;
  snippet: string;
  sourceType: SourceType;
  contentStatus?: string;
  externalUrl?: string;
  sourceSystemName?: string;
}

const DEFAULT_SYSTEM_PROMPT = `Du bist der FlowCore-Assistent — der KI-Assistent der zentralen Prozess- und Wissensplattform des Bildungscampus Backnang.

## Ansprache & Stil
- Verwende konsequent die Du-Ansprache.
- Bleibe stets professionell, sachlich und strukturiert.
- Halte Antworten so lang wie nötig, aber so kurz wie möglich.

## Fragetypen und Antwortverhalten

### Fakten- und Definitionsfragen
Wenn nach einem bestimmten Begriff, einer Definition oder einem Faktum gefragt wird:
- Liefere eine klare, kompakte Antwort.
- Verweise auf die relevante Wiki-Quelle mit Prozess-ID und Seitenname.

### Prozess- und Ablaufbeschreibungen
Wenn nach einem Prozess, Workflow oder einer Vorgehensweise gefragt wird:
- Beschreibe die Schritte in einer nummerierten Liste.
- Nenne beteiligte Rollen, Verantwortlichkeiten und Übergabepunkte.
- Weise auf verknüpfte Prozesse oder Vorlagen hin, falls vorhanden.

### Vergleichs- und Analysefragen
Wenn nach Unterschieden, Gemeinsamkeiten oder einer Bewertung gefragt wird:
- Stelle die Informationen in einer übersichtlichen Gegenüberstellung dar (z. B. Tabelle oder Aufzählung).
- Bleibe neutral und faktenbasiert.

### Problemlösung und Fehlerbehebung
Wenn nach einer Lösung für ein Problem gefragt wird:
- Analysiere das Problem schrittweise.
- Biete konkrete Handlungsempfehlungen.
- Verweise auf relevante Richtlinien oder Ansprechpartner, falls bekannt.

### Offene und explorative Fragen
Wenn die Frage breit oder unspezifisch ist:
- Fasse die relevantesten Aspekte zusammen.
- Biete an, bestimmte Teilbereiche zu vertiefen.

## Allgemeine Regeln
- Antworte immer auf Deutsch, es sei denn, die Frage wird auf Englisch gestellt.
- Formatiere Antworten mit Markdown: Überschriften, Listen, **Fettdruck** für Schlüsselbegriffe.
- Gib bei jeder Information die Quelle an (Prozess-ID, Seitenname).
- Wenn du eine Information nicht in den bereitgestellten Quellen findest, sage das klar — erfinde keine Inhalte.
- Denke proaktiv mit: Weise auf verwandte Themen, häufig übersehene Aspekte oder wichtige Abhängigkeiten hin, die der Fragende möglicherweise nicht bedacht hat.
- Wenn eine Frage unklar ist, stelle eine kurze Rückfrage, bevor du antwortest.`;

interface PromptPolicies {
  sourcePriority?: "wiki_first" | "connector_first" | "equal";
  responseLanguage?: "auto" | "de" | "en";
  citationStyle?: "inline" | "footnote" | "none";
  maxSourcesPerAnswer?: number;
}

function parsePromptPolicies(raw: unknown): PromptPolicies {
  if (!raw || typeof raw !== "object") return {};
  const obj = raw as Record<string, unknown>;
  return {
    sourcePriority:
      obj.sourcePriority === "connector_first" || obj.sourcePriority === "equal"
        ? obj.sourcePriority
        : "wiki_first",
    responseLanguage:
      obj.responseLanguage === "de" || obj.responseLanguage === "en"
        ? obj.responseLanguage
        : "auto",
    citationStyle:
      obj.citationStyle === "footnote" || obj.citationStyle === "none"
        ? obj.citationStyle
        : "inline",
    maxSourcesPerAnswer:
      typeof obj.maxSourcesPerAnswer === "number" &&
      obj.maxSourcesPerAnswer >= 1 &&
      obj.maxSourcesPerAnswer <= 20
        ? obj.maxSourcesPerAnswer
        : 12,
  };
}

function buildPolicyInstructions(policies: PromptPolicies): string {
  const parts: string[] = [];

  if (policies.sourcePriority === "connector_first") {
    parts.push(
      "Priorisiere externe Konnektorquellen gegenüber internen Wiki-Inhalten.",
    );
  } else if (policies.sourcePriority === "equal") {
    parts.push(
      "Behandle interne Wiki-Inhalte und externe Konnektorquellen gleichwertig.",
    );
  } else {
    parts.push("Priorisiere interne Wiki-Inhalte gegenüber externen Quellen.");
  }

  if (policies.responseLanguage === "de") {
    parts.push("Antworte immer auf Deutsch.");
  } else if (policies.responseLanguage === "en") {
    parts.push("Antworte immer auf Englisch.");
  }

  if (policies.citationStyle === "inline") {
    parts.push("Verwende Inline-Zitate mit Quellennummern wie [1], [2], etc.");
  } else if (policies.citationStyle === "footnote") {
    parts.push("Füge Quellenverweise als Fußnoten am Ende der Antwort hinzu.");
  } else if (policies.citationStyle === "none") {
    parts.push("Füge keine expliziten Quellenverweise in den Text ein.");
  }

  return parts.join("\n");
}

export async function getAiSettings() {
  const rows = await db.select().from(aiSettingsTable).limit(1);
  if (rows.length === 0) {
    return {
      id: null,
      enabled: false,
      model: "gpt-5.2",
      sourceMode: "wiki_only" as const,
      webSearchEnabled: false,
      maxCompletionTokens: 8192,
      systemPrompt: DEFAULT_SYSTEM_PROMPT,
      promptPolicies: null,
      updatedAt: null,
      updatedBy: null,
    };
  }
  return rows[0];
}

export async function upsertAiSettings(
  data: {
    enabled?: boolean;
    model?: string;
    sourceMode?: string;
    webSearchEnabled?: boolean;
    maxCompletionTokens?: number;
    systemPrompt?: string | null;
    promptPolicies?: Record<string, unknown> | null;
  },
  updatedBy: string,
) {
  const existing = await db.select().from(aiSettingsTable).limit(1);

  if (existing.length === 0) {
    const [row] = await db
      .insert(aiSettingsTable)
      .values({
        ...data,
        updatedBy,
        updatedAt: new Date(),
      })
      .returning();
    return row;
  }

  const [row] = await db
    .update(aiSettingsTable)
    .set({
      ...data,
      updatedBy,
      updatedAt: new Date(),
    })
    .where(eq(aiSettingsTable.id, existing[0].id))
    .returning();
  return row;
}

type AiVisibility = "published_only" | "include_review" | "all";

async function searchWikiContent(
  query: string,
  principalId: string,
  limit = 8,
  overFetchFactor = 3,
  visibility: AiVisibility = "published_only",
): Promise<AiSource[]> {
  const tsQuery = query
    .split(/\s+/)
    .filter((w) => w.length > 1)
    .map((w) => w.replace(/[^a-zA-Z0-9äöüÄÖÜß]/g, ""))
    .filter(Boolean)
    .join(" & ");

  if (!tsQuery) return [];

  const conditions = [
    eq(contentNodesTable.isDeleted, false),
    sql`${contentNodesTable.searchVector} @@ to_tsquery('german', ${tsQuery})`,
  ];

  if (visibility === "published_only") {
    conditions.push(eq(contentNodesTable.status, "published"));
  } else if (visibility === "include_review") {
    conditions.push(
      sql`${contentNodesTable.status} IN ('published', 'in_review', 'approved')`,
    );
  }

  const results = await db
    .select({
      id: contentNodesTable.id,
      title: contentNodesTable.title,
      displayCode: contentNodesTable.displayCode,
      templateType: contentNodesTable.templateType,
      status: contentNodesTable.status,
      structuredFields: contentRevisionsTable.structuredFields,
    })
    .from(contentNodesTable)
    .leftJoin(
      contentRevisionsTable,
      eq(contentNodesTable.publishedRevisionId, contentRevisionsTable.id),
    )
    .where(and(...conditions))
    .orderBy(
      sql`ts_rank(${contentNodesTable.searchVector}, to_tsquery('german', ${tsQuery})) DESC`,
    )
    .limit(limit * overFetchFactor);

  const permChecks = await Promise.all(
    results.map((r) => hasPermission(principalId, "read_page", r.id)),
  );
  const filtered = results.filter((_, i) => permChecks[i]).slice(0, limit);

  return filtered.map((r) => {
    let snippet = "";
    const sf = r.structuredFields as Record<string, unknown> | null;
    if (sf) {
      const editorContent = sf._editorContent;
      if (typeof editorContent === "object" && editorContent !== null) {
        snippet = extractTextFromBlocks(editorContent).slice(0, 500);
      } else {
        const textFields = Object.entries(sf)
          .filter(([k, v]) => typeof v === "string" && !k.startsWith("_"))
          .map(([, v]) => v as string);
        snippet = textFields.join(" ").slice(0, 500);
      }
    }
    return {
      nodeId: r.id,
      title: r.title,
      displayCode: r.displayCode,
      templateType: r.templateType,
      snippet,
      sourceType: "wiki" as SourceType,
      contentStatus: r.status,
    };
  });
}

async function searchConnectorSources(
  query: string,
  principalId: string,
  limit = 4,
  overFetchFactor = 3,
): Promise<AiSource[]> {
  const queryLower = `%${query.toLowerCase()}%`;

  const results = await db.execute<{
    node_id: string;
    external_title: string | null;
    external_url: string | null;
    system_name: string;
    node_title: string;
    node_display_code: string;
    node_template_type: string;
  }>(sql`
    SELECT sr.node_id, sr.external_title, sr.external_url,
           ss.name as system_name,
           cn.title as node_title, cn.display_code as node_display_code,
           cn.template_type as node_template_type
    FROM source_references sr
    JOIN source_systems ss ON sr.source_system_id = ss.id
    JOIN content_nodes cn ON sr.node_id = cn.id
    WHERE sr.sync_status = 'active'
      AND ss.is_active = true
      AND cn.is_deleted = false
      AND (lower(sr.external_title) LIKE ${queryLower} OR lower(cn.title) LIKE ${queryLower})
    LIMIT ${sql.raw(String(limit * overFetchFactor))}
  `);

  const rows = results.rows;

  const permChecks = await Promise.all(
    rows.map((r) => hasPermission(principalId, "read_page", r.node_id)),
  );
  const filtered = rows.filter((_, i) => permChecks[i]).slice(0, limit);

  return filtered.map((r) => ({
    nodeId: r.node_id,
    title: r.external_title || r.node_title,
    displayCode: r.node_display_code,
    templateType: r.node_template_type,
    snippet: `Externe Quelle: ${r.system_name}`,
    sourceType: "connector" as SourceType,
    externalUrl: r.external_url || undefined,
    sourceSystemName: r.system_name,
  }));
}

function extractTextFromBlocks(content: unknown): string {
  if (!content || typeof content !== "object") return "";
  const doc = content as { type?: string; content?: unknown[]; text?: string };
  if (doc.text) return doc.text;
  if (!Array.isArray(doc.content)) return "";
  return doc.content
    .map((block) => extractTextFromBlocks(block))
    .filter(Boolean)
    .join("\n");
}

function buildContextFromSources(sources: AiSource[]): string {
  if (sources.length === 0) return "Keine relevanten Wiki-Inhalte gefunden.";
  return sources
    .map((s, i) => {
      const typeLabel =
        s.sourceType === "wiki"
          ? "Wiki"
          : s.sourceType === "connector"
            ? `Connector: ${s.sourceSystemName || "extern"}`
            : "Web";
      const statusLabel = s.contentStatus && s.contentStatus !== "published"
        ? ` [Status: ${s.contentStatus}]`
        : "";
      return `[Quelle ${i + 1} – ${typeLabel}${statusLabel}] ${s.displayCode} – ${s.title} (${s.templateType})\n${s.snippet}`;
    })
    .join("\n\n");
}

async function gatherSources(
  query: string,
  principalId: string,
  sourceMode: string,
  policies: PromptPolicies = {},
  visibility: AiVisibility = "published_only",
): Promise<AiSource[]> {
  const wikiSources = await searchWikiContent(
    query,
    principalId,
    8,
    3,
    visibility,
  );
  let connectorSources: AiSource[] = [];

  if (
    sourceMode === "wiki_and_connectors" ||
    sourceMode === "wiki_connectors_web"
  ) {
    connectorSources = await searchConnectorSources(query, principalId);
  }

  let combined: AiSource[];
  if (policies.sourcePriority === "connector_first") {
    combined = [...connectorSources, ...wikiSources];
  } else if (policies.sourcePriority === "equal") {
    const merged: AiSource[] = [];
    const maxLen = Math.max(wikiSources.length, connectorSources.length);
    for (let i = 0; i < maxLen; i++) {
      if (i < wikiSources.length) merged.push(wikiSources[i]);
      if (i < connectorSources.length) merged.push(connectorSources[i]);
    }
    combined = merged;
  } else {
    combined = [...wikiSources, ...connectorSources];
  }

  const maxSources = policies.maxSourcesPerAnswer ?? 12;
  return combined.slice(0, maxSources);
}

function shouldUseWebSearch(
  sourceMode: string,
  webSearchEnabled: boolean,
): boolean {
  return sourceMode === "wiki_connectors_web" && webSearchEnabled;
}

export async function streamAskAnswer(
  query: string,
  principalId: string,
  res: Response,
  includeUnpublished = false,
) {
  const startTime = Date.now();
  const settings = await getAiSettings();

  if (!settings.enabled) {
    res.status(400).json({ error: "AI assistant is disabled" });
    return;
  }

  const highestRole = await getHighestRole(principalId);
  const roleVisibility = getSearchVisibilityForRole(highestRole);
  const effectiveVisibility: AiVisibility =
    includeUnpublished && roleVisibility !== "published_only"
      ? roleVisibility
      : "published_only";

  const policies = parsePromptPolicies(settings.promptPolicies);
  const sources = await gatherSources(
    query,
    principalId,
    settings.sourceMode,
    policies,
    effectiveVisibility,
  );

  const useWebSearch = shouldUseWebSearch(
    settings.sourceMode,
    settings.webSearchEnabled,
  );

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  res.write(
    `data: ${JSON.stringify({ type: "sources", sources, webSearchEnabled: useWebSearch })}\n\n`,
  );

  const contextText = buildContextFromSources(sources);
  const systemPrompt = settings.systemPrompt || DEFAULT_SYSTEM_PROMPT;
  const policyInstructions = buildPolicyInstructions(policies);

  const roleContext = `\n\n## Benutzerkontext\nDie Rolle des Benutzers ist: ${highestRole}.`;

  const publishedWarning = effectiveVisibility !== "published_only"
    ? "\n\nHINWEIS: Einige Quellen sind möglicherweise nicht veröffentlicht (Status: in_review, approved). Kennzeichne solche Inhalte klar als 'In Überprüfung' oder 'Genehmigt' und weise darauf hin, dass diese noch nicht endgültig freigegeben sind."
    : "\n\nHINWEIS: Alle verwendeten Quellen stammen aus veröffentlichten, freigegebenen Inhalten.";

  const qualityHints = `\n\n## Qualitätshinweise
- Wenn du Widersprüche zwischen verschiedenen Quellen erkennst, weise explizit darauf hin.
- Wenn Informationen veraltet erscheinen oder Quellen im Status 'draft'/'in_review' sind, kennzeichne dies.
- Wenn relevante Informationen fehlen könnten, erwähne dies am Ende der Antwort.`;

  const instructions = `${systemPrompt}${roleContext}\n\n${policyInstructions}${publishedWarning}${qualityHints}\n\nRelevante Wiki-Inhalte:\n\n${contextText}`;

  let hasError = false;
  let errorMessage: string | undefined;
  let webSearchUsed = false;

  try {
    const client = await getOpenAI();

    const tools: OpenAI.Responses.Tool[] = [];
    if (useWebSearch) {
      tools.push({ type: "web_search_preview" });
    }

    const stream = await client.responses.create({
      model: settings.model,
      instructions,
      input: query,
      max_output_tokens: settings.maxCompletionTokens,
      stream: true,
      ...(tools.length > 0 ? { tools } : {}),
    });

    for await (const event of stream) {
      if (event.type === "response.output_text.delta") {
        res.write(
          `data: ${JSON.stringify({ type: "content", content: event.delta })}\n\n`,
        );
      }
      if (
        event.type === "response.output_item.added" &&
        "type" in event.item &&
        event.item.type === "web_search_call"
      ) {
        webSearchUsed = true;
        res.write(
          `data: ${JSON.stringify({ type: "web_search_started" })}\n\n`,
        );
      }
      if (
        event.type === "response.output_item.done" &&
        "type" in event.item &&
        event.item.type === "web_search_call"
      ) {
        const webSource: AiSource = {
          nodeId: "",
          title: "Web-Suchergebnis",
          displayCode: "WEB",
          templateType: "external",
          snippet: `Websuche wurde durchgeführt für: "${query}"`,
          sourceType: "web",
        };
        sources.push(webSource);
        res.write(
          `data: ${JSON.stringify({ type: "sources_update", sources })}\n\n`,
        );
      }
    }
  } catch (err) {
    hasError = true;
    errorMessage = err instanceof Error ? err.message : String(err);
    logger.error({ err }, "AI streaming error");
    res.write(
      `data: ${JSON.stringify({ type: "error", error: "AI request failed" })}\n\n`,
    );
  }

  const latencyMs = Date.now() - startTime;

  await db
    .insert(aiUsageLogsTable)
    .values({
      principalId,
      action: "ask",
      model: settings.model,
      sourceMode: settings.sourceMode,
      webSearchUsed,
      sourcesCount: sources.length,
      latencyMs,
      hasError,
      errorMessage: hasError ? errorMessage : undefined,
      zeroResults: sources.length === 0,
    })
    .catch((e) => logger.error({ err: e }, "Failed to log AI usage"));

  let confidence: "high" | "medium" | "low" = "low";
  if (sources.length >= 3) {
    confidence = "high";
  } else if (sources.length >= 1) {
    confidence = "medium";
  }
  if (hasError) {
    confidence = "low";
  }

  res.write(
    `data: ${JSON.stringify({ type: "done", done: true, confidence, sourcesCount: sources.length, webSearchUsed })}\n\n`,
  );
  res.end();
}

export async function generateChangeSummary(
  diff: {
    titleChanged?: boolean;
    metadataChanges: Record<string, { old: unknown; new: unknown }>;
    structuredFieldChanges: Record<string, { old: unknown; new: unknown }>;
    contentChanged: boolean;
  },
): Promise<string> {
  const settings = await getAiSettings();
  if (!settings.enabled) {
    throw new Error("FlowCore-Assistent ist deaktiviert.");
  }

  const parts: string[] = [];

  if (diff.titleChanged) {
    parts.push("- Titel wurde geändert");
  }

  for (const [key, change] of Object.entries(diff.metadataChanges)) {
    const oldStr = change.old != null ? String(change.old) : "(leer)";
    const newStr = change.new != null ? String(change.new) : "(leer)";
    parts.push(`- Metadaten "${key}": "${oldStr}" → "${newStr}"`);
  }

  for (const [key, change] of Object.entries(diff.structuredFieldChanges)) {
    if (key === "_editorContent") {
      parts.push("- Seiteninhalt (Editor) wurde geändert");
      continue;
    }
    const oldLen = change.old ? String(change.old).length : 0;
    const newLen = change.new ? String(change.new).length : 0;
    if (!change.old) {
      parts.push(`- Strukturiertes Feld "${key}" wurde neu angelegt (${newLen} Zeichen)`);
    } else if (!change.new) {
      parts.push(`- Strukturiertes Feld "${key}" wurde entfernt`);
    } else {
      parts.push(`- Strukturiertes Feld "${key}" wurde geändert (${oldLen} → ${newLen} Zeichen)`);
    }
  }

  if (diff.contentChanged) {
    parts.push("- Block-Editor-Inhalt wurde geändert");
  }

  if (parts.length === 0) {
    return "Keine Änderungen erkannt.";
  }

  const diffDescription = parts.join("\n");

  const client = await getOpenAI();
  const response = await client.responses.create({
    model: settings.model,
    instructions: `Du bist ein sachlicher Dokumentations-Assistent für FlowCore, die Wissensplattform des Bildungscampus Backnang.
Fasse die folgenden Änderungen an einer Wiki-Seite in 2-3 kurzen, sachlichen Sätzen auf Deutsch zusammen.
Beschreibe WAS geändert wurde, nicht WARUM. Verwende keine Aufzählungszeichen, sondern Fließtext.
Antworte NUR mit der Zusammenfassung, ohne Einleitungssatz.`,
    input: `Änderungen:\n${diffDescription}`,
    max_output_tokens: 200,
  });

  const text = response.output_text?.trim() || "Änderungen an der Seite vorgenommen.";
  return text;
}

export type PageAssistAction =
  | "reformulate"
  | "summarize"
  | "expand"
  | "shorten"
  | "grammar"
  | "gap_analysis"
  | "professionalize"
  | "adjust_tone"
  | "restructure"
  | "template_completeness"
  | "quality_check"
  | "change_summary"
  | "duplicate_check";

const ACTION_PROMPTS: Record<PageAssistAction, string> = {
  reformulate:
    "Formuliere den folgenden Text um, behalte die Bedeutung bei, verbessere Klarheit und Lesbarkeit:",
  summarize:
    "Fasse den folgenden Text in einer kompakten Zusammenfassung zusammen:",
  expand:
    "Erweitere den folgenden Text mit zusätzlichen Details und Erklärungen:",
  shorten:
    "Kürze den folgenden Text auf das Wesentliche, ohne wichtige Informationen zu verlieren:",
  grammar:
    "Korrigiere Grammatik, Rechtschreibung und Stil im folgenden Text. Gib den korrigierten Text zurück:",
  gap_analysis:
    "Analysiere den folgenden Text und identifiziere fehlende Informationen, Lücken oder Verbesserungsmöglichkeiten:",
  professionalize:
    "Überarbeite den folgenden Text in einen professionellen, formellen Ton, passend für eine Unternehmensdokumentation:",
  adjust_tone:
    "Passe den Ton des folgenden Textes an: Mache ihn sachlich, klar und neutral, geeignet für ein internes Wiki:",
  restructure:
    "Strukturiere den folgenden Text neu. Verwende Überschriften, Aufzählungen und Absätze für bessere Lesbarkeit:",
  template_completeness:
    "Analysiere den folgenden Seiteninhalt und identifiziere fehlende oder unvollständige Felder. Schlage konkrete Ergänzungen vor, die den Inhalt vervollständigen würden:",
  quality_check:
    "Analysiere den folgenden Text auf Qualitätsprobleme. Prüfe auf:\n1. Widersprüche innerhalb des Textes\n2. Veraltete oder ungenaue Informationen\n3. Fehlende Quellen oder Belege\n4. Unklare oder mehrdeutige Formulierungen\n5. Mögliche Duplikate oder redundante Abschnitte\nGib eine strukturierte Liste der gefundenen Probleme mit konkreten Verbesserungsvorschlägen zurück:",
  change_summary:
    "Fasse die folgenden Änderungen an einer Wiki-Seite in 2-3 kurzen, sachlichen Sätzen auf Deutsch zusammen. Beschreibe WAS geändert wurde, nicht WARUM. Verwende Fließtext, keine Aufzählungszeichen:",
  duplicate_check:
    "Analysiere den folgenden Text und identifiziere:\n1. Redundante oder doppelte Informationen innerhalb des Textes\n2. Abschnitte, die zusammengefasst werden könnten\n3. Widersprüchliche Aussagen\nGib konkrete Vorschläge zur Bereinigung:",
};

export async function streamPageAssist(
  action: PageAssistAction,
  text: string,
  nodeId: string | undefined,
  principalId: string,
  res: Response,
) {
  const startTime = Date.now();
  const settings = await getAiSettings();

  if (!settings.enabled) {
    res.status(400).json({ error: "AI assistant is disabled" });
    return;
  }

  if (nodeId) {
    const canRead = await hasPermission(principalId, "read_page", nodeId);
    if (!canRead) {
      res.status(403).json({ error: "No read access to this page" });
      return;
    }
  }

  const actionPrompt = ACTION_PROMPTS[action];
  if (!actionPrompt) {
    res.status(400).json({ error: "Invalid action" });
    return;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  let hasError = false;
  let errorMessage: string | undefined;

  try {
    const client = await getOpenAI();

    const stream = await client.responses.create({
      model: settings.model,
      instructions:
        "Du bist der FlowCore-Schreibassistent — der KI-Schreibassistent der Wissensplattform des Bildungscampus Backnang. Antworte auf Deutsch.",
      input: `${actionPrompt}\n\n${text}`,
      max_output_tokens: settings.maxCompletionTokens,
      stream: true,
    });

    for await (const event of stream) {
      if (event.type === "response.output_text.delta") {
        res.write(
          `data: ${JSON.stringify({ type: "content", content: event.delta })}\n\n`,
        );
      }
    }
  } catch (err) {
    hasError = true;
    errorMessage = err instanceof Error ? err.message : String(err);
    logger.error({ err }, "AI page-assist streaming error");
    res.write(
      `data: ${JSON.stringify({ type: "error", error: "AI request failed" })}\n\n`,
    );
  }

  const latencyMs = Date.now() - startTime;

  await db
    .insert(aiUsageLogsTable)
    .values({
      principalId,
      action,
      model: settings.model,
      sourceMode: settings.sourceMode,
      webSearchUsed: false,
      sourcesCount: 0,
      latencyMs,
      hasError,
      errorMessage: hasError ? errorMessage : undefined,
      zeroResults: false,
      nodeId,
    })
    .catch((e) => logger.error({ err: e }, "Failed to log AI usage"));

  res.write(`data: ${JSON.stringify({ type: "done", done: true })}\n\n`);
  res.end();
}

export type FieldAssistAction =
  | "reformulate"
  | "professionalize"
  | "expand"
  | "shorten"
  | "grammar"
  | "from_bullets";

const FIELD_ACTION_PROMPTS: Record<FieldAssistAction, string> = {
  reformulate:
    "Formuliere den folgenden Feldinhalt um, behalte die Bedeutung bei, verbessere Klarheit und Lesbarkeit:",
  professionalize:
    "Überarbeite den folgenden Feldinhalt in einen professionellen, formellen Ton, passend für eine Unternehmensdokumentation:",
  expand:
    "Erweitere den folgenden Feldinhalt mit zusätzlichen Details und Erklärungen:",
  shorten:
    "Kürze den folgenden Feldinhalt auf das Wesentliche, ohne wichtige Informationen zu verlieren:",
  grammar:
    "Korrigiere Grammatik, Rechtschreibung und Stil im folgenden Feldinhalt. Gib den korrigierten Text zurück:",
  from_bullets:
    "Formuliere die folgenden Stichpunkte zu einem zusammenhängenden, professionellen Fließtext aus:",
};

const DEFAULT_FIELD_GUARDRAILS: Record<string, string> = {
  raci: "Du darfst die Rollen-/Verantwortungslogik strukturieren, aber KEINE konkreten Personen erfinden oder halluzinieren. Verwende nur die im Text genannten Personen und Rollen.",
  kpis: "Du darfst Definitionen sprachlich verbessern, aber KEINE neuen Kennzahlen, Zielwerte oder Messformeln erfinden. Verwende nur die im Text genannten KPIs.",
  risks: "Du darfst Formulierungen verbessern, aber KEINE falschen Kontrollen, Maßnahmen oder Risikobewertungen ergänzen. Bleibe bei den im Text genannten Risiken und Kontrollen.",
  responsibilities: "Du darfst Stichpunkte zu Fließtext ausformulieren, aber KEINE neuen Verantwortlichkeiten, Befugnisse oder Organisationsstrukturen erfinden.",
  role_profile: "Du darfst Stichpunkte strukturieren und sprachlich verbessern, aber KEINE HR-Daten, Gehaltsangaben, Qualifikationen oder Personalinformationen erfinden.",
  compliance: "Du darfst Normbezüge sprachlich verbessern, aber KEINE neuen Normen, Gesetze oder Compliance-Anforderungen erfinden.",
  sipoc: "Du darfst die SIPOC-Struktur sprachlich verbessern, aber KEINE neuen Supplier, Inputs, Outputs oder Customers erfinden.",
};

function getDefaultGuardrailForField(fieldKey: string): string | undefined {
  const key = fieldKey.toLowerCase();
  for (const [pattern, guardrail] of Object.entries(DEFAULT_FIELD_GUARDRAILS)) {
    if (key.includes(pattern)) return guardrail;
  }
  return undefined;
}

export async function streamFieldAssist(
  action: FieldAssistAction,
  text: string,
  fieldKey: string,
  pageType: string,
  nodeId: string | undefined,
  principalId: string,
  res: Response,
) {
  const startTime = Date.now();
  const settings = await getAiSettings();

  if (!settings.enabled) {
    res.status(400).json({ error: "AI assistant is disabled" });
    return;
  }

  if (nodeId) {
    const canRead = await hasPermission(principalId, "read_page", nodeId);
    if (!canRead) {
      res.status(403).json({ error: "No read access to this page" });
      return;
    }
  }

  const actionPrompt = FIELD_ACTION_PROMPTS[action];
  if (!actionPrompt) {
    res.status(400).json({ error: "Invalid action" });
    return;
  }

  const profile = await getFieldProfile(pageType, fieldKey);

  if (profile && Array.isArray(profile.allowedOperations) && profile.allowedOperations.length > 0) {
    if (!profile.allowedOperations.includes(action)) {
      res.status(400).json({ error: `Action "${action}" is not allowed for this field profile` });
      return;
    }
  }

  let systemInstruction = `Du bist der FlowCore-Feldassistent — der KI-Assistent für feldbezogene Inhaltsbearbeitung der Wissensplattform des Bildungscampus Backnang. Antworte auf Deutsch.`;

  if (profile) {
    if (profile.purpose) {
      systemInstruction += `\n\nZweck dieses Feldes: ${profile.purpose}`;
    }
    if (profile.promptInstruction) {
      systemInstruction += `\n\nSpezifische Anweisung: ${profile.promptInstruction}`;
    }
    if (profile.style) {
      systemInstruction += `\n\nGewünschter Stil: ${profile.style}`;
    }
    if (profile.guardrails) {
      systemInstruction += `\n\nGUARDRAILS (UNBEDINGT BEACHTEN): ${profile.guardrails}`;
    }
  } else {
    const defaultGuardrail = getDefaultGuardrailForField(fieldKey);
    if (defaultGuardrail) {
      systemInstruction += `\n\nGUARDRAILS (UNBEDINGT BEACHTEN): ${defaultGuardrail}`;
    }
  }

  systemInstruction += `\n\nFeldkontext: Seitentyp "${pageType}", Feld "${fieldKey}".`;
  systemInstruction += `\n\nGib NUR den verbesserten Feldinhalt zurück, ohne Einleitungssatz oder Erklärung. Der Text soll direkt als Feldwert übernommen werden können.`;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  let hasError = false;
  let errorMessage: string | undefined;

  try {
    const client = await getOpenAI();

    const stream = await client.responses.create({
      model: settings.model,
      instructions: systemInstruction,
      input: `${actionPrompt}\n\n${text}`,
      max_output_tokens: settings.maxCompletionTokens,
      stream: true,
    });

    for await (const event of stream) {
      if (event.type === "response.output_text.delta") {
        res.write(
          `data: ${JSON.stringify({ type: "content", content: event.delta })}\n\n`,
        );
      }
    }
  } catch (err) {
    hasError = true;
    errorMessage = err instanceof Error ? err.message : String(err);
    logger.error({ err }, "AI field-assist streaming error");
    res.write(
      `data: ${JSON.stringify({ type: "error", error: "AI request failed" })}\n\n`,
    );
  }

  const latencyMs = Date.now() - startTime;

  await db
    .insert(aiUsageLogsTable)
    .values({
      principalId,
      action: `field_assist:${action}`,
      model: settings.model,
      sourceMode: settings.sourceMode,
      webSearchUsed: false,
      sourcesCount: 0,
      latencyMs,
      hasError,
      errorMessage: hasError ? errorMessage : undefined,
      zeroResults: false,
      nodeId,
    })
    .catch((e) => logger.error({ err: e }, "Failed to log AI field-assist usage"));

  res.write(`data: ${JSON.stringify({ type: "done", done: true })}\n\n`);
  res.end();
}

async function getFieldProfile(pageType: string, fieldKey: string) {
  const rows = await db
    .select()
    .from(aiFieldProfilesTable)
    .where(
      and(
        eq(aiFieldProfilesTable.pageType, pageType),
        eq(aiFieldProfilesTable.fieldKey, fieldKey),
        eq(aiFieldProfilesTable.isActive, true),
      ),
    )
    .orderBy(aiFieldProfilesTable.updatedAt)
    .limit(1);
  return rows[0] ?? null;
}

export async function listFieldProfiles(pageType?: string, fieldKey?: string) {
  const conditions = [];
  if (pageType) {
    conditions.push(eq(aiFieldProfilesTable.pageType, pageType));
  }
  if (fieldKey) {
    conditions.push(ilike(aiFieldProfilesTable.fieldKey, `%${fieldKey}%`));
  }
  return db
    .select()
    .from(aiFieldProfilesTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(aiFieldProfilesTable.pageType, aiFieldProfilesTable.fieldKey);
}

export async function createFieldProfile(
  data: {
    pageType: string;
    fieldKey: string;
    label: string;
    purpose?: string | null;
    promptInstruction?: string | null;
    style?: string | null;
    guardrails?: string | null;
    allowedOperations?: string[];
    isActive?: boolean;
  },
  updatedBy: string,
) {
  const [row] = await db
    .insert(aiFieldProfilesTable)
    .values({
      ...data,
      allowedOperations: data.allowedOperations ?? [
        "reformulate",
        "professionalize",
        "expand",
        "shorten",
        "grammar",
      ],
      isActive: data.isActive ?? true,
      updatedBy,
    })
    .returning();
  return row;
}

export async function updateFieldProfile(
  id: string,
  data: {
    pageType: string;
    fieldKey: string;
    label: string;
    purpose?: string | null;
    promptInstruction?: string | null;
    style?: string | null;
    guardrails?: string | null;
    allowedOperations?: string[];
    isActive?: boolean;
  },
  updatedBy: string,
) {
  const [row] = await db
    .update(aiFieldProfilesTable)
    .set({
      ...data,
      updatedBy,
      updatedAt: new Date(),
    })
    .where(eq(aiFieldProfilesTable.id, id))
    .returning();
  return row;
}

export async function deleteFieldProfile(id: string) {
  await db
    .delete(aiFieldProfilesTable)
    .where(eq(aiFieldProfilesTable.id, id));
}

export async function getUsageStats(days = 30) {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const stats = await db
    .select({
      totalQueries: sql<number>`count(*)::int`,
      errorCount: sql<number>`count(*) filter (where ${aiUsageLogsTable.hasError} = true)::int`,
      zeroResultCount: sql<number>`count(*) filter (where ${aiUsageLogsTable.zeroResults} = true)::int`,
      avgLatencyMs: sql<number>`coalesce(avg(${aiUsageLogsTable.latencyMs})::int, 0)`,
      webSearchCount: sql<number>`count(*) filter (where ${aiUsageLogsTable.webSearchUsed} = true)::int`,
    })
    .from(aiUsageLogsTable)
    .where(sql`${aiUsageLogsTable.createdAt} >= ${since}`);

  const byAction = await db
    .select({
      action: aiUsageLogsTable.action,
      count: sql<number>`count(*)::int`,
    })
    .from(aiUsageLogsTable)
    .where(sql`${aiUsageLogsTable.createdAt} >= ${since}`)
    .groupBy(aiUsageLogsTable.action)
    .orderBy(sql`count(*) DESC`);

  const byDay = await db
    .select({
      date: sql<string>`to_char(${aiUsageLogsTable.createdAt}, 'YYYY-MM-DD')`,
      count: sql<number>`count(*)::int`,
    })
    .from(aiUsageLogsTable)
    .where(sql`${aiUsageLogsTable.createdAt} >= ${since}`)
    .groupBy(sql`to_char(${aiUsageLogsTable.createdAt}, 'YYYY-MM-DD')`)
    .orderBy(sql`to_char(${aiUsageLogsTable.createdAt}, 'YYYY-MM-DD')`);

  return {
    period: { days, since: since.toISOString() },
    summary: stats[0] ?? {
      totalQueries: 0,
      errorCount: 0,
      zeroResultCount: 0,
      avgLatencyMs: 0,
      webSearchCount: 0,
    },
    byAction,
    byDay,
  };
}
