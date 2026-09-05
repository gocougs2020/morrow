"use client";

import { SparklesIcon } from "lucide-react";
import { VoiceMicButton } from "@/components/voice-mic-button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from "@/components/ui/input-group";
import { Spinner } from "@/components/ui/spinner";

export function InstructionPrompt({
  autoFocus = true,
  disabled,
  generating,
  id = "instruction-prompt",
  onGenerate,
  onPromptChange,
  placeholder = "Keep replies shorter, prefer checklists, use a warmer sign-off…",
  prompt,
}: {
  readonly autoFocus?: boolean;
  readonly disabled?: boolean;
  readonly generating: boolean;
  readonly id?: string;
  readonly onGenerate: () => void;
  readonly onPromptChange: (value: string) => void;
  readonly placeholder?: string;
  readonly prompt: string;
}) {
  const busy = disabled || generating;

  return (
    <InputGroup className="bg-card">
      <InputGroupTextarea
        autoFocus={autoFocus}
        className="min-h-16 px-3 pt-3"
        disabled={busy}
        id={id}
        placeholder={placeholder}
        value={prompt}
        onChange={(event) => onPromptChange(event.currentTarget.value)}
        onKeyDown={(event) => {
          if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;
          event.preventDefault();
          if (!busy && prompt.trim()) onGenerate();
        }}
      />
      <InputGroupAddon align="block-end" className="justify-between border-t px-2 pb-2">
        <VoiceMicButton
          disabled={busy}
          onTranscript={(text) => {
            onPromptChange(prompt.trim() ? `${prompt.trim()} ${text}` : text);
          }}
        />
        <InputGroupButton
          disabled={busy || prompt.trim().length === 0}
          size="sm"
          type="button"
          variant="default"
          onClick={onGenerate}
        >
          {generating ? <Spinner /> : <SparklesIcon />}
          Apply with AI
        </InputGroupButton>
      </InputGroupAddon>
    </InputGroup>
  );
}
