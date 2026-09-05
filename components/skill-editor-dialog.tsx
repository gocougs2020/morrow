"use client";

import { useEffect, useRef, useState } from "react";
import { SparklesIcon } from "lucide-react";
import { InstructionPrompt } from "@/components/instruction-prompt";
import { MarkdownDocumentEditor } from "@/components/markdown-document-editor";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  SKILL_DISPLAY_NAME_MAX,
  SKILL_DISPLAY_NAME_MAX_WORDS,
  displayNameWords,
  sanitizeSkillDisplayName,
} from "@/lib/skill-display-name";
import {
  SKILL_DESCRIPTION_MAX,
  SKILL_NAME_MAX,
  SKILL_NAME_PATTERN,
  parseSkillDocument,
} from "@/lib/skill-document";
import type { UserSkill } from "@/lib/types";

const SAVE_DEBOUNCE_MS = 500;

export type SkillDraft = {
  description: string;
  markdown: string;
  name: string;
  slug: string;
};

const emptyDraft: SkillDraft = { description: "", markdown: "", name: "", slug: "" };

function draftFromSkill(skill?: UserSkill): SkillDraft {
  if (!skill) return emptyDraft;
  return {
    description: skill.description,
    markdown: parseSkillDocument(skill.markdown).body,
    name: skill.name.trim() || sanitizeSkillDisplayName("", skill.slug),
    slug: skill.slug,
  };
}

