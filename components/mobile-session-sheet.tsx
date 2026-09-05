"use client";

import { MenuIcon } from "lucide-react";
import type { ReactNode } from "react";
import { SessionSidebar } from "@/components/session-sidebar";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import type { ChatRecord } from "@/lib/types";
import { cn } from "@/lib/utils";

export function MobileSessionSheet({
  activeChatId,
  chats,
  onDeleteChat,
  trigger,
  triggerClassName,
}: {
  readonly activeChatId?: string;
  readonly chats?: ChatRecord[];
  readonly onDeleteChat?: (chat: ChatRecord) => Promise<void> | void;
  readonly trigger?: ReactNode;
  readonly triggerClassName?: string;
}) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        {trigger ?? (
          <Button
            aria-label="Open menu"
            className={cn(triggerClassName)}
            size="icon-sm"
            variant="ghost"
          >
            <MenuIcon aria-hidden="true" />
          </Button>
        )}
      </SheetTrigger>
      <SheetContent
        className="w-72 gap-0 overflow-hidden p-0 sm:max-w-72"
        onOpenAutoFocus={(event) => {
          event.preventDefault();
        }}
        side="left"
      >
        <SheetTitle className="sr-only">Menu</SheetTitle>
        <SessionSidebar
          activeChatId={activeChatId}
          chats={chats}
          onDeleteChat={onDeleteChat}
        />
      </SheetContent>
    </Sheet>
  );
}
