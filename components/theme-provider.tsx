"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import { useServerInsertedHTML } from "next/navigation";
import { useRef, type ComponentProps } from "react";
import { THEME_STORAGE_KEY, themeInitScript } from "@/lib/theme-script";

export function ThemeProvider({
  children,
  ...props
}: ComponentProps<typeof NextThemesProvider>) {
  // Insert the FOUC script outside the client tree. React 19 warns on
  // executable <script> tags rendered by Client Components (next-themes).
  const inserted = useRef(false);
  useServerInsertedHTML(() => {
    if (inserted.current) return null;
    inserted.current = true;
    return (
      <script
        id="theme-init"
        dangerouslySetInnerHTML={{ __html: themeInitScript }}
      />
    );
  });

  return (
    <NextThemesProvider
      {...props}
      scriptProps={{ type: "application/json" }}
      storageKey={THEME_STORAGE_KEY}
    >
      {children}
    </NextThemesProvider>
  );
}
