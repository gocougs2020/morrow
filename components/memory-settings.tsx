"use client";

import { PlusIcon, Trash2Icon } from "lucide-react";
import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import { VoiceMicButton } from "@/components/voice-mic-button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { InputGroup, InputGroupAddon, InputGroupTextarea } from "@/components/ui/input-group";
import { Textarea } from "@/components/ui/textarea";
import type { ProfileMemory } from "@/lib/types";
import { cn } from "@/lib/utils";

const SAVE_DEBOUNCE_MS = 500;
const MEMORY_FIELD_MIN_HEIGHT = "calc(1lh + 1rem + 2px)";
const MEMORY_FIELD_MAX_HEIGHT = "calc(3lh + 1rem + 2px)";

function useMemoryFieldSizing(className?: string) {
  const [expanded, setExpanded] = useState(false);
  return {
    rows: 1 as const,
    className: cn("min-h-0 resize-y overflow-y-auto", className),
    style: {
      minHeight: MEMORY_FIELD_MIN_HEIGHT,
      maxHeight: expanded ? undefined : MEMORY_FIELD_MAX_HEIGHT,
    } satisfies CSSProperties,
    onPointerUp: (event: PointerEvent<HTMLTextAreaElement>) => {
      if (event.currentTarget.style.height) setExpanded(true);
    },
  };
}

type MemoriesPayload = {
  error?: string;
  memories?: ProfileMemory[];
};

async function parseMemoriesResponse(response: Response): Promise<ProfileMemory[]> {
  const payload = (await response.json().catch(() => ({}))) as MemoriesPayload;
  if (!response.ok) {
    throw new Error(payload.error || "Unable to update memories.");
  }
  return payload.memories ?? [];
}

export function MemorySettings({ active = true }: { readonly active?: boolean }) {
  const [memories, setMemories] = useState<ProfileMemory[]>([]);
  const [nextText, setNextText] = useState("");
  const [adding, setAdding] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savingNew, setSavingNew] = useState(false);
  const [error, setError] = useState<string>();
  const newMemoryField = useMemoryFieldSizing("px-3 pt-3");

  const refresh = async () => {
    const response = await fetch("/api/memories");
    setMemories(await parseMemoriesResponse(response));
  };

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- load memories when the tab is shown
    setLoading(true);
    void refresh()
      .catch((loadError) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load memories.");
          setMemories([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [active]);

  const saveNew = () => {
    if (savingNew || !nextText.trim()) return;
    setSavingNew(true);
    setError(undefined);
    void (async () => {
      try {
        const response = await fetch("/api/memories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: nextText }),
        });
        setMemories(await parseMemoriesResponse(response));
        setNextText("");
        setAdding(false);
      } catch (saveError) {
        setError(saveError instanceof Error ? saveError.message : "Unable to update memories.");
      } finally {
        setSavingNew(false);
      }
    })();
  };

  useEffect(() => {
    if (!adding || savingNew || !nextText.trim()) return;
    const handle = window.setTimeout(() => {
      saveNew();
    }, SAVE_DEBOUNCE_MS);
    return () => window.clearTimeout(handle);
  }, [adding, nextText, savingNew]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1.5 w-3/4">
            <CardTitle>Memories</CardTitle>
            <CardDescription>
              Durable facts and working preferences stored only for you. These follow you into every
              future chat. Do not store confidential information.
            </CardDescription>
          </div>
          <div className="w-1/4 flex justify-end">
          <Button
            aria-controls="new-memory-composer"
            aria-expanded={adding}
            className="shrink-0"
            size="sm"
            type="button"
            variant={adding ? "secondary" : "outline"}
            onClick={() => {
              setAdding((open) => !open);
              setError(undefined);
            }}
          >
            <PlusIcon />
              New Memory
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {adding ? (
          <InputGroup className="bg-card dark:bg-card" id="new-memory-composer">
            <InputGroupTextarea
              autoFocus
              className={newMemoryField.className}
              disabled={savingNew}
              placeholder="Prefers morning calls…"
              rows={newMemoryField.rows}
              style={newMemoryField.style}
              value={nextText}
              onChange={(event) => setNextText(event.currentTarget.value)}
              onPointerUp={newMemoryField.onPointerUp}
              onKeyDown={(event) => {
                if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) {
                  return;
                }
                event.preventDefault();
                saveNew();
              }}
            />
            <InputGroupAddon align="block-end" className="border-t px-2 pb-2">
              <VoiceMicButton
                disabled={savingNew}
                onTranscript={(text) => {
                  setNextText((current) => (current.trim() ? `${current.trim()} ${text}` : text));
                }}
              />
            </InputGroupAddon>
          </InputGroup>
        ) : null}
        {error ? (
          <p className="text-destructive text-sm" role="alert">
            {error}
          </p>
        ) : null}
        {loading ? (
          <p className="text-muted-foreground text-sm">Loading memories…</p>
        ) : memories.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No memories yet. Add one, or ask Eve to remember something in chat.
          </p>
        ) : (
          memories.map((memory) => (
            <SavedMemoryRow
              key={memory.index}
              memory={memory}
              onError={setError}
              onMemoriesChange={setMemories}
            />
          ))
        )}
      </CardContent>
    </Card>
  );
}

function SavedMemoryRow({
  memory,
  onError,
  onMemoriesChange,
}: {
  readonly memory: ProfileMemory;
  readonly onError: (message: string | undefined) => void;
  readonly onMemoriesChange: (memories: ProfileMemory[]) => void;
}) {
  const [draft, setDraft] = useState(memory.text);
  const [deleting, setDeleting] = useState(false);
  const field = useMemoryFieldSizing();
  const savedText = useRef(memory.text);
  // eslint-disable-next-line react-hooks/refs -- compare against the last persisted text
  savedText.current = memory.text;

  useEffect(() => {
    if (draft === memory.text) return;
    let ignore = false;
    const handle = window.setTimeout(() => {
      const text = draft.trim();
      if (!text || text === savedText.current) return;
      onError(undefined);
      void (async () => {
        try {
          const response = await fetch("/api/memories", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ index: memory.index, text }),
          });
          const next = await parseMemoriesResponse(response);
          if (!ignore) onMemoriesChange(next);
        } catch (saveError) {
          if (!ignore) {
            onError(saveError instanceof Error ? saveError.message : "Unable to update memories.");
          }
        }
      })();
    }, SAVE_DEBOUNCE_MS);
    return () => {
      ignore = true;
      window.clearTimeout(handle);
    };
  }, [draft, memory.index, memory.text, onError, onMemoriesChange]);

  const remove = async () => {
    setDeleting(true);
    onError(undefined);
    try {
      const response = await fetch("/api/memories", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ index: memory.index }),
      });
      onMemoriesChange(await parseMemoriesResponse(response));
    } catch (saveError) {
      onError(saveError instanceof Error ? saveError.message : "Unable to update memories.");
      setDeleting(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Textarea
        aria-label="Saved memory"
        className={field.className}
        rows={field.rows}
        style={field.style}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onPointerUp={field.onPointerUp}
      />
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            aria-label="Delete this memory"
            className="text-muted-foreground hover:text-muted-foreground"
            disabled={deleting}
            size="icon"
            type="button"
            variant="ghost"
          >
            <Trash2Icon />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this memory?</AlertDialogTitle>
            <AlertDialogDescription>
              Eve will stop using this sticky note in future chats.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void remove()}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
