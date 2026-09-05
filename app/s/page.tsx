import { NewSessionClient } from "@/app/s/new-session-client";
import { requireSession } from "@/lib/session";

export default async function SessionsPage() {
  await requireSession();
  return <NewSessionClient />;
}
