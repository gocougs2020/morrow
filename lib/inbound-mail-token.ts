import { randomBytes } from "node:crypto";
import { fromMatchesAccount, normalizeEmailAddress } from "@/lib/email-users";
import { inboundAllowlist } from "@/lib/resend";

/** No 0/o/1/i/l — easier to read aloud and save in a contact. */
export const INBOUND_MAIL_TOKEN_ALPHABET = "23456789abcdefghjkmnpqrstuvwxyz";
export const INBOUND_MAIL_TOKEN_LENGTH = 10;

const TOKEN_PATTERN = new RegExp(
  `^[${INBOUND_MAIL_TOKEN_ALPHABET}]{${INBOUND_MAIL_TOKEN_LENGTH}}$`,
);

export function generateInboundMailToken(): string {
  const alphabet = INBOUND_MAIL_TOKEN_ALPHABET;
  let token = "";
  while (token.length < INBOUND_MAIL_TOKEN_LENGTH) {
    const byte = randomBytes(1)[0] ?? 0;
    if (byte >= 248) continue;
    token += alphabet[byte % alphabet.length];
  }
  return token;
}

export function normalizeInboundMailToken(value: string): string {
  return value.trim().toLowerCase().replace(/[^2-9a-z]/g, "");
}

export function isInboundMailToken(value: string): boolean {
  return TOKEN_PATTERN.test(normalizeInboundMailToken(value));
}

export function formatInboundMailToken(token: string): string {
  const normalized = normalizeInboundMailToken(token);
  if (!isInboundMailToken(normalized)) return normalized;
  return `${normalized.slice(0, 5)}-${normalized.slice(5)}`;
}

export function inboundMailboxAddress(): string | null {
  const { addresses, domains } = inboundAllowlist();
  const firstAddress = [...addresses][0];
  if (firstAddress) return firstAddress;
  const domain = [...domains][0];
  return domain ? `agent@${domain}` : null;
}

export function composeInboundMailAddress(token: string, mailbox = inboundMailboxAddress()): string | null {
  if (!mailbox || !isInboundMailToken(token)) return null;
  const email = normalizeEmailAddress(mailbox);
  const at = email.lastIndexOf("@");
  if (at <= 0) return null;
  const local = (email.slice(0, at).split("+")[0] ?? "").trim();
  const domain = email.slice(at + 1).trim();
  if (!local || !domain) return null;
  return `${local}+${formatInboundMailToken(token)}@${domain}`;
}

function inboundTokenFromAddress(address: string): string | null {
  const email = normalizeEmailAddress(address);
  const at = email.lastIndexOf("@");
  if (at <= 0) return null;
  const local = email.slice(0, at);
  if (!local.includes("+")) return null;
  const token = normalizeInboundMailToken(local.split("+").at(-1) ?? "");
  return isInboundMailToken(token) ? token : null;
}

export function extractInboundMailToken(addresses: readonly string[]): string | null {
  for (const address of addresses) {
    const token = inboundTokenFromAddress(address);
    if (token) return token;
  }
  return null;
}

/** Plus-tagged user address on this app's mailbox — not the shared workspace From. */
export function isUserAgentInboundRecipient(addresses: readonly string[]): boolean {
  const { addresses: allowedAddresses, domains: allowedDomains } = inboundAllowlist();
  if (allowedAddresses.size === 0 && allowedDomains.size === 0) return false;

  return addresses.some((raw) => {
    if (!inboundTokenFromAddress(raw)) return false;
    const email = normalizeEmailAddress(raw);
    const at = email.lastIndexOf("@");
    const local = email.slice(0, at);
    const domain = email.slice(at + 1);
    if (allowedDomains.has(domain)) return true;
    const baseLocal = local.split("+")[0] ?? "";
    return Boolean(baseLocal) && allowedAddresses.has(`${baseLocal}@${domain}`);
  });
}

/**
 * Session grant: current secret plus-address AND From equals the account email.
 * From is still spoofable; the plus-tag is the secret. Together they block
 * "email someone else's agent from my inbox."
 */
export function inboundMailAuthorizesUnattendedSession(input: {
  recipients: readonly string[];
  fromAddress: string | null | undefined;
  ownerToken: string | null | undefined;
  ownerEmail: string | null | undefined;
}): boolean {
  if (!input.ownerToken || !isInboundMailToken(input.ownerToken)) return false;
  if (extractInboundMailToken(input.recipients) !== normalizeInboundMailToken(input.ownerToken)) {
    return false;
  }
  return fromMatchesAccount(input.fromAddress, input.ownerEmail);
}
