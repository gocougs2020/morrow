import { AuthForm } from "@/components/auth-form";
import { SettingsPanel } from "@/components/settings-panel";
import { getEnabledBuiltinSkillDocs } from "@/lib/builtin-skill-docs";
import { getSession } from "@/lib/session";
import { parseSettingsTab } from "@/lib/settings-tab";

export default async function SettingsPage({
  searchParams,
}: {
  readonly searchParams: Promise<{ readonly tab?: string | string[] }>;
}) {
  const session = await getSession();
  if (!session) {
    return <AuthForm mode="sign-in" />;
  }

  const query = await searchParams;
  const tab = parseSettingsTab(Array.isArray(query.tab) ? query.tab[0] : query.tab);

  return <SettingsPanel builtinSkills={await getEnabledBuiltinSkillDocs()} tab={tab} />;
}
