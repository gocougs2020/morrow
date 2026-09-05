"use client";

import { CheckIcon, MicIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useVoiceRecording } from "@/hooks/use-voice-recording";
import { cn } from "@/lib/utils";

export function VoiceMicButton({
  className,
  disabled,
  onTranscript,
}: {
  readonly className?: string;
  readonly disabled?: boolean;
  readonly onTranscript: (text: string) => void;
}) {
  const { cancel, error, finish, start, voice } = useVoiceRecording();
  const listening = voice !== "idle";

  return (
    <div className={cn("flex flex-col items-end gap-1", className)}>
      <div className="flex items-center gap-1">
        {listening ? (
          <Button
            aria-label="Cancel recording"
            className="rounded-full [&_svg:not([class*='size-'])]:size-5"
            size="icon"
            type="button"
            variant="ghost"
            onClick={cancel}
          >
            <XIcon />
          </Button>
        ) : null}
        <Button
          aria-label={
            voice === "transcribing"
              ? "Transcribing"
              : voice === "listening"
                ? "Finish recording"
                : "Start voice input"
          }
          className="rounded-full [&_svg:not([class*='size-'])]:size-5"
          disabled={disabled || voice === "transcribing"}
          size="icon"
          type="button"
          variant={listening ? "default" : "ghost"}
          onClick={() => {
            if (voice === "idle") {
              void start();
              return;
            }
            void finish().then((text) => {
              if (text) onTranscript(text);
            });
          }}
        >
          {voice === "transcribing" ? (
            <Spinner />
          ) : voice === "listening" ? (
            <CheckIcon />
          ) : (
            <MicIcon />
          )}
        </Button>
      </div>
      {error ? (
        <p className="max-w-48 text-right text-destructive text-xs" role="alert">
          {error}
        </p>
      ) : voice === "listening" ? (
        <p className="text-muted-foreground text-xs">Listening…</p>
      ) : null}
    </div>
  );
}
