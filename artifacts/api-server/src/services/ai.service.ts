import { db } from "@workspace/db";
import {
  aiSettingsTable,
  aiUsageLogsTable,
  contentNodesTable,
  contentRevisionsTable,
} from "@workspace/db/schema";
import { eq, and, sql, desc } from "drizzle-orm";
import { logger } from "../lib/logger";
import type { Response } from "express";
import { hasPermission } from "./rbac.service";

let _openaiClient: any = null;

async function getOpenAI() {
  if (!_openaiClient) {
    if (
      !process.env.AI_INTEGRATIONS_OPENAI_BASE_URL ||
      !process.env.AI_INTEGRATIONS_OPENAI_API_KEY
    ) {
      throw new Error("OpenAI integration is not configured");
    }
    const mod = await import("@workspace/integrations-openai-ai-server");
    _openaiClient = mod.openai;
  }
  return _openaiClient;
}

export interface AiSource {
  nodeId: string;
  title: string;
  displayCode: string;
  templateType: string;
  snippet: string;
}

export interface AskResult {
  answer: string;
  sources: AiSource[];
  webSearchUsed: boolean;
}

const DEFAULT_SYSTEM_PROMPT = `Du bist ein hilfreicher Wissensassistent für das Bildungscampus Backnang Enterprise Wiki.
Beantworte Fragen basierend auf den bereitgestellten Wiki-Inhalten.
Gib immer Quellenverweise an, wenn du Informationen aus den Wiki-Seiten verwendest.
Antworte auf Deutsch, es sei denn, der Benutzer schreibt auf Englisch.
Formatiere deine Antworten mit Markdown.`;

export async function getAiSettings() {
  const rows = await db.select().from(aiSettingsTable).limit(1);
  if (rows.length === 0) {
    return {
      id: null,
      enabled: false,
      model: "gpt-5.2",
      sourceMode: "wiki_only",
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

async function searchWikiContent(
  query: string,
  principalId: string,
  limit = 8,
): Promise<AiSource[]> {
  const tsQuery = query
    .split(/\s+/)
    .filter((w) => w.length > 1)
    .map((w) => w.replace(/[^a-zA-Z0-9äöüÄÖÜß]/g, ""))
    .filter(Boolean)
    .join(" & ");

  if (!tsQuery) return [];

  const results = await db
    .select({
      id: contentNodesTable.id,
      title: contentNodesTable.title,
      displayCode: contentNodesTable.displayCode,
      templateType: contentNodesTable.templateType,
      content: contentRevisionsTable.content,
      structuredFields: contentRevisionsTable.structuredFields,
      rank: sql<number>`ts_rank(${contentNodesTable.searchVector}, to_tsquery('german', ${tsQuery}))`,
    })
    .from(contentNodesTable)
    .leftJoin(
      contentRevisionsTable,
      eq(contentNodesTable.currentRevisionId, contentRevisionsTable.id),
    )
    .where(
      and(
        eq(contentNodesTable.isDeleted, false),
        sql`${contentNodesTable.searchVector} @@ to_tsquery('german', ${tsQuery})`,
      ),
    )
    .orderBy(
      sql`ts_rank(${contentNodesTable.searchVector}, to_tsquery('german', ${tsQuery})) DESC`,
    )
    .limit(limit);

  const permChecks = await Promise.all(
    results.map((r) => hasPermission(principalId, "read_page", r.id)),
  );
  const filtered = results.filter((_, i) => permChecks[i]);

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
    };
  });
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
    .map(
      (s, i) =>
        `[Quelle ${i + 1}] ${s.displayCode} – ${s.title} (${s.templateType})\n${s.snippet}`,
    )
    .join("\n\n");
}

export async function streamAskAnswer(
  query: string,
  principalId: string,
  res: Response,
) {
  const startTime = Date.now();
  const settings = await getAiSettings();

  if (!settings.enabled) {
    res.status(400).json({ error: "AI assistant is disabled" });
    return;
  }

  const sources = await searchWikiContent(query, principalId);

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  res.write(`data: ${JSON.stringify({ type: "sources", sources })}\n\n`);

  const contextText = buildContextFromSources(sources);
  const systemPrompt = settings.systemPrompt || DEFAULT_SYSTEM_PROMPT;

  const messages: Array<{ role: "system" | "user"; content: string }> = [
    { role: "system", content: systemPrompt },
    {
      role: "system",
      content: `Relevante Wiki-Inhalte:\n\n${contextText}`,
    },
    { role: "user", content: query },
  ];

  let fullResponse = "";
  let hasError = false;
  let errorMessage: string | undefined;

  try {
    const client = await getOpenAI();
    const stream = await client.chat.completions.create({
      model: settings.model,
      max_completion_tokens: settings.maxCompletionTokens,
      messages,
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        fullResponse += content;
        res.write(`data: ${JSON.stringify({ type: "content", content })}\n\n`);
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
      query,
      model: settings.model,
      sourceMode: settings.sourceMode,
      webSearchUsed: false,
      sourcesCount: sources.length,
      latencyMs,
      hasError,
      errorMessage,
      zeroResults: sources.length === 0,
    })
    .catch((e) => logger.error({ err: e }, "Failed to log AI usage"));

  res.write(`data: ${JSON.stringify({ type: "done", done: true })}\n\n`);
  res.end();
}

export type PageAssistAction =
  | "reformulate"
  | "summarize"
  | "expand"
  | "shorten"
  | "grammar"
  | "gap_analysis";

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

  const actionPrompt = ACTION_PROMPTS[action];
  if (!actionPrompt) {
    res.status(400).json({ error: "Invalid action" });
    return;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const messages: Array<{ role: "system" | "user"; content: string }> = [
    {
      role: "system",
      content:
        "Du bist ein Schreibassistent für das Bildungscampus Backnang Enterprise Wiki. Antworte auf Deutsch.",
    },
    { role: "user", content: `${actionPrompt}\n\n${text}` },
  ];

  let fullResponse = "";
  let hasError = false;
  let errorMessage: string | undefined;

  try {
    const client = await getOpenAI();
    const stream = await client.chat.completions.create({
      model: settings.model,
      max_completion_tokens: settings.maxCompletionTokens,
      messages,
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        fullResponse += content;
        res.write(`data: ${JSON.stringify({ type: "content", content })}\n\n`);
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
      query: text.slice(0, 500),
      model: settings.model,
      sourceMode: settings.sourceMode,
      webSearchUsed: false,
      sourcesCount: 0,
      latencyMs,
      hasError,
      errorMessage,
      zeroResults: false,
      nodeId,
    })
    .catch((e) => logger.error({ err: e }, "Failed to log AI usage"));

  res.write(`data: ${JSON.stringify({ type: "done", done: true })}\n\n`);
  res.end();
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
