import { notFound } from "next/navigation";
import { EmailDetail, type ClientEmail } from "@/components/email-inbox";
import { ensureStoredEmailContent, toClientEmail } from "@/lib/email-inbox";
import { requireSession } from "@/lib/session";
import { getEmail } from "@/lib/store";

export default async function InboxEmailPage({
  params,
}: {
  readonly params: Promise<{ readonly id: string }>;
}) {
  const session = await requireSession();
  const { id } = await params;
  const email = await getEmail(session.user.id, id);
  if (!email) notFound();
  return <EmailDetail email={toClientEmail(await ensureStoredEmailContent(email)) as ClientEmail} />;
}
