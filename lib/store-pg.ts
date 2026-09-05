import { randomUUID } from "node:crypto";
import { and, desc, eq, gte, inArray, isNull, lte, or, sql } from "drizzle-orm";
import { getNeonDb } from "@/lib/db";
import {
  pgChatEvents,
  pgChats,
  pgDocumentFolders,
  pgDocuments,
  pgDocumentSessions,
  pgEmails,
  pgEmbeddings,
  pgScheduledJobs,
  pgSessionCitations,
  pgUsageEvents,
  pgUserSettings,
  pgUserSkills,
} from "@/lib/db/schema";
import type {
  ChatEventRecord,
  ChatPatch,
  ChatRecord,
  ChatSource,
  DocumentFolder,
  DocumentKind,
  DocumentRecord,
  EmailDirection,
  EmailRecord,
  EmbeddingKind,
  EmbeddingRecord,
  EmbeddingSourceType,
  SessionCitationSet,
  ScheduledJob,
  UsageRecord,
  UserSettings,
  UserSkill,
} from "@/lib/types";
import { advanceJobAfterRun, parseJobCadence } from "@/lib/job-cadence";
import { normalizeChatSource } from "@/lib/types";
import {
  LIBRARY_SHARE_VALUES,
  isVisibleToViewer,
  normalizeLibraryVisibility,
  normalizeVisibility,
} from "@/lib/visibility";

export { searchUserEmbeddings } from "@/lib/store-pg-embeddings";

function nowDate() {
  return new Date();
}

function iso(value: Date | string | null | undefined): string | null {
  if (value == null) return null;
  return value instanceof Date ? value.toISOString() : value;
}

function asDate(value: string | Date) {
  return value instanceof Date ? value : new Date(value);
}

function defaultSettings(userId: string): UserSettings {
  return { userId, modelTier: "auto", instructionOverlay: "" };
}

function mapChat(row: typeof pgChats.$inferSelect): ChatRecord {
  return {
    id: row.id,
    userId: row.userId,
    title: row.title,
    description: row.description ?? "",
    source: normalizeChatSource(row.source),
    sessionId: row.sessionId,
    streamIndex: row.streamIndex,
    createdAt: iso(row.createdAt) ?? "",
    updatedAt: iso(row.updatedAt) ?? "",
  };
}

function mapSkill(row: typeof pgUserSkills.$inferSelect): UserSkill {
  return {
    id: row.id,
    userId: row.userId,
    name: row.name ?? "",
    slug: row.slug,
    description: row.description,
    markdown: row.markdown,
    enabled: row.enabled,
    visibility: normalizeVisibility(row.visibility),
    createdAt: iso(row.createdAt) ?? "",
    updatedAt: iso(row.updatedAt) ?? "",
  };
}

function mapDocument(row: typeof pgDocuments.$inferSelect): DocumentRecord {
  return {
    id: row.id,
    userId: row.userId,
    folderId: row.folderId ?? null,
    title: row.title,
    filename: row.filename,
    kind: row.kind as DocumentKind,
    mimeType: row.mimeType,
    blobPathname: row.blobPathname,
    blobUrl: row.blobUrl,
    size: row.size,
    isPublic: row.isPublic || row.visibility === "public",
    shareId: row.shareId,
    visibility: normalizeLibraryVisibility(row.visibility, row.isPublic),
    createdAt: iso(row.createdAt) ?? "",
    updatedAt: iso(row.updatedAt) ?? "",
  };
}

function mapFolder(row: typeof pgDocumentFolders.$inferSelect): DocumentFolder {
  return {
    id: row.id,
    userId: row.userId,
    parentId: row.parentId ?? null,
    name: row.name,
    description: row.description,
    visibility: normalizeLibraryVisibility(row.visibility),
    createdAt: iso(row.createdAt) ?? "",
    updatedAt: iso(row.updatedAt) ?? "",
  };
}

function mapJob(row: typeof pgScheduledJobs.$inferSelect): ScheduledJob {
  return {
    id: row.id,
    userId: row.userId,
    prompt: row.prompt,
    firstRunAt: iso(row.firstRunAt) ?? "",
    nextRunAt: iso(row.nextRunAt) ?? "",
    everyMinutes: row.everyMinutes,
    cadence: parseJobCadence(row.cadence),
    enabled: row.enabled,
    leaseToken: row.leaseToken,
    leaseUntil: iso(row.leaseUntil),
    lastError: row.lastError,
    authenticator: row.authenticator,
    issuer: row.issuer,
    visibility: normalizeVisibility(row.visibility),
    createdAt: iso(row.createdAt) ?? "",
    updatedAt: iso(row.updatedAt) ?? "",
  };
}

