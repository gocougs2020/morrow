import type { MetadataRoute } from "next";
import { APP_NAME, APP_TAGLINE } from "@/lib/brand";
import { pwaThemeColor } from "@/lib/pwa";

export default function manifest(): MetadataRoute.Manifest {
  return {
    background_color: pwaThemeColor.light,
    categories: ["productivity"],
    description: APP_TAGLINE,
    display: "standalone",
    display_override: ["standalone", "browser"],
    icons: [
      {
        src: "/icons/192",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/512",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/icons/512-maskable",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    id: "/",
    lang: "en",
    launch_handler: {
      client_mode: ["navigate-existing", "auto"],
    },
    name: APP_NAME,
    short_name: APP_NAME,
    shortcuts: [
      {
        name: "New session",
        short_name: "New",
        url: "/s",
      },
      {
        name: "Files",
        url: "/files",
      },
      {
        name: "Inbox",
        url: "/inbox",
      },
    ],
    start_url: "/",
    scope: "/",
    theme_color: pwaThemeColor.light,
  };
}
