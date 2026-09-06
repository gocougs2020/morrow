"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeftIcon, ChevronDownIcon } from "lucide-react";
import { MobileSessionSheet } from "@/components/mobile-session-sheet";
import { ThemeAppearanceMenu } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { appHeaderNavItems, isAppNavActive } from "@/lib/app-nav";
import { isInAppSetupEnabled } from "@/lib/in-app-setup";
import { authClient } from "@/lib/auth-client";
import { APP_NAME } from "@/lib/brand";
import { cn } from "@/lib/utils";

export function AppHeader({
  backHref,
  backLabel = "Files",
  hideOnMobile = false,
}: {
  readonly backHref?: string;
  readonly backLabel?: string;
  readonly hideOnMobile?: boolean;
}) {
  const pathname = usePathname();
  const { data: session } = authClient.useSession();
  const email = session?.user.email;

  return (
    <>
      <header className="hidden h-[calc(3rem+env(safe-area-inset-top))] items-center justify-between border-b border-border bg-background pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] pt-[env(safe-area-inset-top)] md:flex">
        <div className="flex min-w-0 items-center gap-6">
          <Link className="truncate font-medium text-sm tracking-tight" href="/">
            {APP_NAME}
          </Link>
          <nav className="flex items-center gap-5">
            {appHeaderNavItems.map((item) => {
              const active = isAppNavActive(pathname, item.href);
              return (
                <Link
                  className={cn(
                    "text-base transition-colors",
                    active
                      ? "text-foreground underline decoration-1 underline-offset-8"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                  href={item.href}
                  key={item.href}
                  prefetch={item.prefetch}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex items-center gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="max-w-56 text-muted-foreground" size="sm" variant="ghost">
                <span className="truncate">{email ?? "Account"}</span>
                <ChevronDownIcon aria-hidden="true" data-icon="inline-end" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-48">
              <DropdownMenuGroup>
                <DropdownMenuItem asChild>
                  <Link href="/usage" prefetch={false}>
                    Usage
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/settings" prefetch={false}>
                    Settings
                  </Link>
                </DropdownMenuItem>
                {isInAppSetupEnabled() ? (
                  <DropdownMenuItem asChild>
                    <Link href="/settings/setup" prefetch={false}>
                      Setup
                    </Link>
                  </DropdownMenuItem>
                ) : null}
              </DropdownMenuGroup>
              <ThemeAppearanceMenu />
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onClick={() => {
                  void authClient.signOut({
                    fetchOptions: {
                      onSuccess: () => {
                        window.location.assign("/sign-in");
                      },
                    },
                  });
                }}
              >
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
      {hideOnMobile ? null : (
        <header className="flex h-[calc(3rem+env(safe-area-inset-top))] items-center gap-1 border-b border-border bg-background pl-[max(0.5rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] pt-[env(safe-area-inset-top)] md:hidden">
          <MobileSessionSheet />
          {backHref ? (
            <Link
              aria-label={`Back to ${backLabel}`}
              className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-muted-foreground text-sm outline-none hover:text-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              href={backHref}
            >
              <ArrowLeftIcon aria-hidden="true" className="size-4" />
              {backLabel}
            </Link>
          ) : null}
        </header>
      )}
    </>
  );
}
