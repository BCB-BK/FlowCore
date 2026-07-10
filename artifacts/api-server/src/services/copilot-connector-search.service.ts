import { db } from "@workspace/db";
import { contentNodesTable, glossaryTermsTable } from "@workspace/db/schema";
import { and, eq, isNotNull } from "drizzle-orm";
import {
  projectPublishedPage,
  type CopilotPageProjection,
} from "./copilot-content-projection.service";
import {
  projectGlossaryTerm,
  type GlossaryTermProjection,
} from "./glossary-projection.service";
import {
  getNodeConfidentialityLevel,
  DEFAULT_CONFIDENTIALITY_LEVEL,
} from "./confidentiality.service";
import {
  isConfidentialityAllowed,
  type CopilotConnectorPrincipal,
} from "./copilot-connector-key.service";

export interface ConnectorSearchResult {
  itemType: "flowcore_page" | "glossary_term";
  nodeId: string;
  displayCode: string;
  title: string;
  summary: string;
  url: string;
  version: string | null;
  authorityLevel: string | null;
  brandScope: string[];
  agentScope: string[];
  score: number;
}

/**
 * A key with an empty scope array is allowed to access ANY value for that
 * dimension (i.e. an unscoped key). A key with a non-empty array may only
 * access nodes whose own scope list intersects with it.
 */
function scopeAllowed(keyScopes: string[], nodeScopes: string[]): boolean {
  if (keyScopes.length === 0) return true;
  if (nodeScopes.length === 0) return false;
  return nodeScopes.some((s) => keyScopes.includes(s));
}

async function isNodeAllowedForKey(
  projection: CopilotPageProjection,
  key: CopilotConnectorPrincipal,
): Promise<boolean> {
  if (!scopeAllowed(key.agentScopes, projection.agentScope)) return false;
  if (!scopeAllowed(key.brandScopes, projection.brandScope)) return false;

  const level = await getNodeConfidentialityLevel(projection.nodeId);
  if (!level) return false;
  return isConfidentialityAllowed(level, key.maxConfidentialityLevel);
}

/**
 * Glossary terms have no confidentiality of their own; when a term is
 * linked to a content node, it inherits that node's level. Standalone
 * terms (no linked node) default to the same restrictive default used
 * elsewhere (DEFAULT_CONFIDENTIALITY_LEVEL = "internal") rather than being
 * treated as unrestricted, per the "unset defaults to restrictive" rule.
 */
async function isGlossaryAllowedForKey(
  projection: GlossaryTermProjection,
  key: CopilotConnectorPrincipal,
): Promise<boolean> {
  if (!scopeAllowed(key.agentScopes, projection.agentScope)) return false;
  if (!scopeAllowed(key.brandScopes, projection.brandScope)) return false;

  const level = projection.nodeId
    ? (await getNodeConfidentialityLevel(projection.nodeId)) ??
      DEFAULT_CONFIDENTIALITY_LEVEL
    : DEFAULT_CONFIDENTIALITY_LEVEL;
  return isConfidentialityAllowed(level, key.maxConfidentialityLevel);
}

/**
 * Query-intent detection used to bias ranking towards the item type a user
 * is actually looking for (Task 3 - "Trefferlogik für Mehrfachtreffer"):
 *
 * - "definitional": the user is asking what a term means ("Was bedeutet
 *   AZAV?", "Was ist ein SIPOC?") -> glossary terms should outrank process
 *   pages that merely mention the word in passing.
 * - "structureGuide": the user is asking where to file something or which
 *   template/structure to use ("Wo lege ich ... ab?", "Welches Template
 *   nutze ich für ...?") -> the FlowCore structure guide (tagged
 *   `structure-guide`, see STRUCTURE_GUIDE_TAG) should outrank the specific
 *   content the question happens to mention (e.g. "Markenprofil").
 */
function detectQueryIntent(query: string): {
  definitional: boolean;
  structureGuide: boolean;
} {
  const q = query.toLowerCase();
  const definitional =
    /\b(was (ist|sind|bedeutet|heißt)|wof(ü|u)r steht|definition (von|f(ü|u)r)|was versteht man unter)\b/.test(
      q,
    );
  const structureGuide =
    /\b(wo lege ich|wo speichere ich|wo lege man|welche(s)? (vorlage|template)|welches seitentemplate|ablage(struktur)?|struktur(leitfaden)?)\b/.test(
      q,
    );
  return { definitional, structureGuide };
}

/** Tag convention marking a page as the canonical FlowCore filing/structure guide. */
const STRUCTURE_GUIDE_TAG = "structure-guide";

