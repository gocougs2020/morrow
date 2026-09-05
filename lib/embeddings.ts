import { embed, embedMany } from "ai";
import { appConfig } from "@/app.config";

export const EMBEDDING_MODEL = appConfig.models.embeddings;
export const EMBEDDING_DIMENSIONS = 1536;
export const MAX_EMBED_CHARS = 24_000;

export function clipForEmbedding(text: string): string {
  const trimmed = text.trim();
  if (trimmed.length <= MAX_EMBED_CHARS) return trimmed;
  return trimmed.slice(0, MAX_EMBED_CHARS);
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length === 0 || a.length !== b.length) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let index = 0; index < a.length; index += 1) {
    const left = a[index] ?? 0;
    const right = b[index] ?? 0;
    dot += left * right;
    normA += left * left;
    normB += right * right;
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

export async function embedText(value: string): Promise<number[] | null> {
  const text = clipForEmbedding(value);
  if (!text) return null;
  const result = await embed({
    model: EMBEDDING_MODEL,
    value: text,
  });
  void import("@/lib/record-usage").then(({ recordEmbeddingUsage }) =>
    recordEmbeddingUsage(EMBEDDING_MODEL, result.usage),
  );
  return result.embedding;
}

export async function embedTexts(values: string[]): Promise<(number[] | null)[]> {
  const clipped = values.map((value) => clipForEmbedding(value));
  const pending = clipped.map((text, index) => ({ index, text }));
  const nonempty = pending.filter((item) => item.text);
  const embeddings: (number[] | null)[] = clipped.map((text) => (text ? null : null));

  if (nonempty.length === 0) return embeddings;

  const result = await embedMany({
    model: EMBEDDING_MODEL,
    values: nonempty.map((item) => item.text),
  });
  void import("@/lib/record-usage").then(({ recordEmbeddingUsage }) =>
    recordEmbeddingUsage(EMBEDDING_MODEL, result.usage),
  );

  nonempty.forEach((item, resultIndex) => {
    embeddings[item.index] = result.embeddings[resultIndex] ?? null;
  });
  return embeddings;
}
