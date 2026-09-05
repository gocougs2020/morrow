"use client";

import { useEffect, useState } from "react";
import { MoonIcon, SunIcon } from "lucide-react";
import { useTheme } from "next-themes";
import {
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

function useAppearanceTheme() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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
        {isDark ? <MoonIcon /> : <SunIcon />}
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
        "flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm outline-none hover:bg-accent hover:text-accent-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
        className,
      )}
      onClick={toggle}
      type="button"
    >
      {isDark ? <MoonIcon className="size-4" /> : <SunIcon className="size-4" />}
      {label}
    </button>
  );
}
