import { eq, sql } from "drizzle-orm";
import { getNeonDb, getSqliteDb, hasNeon } from "@/lib/db";
import { pgUser, sqliteUser } from "@/lib/db/schema";

export type AppUser = {
  id: string;
  email: string;
  name: string;
};

export function normalizeEmailAddress(value: string): string {
  const match = value.match(/<([^>]+)>/);
  return (match?.[1] ?? value).trim().toLowerCase();
}

/** Split a `to`/`cc` field (`string` or `string[]`, including comma-separated values) into addresses. */
export function parseAddressList(
  value: string | readonly string[] | undefined | null,
): string[] {
  if (!value) return [];
  return (Array.isArray(value) ? [...value] : [value])
    .flatMap((entry) => String(entry).split(","))
    .map((entry) => normalizeEmailAddress(entry))
    .filter((entry) => entry.includes("@"));
}

export async function findUserByEmail(email: string): Promise<AppUser | null> {
  const normalized = normalizeEmailAddress(email);
  if (!normalized) return null;
  if (hasNeon()) {
    const [row] = await getNeonDb()
      .select({ id: pgUser.id, email: pgUser.email, name: pgUser.name })
      .from(pgUser)
      .where(sql`lower(${pgUser.email}) = ${normalized}`)
      .limit(1);
    return row ?? null;
  }
  const rows = await getSqliteDb()
    .select({ id: sqliteUser.id, email: sqliteUser.email, name: sqliteUser.name })
    .from(sqliteUser)
    .where(sql`lower(${sqliteUser.email}) = ${normalized}`)
    .limit(1);
  return rows[0] ?? null;
}

export async function listAppUsers(): Promise<AppUser[]> {
  if (hasNeon()) {
    return getNeonDb()
      .select({ id: pgUser.id, email: pgUser.email, name: pgUser.name })
      .from(pgUser);
  }
  return getSqliteDb()
    .select({ id: sqliteUser.id, email: sqliteUser.email, name: sqliteUser.name })
    .from(sqliteUser);
}

export async function findUserById(userId: string): Promise<AppUser | null> {
  if (!userId) return null;
  if (hasNeon()) {
    const [row] = await getNeonDb()
      .select({ id: pgUser.id, email: pgUser.email, name: pgUser.name })
      .from(pgUser)
      .where(eq(pgUser.id, userId))
      .limit(1);
    return row ?? null;
  }
  const rows = await getSqliteDb()
    .select({ id: sqliteUser.id, email: sqliteUser.email, name: sqliteUser.name })
    .from(sqliteUser)
    .where(eq(sqliteUser.id, userId))
    .limit(1);
  return rows[0] ?? null;
}

export function extractUserIdFromRecipients(addresses: readonly string[]): string | null {
  for (const address of addresses) {
    const normalized = normalizeEmailAddress(address);
    const local = normalized.split("@")[0] ?? "";
    const tagged = local.split("+").at(-1) ?? "";
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(local)) {
      return local;
    }
    if (tagged.startsWith("u-") && tagged.length > 2) {
      return tagged.slice(2);
    }
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(tagged)) {
      return tagged;
    }
  }
  return null;
}

export async function resolveInboxOwner(input: {
  fromAddress: string;
  toAddresses: readonly string[];
}): Promise<AppUser | null> {
  const fromUser = await findUserByEmail(input.fromAddress);
  if (fromUser) return fromUser;

  const recipientId = extractUserIdFromRecipients(input.toAddresses);
  if (recipientId) {
    const byId = await findUserById(recipientId);
    if (byId) return byId;
  }

  for (const address of input.toAddresses) {
    const user = await findUserByEmail(address);
    if (user) return user;
  }

  return null;
}
