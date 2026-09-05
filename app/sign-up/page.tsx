import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { firstSearchParam } from "@/lib/auth-form";
import { getSession } from "@/lib/session";

export default async function SignUpPage({
  searchParams,
}: {
  readonly searchParams: Promise<{ readonly error?: string | string[] }>;
}) {
  if (await getSession()) {
    redirect("/");
  }
  const query = await searchParams;
  return <AuthForm initialError={firstSearchParam(query.error)} mode="sign-up" />;
}
