"use client";

import { useEffect } from "react";

function isModifiedClick(event: MouseEvent) {
  return event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0;
}

function inAppPath(anchor: HTMLAnchorElement): string | undefined {
  if (anchor.target && anchor.target !== "_self") return undefined;
  if (anchor.hasAttribute("download")) return undefined;
  const href = anchor.getAttribute("href");
  if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) {
    return undefined;
  }
  const url = new URL(anchor.href, window.location.href);
  if (url.origin !== window.location.origin) return undefined;
  return `${url.pathname}${url.search}${url.hash}`;
}

function isSessionPath(path: string) {
  return path === "/s" || path.startsWith("/s/");
}

export function AppNavigation() {
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (isModifiedClick(event)) return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest("a");
      if (!(anchor instanceof HTMLAnchorElement)) return;
      const dest = inAppPath(anchor);
      if (dest === undefined) return;
      const destPath = dest.split(/[?#]/)[0] ?? dest;
      const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      if (dest === current) return;
      if (isSessionPath(window.location.pathname) && isSessionPath(destPath)) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      window.location.assign(new URL(dest, window.location.origin).href);
    };

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  return null;
}