export async function getUserSettings(userId: string): Promise<UserSettings> {
  const [row] = await getNeonDb()
    .select()
    .from(pgUserSettings)
    .where(eq(pgUserSettings.userId, userId))
    .limit(1);
  if (!row) return defaultSettings(userId);
  return {
    userId: row.userId,
    modelTier: row.modelTier as UserSettings["modelTier"],
    instructionOverlay: row.instructionOverlay,
  };
}

export async function upsertUserSettings(
  userId: string,
  patch: Partial<Pick<UserSettings, "modelTier" | "instructionOverlay">>,
): Promise<UserSettings> {
  const current = await getUserSettings(userId);
  const next = { ...current, ...patch, userId };
  await getNeonDb()
    .insert(pgUserSettings)
    .values({
      userId,
      modelTier: next.modelTier,
      instructionOverlay: next.instructionOverlay,
    })
    .onConflictDoUpdate({
      target: pgUserSettings.userId,
      set: {
        modelTier: next.modelTier,
        instructionOverlay: next.instructionOverlay,
      },
    });
  return next;
}

export async function listChats(userId: string): Promise<ChatRecord[]> {
  const rows = await getNeonDb()
    .select()
    .from(pgChats)
    .where(eq(pgChats.userId, userId))
    .orderBy(desc(pgChats.updatedAt));
  return rows.map(mapChat);
}

export async function listAccountChats(): Promise<ChatRecord[]> {
  const rows = await getNeonDb().select().from(pgChats).orderBy(desc(pgChats.updatedAt));
  return rows.map(mapChat);
}

export async function getChat(userId: string, chatId: string): Promise<ChatRecord | null> {
  const [row] = await getNeonDb()
    .select()
    .from(pgChats)
    .where(and(eq(pgChats.userId, userId), eq(pgChats.id, chatId)))
    .limit(1);
  return row ? mapChat(row) : null;
}

export async function createChat(
  userId: string,
  title: string,
  source: ChatSource = "web",
): Promise<ChatRecord> {
  const stamp = nowDate();
  const chat = {
    id: randomUUID(),
    userId,
    title,
    description: "",
    source,
    sessionId: null,
    streamIndex: 0,
    createdAt: stamp,
    updatedAt: stamp,
  };
  await getNeonDb().insert(pgChats).values(chat);
  return mapChat(chat);
}

export async function updateChat(
  userId: string,
  chatId: string,
  patch: ChatPatch,
): Promise<ChatRecord | null> {
  const current = await getChat(userId, chatId);
  if (!current) return null;
  const { touchUpdatedAt, ...fields } = patch;
  const [row] = await getNeonDb()
    .update(pgChats)
    .set({
      ...fields,
      ...(touchUpdatedAt ? { updatedAt: nowDate() } : {}),
    })
    .where(and(eq(pgChats.userId, userId), eq(pgChats.id, chatId)))
    .returning();
  return row ? mapChat(row) : null;
}

export async function deleteChat(userId: string, chatId: string): Promise<boolean> {
  const deleted = await getNeonDb()
    .delete(pgChats)
    .where(and(eq(pgChats.userId, userId), eq(pgChats.id, chatId)))
    .returning({ id: pgChats.id });
  if (deleted.length === 0) return false;
  await getNeonDb().delete(pgChatEvents).where(eq(pgChatEvents.chatId, chatId));
  await getNeonDb().delete(pgDocumentSessions).where(eq(pgDocumentSessions.chatId, chatId));
  await getNeonDb()
    .delete(pgEmbeddings)
    .where(
      and(
        eq(pgEmbeddings.userId, userId),
        eq(pgEmbeddings.sourceType, "session"),
        eq(pgEmbeddings.sourceId, chatId),
      ),
    );
  await getNeonDb()
    .delete(pgSessionCitations)
    .where(and(eq(pgSessionCitations.userId, userId), eq(pgSessionCitations.chatId, chatId)));
  return true;
}

export async function getChatByEveSessionId(
  userId: string,
  eveSessionId: string,
): Promise<ChatRecord | null> {
  const [row] = await getNeonDb()
    .select()
    .from(pgChats)
    .where(and(eq(pgChats.userId, userId), eq(pgChats.sessionId, eveSessionId)))
    .limit(1);
  return row ? mapChat(row) : null;
}

export async function listChatEvents(chatId: string): Promise<ChatEventRecord[]> {
  const rows = await getNeonDb()
    .select()
    .from(pgChatEvents)
    .where(eq(pgChatEvents.chatId, chatId))
    .orderBy(pgChatEvents.index);
  return rows.map((row) => ({
    id: row.id,
    chatId: row.chatId,
    index: row.index,
    event: row.event,
  }));
}

