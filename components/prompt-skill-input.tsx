"use client";

import type { KeyboardEvent as ReactKeyboardEvent, RefObject } from "react";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePromptInputAttachments } from "@/components/ai-elements/prompt-input";
import { useAvailableSkills } from "@/hooks/use-available-skills";
import { filterAvailableSkills, type AvailableSkill } from "@/lib/available-skills";
import {
  insertSkillMention,
  slashQueryAt,
  tokenizeSkillMentions,
} from "@/lib/skill-mention";
import { cn } from "@/lib/utils";

const chipClassName =
  "mx-0.5 text-sm inline-flex items-center rounded-full bg-blue-100 px-2.5 py-1 align-middle text-blue-900";

const emptyEditorHtml = { __html: "" };
const slashMenuWidth = 336;

export function PromptSkillInput({
  autoFocus,
  className,
  disabled,
  onValueChange,
  placeholder,
  slashMenuPlacement = "below-slash",
  value,
}: {
  readonly autoFocus?: boolean;
  readonly className?: string;
  readonly disabled?: boolean;
  readonly onValueChange: (value: string) => void;
  readonly placeholder?: string;
  readonly slashMenuPlacement?: "above-input" | "below-slash";
  readonly value: string;
}) {
  const skills = useAvailableSkills();
  const attachments = usePromptInputAttachments();
  const rootRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const caretRef = useRef(value.length);
  const [caret, setCaret] = useState(value.length);
  const [highlightState, setHighlightState] = useState<{
    index: number;
    key?: string;
  }>({ index: 0 });
  const [dismissedAt, setDismissedAt] = useState<number>();

  const slugs = useMemo(() => new Set(skills.map((skill) => skill.slug)), [skills]);
  const slash = slashQueryAt(value, caret, slugs);
  const matches = useMemo(
    () => (slash ? filterAvailableSkills(skills, slash.query) : []),
    [skills, slash],
  );
  const menuOpen = Boolean(slash) && !disabled && dismissedAt !== slash?.start;
  const slashKey = slash ? `${slash.start}:${slash.query}` : undefined;
  const highlight = highlightState.key === slashKey ? highlightState.index : 0;
  const setHighlight = useCallback(
    (next: number | ((current: number) => number)) => {
      setHighlightState((prev) => {
        const current = prev.key === slashKey ? prev.index : 0;
        const index = typeof next === "function" ? next(current) : next;
        if (prev.key === slashKey && prev.index === index) return prev;
        return { index, key: slashKey };
      });
    },
    [slashKey],
  );

  useEffect(() => {
    const active = listRef.current?.querySelector("[data-active=true]");
    if (active instanceof HTMLElement) {
      active.scrollIntoView({ block: "nearest" });
    }
  }, [highlight, menuOpen]);

  useLayoutEffect(() => {
    if (!autoFocus) return;
    editorRef.current?.focus();
  }, [autoFocus]);

  useLayoutEffect(() => {
    const editor = editorRef.current;
    if (!editor?.isConnected) return;
    if (!needsEditorRender(editor, value, slugs)) return;
    if (document.activeElement !== editor) {
      caretRef.current = value.length;
      setCaret(value.length);
    }
    renderEditor(editor, value, slugs);
    if (document.activeElement === editor) {
      setCaretOffset(editor, caretRef.current);
    }
  }, [slugs, value]);

  const updateCaret = (next: number) => {
    caretRef.current = next;
    setCaret(next);
  };

  const applyMention = useCallback(
    (skill: AvailableSkill) => {
      const next = insertSkillMention(value, skill.slug, caretRef.current);
      onValueChange(next.value);
      updateCaret(next.caret);
      setDismissedAt(undefined);
      requestAnimationFrame(() => {
        const editor = editorRef.current;
        if (!editor) return;
        editor.focus();
        setCaretOffset(editor, next.caret);
      });
    },
    [onValueChange, value],
  );

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (menuOpen && event.key === "ArrowDown") {
      event.preventDefault();
      setHighlight((current) => (matches.length === 0 ? 0 : (current + 1) % matches.length));
      return;
    }
    if (menuOpen && event.key === "ArrowUp") {
      event.preventDefault();
      setHighlight((current) =>
        matches.length === 0 ? 0 : (current - 1 + matches.length) % matches.length,
      );
      return;
    }
    if (menuOpen && event.key === "Escape") {
      event.preventDefault();
      setDismissedAt(slash?.start);
      return;
    }
    const skill = matches[highlight];
    if (menuOpen && skill && (event.key === "Tab" || event.key === "Enter") && !event.shiftKey) {
      event.preventDefault();
      applyMention(skill);
      return;
    }
    if (
      event.key === "Backspace" &&
      value === "" &&
      attachments.files.length > 0
    ) {
      event.preventDefault();
      const lastAttachment = attachments.files.at(-1);
      if (lastAttachment) attachments.remove(lastAttachment.id);
      return;
    }
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      const form = event.currentTarget.closest("form");
      const submitButton = form?.querySelector('button[type="submit"]');
      if (submitButton instanceof HTMLButtonElement && submitButton.disabled) return;
      event.preventDefault();
      form?.requestSubmit();
    }
  };

  return (
    <div className="relative w-full" ref={rootRef}>
      {menuOpen ? (
        <SkillSlashMenu
          anchorRef={rootRef}
          highlight={highlight}
          listRef={listRef}
          onHighlight={setHighlight}
          onSelect={applyMention}
          placement={slashMenuPlacement}
          query={slash?.query ?? ""}
          skills={matches}
        />
      ) : null}
      <textarea
        aria-hidden
        className="sr-only"
        name="message"
        readOnly
        tabIndex={-1}
        value={value}
      />
      <div
        aria-autocomplete="list"
        aria-controls={menuOpen ? "skill-slash-menu" : undefined}
        aria-expanded={menuOpen}
        aria-label={placeholder}
        className={cn(
          "field-sizing-content max-h-48 min-h-16 w-full overflow-y-auto bg-transparent text-md outline-none",
          "whitespace-pre-wrap break-words empty:before:pointer-events-none empty:before:text-muted-foreground empty:before:content-[attr(data-placeholder)]",
          disabled && "pointer-events-none opacity-50",
          className,
        )}
        contentEditable={!disabled}
        dangerouslySetInnerHTML={emptyEditorHtml}
        data-placeholder={placeholder}
        data-skill-prompt
        data-slot="input-group-control"
        onFocus={() => {
          const editor = editorRef.current;
          if (editor) setCaretOffset(editor, caretRef.current);
        }}
        onInput={() => {
          const editor = editorRef.current;
          if (!editor) return;
          const next = serializeEditor(editor);
          updateCaret(caretOffset(editor));
          onValueChange(next);
        }}
        onKeyDown={handleKeyDown}
        onKeyUp={() => {
          const editor = editorRef.current;
          if (editor) updateCaret(caretOffset(editor));
        }}
        onMouseUp={() => {
          const editor = editorRef.current;
          if (editor) updateCaret(caretOffset(editor));
        }}
        onDragOver={(event) => {
          if (event.dataTransfer?.types.includes("Files")) {
            event.preventDefault();
          }
        }}
        onDrop={(event) => {
          if (event.dataTransfer?.types.includes("Files")) {
            event.preventDefault();
          }
        }}
        onPaste={(event) => {
          const items = event.clipboardData?.items;
          const files: File[] = [];
          if (items) {
            for (const item of items) {
              if (item.kind === "file") {
                const file = item.getAsFile();
                if (file) files.push(file);
              }
            }
          }
          if (files.length > 0) {
            event.preventDefault();
            attachments.add(files);
            return;
          }
          event.preventDefault();
          const text = event.clipboardData?.getData("text/plain") ?? "";
          document.execCommand("insertText", false, text);
        }}
        ref={editorRef}
        role="combobox"
        suppressContentEditableWarning
      />
    </div>
  );
}

