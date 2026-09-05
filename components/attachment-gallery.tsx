"use client";

import type { FileUIPart } from "ai";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  FileTextIcon,
  ImageIcon,
  Music2Icon,
  PaperclipIcon,
  Trash2Icon,
  VideoIcon,
  XIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  getAttachmentLabel,
  getMediaCategory,
  type AttachmentMediaCategory,
} from "@/components/ai-elements/attachments";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export type AttachmentGalleryFile = FileUIPart & { id: string };

const mediaIcons: Record<AttachmentMediaCategory, typeof ImageIcon> = {
  audio: Music2Icon,
  document: FileTextIcon,
  image: ImageIcon,
  source: FileTextIcon,
  unknown: PaperclipIcon,
  video: VideoIcon,
};

function fileLabel(file: AttachmentGalleryFile) {
  return getAttachmentLabel({ ...file, id: file.id });
}

function AttachmentThumb({
  file,
  onOpen,
  onRemove,
}: {
  readonly file: AttachmentGalleryFile;
  readonly onOpen: () => void;
  readonly onRemove: () => void;
}) {
  const category = getMediaCategory({ ...file, id: file.id });
  const label = fileLabel(file);
  const Icon = mediaIcons[category];

  return (
    <div className="group relative">
      <button
        aria-label={`View ${label}`}
        className="size-[4.5rem] overflow-hidden rounded-xl border border-border bg-muted text-left transition-colors hover:bg-accent"
        onClick={onOpen}
        type="button"
      >
        {category === "image" && file.url ? (
          <img alt={label} className="size-full object-cover" src={file.url} />
        ) : category === "video" && file.url ? (
          <video className="size-full object-cover" muted src={file.url} />
        ) : (
          <span className="flex size-full flex-col items-center justify-center gap-1 px-1.5">
            <Icon className="size-5 text-muted-foreground" />
            <span className="w-full truncate text-center text-[10px] text-muted-foreground">
              {label}
            </span>
          </span>
        )}
      </button>
      <Button
        aria-label={`Remove ${label}`}
        className="absolute top-1 right-1 size-6 rounded-full bg-background/90 opacity-0 shadow-sm backdrop-blur-sm transition-opacity group-focus-within:opacity-100 group-hover:opacity-100"
        onClick={onRemove}
        size="icon-xs"
        type="button"
        variant="secondary"
      >
        <XIcon />
      </Button>
    </div>
  );
}

function AttachmentLightboxMedia({ file }: { readonly file: AttachmentGalleryFile }) {
  const category = getMediaCategory({ ...file, id: file.id });
  const label = fileLabel(file);
  const Icon = mediaIcons[category];

  if (category === "image" && file.url) {
    return (
      <img
        alt={label}
        className="max-h-[min(80dvh,44rem)] max-w-[min(92vw,72rem)] rounded-lg object-contain"
        src={file.url}
      />
    );
  }

  if (category === "video" && file.url) {
    return (
      <video
        className="max-h-[min(80dvh,44rem)] max-w-[min(92vw,72rem)] rounded-lg"
        controls
        src={file.url}
      />
    );
  }

  if (category === "audio" && file.url) {
    return (
      <div className="flex w-full max-w-md flex-col items-center gap-4 rounded-2xl border bg-card px-6 py-8">
        <Icon className="size-10 text-muted-foreground" />
        <p className="max-w-full truncate font-medium text-sm">{label}</p>
        <audio className="w-full" controls src={file.url} />
      </div>
    );
  }

  return (
    <div className="flex max-w-sm flex-col items-center gap-3 rounded-2xl border bg-card px-8 py-10">
      <Icon className="size-10 text-muted-foreground" />
      <p className="max-w-full truncate font-medium text-sm">{label}</p>
      {file.mediaType ? (
        <p className="text-muted-foreground text-xs">{file.mediaType}</p>
      ) : null}
      {file.url ? (
        <a
          className="text-sm underline underline-offset-4"
          href={file.url}
          rel="noreferrer"
          target="_blank"
        >
          Open file
        </a>
      ) : null}
    </div>
  );
}