export async function upsertChatEvent(chatId: string, index: number, event: unknown) {
  const id = `${chatId}:${index}`;
  await getNeonDb()
    .insert(pgChatEvents)
    .values({ id, chatId, index, event })
    .onConflictDoUpdate({
      target: pgChatEvents.id,
      set: { event },
    });
}

export async function replaceChatEvents(chatId: string, events: unknown[]) {
  const db = getNeonDb();
  if (events.length === 0) {
    await db.delete(pgChatEvents).where(eq(pgChatEvents.chatId, chatId));
    return;
  }
  // Upsert first so overlapping persists from the same streaming session
  // cannot collide on the deterministic `${chatId}:${index}` primary key.
  await db
    .insert(pgChatEvents)
    .values(
      events.map((event, index) => ({
        id: `${chatId}:${index}`,
        chatId,
        index,
        event,
      })),
    )
    .onConflictDoUpdate({
      target: pgChatEvents.id,
      set: { event: sql`excluded.event` },
    });
  await db
    .delete(pgChatEvents)
    .where(and(eq(pgChatEvents.chatId, chatId), gte(pgChatEvents.index, events.length)));
}

export async function listUserSkills(userId: string): Promise<UserSkill[]> {
  const rows = await getNeonDb()
    .select()
    .from(pgUserSkills)
    .where(eq(pgUserSkills.userId, userId));
  return rows.map(mapSkill);
}

export async function createUserSkill(
  userId: string,
  input: Pick<UserSkill, "name" | "slug" | "description" | "markdown"> & {
    enabled?: boolean;
    visibility?: UserSkill["visibility"];
  },
): Promise<UserSkill> {
  const stamp = nowDate();
  const skill = {
    id: randomUUID(),
    userId,
    name: input.name,
    slug: input.slug,
    description: input.description,
    markdown: input.markdown,
    enabled: input.enabled ?? true,
    visibility: normalizeVisibility(input.visibility, "private"),
    createdAt: stamp,
    updatedAt: stamp,
  };
  await getNeonDb().insert(pgUserSkills).values(skill);
  return mapSkill(skill);
}

export async function updateUserSkill(
  userId: string,
  skillId: string,
  patch: Partial<Pick<UserSkill, "name" | "slug" | "description" | "markdown" | "enabled" | "visibility">>,
): Promise<UserSkill | null> {
  const [row] = await getNeonDb()
    .update(pgUserSkills)
    .set({ ...patch, updatedAt: nowDate() })
    .where(and(eq(pgUserSkills.userId, userId), eq(pgUserSkills.id, skillId)))
    .returning();
  return row ? mapSkill(row) : null;
}

export async function deleteUserSkill(userId: string, skillId: string): Promise<boolean> {
  const deleted = await getNeonDb()
    .delete(pgUserSkills)
    .where(and(eq(pgUserSkills.userId, userId), eq(pgUserSkills.id, skillId)))
    .returning({ id: pgUserSkills.id });
  return deleted.length > 0;
}

export async function listJobs(userId: string): Promise<ScheduledJob[]> {
  const rows = await getNeonDb()
    .select()
    .from(pgScheduledJobs)
    .where(eq(pgScheduledJobs.userId, userId))
    .orderBy(pgScheduledJobs.nextRunAt);
  return rows.map(mapJob);
}

export async function createJob(
  userId: string,
  input: Pick<ScheduledJob, "prompt" | "firstRunAt" | "everyMinutes" | "authenticator" | "issuer"> & {
    cadence?: ScheduledJob["cadence"];
    visibility?: ScheduledJob["visibility"];
  },
): Promise<ScheduledJob> {
  const stamp = nowDate();
  const firstRunAt = asDate(input.firstRunAt);
  const job = {
    id: randomUUID(),
    userId,
    prompt: input.prompt,
    firstRunAt,
    nextRunAt: firstRunAt,
    everyMinutes: input.everyMinutes,
    cadence: parseJobCadence(input.cadence),
    enabled: true,
    leaseToken: null,
    leaseUntil: null,
    lastError: null,
    authenticator: input.authenticator,
    issuer: input.issuer,
    visibility: "private",
    createdAt: stamp,
    updatedAt: stamp,
  };
  await getNeonDb().insert(pgScheduledJobs).values(job);
  return mapJob(job);
}