function needsEditorRender(
  root: HTMLElement,
  value: string,
  slugs: ReadonlySet<string>,
): boolean {
  if (serializeEditor(root) !== value) return true;
  let expectedChips = 0;
  for (const token of tokenizeSkillMentions(value, slugs)) {
    if (token.type === "skill") expectedChips += 1;
  }
  return root.querySelectorAll("[data-skill-slug]").length !== expectedChips;
}

function renderEditor(root: HTMLElement, value: string, slugs: ReadonlySet<string>) {
  if (!root.isConnected) return;
  root.replaceChildren();
  if (!value) return;
  for (const token of tokenizeSkillMentions(value, slugs)) {
    if (token.type === "skill") {
      const chip = document.createElement("span");
      chip.className = chipClassName;
      chip.contentEditable = "false";
      chip.dataset.skillSlug = token.slug;
      chip.textContent = `/${token.slug}`;
      root.appendChild(chip);
      continue;
    }
    const parts = token.value.split("\n");
    parts.forEach((part, index) => {
      if (index > 0) root.appendChild(document.createElement("br"));
      if (part) root.appendChild(document.createTextNode(part));
    });
  }
}

function serializeEditor(root: HTMLElement): string {
  let text = "";
  const walk = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      text += (node.textContent ?? "").replaceAll("\u200B", "");
      return;
    }
    if (node instanceof HTMLElement && node.dataset.skillSlug) {
      text += `/${node.dataset.skillSlug}`;
      return;
    }
    if (node.nodeName === "BR") {
      text += "\n";
      return;
    }
    for (const child of node.childNodes) walk(child);
  };
  walk(root);
  return text;
}

