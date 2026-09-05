import { and, cosineDistance, eq, inArray, notInArray, or, sql } from "drizzle-orm";
import { getNeonDb } from "@/lib/db";
import { pgEmbeddings } from "@/lib/db/schema";
import type {
  EmbeddingKind,
  EmbeddingSearchHit,
  EmbeddingSearchInput,
  EmbeddingSourceType,
} from "@/lib/types";

function iso(value: Date | string | null | undefined): string | null {
  if (value == null) return null;
  return value instanceof Date ? value.toISOString() : value;
}

export async function searchUserEmbeddings(
  input: EmbeddingSearchInput,
): Promise<EmbeddingSearchHit[]> {
  const queries = input.queryEmbeddings.filter((query) => query.length > 0);
  if (queries.length === 0 || input.limit <= 0) return [];

  const hits = (
    await Promise.all(queries.map((query) => searchUserEmbeddingsForQuery(input, query)))
  ).flat();

  const byId = new Map<string, EmbeddingSearchHit>();
  for (const hit of hits) {
    const existing = byId.get(hit.record.id);
    if (!existing || hit.score > existing.score) {
      byId.set(hit.record.id, hit);
    }
  }

  return [...byId.values()]
    .filter((hit) => input.minScore == null || hit.score >= input.minScore)
    .sort((left, right) => right.score - left.score)
    .slice(0, input.limit);
}

async function searchUserEmbeddingsForQuery(
  input: EmbeddingSearchInput,
  query: number[],
): Promise<EmbeddingSearchHit[]> {
  const distance = cosineDistance(pgEmbeddings.embedding, query);
  const similarity = sql<number>`1 - (${distance})`;
  const filters =
    input.scope === "account"
      ? []
      : [
          or(
            eq(pgEmbeddings.userId, input.userId),
            input.includeSourceIds?.length
              ? inArray(pgEmbeddings.sourceId, [...input.includeSourceIds])
              : sql`false`,
          ),
        ];
  if (input.kinds && input.kinds.length > 0) {
    filters.push(inArray(pgEmbeddings.kind, [...input.kinds]));
  }
  if (input.excludeSourceIds && input.excludeSourceIds.length > 0) {
    filters.push(notInArray(pgEmbeddings.sourceId, [...input.excludeSourceIds]));
  }

  const rows = await getNeonDb()
    .select({
      id: pgEmbeddings.id,
      userId: pgEmbeddings.userId,
      kind: pgEmbeddings.kind,
      sourceType: pgEmbeddings.sourceType,
      sourceId: pgEmbeddings.sourceId,
      turnId: pgEmbeddings.turnId,
      text: pgEmbeddings.text,
      createdAt: pgEmbeddings.createdAt,
      updatedAt: pgEmbeddings.updatedAt,
      score: similarity,
    })
    .from(pgEmbeddings)
    .where(filters.length > 0 ? and(...filters) : undefined)
    .orderBy(distance)
    .limit(input.limit);

  return rows.map((row) => ({
    record: {
      id: row.id,
      userId: row.userId,
      kind: row.kind as EmbeddingKind,
      sourceType: row.sourceType as EmbeddingSourceType,
      sourceId: row.sourceId,
      turnId: row.turnId,
      text: row.text,
      embedding: [],
      createdAt: iso(row.createdAt) ?? "",
      updatedAt: iso(row.updatedAt) ?? "",
    },
    score: Number(row.score),
  }));
}