export function AttachmentGallery({
  files,
  onRemove,
}: {
  readonly files: readonly AttachmentGalleryFile[];
  readonly onRemove: (id: string) => void;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const openIndex = files.findIndex((file) => file.id === openId);
  const current = openIndex >= 0 ? files[openIndex] : undefined;
  const open = current !== undefined;
  const hasSlideshow = files.length > 1;

  useEffect(() => {
    if (openId && !files.some((file) => file.id === openId)) {
      setOpenId(null);
    }
  }, [files, openId]);

  const showAt = (index: number) => {
    const next = files[(index + files.length) % files.length];
    if (next) setOpenId(next.id);
  };

  const removeCurrent = () => {
    if (!current) return;
    const fallback = files[openIndex + 1] ?? files[openIndex - 1];
    onRemove(current.id);
    setOpenId(fallback?.id ?? null);
  };

  return (
    <>
      <div className="flex w-full flex-wrap gap-2">
        {files.map((file) => (
          <AttachmentThumb
            file={file}
            key={file.id}
            onOpen={() => setOpenId(file.id)}
            onRemove={() => onRemove(file.id)}
          />
        ))}
      </div>
      <Dialog
        onOpenChange={(next) => {
          if (!next) setOpenId(null);
        }}
        open={open}
      >
        <DialogContent
          className={cn(
            "top-0 left-0 flex h-dvh w-screen max-w-none translate-x-0 translate-y-0 flex-col gap-0 border-0 bg-transparent p-0 shadow-none",
            "rounded-none sm:max-w-none",
          )}
          onKeyDown={(event) => {
            if (!hasSlideshow) return;
            if (event.key === "ArrowRight") {
              event.preventDefault();
              showAt(openIndex + 1);
            }
            if (event.key === "ArrowLeft") {
              event.preventDefault();
              showAt(openIndex - 1);
            }
          }}
          overlayClassName="bg-black/80"
          showCloseButton={false}
        >
          <DialogTitle className="sr-only">
            {current ? fileLabel(current) : "Attachment"}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {hasSlideshow
              ? `Attachment ${openIndex + 1} of ${files.length}`
              : "Attached file preview"}
          </DialogDescription>
          <div className="relative flex h-full w-full flex-col">
            <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-4">
              <Button
                aria-label="Close preview"
                className="pointer-events-auto rounded-full bg-background/90 shadow-sm backdrop-blur-sm"
                onClick={() => setOpenId(null)}
                size="icon"
                type="button"
                variant="secondary"
              >
                <XIcon />
              </Button>
              <Button
                aria-label={current ? `Remove ${fileLabel(current)}` : "Remove attachment"}
                className="pointer-events-auto rounded-full bg-background/90 shadow-sm backdrop-blur-sm"
                onClick={removeCurrent}
                size="icon"
                type="button"
                variant="secondary"
              >
                <Trash2Icon />
              </Button>
            </div>
            <div
              className="flex min-h-0 flex-1 items-center justify-center px-16 py-20"
              onClick={(event) => {
                if (event.target === event.currentTarget) setOpenId(null);
              }}
            >
              {current ? <AttachmentLightboxMedia file={current} /> : null}
            </div>
            {hasSlideshow ? (
              <>
                <Button
                  aria-label="Previous attachment"
                  className="absolute top-1/2 left-4 -translate-y-1/2 rounded-full bg-background/90 shadow-sm backdrop-blur-sm"
                  onClick={() => showAt(openIndex - 1)}
                  size="icon"
                  type="button"
                  variant="secondary"
                >
                  <ChevronLeftIcon />
                </Button>
                <Button
                  aria-label="Next attachment"
                  className="absolute top-1/2 right-4 -translate-y-1/2 rounded-full bg-background/90 shadow-sm backdrop-blur-sm"
                  onClick={() => showAt(openIndex + 1)}
                  size="icon"
                  type="button"
                  variant="secondary"
                >
                  <ChevronRightIcon />
                </Button>
              </>
            ) : null}
            {current ? (
              <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col items-center gap-1 px-4 pb-6 text-center">
                <p className="max-w-full truncate font-medium text-sm text-white">
                  {fileLabel(current)}
                </p>
                {hasSlideshow ? (
                  <p className="text-white/70 text-xs">
                    {openIndex + 1} of {files.length}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