function caretOffset(root: HTMLElement): number {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return serializeEditor(root).length;
  const range = selection.getRangeAt(0);
  let offset = 0;
  let found = false;

  const consume = (node: Node) => {
    if (found) return;
    if (node === range.endContainer) {
      if (node.nodeType === Node.TEXT_NODE) {
        offset += range.endOffset;
      } else {
        for (let index = 0; index < range.endOffset; index += 1) {
          const child = node.childNodes[index];
          if (child) consumeFull(child);
        }
      }
      found = true;
      return;
    }
    if (node.nodeType === Node.TEXT_NODE) {
      offset += (node.textContent ?? "").replaceAll("\u200B", "").length;
      return;
    }
    if (node instanceof HTMLElement && node.dataset.skillSlug) {
      offset += 1 + node.dataset.skillSlug.length;
      return;
    }
    if (node.nodeName === "BR") {
      offset += 1;
      return;
    }
    for (const child of node.childNodes) consume(child);
  };

  const consumeFull = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      offset += (node.textContent ?? "").replaceAll("\u200B", "").length;
      return;
    }
    if (node instanceof HTMLElement && node.dataset.skillSlug) {
      offset += 1 + node.dataset.skillSlug.length;
      return;
    }
    if (node.nodeName === "BR") {
      offset += 1;
      return;
    }
    for (const child of node.childNodes) consumeFull(child);
  };

  consume(root);
  return offset;
}

function setCaretOffset(root: HTMLElement, offset: number) {
  const selection = window.getSelection();
  if (!selection) return;
  let remaining = Math.max(0, offset);
  const range = document.createRange();
  let placed = false;

  const walk = (node: Node): boolean => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = (node.textContent ?? "").replaceAll("\u200B", "");
      if (remaining <= text.length) {
        range.setStart(node, remaining);
        range.collapse(true);
        placed = true;
        return true;
      }
      remaining -= text.length;
      return false;
    }
    if (node instanceof HTMLElement && node.dataset.skillSlug) {
      const length = 1 + node.dataset.skillSlug.length;
      if (remaining <= length) {
        range.setStartAfter(node);
        range.collapse(true);
        placed = true;
        return true;
      }
      remaining -= length;
      return false;
    }
    if (node.nodeName === "BR") {
      if (remaining <= 1) {
        range.setStartAfter(node);
        range.collapse(true);
        placed = true;
        return true;
      }
      remaining -= 1;
      return false;
    }
    for (const child of node.childNodes) {
      if (walk(child)) return true;
    }
    return false;
  };

  walk(root);
  if (!placed) {
    range.selectNodeContents(root);
    range.collapse(false);
  }
  selection.removeAllRanges();
  selection.addRange(range);
}

function slashCaretRect(): DOMRect | undefined {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return undefined;
  const range = selection.getRangeAt(0).cloneRange();
  range.collapse(true);
  if (range.startContainer.nodeType === Node.TEXT_NODE && range.startOffset > 0) {
    range.setStart(range.startContainer, range.startOffset - 1);
  }
  const rects = range.getClientRects();
  const rect = rects.item(rects.length - 1) ?? range.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0 && rect.top === 0 && rect.left === 0) {
    return undefined;
  }
  return rect;
}

