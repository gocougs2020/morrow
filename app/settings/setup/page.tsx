import { connection } from "next/server";
import { notFound } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { WorkspaceSetup } from "@/components/workspace-setup";
import { isInAppSetupEnabled } from "@/lib/in-app-setup";
import { getSession } from "@/lib/session";
import { getSetupStatus } from "@/lib/setup-status";

export default async function WorkspaceSetupPage() {
  if (!isInAppSetupEnabled()) notFound();

  const session = await getSession();
  if (!session) {
    return <AuthForm mode="sign-in" />;
  }

  await connection();
  return <WorkspaceSetup initialStatus={getSetupStatus()} />;
}
