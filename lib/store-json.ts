import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type {
  ChatEventRecord,
  ChatPatch,
  ChatRecord,
  ChatSource,
  DocumentFolder,
  DocumentRecord,
  DocumentSessionLink,
  EmailDirection,
  EmailRecord,
  ModelTier,
  ScheduledJob,
  EmbeddingKind,
  EmbeddingRecord,
  EmbeddingSearchHit,
  EmbeddingSearchInput,
  EmbeddingSourceType,
  SessionCitationSet,
  UsageRecord,
  UserSettings,
  UserSkill,
} from "@/lib/types";
import { cosineSimilarity } from "@/lib/embeddings";
import { advanceJobAfterRun, parseJobCadence } from "@/lib/job-cadence";
import { titleForSkillOnlyPrompt } from "@/lib/skill-mention";
import { normalizeChatSource } from "@/lib/types";
import { isVisibleToViewer, normalizeLibraryVisibility, normalizeVisibility } from "@/lib/visibility";

type AppData = {
  chats: ChatRecord[];
  chatEvents: ChatEventRecord[];
  settings: UserSettings[];
  skills: UserSkill[];
  jobs: ScheduledJob[];
  documents: DocumentRecord[];
  documentFolders: DocumentFolder[];
  documentSessions: DocumentSessionLink[];
  embeddings: EmbeddingRecord[];
  sessionCitations: SessionCitationSet[];
  usageEvents: UsageRecord[];
  emails: EmailRecord[];
};

const empty: AppData = {
  chats: [],
  chatEvents: [],
  settings: [],
  skills: [],
  jobs: [],
  documents: [],
  documentFolders: [],
  documentSessions: [],
  embeddings: [],
  sessionCitations: [],
  usageEvents: [],
  emails: [],
};

const filePath = path.join(process.cwd(), ".data", "app.json");

function load(): AppData {
  try {
    const parsed = JSON.parse(readFileSync(filePath, "utf8")) as Partial<AppData>;
    return {
      ...empty,
      ...parsed,
      chats: (parsed.chats ?? []).map((chat) => ({
        ...chat,
        description: chat.description ?? "",
      })),
      documents: (parsed.documents ?? []).map((document) => {
        const visibility = normalizeLibraryVisibility(document.visibility, document.isPublic);
        return {
          ...document,
          folderId: document.folderId ?? null,
          isPublic: visibility === "public",
          visibility,
        };
      }),
      documentFolders: (parsed.documentFolders ?? []).map((folder) => ({
        ...folder,
        visibility: normalizeLibraryVisibility(folder.visibility),
      })),
      skills: (parsed.skills ?? []).map((skill) => ({
        ...skill,
        name: skill.name ?? "",
        visibility: normalizeVisibility(skill.visibility),
      })),
      jobs: (parsed.jobs ?? []).map((job) => ({
        ...job,
        cadence: parseJobCadence(job.cadence),
        visibility: normalizeVisibility(job.visibility),
      })),
      documentSessions: parsed.documentSessions ?? [],
      embeddings: parsed.embeddings ?? [],
      sessionCitations: parsed.sessionCitations ?? [],
      usageEvents: parsed.usageEvents ?? [],
      emails: parsed.emails ?? [],
    };
  } catch {
    return structuredClone(empty);
  }
}

