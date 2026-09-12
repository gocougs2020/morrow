import { AuthForm } from "@/components/auth-form";
import { EmailInbox, type ClientEmail } from "@/components/email-inbox";
import { toClientEmail } from "@/lib/email-inbox";
import { getSession } from "@/lib/session";
import { listEmails } from "@/lib/store";

export default async function InboxPage() {
  const session = await getSession();
  if (!session) {
    return <AuthForm mode="sign-in" />;
  }

  const emails = (await listEmails(session.user.id)).map((email) =>
    toClientEmail(email, { includeBodies: false, bodyPreviewChars: 0 }),
  ) as ClientEmail[];
  return <EmailInbox emails={emails} />;
}