export async function updateJob(
  userId: string,
  jobId: string,
  patch: Partial<
    Pick<
      ScheduledJob,
      "prompt" | "nextRunAt" | "everyMinutes" | "cadence" | "enabled" | "lastError" | "visibility"
    >
  >,
): Promise<ScheduledJob | null> {
  const { nextRunAt, ...rest } = patch;
  const next = {
    ...rest,
    ...(nextRunAt ? { nextRunAt: asDate(nextRunAt) } : {}),
    ...(patch.cadence !== undefined
      ? { cadence: parseJobCadence(patch.cadence) }
      : patch.everyMinutes !== undefined
        ? { cadence: null }
        : {}),
    updatedAt: nowDate(),
  };
  const [row] = await getNeonDb()
    .update(pgScheduledJobs)
    .set(next)
    .where(and(eq(pgScheduledJobs.userId, userId), eq(pgScheduledJobs.id, jobId)))
    .returning();
  return row ? mapJob(row) : null;
}

export async function deleteJob(userId: string, jobId: string): Promise<boolean> {
  const deleted = await getNeonDb()
    .delete(pgScheduledJobs)
    .where(and(eq(pgScheduledJobs.userId, userId), eq(pgScheduledJobs.id, jobId)))
    .returning({ id: pgScheduledJobs.id });
  return deleted.length > 0;
}

export async function claimDueJobs(options: {
  now: Date;
  limit: number;
  leaseForMs: number;
}): Promise<ScheduledJob[]> {
  const due = await getNeonDb()
    .select()
    .from(pgScheduledJobs)
    .where(
      and(
        eq(pgScheduledJobs.enabled, true),
        lte(pgScheduledJobs.nextRunAt, options.now),
        or(isNull(pgScheduledJobs.leaseUntil), lte(pgScheduledJobs.leaseUntil, options.now)),
      ),
    )
    .limit(options.limit);

  const leaseUntil = new Date(options.now.getTime() + options.leaseForMs);
  const claimed: ScheduledJob[] = [];
  for (const job of due) {
    const token = randomUUID();
    const [row] = await getNeonDb()
      .update(pgScheduledJobs)
      .set({
        leaseToken: token,
        leaseUntil,
        updatedAt: nowDate(),
      })
      .where(eq(pgScheduledJobs.id, job.id))
      .returning();
    if (row) claimed.push(mapJob(row));
  }
  return claimed;
}

export async function completeJob(job: ScheduledJob) {
  const current = nowDate();
  const advanced = advanceJobAfterRun(job);
  await getNeonDb()
    .update(pgScheduledJobs)
    .set({
      enabled: advanced.enabled,
      ...(advanced.nextRunAt ? { nextRunAt: asDate(advanced.nextRunAt) } : {}),
      leaseToken: null,
      leaseUntil: null,
      lastError: null,
      updatedAt: current,
    })
    .where(eq(pgScheduledJobs.id, job.id));
}

export async function releaseJob(job: ScheduledJob, error: string, retryAt: Date) {
  await getNeonDb()
    .update(pgScheduledJobs)
    .set({
      leaseToken: null,
      leaseUntil: null,
      lastError: error,
      nextRunAt: retryAt,
      updatedAt: nowDate(),
    })
    .where(eq(pgScheduledJobs.id, job.id));
}

export async function listDocuments(userId: string): Promise<DocumentRecord[]> {
  const rows = await getNeonDb()
    .select()
    .from(pgDocuments)
    .where(or(eq(pgDocuments.userId, userId), inArray(pgDocuments.visibility, LIBRARY_SHARE_VALUES)))
    .orderBy(desc(pgDocuments.updatedAt));
  return rows.map(mapDocument);
}

export async function listDocumentsInFolder(
  userId: string,
  folderId: string | null,
): Promise<DocumentRecord[]> {
  const rows = await getNeonDb()
    .select()
    .from(pgDocuments)
    .where(
      and(
        or(eq(pgDocuments.userId, userId), inArray(pgDocuments.visibility, LIBRARY_SHARE_VALUES)),
        folderId ? eq(pgDocuments.folderId, folderId) : isNull(pgDocuments.folderId),
      ),
    )
    .orderBy(desc(pgDocuments.updatedAt));
  return rows.map(mapDocument);
}

export async function listFolders(userId: string): Promise<DocumentFolder[]> {
  const rows = await getNeonDb()
    .select()
    .from(pgDocumentFolders)
    .where(
      or(eq(pgDocumentFolders.userId, userId), inArray(pgDocumentFolders.visibility, LIBRARY_SHARE_VALUES)),
    )
    .orderBy(pgDocumentFolders.name);
  return rows.map(mapFolder);
}

export async function getFolder(userId: string, folderId: string): Promise<DocumentFolder | null> {
  const [row] = await getNeonDb()
    .select()
    .from(pgDocumentFolders)
    .where(eq(pgDocumentFolders.id, folderId))
    .limit(1);
  if (!row) return null;
  const folder = mapFolder(row);
  return isVisibleToViewer(folder, userId) ? folder : null;
}

