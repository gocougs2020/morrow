import { APP_NAME } from "@/lib/brand";
import { getResend, resendConfigured, resendFromAddress } from "@/lib/resend";

export const VERIFY_EMAIL_CALLBACK_PATH = "/sign-in";
export const VERIFY_EMAIL_EXPIRES_IN_SECONDS = 60 * 60;

export const EMAIL_NOT_VERIFIED_MESSAGE =
  "Check your email for a verification link, including the spam folder. We sent another one if this account still needs to be confirmed.";

export const VERIFY_EMAIL_EXPIRED_MESSAGE =
  "This verification link expired. Sign in or request a new link to confirm your email.";

export const VERIFY_EMAIL_INVALID_MESSAGE =
  "This verification link is invalid. Sign in or request a new link to confirm your email.";

export const VERIFY_EMAIL_NOT_CONFIGURED_MESSAGE =
  "Email verification requires RESEND_API_KEY. Set it so new accounts can confirm their address.";

const VERIFY_EMAIL_ERROR_ALIASES: Record<string, string> = {
  EMAIL_NOT_VERIFIED: EMAIL_NOT_VERIFIED_MESSAGE,
  "Email not verified": EMAIL_NOT_VERIFIED_MESSAGE,
  TOKEN_EXPIRED: VERIFY_EMAIL_EXPIRED_MESSAGE,
  "Token expired": VERIFY_EMAIL_EXPIRED_MESSAGE,
  INVALID_TOKEN: VERIFY_EMAIL_INVALID_MESSAGE,
  "Invalid token": VERIFY_EMAIL_INVALID_MESSAGE,
};

export function friendlyAuthError(message: string): string | undefined {
  return VERIFY_EMAIL_ERROR_ALIASES[message.trim()];
}

export function isUnverifiedEmailMessage(message: string | undefined): boolean {
  const trimmed = message?.trim() ?? "";
  return trimmed === EMAIL_NOT_VERIFIED_MESSAGE || trimmed === "EMAIL_NOT_VERIFIED" || trimmed === "Email not verified";
}

export function needsVerificationFollowUp(message: string | undefined): boolean {
  const trimmed = message?.trim() ?? "";
  return Boolean(friendlyAuthError(trimmed));
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function verificationEmailContent(input: { appName: string; verifyUrl: string }): {
  subject: string;
  text: string;
  html: string;
} {
  const subject = `Verify your email for ${input.appName}`;
  const text = [
    `Confirm this email to finish creating your ${input.appName} account.`,
    "",
    `Verify email: ${input.verifyUrl}`,
    "",
    "This link expires in 1 hour. If you did not create an account, you can ignore this message.",
  ].join("\n");
  const html = [
    `<!DOCTYPE html><html lang="en"><body>`,
    `<p>Confirm this email to finish creating your ${escapeHtml(input.appName)} account.</p>`,
    `<p><a href="${escapeHtml(input.verifyUrl)}">Verify email</a></p>`,
    `<p>This link expires in 1 hour. If you did not create an account, you can ignore this message.</p>`,
    `</body></html>`,
  ].join("");
  return { subject, text, html };
}

export async function sendVerificationEmail(data: {
  readonly user: { readonly id: string; readonly email: string };
  readonly url: string;
  readonly token: string;
}): Promise<void> {
  if (!resendConfigured()) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(VERIFY_EMAIL_NOT_CONFIGURED_MESSAGE);
    }
    console.info(`[auth] Verification URL for ${data.user.email}: ${data.url}`);
    return;
  }

  const { subject, text, html } = verificationEmailContent({
    appName: APP_NAME,
    verifyUrl: data.url,
  });
  const { error } = await getResend().emails.send(
    {
      from: resendFromAddress(),
      to: data.user.email,
      subject,
      text,
      html,
    },
    { idempotencyKey: `verify-email/${data.user.id}/${data.token.slice(0, 24)}`.slice(0, 256) },
  );
  if (error) {
    throw new Error(error.message);
  }
}
