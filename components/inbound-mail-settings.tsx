"use client";

import { useState } from "react";
import { CheckIcon, CopyIcon, RefreshCwIcon } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export type InboundMailInfo = {
  address: string | null;
  configured: boolean;
};

async function copyText(value: string): Promise<boolean> {
  if (!navigator.clipboard?.writeText) return false;
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    return false;
  }
}

export function InboundMailSettings({
  inboundMail,
  onRotated,
}: {
  readonly inboundMail: InboundMailInfo | undefined;
  readonly onRotated: (next: InboundMailInfo) => void;
}) {
  const [copied, setCopied] = useState(false);
  const [rotating, setRotating] = useState(false);
  const [error, setError] = useState<string>();
  const address = inboundMail?.address ?? "";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Agent address</CardTitle>
        <CardDescription>
          This is your send and receive address. Mail to it starts a session only when it comes
          from your signed-in account email. Save it as a contact. Rotate it if it leaks. Workspace
          notices such as signup verification still use the shared From address.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {inboundMail && !inboundMail.configured ? (
          <p className="text-muted-foreground text-sm">
            Set <code>RESEND_FROM_EMAIL</code> or an inbound allowlist so this app can receive mail.
            Your secret plus-tag is ready and will appear here after inbound is configured.
          </p>
        ) : null}
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            readOnly
            aria-label="Secret agent email address"
            className="font-mono text-sm"
            placeholder="Configure inbound email to see your address"
            value={address}
          />
          <div className="flex gap-2">
            <Button
              disabled={!address}
              size="sm"
              type="button"
              variant="outline"
              onClick={() => {
                if (!address) return;
                void copyText(address).then((ok) => {
                  if (!ok) return;
                  setCopied(true);
                  window.setTimeout(() => setCopied(false), 1600);
                });
              }}
            >
              {copied ? <CheckIcon /> : <CopyIcon />}
              {copied ? "Copied" : "Copy"}
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button disabled={rotating} size="sm" type="button" variant="outline">
                  <RefreshCwIcon />
                  Rotate
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Rotate this address?</AlertDialogTitle>
                  <AlertDialogDescription>
                    The current address stops working immediately. Update the contact you saved
                    before you email the agent again.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => {
                      setRotating(true);
                      setError(undefined);
                      void fetch("/api/settings/inbound-mail", { method: "POST" })
                        .then(async (response) => {
                          const payload = (await response.json().catch(() => ({}))) as {
                            error?: string;
                            inboundMail?: InboundMailInfo;
                          };
                          if (!response.ok || !payload.inboundMail) {
                            throw new Error(payload.error || "Unable to rotate this address.");
                          }
                          onRotated(payload.inboundMail);
                        })
                        .catch((rotateError: unknown) => {
                          setError(
                            rotateError instanceof Error
                              ? rotateError.message
                              : "Unable to rotate this address.",
                          );
                        })
                        .finally(() => setRotating(false));
                    }}
                  >
                    Rotate address
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
        {error ? (
          <p className="text-destructive text-sm" role="alert">
            {error}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}