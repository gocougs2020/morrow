"use client";

import { BoldIcon, Heading2Icon, ItalicIcon, ListIcon, ListOrderedIcon } from "lucide-react";
import { type ReactNode, useLayoutEffect, useRef } from "react";
import { VoiceMicButton } from "@/components/voice-mic-button";
import { Button } from "@/components/ui/button";
import {
  htmlToMarkdown,
  markdownToSafeHtml,
  normalizeInstructionMarkdown,
} from "@/lib/markdown-document";
import { cn } from "@/lib/utils";

const emptyEditorHtml = { __html: "" };

function runCommand(command: string, value?: string) {
  document.execCommand(command, false, value);
}

function insertPlainText(root: HTMLElement, text: string) {
  root.focus();
  const selection = window.getSelection();
  if (selection && selection.rangeCount > 0 && root.contains(selection.anchorNode)) {
    const range = selection.getRangeAt(0);
    range.deleteContents();
    const node = document.createTextNode(text);
    range.insertNode(node);
    range.setStartAfter(node);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
    return;
  }

  const spacer = root.textContent?.trim() ? " " : "";
  root.append(document.createTextNode(`${spacer}${text}`));
}

export function MarkdownDocumentEditor({
  className,
  disabled,
  minHeightClassName = "min-h-56",
  onChange,
  placeholder = "Write how the agent should work…",
  value,
}: {
  readonly className?: string;
  readonly disabled?: boolean;
  readonly minHeightClassName?: string;
  readonly onChange: (markdown: string) => void;
  readonly placeholder?: string;
  readonly value: string;
}) {
  const editorRef = useRef<HTMLDivElement>(null);
  const lastEmitted = useRef<string | null>(null);

  useLayoutEffect(() => {
    const editor = editorRef.current;
    if (!editor?.isConnected) return;
    const incoming = normalizeInstructionMarkdown(value);
    if (incoming === lastEmitted.current) return;
    editor.innerHTML = markdownToSafeHtml(value);
    lastEmitted.current = incoming;
  }, [value]);

  const emit = () => {
    const editor = editorRef.current;
    if (!editor) return;
    const markdown = normalizeInstructionMarkdown(htmlToMarkdown(editor));
    lastEmitted.current = markdown;
    onChange(markdown);
  };

  const focusEditor = () => {
    editorRef.current?.focus();
  };

  return (
    <div className={cn("overflow-hidden rounded-xl border bg-card", className)}>
      <div className="flex items-center gap-1 border-b px-2 py-1.5">
        <ToolbarButton
          disabled={disabled}
          label="Heading"
          onClick={() => {
            focusEditor();
            runCommand("formatBlock", "<h2>");
            emit();
          }}
        >
          <Heading2Icon />
        </ToolbarButton>
        <ToolbarButton
          disabled={disabled}
          label="Bold"
          onClick={() => {
            focusEditor();
            runCommand("bold");
            emit();
          }}
        >
          <BoldIcon />
        </ToolbarButton>
        <ToolbarButton
          disabled={disabled}
          label="Italic"
          onClick={() => {
            focusEditor();
            runCommand("italic");
            emit();
          }}
        >
          <ItalicIcon />
        </ToolbarButton>
        <ToolbarButton
          disabled={disabled}
          label="Bulleted list"
          onClick={() => {
            focusEditor();
            runCommand("insertUnorderedList");
            emit();
          }}
        >
          <ListIcon />
        </ToolbarButton>
        <ToolbarButton
          disabled={disabled}
          label="Numbered list"
          onClick={() => {
            focusEditor();
            runCommand("insertOrderedList");
            emit();
          }}
        >
          <ListOrderedIcon />
        </ToolbarButton>
      </div>
      <div className="relative">
        <div
          className={cn(
            "markdown-document-editor px-4 py-3 pr-14 pb-12 text-sm outline-none",
            minHeightClassName,
            disabled && "pointer-events-none opacity-60",
          )}
          contentEditable={!disabled}
          dangerouslySetInnerHTML={emptyEditorHtml}
          data-placeholder={placeholder}
          ref={editorRef}
          role="textbox"
          suppressContentEditableWarning
          aria-multiline
          onBlur={emit}
          onInput={emit}
          onPaste={(event) => {
            event.preventDefault();
            const text = event.clipboardData.getData("text/plain");
            runCommand("insertText", text);
            emit();
          }}
        />
        <VoiceMicButton
          className="absolute right-2 bottom-2"
          disabled={disabled}
          onTranscript={(text) => {
            const editor = editorRef.current;
            if (!editor) return;
            insertPlainText(editor, text);
            emit();
          }}
        />
      </div>
    </div>
  );
}

function ToolbarButton({
  children,
  disabled,
  label,
  onClick,
}: {
  readonly children: ReactNode;
  readonly disabled?: boolean;
  readonly label: string;
  readonly onClick: () => void;
}) {
  return (
    <Button
      aria-label={label}
      className="text-muted-foreground"
      disabled={disabled}
      size="icon-sm"
      type="button"
      variant="ghost"
      onClick={onClick}
    >
      {children}
    </Button>
  );
}
