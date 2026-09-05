import type { ReactNode } from "react";
import { SessionWorkspace } from "@/components/session-workspace";
import { requireSession } from "@/lib/session";
import { listChats } from "@/lib/store";

export default async function SessionsLayout({
  children,
}: {
  readonly children: ReactNode;
}) {
  const session = await requireSession();
  return <SessionWorkspace chats={await listChats(session.user.id)}>{children}</SessionWorkspace>;
}
