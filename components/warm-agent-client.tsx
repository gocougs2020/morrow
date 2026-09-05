"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { warmEveRuntime } from "@/lib/start-web-session";

export function WarmAgentClient() {
  const router = useRouter();

  useEffect(() => {
    router.prefetch("/s");
    warmEveRuntime();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- router identity is not stable; warm once on mount
  }, []);

  return null;
}
