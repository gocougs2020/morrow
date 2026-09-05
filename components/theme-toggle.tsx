"use client";

import { useSyncExternalStore } from "react";
import { MoonIcon, SunIcon } from "lucide-react";
import { useTheme } from "next-themes";
import {
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const themeIconClassName = "size-3.5";

function subscribeNoop() {
  return () => undefined;
}

function useAppearanceTheme() {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(subscribeNoop, () => true, () => false);

  const isDark = mounted && resolvedTheme === "dark";
  return {
    isDark,
    label: isDark ? "Dark mode" : "Light mode",
    toggle: () => setTheme(isDark ? "light" : "dark"),
  };
}

export function ThemeAppearanceMenu() {
  const { isDark, label, toggle } = useAppearanceTheme();

  return (
    <>
      <DropdownMenuSeparator />
      <DropdownMenuItem onSelect={toggle}>
        {isDark ? <MoonIcon className={themeIconClassName} /> : <SunIcon className={themeIconClassName} />}
        {label}
      </DropdownMenuItem>
    </>
  );
}

export function ThemeAppearanceButton({
  className,
}: {
  readonly className?: string;
}) {
  const { isDark, label, toggle } = useAppearanceTheme();

  return (
    <button
      className={cn(
        "inline-flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm! leading-5! text-foreground outline-none hover:bg-accent hover:text-accent-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
        className,
      )}
      onClick={toggle}
      type="button"
    >
      {isDark ? <MoonIcon className={themeIconClassName} /> : <SunIcon className={themeIconClassName} />}
      {label}
    </button>
  );
}