function SkillSlashMenu({
  anchorRef,
  highlight,
  listRef,
  onHighlight,
  onSelect,
  placement,
  query,
  skills,
}: {
  readonly anchorRef: RefObject<HTMLDivElement | null>;
  readonly highlight: number;
  readonly listRef: RefObject<HTMLDivElement | null>;
  readonly onHighlight: (index: number) => void;
  readonly onSelect: (skill: AvailableSkill) => void;
  readonly placement: "above-input" | "below-slash";
  readonly query: string;
  readonly skills: readonly AvailableSkill[];
}) {
  const builtin = skills.filter((skill) => skill.source === "builtin");
  const user = skills.filter((skill) => skill.source === "user");
  const [box, setBox] = useState<{ bottom?: number; left: number; top?: number }>();

  useLayoutEffect(() => {
    const update = () => {
      const caret = slashCaretRect();
      const editor = anchorRef.current?.getBoundingClientRect();
      const input = anchorRef.current
        ?.closest("[data-slot=input-group]")
        ?.getBoundingClientRect();
      const leftSource = caret ?? editor ?? input;
      if (!leftSource) return;
      const left = Math.min(
        Math.max(8, leftSource.left),
        window.innerWidth - slashMenuWidth - 8,
      );
      if (placement === "above-input") {
        const above = input ?? editor;
        if (!above) return;
        setBox({
          left,
          bottom: window.innerHeight - above.top + 8,
        });
        return;
      }
      const below = caret ?? editor;
      if (!below) return;
      setBox({
        left,
        top: below.bottom + 6,
      });
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [anchorRef, placement, query, skills.length]);

  if (!box) return null;

  return createPortal(
    <div
      className="fixed z-50 overflow-hidden rounded-xl border bg-popover text-popover-foreground shadow-md"
      id="skill-slash-menu"
      role="listbox"
      aria-label="Skills"
      style={{
        left: box.left,
        top: box.top,
        bottom: box.bottom,
        width: slashMenuWidth,
      }}
    >
      <div className="max-h-64 overflow-y-auto py-1" ref={listRef}>
        {skills.length === 0 ? (
          <p className="px-3 py-2 text-muted-foreground text-sm">No matching skills</p>
        ) : (
          <>
            <SkillSlashGroup
              offset={0}
              onHighlight={onHighlight}
              onSelect={onSelect}
              selectedIndex={highlight}
              skills={builtin}
              title="Built-in"
            />
            <SkillSlashGroup
              offset={builtin.length}
              onHighlight={onHighlight}
              onSelect={onSelect}
              selectedIndex={highlight}
              skills={user}
              title="Your skills"
            />
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}

function SkillSlashGroup({
  offset,
  onHighlight,
  onSelect,
  selectedIndex,
  skills,
  title,
}: {
  readonly offset: number;
  readonly onHighlight: (index: number) => void;
  readonly onSelect: (skill: AvailableSkill) => void;
  readonly selectedIndex: number;
  readonly skills: readonly AvailableSkill[];
  readonly title: string;
}) {
  if (skills.length === 0) return null;

  return (
    <div>
      <p className="px-3 pt-2 pb-1 font-medium text-muted-foreground text-xs">{title}</p>
      {skills.map((skill, index) => {
        const absolute = offset + index;
        const active = absolute === selectedIndex;
        return (
          <button
            className={cn(
              "flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm",
              active ? "bg-accent text-accent-foreground" : "hover:bg-accent/60",
            )}
            data-active={active}
            id={`skill-slash-option-${skill.slug}`}
            key={`${skill.source}-${skill.slug}`}
            role="option"
            type="button"
            aria-selected={active}
            onMouseDown={(event) => {
              event.preventDefault();
              onSelect(skill);
            }}
            onMouseEnter={() => onHighlight(absolute)}
          >
            <span aria-hidden className="w-5 shrink-0 text-center text-xs">
              {skill.emoji ?? "·"}
            </span>
            <span className="min-w-0 flex-1 truncate">{skill.title}</span>
            <span className="shrink-0 font-mono text-muted-foreground text-xs">/{skill.slug}</span>
          </button>
        );
      })}
    </div>
  );
}
