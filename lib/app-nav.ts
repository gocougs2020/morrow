import { isInAppSetupEnabled } from "@/lib/in-app-setup";

export type AppNavItem = {
  href: string;
  label: string;
  prefetch?: false;
};

export const appHeaderNavItems: readonly AppNavItem[] = [
  { href: "/", label: "Home" },
  { href: "/inbox", label: "Inbox", prefetch: false },
  { href: "/files", label: "Files", prefetch: false },
];

const accountNavBase: readonly AppNavItem[] = [
  { href: "/", label: "Home" },
  { href: "/inbox", label: "Inbox", prefetch: false },
  { href: "/files", label: "Files", prefetch: false },
  { href: "/usage", label: "Usage", prefetch: false },
  { href: "/settings", label: "Settings", prefetch: false },
];

const setupNavItem: AppNavItem = {
  href: "/settings/setup",
  label: "Setup",
  prefetch: false,
};

export function getAppAccountNavItems(): readonly AppNavItem[] {
  if (!isInAppSetupEnabled()) return accountNavBase;
  return [...accountNavBase, setupNavItem];
}

export function isAppNavActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  if (href === "/settings") return pathname === "/settings";
  return pathname === href || pathname.startsWith(`${href}/`);
}
