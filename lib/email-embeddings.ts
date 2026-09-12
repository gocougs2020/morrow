import { emailBodyForEmbedding } from "@/lib/email-content";
import { embedTexts } from "@/lib/embeddings";
import { upsertEmbedding } from "@/lib/store";
import { runWithUsageScope } from "@/lib/usage-scope";
import type { EmailRecord, EmbeddingKind } from "@/lib/types";

export const EMAIL_EMBEDDING_KINDS = [
  "email_subject",
  "email_body",
] as const satisfies readonly EmbeddingKind[];

export const EMAIL_SEARCH_MIN_SCORE = 0.32;

export async function persistEmailEmbeddings(email: EmailRecord): Promise<void> {
  try {
    const subject = email.subject.trim();
    const body = emailBodyForEmbedding(email);
    const [subjectEmbedding, bodyEmbedding] = await runWithUsageScope({ userId: email.userId }, () =>
      embedTexts([subject, body]),
    );
    if (subjectEmbedding && subject) {
      await upsertEmbedding({
        userId: email.userId,
        kind: "email_subject",
        sourceType: "email",
        sourceId: email.id,
        turnId: null,
        text: subject,
        embedding: subjectEmbedding,
      });
    }
    if (bodyEmbedding && body) {
      await upsertEmbedding({
        userId: email.userId,
        kind: "email_body",
        sourceType: "email",
        sourceId: email.id,
        turnId: null,
        text: body,
        embedding: bodyEmbedding,
      });
    }
  } catch (error) {
    console.error("[email] embedding failed", { emailId: email.id, error });
  }
}
