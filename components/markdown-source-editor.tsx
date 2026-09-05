"use client";

import { useRef } from "react";
import { VoiceMicButton } from "@/components/voice-mic-button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export function MarkdownSourceEditor({
  disabled,
  fillHeight,
  minHeightClassName = "min-h-80",
  onChange,
  placeholder = "Start writing…",
  value,
}: {
  readonly disabled?: boolean;
  readonly fillHeight?: boolean;
  readonly minHeightClassName?: string;
  readonly onChange: (markdown: string) => void;
  readonly placeholder?: string;
  readonly value: string;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const insertAtCursor = (text: string) => {
    const editor = textareaRef.current;
    if (!editor) {
      onChange(value ? `${value} ${text}` : text);
      return;
    }

    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    const next = `${value.slice(0, start)}${text}${value.slice(end)}`;
    onChange(next);
    const cursor = start + text.length;
    requestAnimationFrame(() => {
      editor.focus();
      editor.setSelectionRange(cursor, cursor);
    });
  };

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border bg-card",
        fillHeight && "flex min-h-0 flex-1 flex-col",
      )}
    >
      <div className="shrink-0 border-b px-3 py-2 font-mono text-muted-foreground text-xs">
        Markdown
      </div>
      <div className={cn("relative", fillHeight && "min-h-0 flex-1")}>
        <Textarea
          ref={textareaRef}
          aria-label="Markdown source"
          autoComplete="off"
          className={cn(
            "rounded-none border-0 bg-transparent pr-14 pb-12 font-mono text-sm shadow-none dark:bg-transparent",
            fillHeight ? "h-full min-h-0 resize-none" : cn("resize-y", minHeightClassName),
          )}
          disabled={disabled}
          name="markdown-source"
          placeholder={placeholder}
          spellCheck
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
        <VoiceMicButton
          className="absolute right-2 bottom-2"
          disabled={disabled}
          onTranscript={insertAtCursor}
        />
      </div>
    </div>
  );
}
