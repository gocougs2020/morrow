"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CopyIcon, RefreshCwIcon } from "lucide-react";
import { OutLink, SetupStep } from "@/components/setup-step";
import { ThemeAppearanceButton } from "@/components/theme-toggle";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { APP_NAME } from "@/lib/brand";
import type { SetupStatus } from "@/lib/setup-status";
import { cn } from "@/lib/utils";

const AI_GATEWAY_KEYS_URL =
  "https://vercel.com/d?to=%2F%5Bteam%5D%2F%7E%2Fai%2Fapi-keys&title=Get%20your%20AI%20Gateway%20key";
const VERCEL_NEW_URL = "https://vercel.com/new";
const VERCEL_SIGNUP_URL = "https://vercel.com/signup";
const NEON_MARKETPLACE_URL = "https://vercel.com/marketplace/neon";
const BLOB_DOCS_URL = "https://vercel.com/docs/storage/vercel-blob";
const GITHUB_REPO_URL = "https://github.com/gocougs2020/morrow";

type RequiredStepId =
  | "authSecret"
  | "aiGateway"
  | "hosted"
  | "authUrl"
  | "database"
  | "blob"
  | "allowlist";

const requiredSteps: readonly RequiredStepId[] = [
  "authSecret",
  "aiGateway",
  "hosted",
  "authUrl",
  "database",
  "blob",
  "allowlist",
];

async function copyText(value: string): Promise<boolean> {
  if (!navigator.clipboard?.writeText) return false;
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    return false;
  }
}

