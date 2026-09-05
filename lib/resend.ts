import { Resend } from "resend";
import { APP_NAME } from "@/lib/brand";
import { normalizeEmailAddress } from "@/lib/email-users";

let client: Resend | null = null;

export function resendConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

export function getResend(): Resend {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not set.");
  }
  client ??= new Resend(apiKey);
  return client;
}

export function resendFromAddress(): string {
  const configured = process.env.RESEND_FROM_EMAIL?.trim();
  if (!configured) return `${APP_NAME} <onboarding@resend.dev>`;
  if (configured.includes("<")) return configured;
  return `${APP_NAME} <${configured}>`;
}

function parseCsv(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export function inboundAllowlist(): { addresses: Set<string>; domains: Set<string> } {
  const addresses = new Set<string>();
  const domains = new Set<string>();

  const from = normalizeEmailAddress(process.env.RESEND_FROM_EMAIL ?? "");
  if (from && !from.endsWith("@resend.dev")) {
    addresses.add(from);
  }

  for (const address of parseCsv(process.env.RESEND_INBOUND_ADDRESSES)) {
    addresses.add(normalizeEmailAddress(address));
  }

  for (const domain of parseCsv(process.env.RESEND_INBOUND_DOMAINS)) {
    domains.add(domain.replace(/^@/, "").toLowerCase());
  }

  return { addresses, domains };
}

/** True when a recipient is this app's mailbox, not another address on the same Resend account. */
export function isAppInboundRecipient(addresses: readonly string[]): boolean {
  const { addresses: allowedAddresses, domains: allowedDomains } = inboundAllowlist();
  if (allowedAddresses.size === 0 && allowedDomains.size === 0) {
    return false;
  }

  return addresses.some((raw) => {
    const email = normalizeEmailAddress(raw);
    if (!email.includes("@")) return false;
    if (allowedAddresses.has(email)) return true;

    const at = email.lastIndexOf("@");
    const local = email.slice(0, at);
    const domain = email.slice(at + 1);
    if (allowedDomains.has(domain)) return true;

    const baseLocal = local.split("+")[0] ?? "";
    return Boolean(baseLocal) && allowedAddresses.has(`${baseLocal}@${domain}`);
  });
}