/**
 * Common German question-frame words ("was", "wie", "bedeutet", "ich",
 * "ein", ...). These appear in almost every page's running text, so
 * counting them as scoring words drowns out the one or two actually
 * discriminating words in short questions (e.g. "Was bedeutet AZAV?" would
 * otherwise rank pages that merely contain "was" and "bedeutet" above the
 * exact glossary term "AZAV"). They are stripped before scoring, but query
 * intent detection (detectQueryIntent) still runs on the full original text.
 */
const STOPWORDS = new Set([
  "was","wie","wer","wo","wann","warum","weshalb","welche","welcher","welches","welchen","welchem",
  "ist","sind","war","waren","bedeutet","bedeuten","heißt","versteht","verstehen",
  "der","die","das","des","dem","den","ein","eine","einen","einem","einer","eines",
  "und","oder","auch","noch","nur","man","ich","du","er","sie","es","wir","ihr",
  "für","von","zu","zur","zum","in","im","an","am","auf","bei","mit","nach","über","unter",
  "ab","lege","legen","lege ich","nutze","nutzen","neue","neues","neuer","neuen",
  "kann","konzipiert","konzipieren","entwickelt","entwickeln","macht","gibt","es",
]);

/**
 * Copilot Studio sends free-text queries ("Vision BildungsCampus", "Was
 * weißt du über Produkte?") rather than exact phrases. Matching the whole
 * query as one literal substring meant almost nothing ever matched, even
 * when every individual word was present in the page (e.g. the page
 * "Vision des BildungsCampus" doesn't contain the contiguous phrase "vision
 * bildungscampus"). Instead, score each significant word independently and
 * sum the best-field match per word, so a page containing all of the query's
 * words (in any order, anywhere) ranks above one containing only some.
 * Question-frame stopwords are dropped first so short, mostly-frame
 * questions still discriminate on their one or two real keywords.
 */
function textMatches(
  fields: { title: string; summary: string; contentText: string; keywords: string[] },
  query: string,
): number {
  const allWords = query
    .trim()
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((w) => w.length > 1);

  const words = allWords.filter((w) => !STOPWORDS.has(w));
  const effectiveWords = words.length > 0 ? words : allWords;

  if (effectiveWords.length === 0) return 1;

  const title = fields.title.toLowerCase();
  const summary = fields.summary.toLowerCase();
  const contentText = fields.contentText.toLowerCase();
  const keywords = fields.keywords.map((k) => k.toLowerCase());

  let score = 0;
  for (const word of effectiveWords) {
    // An exact whole-title/keyword match (e.g. the query word "AZAV"
    // against the glossary entry titled exactly "AZAV") identifies the
    // canonical entry for that term. Without this, a compound entry like
    // "AZAV-System" can outscore the plain "AZAV" entry simply because its
    // longer definition repeats the substring "azav" more times.
    if (title === word) score += 10;
    else if (title.includes(word)) score += 3;
    if (summary.includes(word)) score += 2;
    if (contentText.includes(word)) score += 1;
    // Cross-reference synonyms/related-terms mentioning another entry's
    // name (e.g. "AZWV" lists "AZAV" as a synonym) are a much weaker
    // signal than actually being that entry — otherwise every term that
    // merely cross-references "AZAV" would tie with or beat the AZAV entry
    // itself.
    if (keywords.includes(word)) score += 3;
    else if (keywords.some((k) => k.includes(word))) score += 1;
  }
  return score;
}

/** Flat bonus applied when an item type matches the detected query intent, on top of its text-match score, so it wins ties without drowning out a genuinely better textual match. */
const INTENT_BOOST = 8;

export interface ConnectorSearchInput {
  query: string;
  brandScope?: string[];
  agentScope?: string[];
  limit?: number;
}

/**
 * Requested brandScope/agentScope filters must be a subset of what the key
 * itself is allowed to see. Requesting a scope the key isn't allowed to
 * touch is rejected up front rather than silently dropped, so a
 * misconfigured Copilot Studio action fails loudly instead of returning an
 * empty result that looks like "no matches".
 */
export function validateRequestedScope(
  requested: string[] | undefined,
  keyScopes: string[],
): { ok: true } | { ok: false; disallowed: string[] } {
  if (!requested || requested.length === 0) return { ok: true };
  if (keyScopes.length === 0) return { ok: true };
  const disallowed = requested.filter((s) => !keyScopes.includes(s));
  if (disallowed.length > 0) return { ok: false, disallowed };
  return { ok: true };
}

