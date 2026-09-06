import { APP_NAME } from "@/lib/brand";
import { getDocumentBlob } from "@/lib/blob-store";
import { persistEmailEmbeddings } from "@/lib/email-embeddings";
import { parseAddressList } from "@/lib/email-users";
import { composeInboundMailAddress } from "@/lib/inbound-mail-token";
import { getResend, resendConfigured } from "@/lib/resend";
import { createEmail, ensureInboundMailToken, getDocument, updateEmail } from "@/lib/store";
import type { EmailAttachmentMeta, EmailRecord } from "@/lib/types";

export type SendEmailInput = {
  userId: string;
  to: string | readonly string[];
  subject: string;
  body: string;
  html?: string;
  cc?: readonly string[];
  documentIds?: readonly string[];
  inReplyTo?: string | null;
  chatId?: string | null;
  idempotencyKey: string;
};

function textToHtml(text: string): string {
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return `<div>${escaped
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${paragraph.replace(/\n/g, "<br />")}</p>`)
    .join("")}</div>`;
}

async function documentAttachments(
  userId: string,
  documentIds: readonly string[] | undefined,
): Promise<{ filename: string; content: Buffer; contentType?: string }[]> {
  if (!documentIds?.length) return [];
  const attachments: { filename: string; content: Buffer; contentType?: string }[] = [];
  for (const documentId of documentIds) {
    const document = await getDocument(userId, documentId);
    if (!document) continue;
    const blob = await getDocumentBlob(document.blobUrl, document.blobPathname);
    if (!blob) continue;
    attachments.push({
      filename: document.filename,
      content: blob.buffer,
      contentType: blob.contentType ?? document.mimeType,
    });
  }
  return attachments;
}

export async function userAgentFromAddress(userId: string): Promise<string> {
  const settings = await ensureInboundMailToken(userId);
  const address = settings.inboundMailToken
    ? composeInboundMailAddress(settings.inboundMailToken)
    : null;
  if (!address) {
    throw new Error(
      "This user's agent address is not ready. Set RESEND_FROM_EMAIL or an inbound allowlist.",
    );
  }
  return `${APP_NAME} <${address}>`;
}

export async function sendUserEmail(input: SendEmailInput): Promise<EmailRecord> {
  if (!resendConfigured()) {
    throw new Error("Resend is not configured. Set RESEND_API_KEY and RESEND_FROM_EMAIL.");
  }
  const from = await userAgentFromAddress(input.userId);

  const to = parseAddressList(input.to);
  const cc = parseAddressList(input.cc);
  if (to.length === 0) {
    throw new Error("At least one recipient is required.");
  }

  const attachments = await documentAttachments(input.userId, input.documentIds);
  const attachmentMeta: EmailAttachmentMeta[] = attachments.map((attachment) => ({
    filename: attachment.filename,
    contentType: attachment.contentType ?? "application/octet-stream",
    size: attachment.content.length,
  }));

  const email = await createEmail({
    userId: input.userId,
    direction: "outbound",
    fromAddress: from,
    toAddresses: to,
    ccAddresses: cc,
    subject: input.subject.trim(),
    bodyText: input.body,
    bodyHtml: input.html?.trim() || textToHtml(input.body),
    resendEmailId: null,
    status: "sent",
    hasActionItem: false,
    actionSummary: null,
    chatId: input.chatId ?? null,
    inReplyTo: input.inReplyTo ?? null,
    attachments: attachmentMeta,
  });

  const { data, error } = await getResend().emails.send(
    {
      from,
      to,
      ...(cc.length > 0 ? { cc } : {}),
      subject: email.subject,
      text: email.bodyText,
      html: email.bodyHtml,
      ...(attachments.length > 0
        ? {
            attachments: attachments.map((attachment) => ({
              filename: attachment.filename,
              content: attachment.content,
              contentType: attachment.contentType,
            })),
          }
        : {}),
      ...(input.inReplyTo ? { headers: { "In-Reply-To": input.inReplyTo } } : {}),
    },
    { idempotencyKey: input.idempotencyKey.slice(0, 256) },
  );

  if (error) {
    await updateEmail(input.userId, email.id, { status: "failed" });
    throw new Error(error.message);
  }

  const stored =
    (await updateEmail(input.userId, email.id, {
      resendEmailId: data?.id ?? null,
      status: "sent",
    })) ?? email;
  void persistEmailEmbeddings(stored);
  return stored;
}