export async function createFolder(record: DocumentFolder): Promise<DocumentFolder> {
  await getNeonDb().insert(pgDocumentFolders).values({
    id: record.id,
    userId: record.userId,
    parentId: record.parentId,
    name: record.name,
    description: record.description,
    visibility: record.visibility,
    createdAt: asDate(record.createdAt),
    updatedAt: asDate(record.updatedAt),
  });
  return record;
}

export async function updateFolder(
  userId: string,
  folderId: string,
  patch: Partial<Pick<DocumentFolder, "name" | "description" | "parentId" | "visibility">>,
): Promise<DocumentFolder | null> {
  const [row] = await getNeonDb()
    .update(pgDocumentFolders)
    .set({ ...patch, updatedAt: nowDate() })
    .where(and(eq(pgDocumentFolders.userId, userId), eq(pgDocumentFolders.id, folderId)))
    .returning();
  return row ? mapFolder(row) : null;
}

export async function deleteFolder(
  userId: string,
  folderId: string,
): Promise<DocumentFolder | null> {
  const current = await getFolder(userId, folderId);
  if (!current || current.userId !== userId) return null;
  const parentId = current.parentId;
  await getNeonDb()
    .update(pgDocumentFolders)
    .set({ parentId, updatedAt: nowDate() })
    .where(eq(pgDocumentFolders.parentId, folderId));
  await getNeonDb()
    .update(pgDocuments)
    .set({ folderId: parentId, updatedAt: nowDate() })
    .where(eq(pgDocuments.folderId, folderId));
  await getNeonDb()
    .delete(pgDocumentFolders)
    .where(and(eq(pgDocumentFolders.userId, userId), eq(pgDocumentFolders.id, folderId)));
  return current;
}

export async function getDocument(userId: string, documentId: string): Promise<DocumentRecord | null> {
  const [row] = await getNeonDb()
    .select()
    .from(pgDocuments)
    .where(eq(pgDocuments.id, documentId))
    .limit(1);
  if (!row) return null;
  const document = mapDocument(row);
  return isVisibleToViewer(document, userId) ? document : null;
}

export async function getPublicDocument(shareId: string): Promise<DocumentRecord | null> {
  const [row] = await getNeonDb()
    .select()
    .from(pgDocuments)
    .where(and(eq(pgDocuments.shareId, shareId), eq(pgDocuments.isPublic, true)))
    .limit(1);
  return row ? mapDocument(row) : null;
}

export async function createDocument(record: DocumentRecord): Promise<DocumentRecord> {
  await getNeonDb().insert(pgDocuments).values({
    id: record.id,
    userId: record.userId,
    title: record.title,
    filename: record.filename,
    kind: record.kind,
    mimeType: record.mimeType,
    blobPathname: record.blobPathname,
    blobUrl: record.blobUrl,
    size: record.size,
    isPublic: record.isPublic,
    shareId: record.shareId,
    visibility: record.visibility,
    folderId: record.folderId,
    createdAt: asDate(record.createdAt),
    updatedAt: asDate(record.updatedAt),
  });
  return record;
}

export async function updateDocument(
  userId: string,
  documentId: string,
  patch: Partial<
    Pick<
      DocumentRecord,
      | "title"
      | "filename"
      | "kind"
      | "mimeType"
      | "blobPathname"
      | "blobUrl"
      | "size"
      | "isPublic"
      | "folderId"
      | "visibility"
    >
  >,
): Promise<DocumentRecord | null> {
  const current = await getDocument(userId, documentId);
  if (!current) return null;
  const [row] = await getNeonDb()
    .update(pgDocuments)
    .set({ ...patch, updatedAt: nowDate() })
    .where(eq(pgDocuments.id, documentId))
    .returning();
  return row ? mapDocument(row) : null;
}

export async function deleteDocument(
  userId: string,
  documentId: string,
): Promise<DocumentRecord | null> {
  const current = await getDocument(userId, documentId);
  if (!current || current.userId !== userId) return null;
  await getNeonDb()
    .delete(pgDocuments)
    .where(and(eq(pgDocuments.userId, userId), eq(pgDocuments.id, documentId)));
  await getNeonDb()
    .delete(pgDocumentSessions)
    .where(eq(pgDocumentSessions.documentId, documentId));
  return current;
}

