export interface EmbeddingResult {
  vector: number[];
  model: string;
  tokenCount: number;
}

export interface CompletionResult {
  text: string;
  model: string;
  tokenCount: { prompt: number; completion: number };
  finishReason: string;
}

export interface RAGContext {
  chunks: Array<{
    id: string;
    content: string;
    score: number;
    source: { nodeId: string; title: string; revisionNo: number };
  }>;
}

export interface IAIProvider {
  generateEmbedding(text: string): Promise<EmbeddingResult>;
  complete(
    prompt: string,
    options?: {
      maxTokens?: number;
      temperature?: number;
      systemPrompt?: string;
    },
  ): Promise<CompletionResult>;
  retrieveContext(query: string, limit?: number): Promise<RAGContext>;
  summarize(text: string): Promise<string>;
  analyzeQuality(
    content: string,
    templateType: string,
  ): Promise<{ score: number; suggestions: string[] }>;
}