export async function searchForConnector(
  input: ConnectorSearchInput,
  key: CopilotConnectorPrincipal,
): Promise<ConnectorSearchResult[]> {
  const limit = Math.min(Math.max(input.limit ?? 10, 1), 25);
  const intent = detectQueryIntent(input.query);

  const rows = await db
    .select({ id: contentNodesTable.id })
    .from(contentNodesTable)
    .where(
      and(
        eq(contentNodesTable.isDeleted, false),
        isNotNull(contentNodesTable.publishedRevisionId),
      ),
    );

  // Projecting + checking each node involves several sequential DB round
  // trips (revision, tags, relations, glossary scan, confidentiality
  // lookup). With potentially hundreds of published nodes, awaiting these
  // one at a time in a loop turns into tens of seconds of wall-clock time
  // (observed ~45s in production) — enough to risk a Power Platform/Copilot
  // Studio connector timeout. Running them concurrently in bounded batches
  // keeps the same per-node cost but lets the DB pool pipeline the work.
  const BATCH_SIZE = 10;
  const candidates: ConnectorSearchResult[] = [];

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map(async (row) => {
        const projection = await projectPublishedPage(row.id);
        if (!projection) return null;

        if (input.brandScope?.length) {
          const overlaps = projection.brandScope.some((b) =>
            input.brandScope!.includes(b),
          );
          if (!overlaps) return null;
        }
        if (input.agentScope?.length) {
          const overlaps = projection.agentScope.some((s) =>
            input.agentScope!.includes(s),
          );
          if (!overlaps) return null;
        }

        const allowed = await isNodeAllowedForKey(projection, key);
        if (!allowed) return null;

        let score = textMatches(
          {
            title: projection.title,
            summary: projection.summary,
            contentText: projection.contentText,
            keywords: projection.copilotKeywords,
          },
          input.query,
        );
        if (score <= 0) return null;

        if (intent.structureGuide && projection.tags.includes(STRUCTURE_GUIDE_TAG)) {
          score += INTENT_BOOST;
        }

        const result: ConnectorSearchResult = {
          itemType: "flowcore_page",
          nodeId: projection.nodeId,
          displayCode: projection.displayCode,
          title: projection.title,
          summary: projection.summary,
          url: projection.sourceUrl,
          version: projection.version,
          authorityLevel: projection.authorityLevel,
          brandScope: projection.brandScope,
          agentScope: projection.agentScope,
          score,
        };
        return result;
      }),
    );
    for (const r of batchResults) {
      if (r) candidates.push(r);
    }
  }

  // Glossary terms are indexed independently of content nodes (a term does
  // not need to be linked to a page). Without including them here,
  // definitional questions ("Was bedeutet AZAV?") could only ever surface
  // process pages that happen to mention the abbreviation in passing.
  const glossaryRows = await db
    .select({ id: glossaryTermsTable.id })
    .from(glossaryTermsTable);

  for (let i = 0; i < glossaryRows.length; i += BATCH_SIZE) {
    const batch = glossaryRows.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map(async (row) => {
        const projection = await projectGlossaryTerm(row.id);
        if (!projection) return null;

        if (input.brandScope?.length) {
          const overlaps = projection.brandScope.some((b) =>
            input.brandScope!.includes(b),
          );
          if (!overlaps) return null;
        }
        if (input.agentScope?.length) {
          const overlaps = projection.agentScope.some((s) =>
            input.agentScope!.includes(s),
          );
          if (!overlaps) return null;
        }

        const allowed = await isGlossaryAllowedForKey(projection, key);
        if (!allowed) return null;

        let score = textMatches(
          {
            title: projection.term,
            summary: projection.shortDescription,
            contentText: projection.definition,
            keywords: [...projection.synonyms, ...projection.relatedTerms],
          },
          input.query,
        );
        if (score <= 0) return null;

        if (intent.definitional) {
          score += INTENT_BOOST;
        }

        const result: ConnectorSearchResult = {
          itemType: "glossary_term",
          nodeId: projection.termId,
          displayCode: projection.displayCode,
          title: projection.term,
          summary: projection.shortDescription,
          url: projection.sourceUrl,
          version: projection.version,
          authorityLevel: projection.authorityLevel,
          brandScope: projection.brandScope,
          agentScope: projection.agentScope,
          score,
        };
        return result;
      }),
    );
    for (const r of batchResults) {
      if (r) candidates.push(r);
    }
  }

  candidates.sort((a, b) => b.score - a.score);
  return candidates.slice(0, limit);
}

export async function getNodeForConnector(
  nodeId: string,
  key: CopilotConnectorPrincipal,
): Promise<CopilotPageProjection | "forbidden" | null> {
  const projection = await projectPublishedPage(nodeId);
  if (!projection) return null;

  const allowed = await isNodeAllowedForKey(projection, key);
  if (!allowed) return "forbidden";

  return projection;
}