export async function listChatDocuments(userId: string, chatId: string): Promise<DocumentRecord[]> {
  const rows = await getNeonDb()
    .select({ document: pgDocuments })
    .from(pgDocumentSessions)
    .innerJoin(pgDocuments, eq(pgDocuments.id, pgDocumentSessions.documentId))
    .where(
      and(
        eq(pgDocumentSessions.chatId, chatId),
        or(eq(pgDocuments.userId, userId), inArray(pgDocuments.visibility, LIBRARY_SHARE_VALUES)),
      ),
    )
    .orderBy(desc(pgDocuments.updatedAt));
  return rows.map((row) => mapDocument(row.document));
}

export async function listDocumentChats(userId: string, documentId: string): Promise<ChatRecord[]> {
  const document = await getDocument(userId, documentId);
  if (!document) return [];
  const rows = await getNeonDb()
    .select({ chat: pgChats })
    .from(pgDocumentSessions)
    .innerJoin(pgChats, eq(pgChats.id, pgDocumentSessions.chatId))
    .where(and(eq(pgDocumentSessions.documentId, documentId), eq(pgChats.userId, userId)))
    .orderBy(desc(pgChats.updatedAt));
  return rows.map((row) => mapChat(row.chat));
}

export async function attachDocument(
  userId: string,
  documentId: string,
  chatId: string,
): Promise<boolean> {
  const document = await getDocument(userId, documentId);
  const chat = await getChat(userId, chatId);
  if (!document || !chat) return false;
  const [existing] = await getNeonDb()
    .select()
    .from(pgDocumentSessions)
    .where(
      and(eq(pgDocumentSessions.documentId, documentId), eq(pgDocumentSessions.chatId, chatId)),
    )
    .limit(1);
  if (existing) return true;
  await getNeonDb().insert(pgDocumentSessions).values({
    documentId,
    chatId,
    createdAt: nowDate(),
  });
  return true;
}

export async function detachDocument(
  userId: string,
  documentId: string,
  chatId: string,
): Promise<boolean> {
  const document = await getDocument(userId, documentId);
  if (!document) return false;
  const deleted = await getNeonDb()
    .delete(pgDocumentSessions)
    .where(
      and(eq(pgDocumentSessions.documentId, documentId), eq(pgDocumentSessions.chatId, chatId)),
    )
    .returning({ documentId: pgDocumentSessions.documentId });
  return deleted.length > 0;
}

function asEmbedding(value: unknown): number[] {
  if (Array.isArray(value)) {
    return value.map(Number).filter((entry) => Number.isFinite(entry));
  }
  if (typeof value === "string") {
    return value
      .replace(/^\[|\]$/g, "")
      .split(",")
      .map((part) => Number(part.trim()))
      .filter((entry) => Number.isFinite(entry));
  }
  return [];
}

function mapEmbedding(row: typeof pgEmbeddings.$inferSelect): EmbeddingRecord {
  return {
    id: row.id,
    userId: row.userId,
    kind: row.kind as EmbeddingKind,
    sourceType: row.sourceType as EmbeddingSourceType,
    sourceId: row.sourceId,
    turnId: row.turnId,
    text: row.text,
    embedding: asEmbedding(row.embedding),
    createdAt: iso(row.createdAt) ?? "",
    updatedAt: iso(row.updatedAt) ?? "",
  };
}

export async function upsertEmbedding(
  input: Omit<EmbeddingRecord, "id" | "createdAt" | "updatedAt"> & {
    id?: string;
  },
): Promise<EmbeddingRecord> {
  const turnMatch = input.turnId ? eq(pgEmbeddings.turnId, input.turnId) : isNull(pgEmbeddings.turnId);
  const [existing] = await getNeonDb()
    .select()
    .from(pgEmbeddings)
    .where(
      and(
        eq(pgEmbeddings.userId, input.userId),
        eq(pgEmbeddings.kind, input.kind),
        eq(pgEmbeddings.sourceId, input.sourceId),
        turnMatch,
      ),
    )
    .limit(1);
  const timestamp = nowDate();
  if (!existing) {
    const [row] = await getNeonDb()
      .insert(pgEmbeddings)
      .values({
        id: input.id ?? randomUUID(),
        userId: input.userId,
        kind: input.kind,
        sourceType: input.sourceType,
        sourceId: input.sourceId,
        turnId: input.turnId ?? null,
        text: input.text,
        embedding: input.embedding,
        createdAt: timestamp,
        updatedAt: timestamp,
      })
      .returning();
    if (!row) throw new Error("Failed to create embedding.");
    return mapEmbedding(row);
  }
  const [row] = await getNeonDb()
    .update(pgEmbeddings)
    .set({
      text: input.text,
      embedding: input.embedding,
      sourceType: input.sourceType,
      updatedAt: timestamp,
    })
    .where(eq(pgEmbeddings.id, existing.id))
    .returning();
  if (!row) throw new Error("Failed to update embedding.");
  return mapEmbedding(row);
}

