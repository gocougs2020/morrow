import { normalizeEmailAddress } from "@/lib/email-users";

function splitEnvList(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(/[\s,]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeDomain(value: string): string {
  return value.trim().toLowerCase().replace(/^@+/, "");
}

function uniqueNormalized(
  values: readonly string[],
  normalize: (value: string) => string,
): string[] {
  return [...new Set(values.map(normalize).filter(Boolean))];
}

export function allowedAccessEmails(): string[] {
  return uniqueNormalized(splitEnvList(process.env.ALLOWED_SIGNUP_EMAILS), normalizeEmailAddress);
}

export function allowedAccessDomains(): string[] {
  return uniqueNormalized(splitEnvList(process.env.ALLOWED_SIGNUP_DOMAINS), normalizeDomain);
}

export function blockedAccessEmails(): string[] {
  return uniqueNormalized(splitEnvList(process.env.BLOCKED_ACCESS_EMAILS), normalizeEmailAddress);
}

export function allowedAccountUsageEmails(): string[] {
  return uniqueNormalized(
    splitEnvList(process.env.ALLOWED_ACCOUNT_USAGE_EMAILS),
    normalizeEmailAddress,
  );
}

export function canViewAccountUsage(email: string): boolean {
  const normalized = normalizeEmailAddress(email);
  return Boolean(normalized) && allowedAccountUsageEmails().includes(normalized);
}

export function isAccessAllowlistActive(): boolean {
  return allowedAccessEmails().length > 0 || allowedAccessDomains().length > 0;
}

export function isAccessEmailAllowed(email: string): boolean {
  const normalized = normalizeEmailAddress(email);
  if (normalized && blockedAccessEmails().includes(normalized)) return false;
  if (!isAccessAllowlistActive()) return true;
  if (!normalized || !normalized.includes("@")) return false;
  if (allowedAccessEmails().includes(normalized)) return true;
  const domain = normalized.slice(normalized.lastIndexOf("@") + 1);
  return Boolean(domain) && allowedAccessDomains().includes(domain);
}

export const SIGNUP_NOT_ALLOWED_MESSAGE = "This email isn't eligible to create an account.";

export const ACCESS_DENIED_MESSAGE = "This account is no longer allowed to access the app.";
