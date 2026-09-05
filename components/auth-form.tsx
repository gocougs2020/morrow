"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { APP_NAME } from "@/lib/brand";

export function AuthForm({
  initialError,
  mode,
}: {
  readonly initialError?: string;
  readonly mode: "sign-in" | "sign-up";
}) {
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!initialError) return;
    const url = new URL(window.location.href);
    if (!url.searchParams.has("error")) return;
    url.searchParams.delete("error");
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  }, [initialError]);

  return (
    <main
      className="flex min-h-dvh items-center justify-center bg-background pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]"
      id="main"
      tabIndex={-1}
    >
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{mode === "sign-in" ? "Sign in" : "Create your account"}</CardTitle>
          <CardDescription>
            {APP_NAME} keeps sessions, skills, and jobs with your account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            action={mode === "sign-in" ? "/auth/sign-in" : "/auth/sign-up"}
            className="space-y-4"
            method="post"
            onSubmit={() => setPending(true)}
          >
            {initialError ? (
              <Alert aria-live="polite" variant="destructive">
                <AlertTitle>Authentication failed</AlertTitle>
                <AlertDescription>{initialError}</AlertDescription>
              </Alert>
            ) : null}
            {mode === "sign-up" ? (
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input autoComplete="name" id="name" name="name" />
              </div>
            ) : null}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                autoComplete="email"
                id="email"
                inputMode="email"
                name="email"
                spellCheck={false}
                type="email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
                id="password"
                name="password"
                type="password"
              />
            </div>
            <Button className="w-full" disabled={pending} type="submit">
              {pending ? (
                <>
                  <Spinner />
                  {mode === "sign-in" ? "Signing in…" : "Creating account…"}
                </>
              ) : mode === "sign-in" ? (
                "Sign in"
              ) : (
                "Create account"
              )}
            </Button>
            <p className="text-center text-muted-foreground text-sm">
              {mode === "sign-in" ? (
                <>
                  No account?{" "}
                  <Link className="underline" href="/sign-up">
                    Sign up
                  </Link>
                </>
              ) : (
                <>
                  Already have an account?{" "}
                  <Link className="underline" href="/sign-in">
                    Sign in
                  </Link>
                </>
              )}
            </p>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
