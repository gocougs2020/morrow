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

export const appAccountNavItems: readonly AppNavItem[] = [
  { href: "/", label: "Home" },
  { href: "/inbox", label: "Inbox", prefetch: false },
  { href: "/files", label: "Files", prefetch: false },
  { href: "/usage", label: "Usage", prefetch: false },
  { href: "/settings", label: "Settings", prefetch: false },
];

export function isAppNavActive(pathname: string, href: string): boolean {
  return href === "/"
    ? pathname === "/"
    : pathname === href || pathname.startsWith(`${href}/`);
}
