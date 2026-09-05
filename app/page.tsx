import { LandingHome } from "@/components/landing-home";
import { requireSession } from "@/lib/session";

export default async function Page() {
  await requireSession();
  return <LandingHome />;
}
