"use client";

import { useEffect } from "react";
import { hrefOpensExistingSession, markExplicitSessionOpen } from "@/lib/session-freshness";

export function SessionFreshness() {
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
        return;
      }
      const link = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (!(link instanceof HTMLAnchorElement)) return;
      if (hrefOpensExistingSession(link.href)) markExplicitSessionOpen();
    };

    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  return null;
}
