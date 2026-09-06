import type { ReactNode } from "react";
import { CheckIcon, ExternalLinkIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function SetupStep({
  children,
  done,
  id,
  last = false,
  open,
  onOpen,
  title,
}: {
  readonly children: ReactNode;
  readonly done: boolean;
  readonly id: string;
  readonly last?: boolean;
  readonly open: boolean;
  readonly onOpen: () => void;
  readonly title: string;
}) {
  return (
    <li className={cn(!last && "border-b")}>
      <button
        aria-controls={`setup-step-${id}`}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left outline-none hover:bg-accent/40 focus-visible:bg-accent/40"
        onClick={onOpen}
        type="button"
      >
        <span
          aria-hidden
          className={cn(
            "flex size-6 shrink-0 items-center justify-center rounded-full border text-xs",
            done
              ? "border-transparent bg-foreground text-background"
              : "border-border text-muted-foreground",
          )}
        >
          {done ? <CheckIcon className="size-3.5" /> : null}
        </span>
        <span className="min-w-0 flex-1 font-medium text-sm">{title}</span>
        <span className="text-muted-foreground text-xs">{done ? "Done" : "To do"}</span>
      </button>
      {open ? (
        <div
          className="space-y-3 px-4 pb-4 text-muted-foreground text-sm leading-relaxed [&_strong]:font-medium [&_strong]:text-foreground"
          id={`setup-step-${id}`}
        >
          {children}
        </div>
      ) : null}
    </li>
  );
}

export function OutLink({ href, children }: { readonly href: string; readonly children: ReactNode }) {
  return (
    <a
      className="inline-flex items-center gap-1 underline"
      href={href}
      rel="noreferrer"
      target="_blank"
    >
      {children}
      <ExternalLinkIcon aria-hidden className="size-3" />
    </a>
  );
}