export function SkillEditorDialog({
  onOpenChange,
  onSave,
  open,
  readOnly = false,
  skill,
}: {
  readonly onOpenChange: (open: boolean) => void;
  readonly onSave: (draft: SkillDraft, skillId?: string) => Promise<UserSkill>;
  readonly open: boolean;
  readonly readOnly?: boolean;
  readonly skill?: UserSkill;
}) {
  const [draft, setDraft] = useState<SkillDraft>(emptyDraft);
  const [prompt, setPrompt] = useState("");
  const [showAi, setShowAi] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string>();
  const [sessionOpen, setSessionOpen] = useState(false);
  const skillIdRef = useRef<string | undefined>(undefined);
  const savedDraft = useRef<SkillDraft>(emptyDraft);
  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;

  if (open && !sessionOpen) {
    const next = draftFromSkill(skill);
    setSessionOpen(true);
    setDraft(next);
    savedDraft.current = next;
    skillIdRef.current = skill?.id;
    setPrompt("");
    setShowAi(!skill);
    setShowEditor(Boolean(skill));
    setError(undefined);
    setGenerating(false);
  } else if (!open && sessionOpen) {
    setSessionOpen(false);
  } else if (skill?.id) {
    skillIdRef.current = skill.id;
  }

  const generate = async () => {
    const trimmed = prompt.trim();
    if (!trimmed || generating) return;
    setGenerating(true);
    setError(undefined);
    try {
      const response = await fetch("/api/instructions/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          current: draft.markdown,
          kind: "skill",
          prompt: trimmed,
          skillDescription: draft.description,
          skillName: draft.name,
          skillSlug: draft.slug,
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        description?: string;
        error?: string;
        markdown?: string;
        name?: string;
        slug?: string;
      };
      if (!response.ok || !payload.markdown) {
        throw new Error(payload.error || "Unable to generate skill instructions.");
      }
      setDraft((current) => {
        const lockIdentity = Boolean(current.name.trim() && current.slug.trim());
        return {
          description: payload.description?.trim() || current.description,
          markdown: parseSkillDocument(payload.markdown ?? current.markdown).body,
          name: lockIdentity ? current.name : (payload.name?.trim() || current.name),
          slug: lockIdentity ? current.slug : (payload.slug?.trim() || current.slug),
        };
      });
      setPrompt("");
      setShowAi(false);
      setShowEditor(true);
    } catch (generateError) {
      setError(generateError instanceof Error ? generateError.message : "Unable to generate.");
    } finally {
      setGenerating(false);
    }
  };

  useEffect(() => {
    if (!open || generating || readOnly) return;
    const next = {
      description: draft.description.trim(),
      markdown: draft.markdown.trim(),
      name: draft.name.trim(),
      slug: draft.slug.trim(),
    };
    if (!next.name || !next.slug || !next.description || !next.markdown) return;
    if (
      next.name === savedDraft.current.name &&
      next.slug === savedDraft.current.slug &&
      next.description === savedDraft.current.description &&
      next.markdown === savedDraft.current.markdown
    ) {
      return;
    }
    let ignore = false;
    const handle = window.setTimeout(() => {
      if (
        next.name.length > SKILL_DISPLAY_NAME_MAX ||
        displayNameWords(next.name).length === 0 ||
        displayNameWords(next.name).length > SKILL_DISPLAY_NAME_MAX_WORDS
      ) {
        setError(`Name must be ${SKILL_DISPLAY_NAME_MAX_WORDS} words or fewer.`);
        return;
      }
      if (next.slug.length > SKILL_NAME_MAX || !SKILL_NAME_PATTERN.test(next.slug)) {
        setError("Slug must be lowercase letters, numbers, and single hyphens.");
        return;
      }
      if (next.description.length > SKILL_DESCRIPTION_MAX) {
        setError(`Description must be ${SKILL_DESCRIPTION_MAX} characters or fewer.`);
        return;
      }
      setError(undefined);
      void onSaveRef.current(next, skillIdRef.current)
        .then((saved) => {
          if (ignore) return;
          skillIdRef.current = saved.id;
          savedDraft.current = next;
        })
        .catch((saveError) => {
          if (!ignore) {
            setError(saveError instanceof Error ? saveError.message : "Unable to save this skill.");
          }
        });
    }, SAVE_DEBOUNCE_MS);
    return () => {
      ignore = true;
      window.clearTimeout(handle);
    };
  }, [draft, generating, open, readOnly]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl"
        onCloseAutoFocus={(event) => event.preventDefault()}
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        <DialogHeader className="shrink-0 px-6 pt-6 pb-4">
          <DialogTitle>{skill ? "Edit skill" : "New skill"}</DialogTitle>
          <DialogDescription>
            {showEditor
              ? "Saved as an Agent Skill: a chip name, slug, when-to-use description, and a short procedure. Update with AI revises the description and instructions only — name and skill ID stay put unless you edit them."
              : "Describe the skill you want, or use voice. Apply with AI to create a chip name, slug, when to use, and procedure you can edit."}
          </DialogDescription>
        </DialogHeader>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-6">
          {showEditor ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="skill-name">Name</Label>
                <Input
                  id="skill-name"
                  maxLength={SKILL_DISPLAY_NAME_MAX}
                  placeholder="👋 Client handoff"
                  disabled={readOnly || generating}
                  value={draft.name}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, name: event.currentTarget.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="skill-slug">Skill ID</Label>
                <Input
                  id="skill-slug"
                  maxLength={SKILL_NAME_MAX}
                  placeholder="client-handoff"
                  disabled={readOnly || generating}
                  value={draft.slug}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, slug: event.currentTarget.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="skill-description">Description</Label>
                <Textarea
                  id="skill-description"
                  maxLength={SKILL_DESCRIPTION_MAX}
                  placeholder="Use when the user wants to…"
                  disabled={readOnly || generating}
                  rows={2}
                  className="min-h-16 resize-none"
                  value={draft.description}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      description: event.currentTarget.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-3 rounded-xl border bg-card p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-sm">Instructions</p>
                    <p className="text-muted-foreground text-xs">
                      The procedure the agent follows when this skill loads.
                    </p>
                  </div>
                  {readOnly ? null : (
                    <Button
                      aria-controls="skill-ai-prompt"
                      aria-expanded={showAi}
                      size="sm"
                      type="button"
                      variant={showAi ? "secondary" : "outline"}
                      onClick={() => {
                        setShowAi((openAi) => !openAi);
                        setError(undefined);
                      }}
                    >
                      <SparklesIcon />
                      Update with AI
                    </Button>
                  )}
                </div>
                {showAi ? (
                  <div className="space-y-2" id="skill-ai-prompt">
                    <p className="text-muted-foreground text-xs">
                      AI can change the description and instructions, not the name or skill ID.
                    </p>
                    <InstructionPrompt
                      autoFocus={false}
                      generating={generating}
                      id="skill-instruction-prompt"
                      placeholder="Always confirm the brief first and return a one-screen summary…"
                      prompt={prompt}
                      onGenerate={() => void generate()}
                      onPromptChange={setPrompt}
                    />
                  </div>
                ) : null}
                <MarkdownDocumentEditor
                  className="border-0 shadow-none"
                  disabled={generating || readOnly}
                  placeholder="Write the steps this skill should follow, or update with AI…"
                  value={draft.markdown}
                  onChange={(markdown) => setDraft((current) => ({ ...current, markdown }))}
                />
              </div>
            </>
          ) : (
            <InstructionPrompt
              autoFocus={false}
              generating={generating}
              id="skill-instruction-prompt"
              placeholder="A skill for handing a project to a teammate with a checklist and recap…"
              prompt={prompt}
              onGenerate={() => void generate()}
              onPromptChange={setPrompt}
            />
          )}
        </div>
        <div className="shrink-0 space-y-3 border-t bg-background px-6 py-4">
          {error ? (
            <p className="text-destructive text-sm" role="alert">
              {error}
            </p>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Done
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
