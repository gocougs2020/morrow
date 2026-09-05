import { connection } from "next/server";
import { LandingHome } from "@/components/landing-home";
import { SetupChecklist } from "@/components/setup-checklist";
import { getSetupStatus, isSetupScreenVisible } from "@/lib/setup-status";
import { requireSession } from "@/lib/session";

export default async function Page() {
  await connection();
  const status = getSetupStatus();
  if (isSetupScreenVisible(status)) {
    return <SetupChecklist initialStatus={status} />;
  }
  await requireSession();
  return <LandingHome />;
}
