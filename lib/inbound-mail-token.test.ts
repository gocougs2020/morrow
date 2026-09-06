import { afterEach, describe, expect, it } from "vitest";
import {
  composeInboundMailAddress,
  extractInboundMailToken,
  formatInboundMailToken,
  generateInboundMailToken,
  inboundMailAuthorizesUnattendedSession,
  inboundMailboxAddress,
  isInboundMailToken,
  isUserAgentInboundRecipient,
  normalizeInboundMailToken,
} from "@/lib/inbound-mail-token";

const ENV_KEYS = ["RESEND_FROM_EMAIL", "RESEND_INBOUND_ADDRESSES", "RESEND_INBOUND_DOMAINS"] as const;
const original: Partial<Record<(typeof ENV_KEYS)[number], string | undefined>> = {};

function env() {
  return process.env as Record<string, string | undefined>;
}

for (const key of ENV_KEYS) {
  original[key] = process.env[key];
}

afterEach(() => {
  const store = env();
  for (const key of ENV_KEYS) {
    if (original[key] === undefined) delete store[key];
    else store[key] = original[key];
  }
});

describe("inbound mail token", () => {
  it("issues a 10-character contact-friendly token", () => {
    const token = generateInboundMailToken();
    expect(isInboundMailToken(token)).toBe(true);
    expect(token).toHaveLength(10);
    expect(formatInboundMailToken(token)).toMatch(/^[2-9a-hj-np-z]{5}-[2-9a-hj-np-z]{5}$/);
  });

  it("normalizes grouped plus-tags", () => {
    expect(normalizeInboundMailToken("K7xqm-2N4pw")).toBe("k7xqm2n4pw");
    expect(isInboundMailToken("k7xqm-2n4pw")).toBe(true);
    expect(isInboundMailToken("u-11111111-1111-4111-8111-111111111111")).toBe(false);
  });

  it("builds a plus-address from the inbound mailbox", () => {
    env().RESEND_FROM_EMAIL = "Morrow <agent@example.com>";
    delete env().RESEND_INBOUND_ADDRESSES;
    delete env().RESEND_INBOUND_DOMAINS;
    expect(inboundMailboxAddress()).toBe("agent@example.com");
    expect(composeInboundMailAddress("k7xqm2n4pw")).toBe("agent+k7xqm-2n4pw@example.com");
  });

  it("extracts the token from plus-tags only", () => {
    expect(extractInboundMailToken(["Agent <agent+k7xqm-2n4pw@example.com>"])).toBe("k7xqm2n4pw");
    expect(extractInboundMailToken(["agent@example.com"])).toBe(null);
    expect(extractInboundMailToken(["k7xqm-2n4pw@example.com"])).toBe(null);
  });

  it("accepts only a user plus-address on this app's mailbox", () => {
    env().RESEND_FROM_EMAIL = "Morrow <agent@example.com>";
    delete env().RESEND_INBOUND_ADDRESSES;
    delete env().RESEND_INBOUND_DOMAINS;
    expect(isUserAgentInboundRecipient(["agent+k7xqm-2n4pw@example.com"])).toBe(true);
    expect(isUserAgentInboundRecipient(["agent@example.com"])).toBe(false);
    expect(isUserAgentInboundRecipient(["other+k7xqm-2n4pw@elsewhere.com"])).toBe(false);
  });

  it("requires the secret address and the owner's From", () => {
    const grant = {
      recipients: ["agent+k7xqm-2n4pw@example.com"],
      ownerToken: "k7xqm2n4pw",
      ownerEmail: "ada@example.com",
    };
    expect(
      inboundMailAuthorizesUnattendedSession({ ...grant, fromAddress: "ada@example.com" }),
    ).toBe(true);
    expect(
      inboundMailAuthorizesUnattendedSession({ ...grant, fromAddress: "mallory@example.com" }),
    ).toBe(false);
    expect(
      inboundMailAuthorizesUnattendedSession({
        ...grant,
        recipients: ["agent@example.com"],
        fromAddress: "ada@example.com",
      }),
    ).toBe(false);
    expect(
      inboundMailAuthorizesUnattendedSession({
        ...grant,
        ownerToken: "zzzzzzzzzz",
        fromAddress: "ada@example.com",
      }),
    ).toBe(false);
  });
});