function save(data: AppData) {
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function now() {
  return new Date().toISOString();
}

function defaultSettings(userId: string): UserSettings {
  return { userId, modelTier: "auto", instructionOverlay: "" };
}

export function getUserSettings(userId: string): UserSettings {
  const data = load();
  return data.settings.find((row) => row.userId === userId) ?? defaultSettings(userId);
}

export function upsertUserSettings(
  userId: string,
  patch: Partial<Pick<UserSettings, "modelTier" | "instructionOverlay">>,
): UserSettings {
  const data = load();
  const current = data.settings.find((row) => row.userId === userId) ?? defaultSettings(userId);
  const next = { ...current, ...patch, userId };
  data.settings = [...data.settings.filter((row) => row.userId !== userId), next];
  save(data);
  return next;
}

function normalizeChat(chat: ChatRecord): ChatRecord {
  return {
    ...chat,
    description: chat.description ?? "",
    source: normalizeChatSource(chat.source),
  };
}

export function listChats(userId: string): ChatRecord[] {
  return load()
    .chats.filter((chat) => chat.userId === userId)
    .map(normalizeChat)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function listAccountChats(): ChatRecord[] {
  return load()
    .chats.map(normalizeChat)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function getChat(userId: string, chatId: string): ChatRecord | null {
  const chat = load().chats.find((row) => row.userId === userId && row.id === chatId);
  return chat ? normalizeChat(chat) : null;
}

export function createChat(
  userId: string,
  title: string,
  source: ChatSource = "web",
): ChatRecord {
  const data = load();
  const chat: ChatRecord = {
    id: randomUUID(),
    userId,
    title,
    description: "",
    source,
    sessionId: null,
    streamIndex: 0,
    createdAt: now(),
    updatedAt: now(),
  };
  data.chats.unshift(chat);
  save(data);
  return chat;
}

export function updateChat(
  userId: string,
  chatId: string,
  patch: ChatPatch,
): ChatRecord | null {
  const data = load();
  const index = data.chats.findIndex((chat) => chat.userId === userId && chat.id === chatId);
  if (index === -1) return null;
  const { touchUpdatedAt, ...fields } = patch;
  data.chats[index] = {
    ...data.chats[index],
    ...fields,
    updatedAt: touchUpdatedAt ? now() : data.chats[index].updatedAt,
  };
  save(data);
  return normalizeChat(data.chats[index]);
}

export function deleteChat(userId: string, chatId: string): boolean {
  const data = load();
  const before = data.chats.length;
  data.chats = data.chats.filter((chat) => !(chat.userId === userId && chat.id === chatId));
  data.chatEvents = data.chatEvents.filter((event) => event.chatId !== chatId);
  data.documentSessions = data.documentSessions.filter((link) => link.chatId !== chatId);
  data.embeddings = data.embeddings.filter(
    (row) => !(row.userId === userId && row.sourceType === "session" && row.sourceId === chatId),
  );
  data.sessionCitations = data.sessionCitations.filter(
    (row) => !(row.userId === userId && row.chatId === chatId),
  );
  save(data);
  return data.chats.length < before;
}

export function getChatByEveSessionId(
  userId: string,
  eveSessionId: string,
): ChatRecord | null {
  const chat = load().chats.find(
    (row) => row.userId === userId && row.sessionId === eveSessionId,
  );
  return chat ? normalizeChat(chat) : null;
}

export function listChatEvents(chatId: string): ChatEventRecord[] {
  return load()
    .chatEvents.filter((event) => event.chatId === chatId)
    .sort((a, b) => a.index - b.index);
}

export function upsertChatEvent(chatId: string, index: number, event: unknown) {
  const data = load();
  const existing = data.chatEvents.findIndex((row) => row.chatId === chatId && row.index === index);
  const record: ChatEventRecord = { id: `${chatId}:${index}`, chatId, index, event };
  if (existing === -1) data.chatEvents.push(record);
  else data.chatEvents[existing] = record;
  save(data);
}

export function replaceChatEvents(chatId: string, events: unknown[]) {
  const data = load();
  data.chatEvents = data.chatEvents.filter((event) => event.chatId !== chatId);
  events.forEach((event, index) => {
    data.chatEvents.push({ id: `${chatId}:${index}`, chatId, index, event });
  });
  save(data);
}

export function listUserSkills(userId: string): UserSkill[] {
  return load().skills.filter((skill) => skill.userId === userId);
}

export function createUserSkill(
  userId: string,
  input: Pick<UserSkill, "name" | "slug" | "description" | "markdown"> & {
    enabled?: boolean;
    visibility?: UserSkill["visibility"];
  },
): UserSkill {
  const data = load();
  const skill: UserSkill = {
    id: randomUUID(),
    userId,
    name: input.name,
    slug: input.slug,
    description: input.description,
    markdown: input.markdown,
    enabled: input.enabled ?? true,
    visibility: normalizeVisibility(input.visibility, "private"),
    createdAt: now(),
    updatedAt: now(),
  };
  data.skills.push(skill);
  save(data);
  return skill;
}

export function updateUserSkill(
  userId: string,
  skillId: string,
  patch: Partial<Pick<UserSkill, "name" | "slug" | "description" | "markdown" | "enabled" | "visibility">>,
): UserSkill | null {
  const data = load();
  const index = data.skills.findIndex((skill) => skill.userId === userId && skill.id === skillId);
  if (index === -1) return null;
  data.skills[index] = { ...data.skills[index], ...patch, updatedAt: now() };
  save(data);
  return data.skills[index];
}

export function deleteUserSkill(userId: string, skillId: string): boolean {
  const data = load();
  const before = data.skills.length;
  data.skills = data.skills.filter((skill) => !(skill.userId === userId && skill.id === skillId));
  save(data);
  return data.skills.length < before;
}

export function listJobs(userId: string): ScheduledJob[] {
  return load()
    .jobs.filter((job) => job.userId === userId)
    .sort((a, b) => a.nextRunAt.localeCompare(b.nextRunAt));
}

export function createJob(
  userId: string,
  input: Pick<ScheduledJob, "prompt" | "firstRunAt" | "everyMinutes" | "authenticator" | "issuer"> & {
    cadence?: ScheduledJob["cadence"];
    visibility?: ScheduledJob["visibility"];
  },
): ScheduledJob {
  const data = load();
  const job: ScheduledJob = {
    id: randomUUID(),
    userId,
    prompt: input.prompt,
    firstRunAt: input.firstRunAt,
    nextRunAt: input.firstRunAt,
    everyMinutes: input.everyMinutes,
    cadence: parseJobCadence(input.cadence),
    visibility: "private",
    enabled: true,
    leaseToken: null,
    leaseUntil: null,
    lastError: null,
    authenticator: input.authenticator,
    issuer: input.issuer,
    createdAt: now(),
    updatedAt: now(),
  };
  data.jobs.push(job);
  save(data);
  return job;
}

export function updateJob(
  userId: string,
  jobId: string,
  patch: Partial<
    Pick<
      ScheduledJob,
      "prompt" | "nextRunAt" | "everyMinutes" | "cadence" | "enabled" | "lastError" | "visibility"
    >
  >,
): ScheduledJob | null {
  const data = load();
  const index = data.jobs.findIndex((job) => job.userId === userId && job.id === jobId);
  if (index === -1) return null;
  const cadence =
    patch.cadence !== undefined
      ? parseJobCadence(patch.cadence)
      : patch.everyMinutes !== undefined
        ? null
        : data.jobs[index].cadence;
  const defined = Object.fromEntries(
    Object.entries(patch).filter(([, value]) => value !== undefined),
  );
  data.jobs[index] = { ...data.jobs[index], ...defined, cadence, updatedAt: now() };
  save(data);
  return data.jobs[index];
}

export function deleteJob(userId: string, jobId: string): boolean {
  const data = load();
  const before = data.jobs.length;
  data.jobs = data.jobs.filter((job) => !(job.userId === userId && job.id === jobId));
  save(data);
  return data.jobs.length < before;
}

export function claimDueJobs(options: {
  now: Date;
  limit: number;
  leaseForMs: number;
}): ScheduledJob[] {
  const data = load();
  const current = options.now.toISOString();
  const leaseUntil = new Date(options.now.getTime() + options.leaseForMs).toISOString();
  const claimed: ScheduledJob[] = [];

  for (const job of data.jobs) {
    if (claimed.length >= options.limit) break;
    if (!job.enabled) continue;
    if (job.nextRunAt > current) continue;
    if (job.leaseUntil && job.leaseUntil > current) continue;
    job.leaseToken = randomUUID();
    job.leaseUntil = leaseUntil;
    job.updatedAt = now();
    claimed.push(job);
  }

  save(data);
  return claimed;
}

export function completeJob(job: ScheduledJob) {
  const data = load();
  const index = data.jobs.findIndex((row) => row.id === job.id);
  if (index === -1) return;
  const current = data.jobs[index];
  const advanced = advanceJobAfterRun(current);
  current.enabled = advanced.enabled;
  if (advanced.nextRunAt) current.nextRunAt = advanced.nextRunAt;
  current.leaseToken = null;
  current.leaseUntil = null;
  current.lastError = null;
  current.updatedAt = now();
  save(data);
}

export function releaseJob(job: ScheduledJob, error: string, retryAt: Date) {
  const data = load();
  const index = data.jobs.findIndex((row) => row.id === job.id);
  if (index === -1) return;
  data.jobs[index] = {
    ...data.jobs[index],
    leaseToken: null,
    leaseUntil: null,
    lastError: error,
    nextRunAt: retryAt.toISOString(),
    updatedAt: now(),
  };
  save(data);
}

export function listDocuments(userId: string): DocumentRecord[] {
  return load()
    .documents.filter((document) => isVisibleToViewer(document, userId))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function listDocumentsInFolder(
  userId: string,
  folderId: string | null,
): DocumentRecord[] {
  return listDocuments(userId).filter((document) => (document.folderId ?? null) === folderId);
}

export function listFolders(userId: string): DocumentFolder[] {
  return load()
    .documentFolders.filter((folder) => isVisibleToViewer(folder, userId))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function getFolder(userId: string, folderId: string): DocumentFolder | null {
  const folder = load().documentFolders.find((row) => row.id === folderId);
  return folder && isVisibleToViewer(folder, userId) ? folder : null;
}

export function createFolder(record: DocumentFolder): DocumentFolder {
  const data = load();
  data.documentFolders.unshift(record);
  save(data);
  return record;
}

export function updateFolder(
  userId: string,
  folderId: string,
  patch: Partial<Pick<DocumentFolder, "name" | "description" | "parentId" | "visibility">>,
): DocumentFolder | null {
  const data = load();
  const index = data.documentFolders.findIndex(
    (folder) => folder.userId === userId && folder.id === folderId,
  );
  if (index === -1) return null;
  data.documentFolders[index] = { ...data.documentFolders[index], ...patch, updatedAt: now() };
  save(data);
  return data.documentFolders[index];
}

export function deleteFolder(userId: string, folderId: string): DocumentFolder | null {
  const data = load();
  const folder = data.documentFolders.find((row) => row.userId === userId && row.id === folderId);
  if (!folder) return null;
  const parentId = folder.parentId;
  data.documentFolders = data.documentFolders
    .filter((row) => row.id !== folderId)
    .map((row) => (row.parentId === folderId ? { ...row, parentId, updatedAt: now() } : row));
  data.documents = data.documents.map((document) =>
    document.folderId === folderId ? { ...document, folderId: parentId, updatedAt: now() } : document,
  );
  save(data);
  return folder;
}

export function getDocument(userId: string, documentId: string): DocumentRecord | null {
  const document = load().documents.find((row) => row.id === documentId);
  return document && isVisibleToViewer(document, userId) ? document : null;
}

export function getPublicDocument(shareId: string): DocumentRecord | null {
  const document = load().documents.find((row) => row.shareId === shareId);
  return document?.isPublic ? document : null;
}

export function createDocument(record: DocumentRecord): DocumentRecord {
  const data = load();
  data.documents.unshift(record);
  save(data);
  return record;
}

export function updateDocument(
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
): DocumentRecord | null {
  const data = load();
  const index = data.documents.findIndex((document) => document.id === documentId);
  if (index === -1 || !isVisibleToViewer(data.documents[index], userId)) return null;
  data.documents[index] = { ...data.documents[index], ...patch, updatedAt: now() };
  save(data);
  return data.documents[index];
}

export function deleteDocument(userId: string, documentId: string): DocumentRecord | null {
  const data = load();
  const document = data.documents.find((row) => row.userId === userId && row.id === documentId);
  if (!document) return null;
  data.documents = data.documents.filter((row) => row.id !== documentId);
  data.documentSessions = data.documentSessions.filter((link) => link.documentId !== documentId);
  save(data);
  return document;
}

export function listChatDocuments(userId: string, chatId: string): DocumentRecord[] {
  const data = load();
  const ids = new Set(
    data.documentSessions.filter((link) => link.chatId === chatId).map((link) => link.documentId),
  );
  return data.documents
    .filter((document) => ids.has(document.id) && isVisibleToViewer(document, userId))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function listDocumentChats(userId: string, documentId: string): ChatRecord[] {
  const data = load();
  const document = data.documents.find((row) => row.id === documentId);
  if (!document || !isVisibleToViewer(document, userId)) return [];
  const chatIds = new Set(
    data.documentSessions
      .filter((link) => link.documentId === documentId)
      .map((link) => link.chatId),
  );
  return data.chats
    .filter((chat) => chat.userId === userId && chatIds.has(chat.id))
    .map(normalizeChat)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function attachDocument(
  userId: string,
  documentId: string,
  chatId: string,
): boolean {
  const data = load();
  const document = data.documents.find((row) => row.id === documentId);
  const chat = data.chats.find((row) => row.userId === userId && row.id === chatId);
  if (!document || !chat || !isVisibleToViewer(document, userId)) return false;
  if (data.documentSessions.some((link) => link.documentId === documentId && link.chatId === chatId)) {
    return true;
  }
  data.documentSessions.push({ documentId, chatId, createdAt: now() });
  save(data);
  return true;
}

export function detachDocument(
  userId: string,
  documentId: string,
  chatId: string,
): boolean {
  const data = load();
  const document = data.documents.find((row) => row.id === documentId);
  if (!document || !isVisibleToViewer(document, userId)) return false;
  const before = data.documentSessions.length;
  data.documentSessions = data.documentSessions.filter(
    (link) => !(link.documentId === documentId && link.chatId === chatId),
  );
  save(data);
  return data.documentSessions.length < before;
}

export function titleFromPrompt(prompt: string): string {
  const trimmed = prompt.trim().replace(/\s+/g, " ");
  const skillTitle = titleForSkillOnlyPrompt(trimmed);
  if (skillTitle) return skillTitle;
  return trimmed.length > 56 ? `${trimmed.slice(0, 53)}…` : trimmed || "New session";
}

function sameEmbeddingKey(
  row: EmbeddingRecord,
  input: Pick<EmbeddingRecord, "userId" | "kind" | "sourceId" | "turnId">,
) {
  return (
    row.userId === input.userId &&
    row.kind === input.kind &&
    row.sourceId === input.sourceId &&
    (row.turnId ?? null) === (input.turnId ?? null)
  );
}

export function upsertEmbedding(
  input: Omit<EmbeddingRecord, "id" | "createdAt" | "updatedAt"> & {
    id?: string;
  },
): EmbeddingRecord {
  const data = load();
  const index = data.embeddings.findIndex((row) => sameEmbeddingKey(row, input));
  const timestamp = now();
  if (index === -1) {
    const record: EmbeddingRecord = {
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
    };
    data.embeddings.push(record);
    save(data);
    return record;
  }
  data.embeddings[index] = {
    ...data.embeddings[index],
    text: input.text,
    embedding: input.embedding,
    sourceType: input.sourceType,
    updatedAt: timestamp,
  };
  save(data);
  return data.embeddings[index];
}

export function listUserEmbeddings(
  userId: string,
  kinds?: readonly EmbeddingKind[],
): EmbeddingRecord[] {
  return load().embeddings.filter(
    (row) => row.userId === userId && (!kinds || kinds.includes(row.kind)),
  );
}

export function searchUserEmbeddings(input: EmbeddingSearchInput): EmbeddingSearchHit[] {
  const queries = input.queryEmbeddings.filter((query) => query.length > 0);
  if (queries.length === 0 || input.limit <= 0) return [];

  const records = load().embeddings.filter((row) => {
    if (input.kinds && !input.kinds.includes(row.kind)) return false;
    if (input.scope === "account") return true;
    if (row.userId === input.userId) return true;
    return Boolean(input.includeSourceIds?.includes(row.sourceId));
  });
  return records
    .filter((record) => !input.excludeSourceIds?.includes(record.sourceId))
    .map((record) => ({
      record,
      score: Math.max(...queries.map((query) => cosineSimilarity(query, record.embedding))),
    }))
    .filter((hit) => input.minScore == null || hit.score >= input.minScore)
    .sort((left, right) => right.score - left.score)
    .slice(0, input.limit);
}

export function deleteEmbeddingsForSource(
  userId: string,
  sourceType: EmbeddingSourceType,
  sourceId: string,
): void {
  const data = load();
  data.embeddings = data.embeddings.filter(
    (row) =>
      !(row.userId === userId && row.sourceType === sourceType && row.sourceId === sourceId),
  );
  save(data);
}

export function upsertSessionCitationSet(input: {
  userId: string;
  chatId: string;
  queryText: string;
  citations: SessionCitationSet["citations"];
}): SessionCitationSet {
  const data = load();
  const index = data.sessionCitations.findIndex(
    (row) =>
      row.userId === input.userId &&
      row.chatId === input.chatId &&
      row.queryText === input.queryText,
  );
  const timestamp = now();
  if (index === -1) {
    const record: SessionCitationSet = {
      id: randomUUID(),
      userId: input.userId,
      chatId: input.chatId,
      queryText: input.queryText,
      citations: input.citations,
      createdAt: timestamp,
    };
    data.sessionCitations.push(record);
    save(data);
    return record;
  }
  data.sessionCitations[index] = {
    ...data.sessionCitations[index],
    citations: input.citations,
  };
  save(data);
  return data.sessionCitations[index];
}

export function listSessionCitationSets(
  userId: string,
  chatId: string,
): SessionCitationSet[] {
  return load().sessionCitations.filter(
    (row) => row.userId === userId && row.chatId === chatId,
  );
}

export function upsertUsageRecord(record: UsageRecord): UsageRecord {
  const data = load();
  const index = data.usageEvents.findIndex((row) => row.id === record.id);
  if (index === -1) {
    data.usageEvents.push(record);
  } else {
    data.usageEvents[index] = {
      ...record,
      createdAt: data.usageEvents[index].createdAt,
    };
  }
  save(data);
  return index === -1 ? record : data.usageEvents[index];
}

export function listUserUsage(userId: string): UsageRecord[] {
  return load()
    .usageEvents.filter((row) => row.userId === userId)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

export function listAccountUsage(): UsageRecord[] {
  return load()
    .usageEvents.slice()
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

export function listChatUsage(userId: string, chatId: string): UsageRecord[] {
  return load()
    .usageEvents.filter((row) => row.userId === userId && row.chatId === chatId)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

function normalizeEmail(email: EmailRecord): EmailRecord {
  return {
    ...email,
    toAddresses: email.toAddresses ?? [],
    ccAddresses: email.ccAddresses ?? [],
    attachments: email.attachments ?? [],
    bodyText: email.bodyText ?? "",
    bodyHtml: email.bodyHtml ?? "",
  };
}

export function listEmails(
  userId: string,
  options?: { direction?: EmailDirection; limit?: number },
): EmailRecord[] {
  const limit = options?.limit ?? 200;
  return load()
    .emails.filter((row) => !options?.direction || row.direction === options.direction)
    .map(normalizeEmail)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .slice(0, limit);
}

export function getEmail(_userId: string, emailId: string): EmailRecord | null {
  const email = load().emails.find((row) => row.id === emailId);
  return email ? normalizeEmail(email) : null;
}

export function getEmailByResendId(resendEmailId: string): EmailRecord | null {
  const email = load().emails.find((row) => row.resendEmailId === resendEmailId);
  return email ? normalizeEmail(email) : null;
}

export function createEmail(
  input: Omit<EmailRecord, "id" | "createdAt" | "updatedAt"> & { id?: string },
): EmailRecord {
  const data = load();
  const stamp = now();
  const email: EmailRecord = {
    ...input,
    id: input.id ?? randomUUID(),
    toAddresses: input.toAddresses ?? [],
    ccAddresses: input.ccAddresses ?? [],
    attachments: input.attachments ?? [],
    createdAt: stamp,
    updatedAt: stamp,
  };
  data.emails.unshift(email);
  save(data);
  return email;
}

export function updateEmail(
  userId: string,
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
): EmailRecord | null {
  const data = load();
  const index = data.emails.findIndex((row) => row.id === emailId);
  if (index === -1) return null;
  data.emails[index] = { ...data.emails[index], ...patch, updatedAt: now() };
  save(data);
  return normalizeEmail(data.emails[index]);
}

export type { ModelTier };
