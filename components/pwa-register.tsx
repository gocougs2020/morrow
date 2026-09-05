"use client";

import { useTheme } from "next-themes";
import { useEffect } from "react";
import { pwaThemeColor } from "@/lib/pwa";

export function PwaRegister() {
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    if (!resolvedTheme) return;
    const color = resolvedTheme === "dark" ? pwaThemeColor.dark : pwaThemeColor.light;
    const metas = [...document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')];
    const [themeMeta, ...extra] = metas;
    for (const meta of extra) meta.remove();
    if (!themeMeta) {
      const meta = document.createElement("meta");
      meta.name = "theme-color";
      meta.content = color;
      document.head.appendChild(meta);
      return;
    }
    themeMeta.content = color;
    themeMeta.removeAttribute("media");
  }, [resolvedTheme]);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    const register = () => {
      void navigator.serviceWorker.register("/sw.js", {
        scope: "/",
        updateViaCache: "none",
      });
    };

    if (document.readyState === "complete") {
      register();
      return;
    }

    window.addEventListener("load", register, { once: true });
    return () => window.removeEventListener("load", register);
  }, []);

  return null;
}
