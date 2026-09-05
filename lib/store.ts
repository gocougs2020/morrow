import { ensureNeonAuthSchema, hasNeon } from "@/lib/db";
import * as jsonStore from "@/lib/store-json";
import * as pgStore from "@/lib/store-pg";

export { titleFromPrompt } from "@/lib/store-json";
export type { ModelTier } from "@/lib/types";

async function store() {
  if (hasNeon()) {
    await ensureNeonAuthSchema();
    return pgStore;
  }
  return jsonStore;
}

export async function getUserSettings(...args: Parameters<typeof jsonStore.getUserSettings>) {
  return (await store()).getUserSettings(...args);
}

export async function upsertUserSettings(...args: Parameters<typeof jsonStore.upsertUserSettings>) {
  return (await store()).upsertUserSettings(...args);
}

export async function listChats(...args: Parameters<typeof jsonStore.listChats>) {
  return (await store()).listChats(...args);
}

export async function listAccountChats() {
  return (await store()).listAccountChats();
}

export async function getChat(...args: Parameters<typeof jsonStore.getChat>) {
  return (await store()).getChat(...args);
}

export async function createChat(...args: Parameters<typeof jsonStore.createChat>) {
  return (await store()).createChat(...args);
}

export async function updateChat(...args: Parameters<typeof jsonStore.updateChat>) {
  return (await store()).updateChat(...args);
}

export async function deleteChat(...args: Parameters<typeof jsonStore.deleteChat>) {
  return (await store()).deleteChat(...args);
}

export async function listChatEvents(...args: Parameters<typeof jsonStore.listChatEvents>) {
  return (await store()).listChatEvents(...args);
}

export async function upsertChatEvent(...args: Parameters<typeof jsonStore.upsertChatEvent>) {
  return (await store()).upsertChatEvent(...args);
}

export async function replaceChatEvents(...args: Parameters<typeof jsonStore.replaceChatEvents>) {
  return (await store()).replaceChatEvents(...args);
}

export async function listUserSkills(...args: Parameters<typeof jsonStore.listUserSkills>) {
  return (await store()).listUserSkills(...args);
}

export async function createUserSkill(...args: Parameters<typeof jsonStore.createUserSkill>) {
  return (await store()).createUserSkill(...args);
}

export async function updateUserSkill(...args: Parameters<typeof jsonStore.updateUserSkill>) {
  return (await store()).updateUserSkill(...args);
}

export async function deleteUserSkill(...args: Parameters<typeof jsonStore.deleteUserSkill>) {
  return (await store()).deleteUserSkill(...args);
}

export async function listJobs(...args: Parameters<typeof jsonStore.listJobs>) {
  return (await store()).listJobs(...args);
}

export async function createJob(...args: Parameters<typeof jsonStore.createJob>) {
  return (await store()).createJob(...args);
}

export async function updateJob(...args: Parameters<typeof jsonStore.updateJob>) {
  return (await store()).updateJob(...args);
}

export async function deleteJob(...args: Parameters<typeof jsonStore.deleteJob>) {
  return (await store()).deleteJob(...args);
}

export async function claimDueJobs(...args: Parameters<typeof jsonStore.claimDueJobs>) {
  return (await store()).claimDueJobs(...args);
}

export async function completeJob(...args: Parameters<typeof jsonStore.completeJob>) {
  return (await store()).completeJob(...args);
}

export async function releaseJob(...args: Parameters<typeof jsonStore.releaseJob>) {
  return (await store()).releaseJob(...args);
}

export async function getChatByEveSessionId(
  ...args: Parameters<typeof jsonStore.getChatByEveSessionId>
) {
  return (await store()).getChatByEveSessionId(...args);
}

export async function listDocuments(...args: Parameters<typeof jsonStore.listDocuments>) {
  return (await store()).listDocuments(...args);
}

export async function listDocumentsInFolder(
  ...args: Parameters<typeof jsonStore.listDocumentsInFolder>
) {
  return (await store()).listDocumentsInFolder(...args);
}

export async function listFolders(...args: Parameters<typeof jsonStore.listFolders>) {
  return (await store()).listFolders(...args);
}

