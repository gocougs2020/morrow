import { SparklesIcon, SquareTerminalIcon } from "lucide-react";
import { APP_NAME, APP_TAGLINE } from "@/lib/brand";

export function BrandHero() {
  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <div className="relative size-12" aria-hidden>
        <span className="absolute top-0 left-0 flex size-10 items-center justify-center rounded-full bg-foreground text-background">
          <SquareTerminalIcon className="size-4" />
        </span>
        <span className="absolute right-0 bottom-0 flex size-10 items-center justify-center rounded-full border-2 border-foreground bg-background text-foreground">
          <SparklesIcon className="size-4" />
        </span>
      </div>
      <h1 className="text-pretty font-semibold text-2xl tracking-tight">{APP_NAME}</h1>
      <p className="max-w-md text-muted-foreground text-sm">{APP_TAGLINE}</p>
    </div>
  );
}
