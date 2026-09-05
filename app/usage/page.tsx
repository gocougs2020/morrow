import { AuthForm } from "@/components/auth-form";
import { UsagePanel } from "@/components/usage-panel";
import { canViewAccountUsage } from "@/lib/access";
import { listAppUsers } from "@/lib/email-users";
import { getSession } from "@/lib/session";
import { listAccountChats, listAccountUsage, listChats, listUserUsage } from "@/lib/store";
import { toUsagePageSnapshot } from "@/lib/usage";

export default async function UsagePage() {
  const session = await getSession();
  if (!session) {
    return <AuthForm mode="sign-in" />;
  }

  const showAccount = canViewAccountUsage(session.user.email);
  const [userRecords, userChats, accountRecords, accountChats, users] = await Promise.all([
    listUserUsage(session.user.id),
    listChats(session.user.id),
    showAccount ? listAccountUsage() : Promise.resolve([]),
    showAccount ? listAccountChats() : Promise.resolve([]),
    showAccount ? listAppUsers() : Promise.resolve([]),
  ]);

  return (
    <UsagePanel
      you={toUsagePageSnapshot(userRecords, userChats, { includeSessions: false })}
      account={
        showAccount
          ? toUsagePageSnapshot(accountRecords, accountChats, {
              users,
              includeSessions: false,
            })
          : undefined
      }
    />
  );
}
