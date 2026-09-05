import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import type { ReactNode } from "react";
import { AppNavigation } from "@/components/app-navigation";
import { PwaRegister } from "@/components/pwa-register";
import { ThemeProvider } from "@/components/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { WarmAgentClient } from "@/components/warm-agent-client";
import { APP_NAME, APP_TAGLINE } from "@/lib/brand";
import { pwaThemeColor } from "@/lib/pwa";
import { cn } from "@/lib/utils";
import "katex/dist/katex.min.css";
import "./globals.css";

const sans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: "variable",
  display: "swap",
});

const mono = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: "variable",
  display: "swap",
});

export const metadata: Metadata = {
  applicationName: APP_NAME,
  title: APP_NAME,
  description: APP_TAGLINE,
  appleWebApp: {
    statusBarStyle: "default",
    title: APP_NAME,
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  initialScale: 1,
  interactiveWidget: "resizes-content",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: pwaThemeColor.light },
    { media: "(prefers-color-scheme: dark)", color: pwaThemeColor.dark },
  ],
  viewportFit: "cover",
  width: "device-width",
};

export default function RootLayout({ children }: { readonly children: ReactNode }) {
  return (
    <html className={cn(sans.variable, mono.variable)} lang="en" suppressHydrationWarning>
      <head>
        <link href="/manifest.webmanifest" rel="manifest" />
      </head>
      <body className="antialiased">
        <ThemeProvider attribute="class" defaultTheme="system" disableTransitionOnChange enableSystem>
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-background focus:px-3 focus:py-2 focus:ring-2 focus:ring-ring"
          >
            Skip to main content
          </a>
          <TooltipProvider>
            <AppNavigation />
            <PwaRegister />
            <WarmAgentClient />
            {children}
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