export function SetupChecklist({
  initialStatus,
}: {
  readonly initialStatus: SetupStatus;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [secret, setSecret] = useState("");
  const [allowlistEmail, setAllowlistEmail] = useState("");
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState<"generate" | "save-secret" | "save-email" | "refresh" | null>(
    null,
  );
  const [error, setError] = useState<string>();

  const doneCount = requiredSteps.filter((id) => status[id]).length;
  const progress = Math.round((doneCount / requiredSteps.length) * 100);
  const firstOpen = requiredSteps.find((id) => !status[id]) ?? "allowlist";
  const [openId, setOpenId] = useState<RequiredStepId | "voice" | "inbox">(firstOpen);

  async function refreshStatus() {
    setBusy("refresh");
    setError(undefined);
    try {
      const response = await fetch("/api/setup");
      if (!response.ok) throw new Error("Could not refresh the checklist.");
      const payload = (await response.json()) as { status: SetupStatus };
      setStatus(payload.status);
      if (payload.status.allowlist) {
        router.refresh();
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not refresh the checklist.");
    } finally {
      setBusy(null);
    }
  }

  async function postSetup(body: Record<string, string>) {
    const response = await fetch("/api/setup", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload = (await response.json()) as {
      error?: string;
      secret?: string;
      status?: SetupStatus;
    };
    if (!response.ok) {
      throw new Error(payload.error || "That step did not work.");
    }
    if (payload.status) setStatus(payload.status);
    return payload;
  }

  return (
    <main
      className="min-h-dvh bg-background pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]"
      id="main"
      tabIndex={-1}
    >
      <div className="mx-auto flex w-full max-w-xl flex-col gap-8 px-1 py-10 sm:py-14">
        <header className="flex items-start justify-between gap-4">
          <div className="min-w-0 space-y-2">
            <p className="font-medium text-sm tracking-tight">{APP_NAME}</p>
            <h1 className="font-semibold text-2xl tracking-tight">Set up your workspace</h1>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Follow the list. Each box turns green when that setting is in place. The last step
              is who can sign in — after you add your email or domain, this page goes away.
            </p>
          </div>
          <ThemeAppearanceButton className="w-auto shrink-0 px-2 py-1 text-muted-foreground text-xs" />
        </header>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3 text-muted-foreground text-sm">
            <p>
              {doneCount} of {requiredSteps.length} required steps ready
            </p>
            <Button
              disabled={busy !== null}
              onClick={() => void refreshStatus()}
              size="sm"
              type="button"
              variant="ghost"
            >
              <RefreshCwIcon className={cn(busy === "refresh" && "animate-spin")} />
              Refresh
            </Button>
          </div>
          <Progress value={progress} />
        </div>

        {error ? (
          <Alert variant="destructive">
            <AlertTitle>Something went wrong</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        <section className="space-y-3">
          <h2 className="font-medium text-muted-foreground text-xs uppercase tracking-wider">
            On this computer
          </h2>
          <ol className="overflow-hidden rounded-xl border bg-card">
            <SetupStep
              done={status.authSecret}
              id="authSecret"
              open={openId === "authSecret"}
              onOpen={() => setOpenId("authSecret")}
              title="Create a sign-in secret"
            >
              <p>
                This random password protects sign-in cookies. You do not need to remember it —
                store it in your settings file.
              </p>
              {status.authSecret ? (
                <p className="text-foreground">This secret is already set.</p>
              ) : (
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    <Button
                      disabled={busy !== null}
                      onClick={() => {
                        setBusy("generate");
                        setError(undefined);
                        void postSetup({ action: "generate-secret" })
                          .then((payload) => {
                            if (payload.secret) setSecret(payload.secret);
                          })
                          .catch((caught: unknown) => {
                            setError(
                              caught instanceof Error ? caught.message : "Could not generate a secret.",
                            );
                          })
                          .finally(() => setBusy(null));
                      }}
                      type="button"
                    >
                      Generate secret
                    </Button>
                    {status.canWriteLocalEnv && secret ? (
                      <Button
                        disabled={busy !== null}
                        onClick={() => {
                          setBusy("save-secret");
                          setError(undefined);
                          void postSetup({ action: "save-secret", secret })
                            .then(() => setOpenId("aiGateway"))
                            .catch((caught: unknown) => {
                              setError(
                                caught instanceof Error
                                  ? caught.message
                                  : "Could not save the secret.",
                              );
                            })
                            .finally(() => setBusy(null));
                        }}
                        type="button"
                        variant="secondary"
                      >
                        Save to this computer
                      </Button>
                    ) : null}
                  </div>
                  {secret ? (
                    <div className="space-y-2">
                      <Label htmlFor="setup-secret">Your new secret</Label>
                      <div className="flex gap-2">
                        <Input
                          id="setup-secret"
                          readOnly
                          spellCheck={false}
                          value={secret}
                        />
                        <Button
                          onClick={() => {
                            void copyText(`BETTER_AUTH_SECRET=${secret}`).then((ok) => {
                              setCopied(ok);
                              if (ok) window.setTimeout(() => setCopied(false), 2000);
                            });
                          }}
                          size="icon"
                          type="button"
                          variant="outline"
                        >
                          <CopyIcon />
                          <span className="sr-only">Copy secret</span>
                        </Button>
                      </div>
                      <p className="text-muted-foreground text-xs">
                        {copied ? "Copied. " : ""}
                        Paste this line into <code className="font-mono">.env.local</code> (or
                        Vercel → Settings → Environment Variables) as{" "}
                        <code className="font-mono">BETTER_AUTH_SECRET</code>. If you edited the
                        file yourself, stop the app and run <code className="font-mono">npm run
                        dev</code> again, then hit Refresh.
                      </p>
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-xs">
                      Click Generate, then copy the value. On this computer it belongs in{" "}
                      <code className="font-mono">.env.local</code>. On Vercel, add the same name
                      in Settings → Environment Variables.
                    </p>
                  )}
                </div>
              )}
            </SetupStep>
            <SetupStep
              done={status.aiGateway}
              id="aiGateway"
              open={openId === "aiGateway"}
              onOpen={() => setOpenId("aiGateway")}
              title="Add an AI Gateway key"
            >
              <p>
                This is how the agent talks to AI models. On Vercel a linked project can skip the
                key. On your computer you need one.
              </p>
              <ol className="list-decimal space-y-1 pl-5">
                <li>
                  Create a free{" "}
                  <OutLink href={VERCEL_SIGNUP_URL}>Vercel account</OutLink> if you do not have
                  one.
                </li>
                <li>
                  Open{" "}
                  <OutLink href={AI_GATEWAY_KEYS_URL}>AI Gateway API keys</OutLink> and create a
                  key.
                </li>
                <li>
                  In <code className="font-mono">.env.local</code>, put it on the{" "}
                  <code className="font-mono">AI_GATEWAY_API_KEY=</code> line. Save the file,
                  restart <code className="font-mono">npm run dev</code>, then Refresh.
                </li>
              </ol>
            </SetupStep>
          </ol>
        </section>

        <section className="space-y-3">
          <h2 className="font-medium text-muted-foreground text-xs uppercase tracking-wider">
            On the internet
          </h2>
          <ol className="overflow-hidden rounded-xl border bg-card">
            <SetupStep
              done={status.hosted}
              id="hosted"
              open={openId === "hosted"}
              onOpen={() => setOpenId("hosted")}
              title="Put the app on Vercel"
            >
              <p>
                Vercel is the host. You get a public https address. This box checks itself when
                you open that live site.
              </p>
              <ol className="list-decimal space-y-1 pl-5">
                <li>
                  On GitHub, open{" "}
                  <OutLink href={GITHUB_REPO_URL}>the Morrow repo</OutLink> and click{" "}
                  <strong>Fork</strong> (top right). That makes your own copy.
                </li>
                <li>
                  Go to <OutLink href={VERCEL_NEW_URL}>vercel.com/new</OutLink>, sign in with
                  GitHub, and import your fork.
                </li>
                <li>
                  After the first deploy, copy the site URL (it looks like{" "}
                  <code className="font-mono">https://something.vercel.app</code>).
                </li>
              </ol>
            </SetupStep>
            <SetupStep
              done={status.authUrl}
              id="authUrl"
              open={openId === "authUrl"}
              onOpen={() => setOpenId("authUrl")}
              title="Set the public website address"
            >
              <p>
                Sign-in needs to know the real site URL. On this computer, localhost is already
                correct.
              </p>
              <ol className="list-decimal space-y-1 pl-5">
                <li>Open your Vercel project → Settings → Environment Variables.</li>
                <li>
                  Add <code className="font-mono">BETTER_AUTH_URL</code> with your live URL, such
                  as <code className="font-mono">https://your-app.vercel.app</code>.
                </li>
                <li>Redeploy (Deployments → ⋯ → Redeploy) so the new setting is used.</li>
              </ol>
            </SetupStep>
            <SetupStep
              done={status.database}
              id="database"
              open={openId === "database"}
              onOpen={() => setOpenId("database")}
              title="Add a Neon database"
            >
              <p>
                On your computer the app can use a local file. On the internet it needs a Neon
                Postgres database so accounts and chats survive deploys.
              </p>
              <ol className="list-decimal space-y-1 pl-5">
                <li>Open your Vercel project → Storage → Create Database → Neon.</li>
                <li>
                  Or install Neon from the{" "}
                  <OutLink href={NEON_MARKETPLACE_URL}>Vercel Marketplace</OutLink>.
                </li>
                <li>
                  Vercel adds <code className="font-mono">DATABASE_URL</code> for you. Redeploy
                  after it appears.
                </li>
              </ol>
            </SetupStep>
            <SetupStep
              done={status.blob}
              id="blob"
              open={openId === "blob"}
              onOpen={() => setOpenId("blob")}
              title="Add file storage"
            >
              <p>
                Vercel Blob stores uploaded files and some memory notes. On your computer a local
                folder is fine.
              </p>
              <ol className="list-decimal space-y-1 pl-5">
                <li>Open your Vercel project → Storage → Create → Blob.</li>
                <li>
                  See the <OutLink href={BLOB_DOCS_URL}>Blob guide</OutLink> if the menu looks
                  different.
                </li>
                <li>
                  Vercel adds <code className="font-mono">BLOB_READ_WRITE_TOKEN</code>. Redeploy
                  after it appears.
                </li>
              </ol>
            </SetupStep>
            <SetupStep
              done={status.allowlist}
              id="allowlist"
              last
              open={openId === "allowlist"}
              onOpen={() => setOpenId("allowlist")}
              title="Lock who can sign in"
            >
              <p>
                Do this last. Until you add an email or domain, anyone who finds the site can
                create an account and spend your AI budget. After you add one, this setup page
                disappears.
              </p>
              {status.canWriteLocalEnv ? (
                <form
                  className="space-y-3"
                  onSubmit={(event) => {
                    event.preventDefault();
                    setBusy("save-email");
                    setError(undefined);
                    void postSetup({
                      action: "save-allowlist-email",
                      email: allowlistEmail,
                    })
                      .then((payload) => {
                        if (payload.status?.allowlist) {
                          router.refresh();
                        }
                      })
                      .catch((caught: unknown) => {
                        setError(
                          caught instanceof Error ? caught.message : "Could not save that email.",
                        );
                      })
                      .finally(() => setBusy(null));
                  }}
                >
                  <div className="space-y-2">
                    <Label htmlFor="setup-allowlist-email">Your email</Label>
                    <Input
                      autoComplete="email"
                      id="setup-allowlist-email"
                      inputMode="email"
                      onChange={(event) => setAllowlistEmail(event.target.value)}
                      placeholder="you@example.com"
                      required
                      spellCheck={false}
                      type="email"
                      value={allowlistEmail}
                    />
                  </div>
                  <Button disabled={busy !== null} type="submit">
                    Save and hide this page
                  </Button>
                  <p className="text-muted-foreground text-xs">
                    This writes <code className="font-mono">ALLOWED_SIGNUP_EMAILS</code> on this
                    computer only. Add the same value on Vercel before you share the live URL.
                  </p>
                </form>
              ) : (
                <ol className="list-decimal space-y-1 pl-5">
                  <li>Open your Vercel project → Settings → Environment Variables.</li>
                  <li>
                    Add <code className="font-mono">ALLOWED_SIGNUP_EMAILS</code> with your email
                    (or <code className="font-mono">ALLOWED_SIGNUP_DOMAINS</code> with{" "}
                    <code className="font-mono">yourcompany.com</code>).
                  </li>
                  <li>Redeploy, then open the live site. This page should be gone.</li>
                </ol>
              )}
            </SetupStep>
          </ol>
        </section>

        <section className="space-y-3">
          <h2 className="font-medium text-muted-foreground text-xs uppercase tracking-wider">
            Optional
          </h2>
          <ol className="overflow-hidden rounded-xl border bg-card">
            <SetupStep
              done={status.voice}
              id="voice"
              open={openId === "voice"}
              onOpen={() => setOpenId("voice")}
              title="Voice input"
            >
              <p>
                Add <code className="font-mono">OPENAI_API_KEY</code> if you want spoken prompts.
                Chat still works without it.
              </p>
            </SetupStep>
            <SetupStep
              done={status.inbox}
              id="inbox"
              last
              open={openId === "inbox"}
              onOpen={() => setOpenId("inbox")}
              title="Email inbox"
            >
              <p>
                Add <code className="font-mono">RESEND_API_KEY</code> and{" "}
                <code className="font-mono">RESEND_FROM_EMAIL</code> so the agent can send and
                receive mail. The README has the inbound webhook steps.
              </p>
            </SetupStep>
          </ol>
        </section>

        <p className="text-center text-muted-foreground text-sm">
          {status.authSecret ? (
            <>
              Ready to try the app on this computer?{" "}
              <Link className="underline" href="/sign-up">
                Create an account
              </Link>{" "}
              or{" "}
              <Link className="underline" href="/sign-in">
                sign in
              </Link>
              .
            </>
          ) : (
            <>Create the sign-in secret first, then you can make an account on this computer.</>
          )}
        </p>
      </div>
    </main>
  );
}