export async function getFolder(...args: Parameters<typeof jsonStore.getFolder>) {
  return (await store()).getFolder(...args);
}

export async function createFolder(...args: Parameters<typeof jsonStore.createFolder>) {
  return (await store()).createFolder(...args);
}

export async function updateFolder(...args: Parameters<typeof jsonStore.updateFolder>) {
  return (await store()).updateFolder(...args);
}

export async function deleteFolder(...args: Parameters<typeof jsonStore.deleteFolder>) {
  return (await store()).deleteFolder(...args);
}

export async function getDocument(...args: Parameters<typeof jsonStore.getDocument>) {
  return (await store()).getDocument(...args);
}

export async function getPublicDocument(...args: Parameters<typeof jsonStore.getPublicDocument>) {
  return (await store()).getPublicDocument(...args);
}

export async function createDocument(...args: Parameters<typeof jsonStore.createDocument>) {
  return (await store()).createDocument(...args);
}

export async function updateDocument(...args: Parameters<typeof jsonStore.updateDocument>) {
  return (await store()).updateDocument(...args);
}

export async function deleteDocument(...args: Parameters<typeof jsonStore.deleteDocument>) {
  return (await store()).deleteDocument(...args);
}

export async function listChatDocuments(...args: Parameters<typeof jsonStore.listChatDocuments>) {
  return (await store()).listChatDocuments(...args);
}

export async function listDocumentChats(...args: Parameters<typeof jsonStore.listDocumentChats>) {
  return (await store()).listDocumentChats(...args);
}

export async function attachDocument(...args: Parameters<typeof jsonStore.attachDocument>) {
  return (await store()).attachDocument(...args);
}

export async function detachDocument(...args: Parameters<typeof jsonStore.detachDocument>) {
  return (await store()).detachDocument(...args);
}

export async function upsertEmbedding(...args: Parameters<typeof jsonStore.upsertEmbedding>) {
  return (await store()).upsertEmbedding(...args);
}

export async function listUserEmbeddings(...args: Parameters<typeof jsonStore.listUserEmbeddings>) {
  return (await store()).listUserEmbeddings(...args);
}

export async function searchUserEmbeddings(
  ...args: Parameters<typeof jsonStore.searchUserEmbeddings>
) {
  return (await store()).searchUserEmbeddings(...args);
}

export async function deleteEmbeddingsForSource(
  ...args: Parameters<typeof jsonStore.deleteEmbeddingsForSource>
) {
  return (await store()).deleteEmbeddingsForSource(...args);
}

export async function upsertSessionCitationSet(
  ...args: Parameters<typeof jsonStore.upsertSessionCitationSet>
) {
  return (await store()).upsertSessionCitationSet(...args);
}

export async function listSessionCitationSets(
  ...args: Parameters<typeof jsonStore.listSessionCitationSets>
) {
  return (await store()).listSessionCitationSets(...args);
}

export async function upsertUsageRecord(...args: Parameters<typeof jsonStore.upsertUsageRecord>) {
  return (await store()).upsertUsageRecord(...args);
}

export async function listUserUsage(...args: Parameters<typeof jsonStore.listUserUsage>) {
  return (await store()).listUserUsage(...args);
}

export async function listAccountUsage() {
  return (await store()).listAccountUsage();
}

export async function listChatUsage(...args: Parameters<typeof jsonStore.listChatUsage>) {
  return (await store()).listChatUsage(...args);
}

export async function listEmails(...args: Parameters<typeof jsonStore.listEmails>) {
  return (await store()).listEmails(...args);
}

export async function getEmail(...args: Parameters<typeof jsonStore.getEmail>) {
  return (await store()).getEmail(...args);
}

export async function getEmailByResendId(...args: Parameters<typeof jsonStore.getEmailByResendId>) {
  return (await store()).getEmailByResendId(...args);
}

export async function createEmail(...args: Parameters<typeof jsonStore.createEmail>) {
  return (await store()).createEmail(...args);
}

export async function updateEmail(...args: Parameters<typeof jsonStore.updateEmail>) {
  return (await store()).updateEmail(...args);
}