export async function listUserEmbeddings(
  userId: string,
  kinds?: readonly EmbeddingKind[],
): Promise<EmbeddingRecord[]> {
  const rows = await getNeonDb()
    .select()
    .from(pgEmbeddings)
    .where(
      kinds && kinds.length > 0
        ? and(eq(pgEmbeddings.userId, userId), inArray(pgEmbeddings.kind, [...kinds]))
        : eq(pgEmbeddings.userId, userId),
    );
  return rows.map(mapEmbedding);
}

export async function deleteEmbeddingsForSource(
  userId: string,
  sourceType: EmbeddingSourceType,
  sourceId: string,
): Promise<void> {
  await getNeonDb()
    .delete(pgEmbeddings)
    .where(
      and(
        eq(pgEmbeddings.userId, userId),
        eq(pgEmbeddings.sourceType, sourceType),
        eq(pgEmbeddings.sourceId, sourceId),
      ),
    );
}

function mapSessionCitationSet(
  row: typeof pgSessionCitations.$inferSelect,
): SessionCitationSet {
  return {
    id: row.id,
    userId: row.userId,
    chatId: row.chatId,
    queryText: row.queryText,
    citations: row.citations,
    createdAt: iso(row.createdAt) ?? "",
  };
}

export async function upsertSessionCitationSet(input: {
  userId: string;
  chatId: string;
  queryText: string;
  citations: SessionCitationSet["citations"];
}): Promise<SessionCitationSet> {
  const [existing] = await getNeonDb()
    .select()
    .from(pgSessionCitations)
    .where(
      and(
        eq(pgSessionCitations.userId, input.userId),
        eq(pgSessionCitations.chatId, input.chatId),
        eq(pgSessionCitations.queryText, input.queryText),
      ),
    )
    .limit(1);

  if (!existing) {
    const [row] = await getNeonDb()
      .insert(pgSessionCitations)
      .values({
        id: randomUUID(),
        userId: input.userId,
        chatId: input.chatId,
        queryText: input.queryText,
        citations: input.citations,
        createdAt: nowDate(),
      })
      .returning();
    if (!row) throw new Error("Failed to save session citations.");
    return mapSessionCitationSet(row);
  }

  const [row] = await getNeonDb()
    .update(pgSessionCitations)
    .set({ citations: input.citations })
    .where(eq(pgSessionCitations.id, existing.id))
    .returning();
  if (!row) throw new Error("Failed to update session citations.");
  return mapSessionCitationSet(row);
}

export async function listSessionCitationSets(
  userId: string,
  chatId: string,
): Promise<SessionCitationSet[]> {
  const rows = await getNeonDb()
    .select()
    .from(pgSessionCitations)
    .where(
      and(eq(pgSessionCitations.userId, userId), eq(pgSessionCitations.chatId, chatId)),
    );
  return rows.map(mapSessionCitationSet);
}

function mapUsageRecord(row: typeof pgUsageEvents.$inferSelect): UsageRecord {
  return {
    id: row.id,
    userId: row.userId,
    chatId: row.chatId,
    purpose: row.purpose as UsageRecord["purpose"],
    modelId: row.modelId,
    inputTokens: row.inputTokens,
    outputTokens: row.outputTokens,
    reasoningTokens: row.reasoningTokens,
    cacheReadTokens: row.cacheReadTokens,
    cacheWriteTokens: row.cacheWriteTokens,
    costUsd: row.costUsd,
    createdAt: iso(row.createdAt) ?? "",
  };
}

export async function upsertUsageRecord(record: UsageRecord): Promise<UsageRecord> {
  const [row] = await getNeonDb()
    .insert(pgUsageEvents)
    .values({
      id: record.id,
      userId: record.userId,
      chatId: record.chatId,
      purpose: record.purpose,
      modelId: record.modelId,
      inputTokens: record.inputTokens,
      outputTokens: record.outputTokens,
      reasoningTokens: record.reasoningTokens,
      cacheReadTokens: record.cacheReadTokens,
      cacheWriteTokens: record.cacheWriteTokens,
      costUsd: record.costUsd,
      createdAt: asDate(record.createdAt),
    })
    .onConflictDoUpdate({
      target: pgUsageEvents.id,
      set: {
        inputTokens: record.inputTokens,
        outputTokens: record.outputTokens,
        reasoningTokens: record.reasoningTokens,
        cacheReadTokens: record.cacheReadTokens,
        cacheWriteTokens: record.cacheWriteTokens,
        costUsd: record.costUsd,
        modelId: record.modelId,
        purpose: record.purpose,
        chatId: record.chatId,
      },
    })
    .returning();
  if (!row) throw new Error("Failed to record usage.");
  return mapUsageRecord(row);
}

