import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  EMAIL_NOT_VERIFIED_MESSAGE,
  VERIFY_EMAIL_EXPIRED_MESSAGE,
  VERIFY_EMAIL_INVALID_MESSAGE,
  VERIFY_EMAIL_NOT_CONFIGURED_MESSAGE,
  friendlyAuthError,
  isUnverifiedEmailMessage,
  needsVerificationFollowUp,
  sendVerificationEmail,
  verificationEmailContent,
} from "@/lib/auth-email";

const sendMock = vi.fn();

vi.mock("@/lib/resend", () => ({
  resendConfigured: vi.fn(),
  resendFromAddress: vi.fn(() => "Morrow <onboarding@resend.dev>"),
  getResend: vi.fn(() => ({ emails: { send: sendMock } })),
}));

import { resendConfigured } from "@/lib/resend";

describe("verificationEmailContent", () => {
  it("names the app and includes the verify URL", () => {
    const content = verificationEmailContent({
      appName: "Morrow",
      verifyUrl: "https://example.com/api/auth/verify-email?token=abc",
    });
    expect(content.subject).toBe("Verify your email for Morrow");
    expect(content.text).toContain("https://example.com/api/auth/verify-email?token=abc");
    expect(content.html).toContain('href="https://example.com/api/auth/verify-email?token=abc"');
    expect(content.html).toContain("Morrow");
  });

  it("escapes HTML in the app name and URL", () => {
    const content = verificationEmailContent({
      appName: `A <script>alert(1)</script>`,
      verifyUrl: `https://example.com/?q="><img src=x>`,
    });
    expect(content.html).not.toContain("<script>");
    expect(content.html).toContain("&lt;script&gt;");
    expect(content.html).toContain("&quot;");
  });
});

describe("friendlyAuthError", () => {
  it("maps Better Auth verification codes and messages", () => {
    expect(friendlyAuthError("EMAIL_NOT_VERIFIED")).toBe(EMAIL_NOT_VERIFIED_MESSAGE);
    expect(friendlyAuthError("Email not verified")).toBe(EMAIL_NOT_VERIFIED_MESSAGE);
    expect(friendlyAuthError("TOKEN_EXPIRED")).toBe(VERIFY_EMAIL_EXPIRED_MESSAGE);
    expect(friendlyAuthError("INVALID_TOKEN")).toBe(VERIFY_EMAIL_INVALID_MESSAGE);
    expect(friendlyAuthError("unrelated")).toBeUndefined();
  });
});

describe("isUnverifiedEmailMessage", () => {
  it("recognizes raw and friendly unverified copy", () => {
    expect(isUnverifiedEmailMessage(EMAIL_NOT_VERIFIED_MESSAGE)).toBe(true);
    expect(isUnverifiedEmailMessage("EMAIL_NOT_VERIFIED")).toBe(true);
    expect(isUnverifiedEmailMessage("Email not verified")).toBe(true);
    expect(isUnverifiedEmailMessage("wrong password")).toBe(false);
  });
});

describe("needsVerificationFollowUp", () => {
  it("covers expired and invalid links as well as unverified sign-in", () => {
    expect(needsVerificationFollowUp("TOKEN_EXPIRED")).toBe(true);
    expect(needsVerificationFollowUp("INVALID_TOKEN")).toBe(true);
    expect(needsVerificationFollowUp("EMAIL_NOT_VERIFIED")).toBe(true);
    expect(needsVerificationFollowUp("Invalid email or password")).toBe(false);
  });
});

function envStore(): Record<string, string | undefined> {
  return process.env as Record<string, string | undefined>;
}

describe("sendVerificationEmail", () => {
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    sendMock.mockReset();
    vi.mocked(resendConfigured).mockReturnValue(false);
  });

  afterEach(() => {
    envStore().NODE_ENV = originalNodeEnv;
  });

  it("logs the URL locally when Resend is unset", async () => {
    envStore().NODE_ENV = "test";
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    await sendVerificationEmail({
      user: { id: "user_1", email: "ada@example.com" },
      url: "https://example.com/verify",
      token: "token-value",
    });
    expect(info).toHaveBeenCalledWith("[auth] Verification URL for ada@example.com: https://example.com/verify");
    expect(sendMock).not.toHaveBeenCalled();
    info.mockRestore();
  });

  it("fails in production when Resend is unset", async () => {
    envStore().NODE_ENV = "production";
    await expect(
      sendVerificationEmail({
        user: { id: "user_1", email: "ada@example.com" },
        url: "https://example.com/verify",
        token: "token-value",
      }),
    ).rejects.toThrow(VERIFY_EMAIL_NOT_CONFIGURED_MESSAGE);
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("sends through Resend when configured", async () => {
    vi.mocked(resendConfigured).mockReturnValue(true);
    sendMock.mockResolvedValue({ data: { id: "re_1" }, error: null });
    await sendVerificationEmail({
      user: { id: "user_1", email: "ada@example.com" },
      url: "https://example.com/verify",
      token: "abcdefghijklmnopqrstuvwxyz",
    });
    expect(sendMock).toHaveBeenCalledTimes(1);
    const [payload, options] = sendMock.mock.calls[0] as [
      { to: string; subject: string; text: string },
      { idempotencyKey: string },
    ];
    expect(payload.to).toBe("ada@example.com");
    expect(payload.subject).toBe("Verify your email for Morrow");
    expect(payload.text).toContain("https://example.com/verify");
    expect(options.idempotencyKey).toBe("verify-email/user_1/abcdefghijklmnopqrstuvwx");
  });
});