export async function listUserUsage(userId: string): Promise<UsageRecord[]> {
  const rows = await getNeonDb()
    .select()
    .from(pgUsageEvents)
    .where(eq(pgUsageEvents.userId, userId))
    .orderBy(desc(pgUsageEvents.createdAt));
  return rows.map(mapUsageRecord);
}

export async function listAccountUsage(): Promise<UsageRecord[]> {
  const rows = await getNeonDb()
    .select()
    .from(pgUsageEvents)
    .orderBy(desc(pgUsageEvents.createdAt));
  return rows.map(mapUsageRecord);
}

export async function listChatUsage(userId: string, chatId: string): Promise<UsageRecord[]> {
  const rows = await getNeonDb()
    .select()
    .from(pgUsageEvents)
    .where(and(eq(pgUsageEvents.userId, userId), eq(pgUsageEvents.chatId, chatId)))
    .orderBy(desc(pgUsageEvents.createdAt));
  return rows.map(mapUsageRecord);
}

function asStringList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function mapEmail(row: typeof pgEmails.$inferSelect): EmailRecord {
  return {
    id: row.id,
    userId: row.userId,
    direction: row.direction as EmailDirection,
    fromAddress: row.fromAddress,
    toAddresses: asStringList(row.toAddresses),
    ccAddresses: asStringList(row.ccAddresses),
    subject: row.subject,
    bodyText: row.bodyText ?? "",
    bodyHtml: row.bodyHtml ?? "",
    resendEmailId: row.resendEmailId,
    status: row.status as EmailRecord["status"],
    hasActionItem: row.hasActionItem,
    actionSummary: row.actionSummary,
    chatId: row.chatId,
    inReplyTo: row.inReplyTo,
    attachments: Array.isArray(row.attachments) ? row.attachments : [],
    createdAt: iso(row.createdAt) ?? "",
    updatedAt: iso(row.updatedAt) ?? "",
  };
}

export async function listEmails(
  _userId: string,
  options?: { direction?: EmailDirection; limit?: number },
): Promise<EmailRecord[]> {
  const limit = options?.limit ?? 200;
  const rows = await getNeonDb()
    .select()
    .from(pgEmails)
    .where(options?.direction ? eq(pgEmails.direction, options.direction) : undefined)
    .orderBy(desc(pgEmails.createdAt))
    .limit(limit);
  return rows.map(mapEmail);
}

export async function getEmail(_userId: string, emailId: string): Promise<EmailRecord | null> {
  const [row] = await getNeonDb()
    .select()
    .from(pgEmails)
    .where(eq(pgEmails.id, emailId))
    .limit(1);
  return row ? mapEmail(row) : null;
}

export async function getEmailByResendId(resendEmailId: string): Promise<EmailRecord | null> {
  const [row] = await getNeonDb()
    .select()
    .from(pgEmails)
    .where(eq(pgEmails.resendEmailId, resendEmailId))
    .limit(1);
  return row ? mapEmail(row) : null;
}

export async function createEmail(
  input: Omit<EmailRecord, "id" | "createdAt" | "updatedAt"> & { id?: string },
): Promise<EmailRecord> {
  const stamp = nowDate();
  const email = {
    id: input.id ?? randomUUID(),
    userId: input.userId,
    direction: input.direction,
    fromAddress: input.fromAddress,
    toAddresses: input.toAddresses,
    ccAddresses: input.ccAddresses,
    subject: input.subject,
    bodyText: input.bodyText,
    bodyHtml: input.bodyHtml,
    resendEmailId: input.resendEmailId,
    status: input.status,
    hasActionItem: input.hasActionItem,
    actionSummary: input.actionSummary,
    chatId: input.chatId,
    inReplyTo: input.inReplyTo,
    attachments: input.attachments,
    createdAt: stamp,
    updatedAt: stamp,
  };
  await getNeonDb().insert(pgEmails).values(email);
  return mapEmail(email);
}

export async function updateEmail(
  _userId: string,
  emailId: string,
  patch: Partial<
    Pick<
      EmailRecord,
      | "status"
      | "hasActionItem"
      | "actionSummary"
      | "chatId"
      | "resendEmailId"
      | "bodyText"
      | "bodyHtml"
    >
  >,
): Promise<EmailRecord | null> {
  const [row] = await getNeonDb()
    .update(pgEmails)
    .set({ ...patch, updatedAt: nowDate() })
    .where(eq(pgEmails.id, emailId))
    .returning();
  return row ? mapEmail(row) : null;
}
