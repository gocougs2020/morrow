import { cn } from "@/lib/utils";
import type { Experimental_GeneratedImage } from "ai";
import type { ComponentProps } from "react";

export type ImageProps = Experimental_GeneratedImage &
  Omit<ComponentProps<"img">, "src">;

export const Image = ({
  base64,
  uint8Array: _uint8Array,
  mediaType,
  ...props
}: ImageProps) => (
  <img
    {...props}
    alt={props.alt}
    className={cn(
      "h-auto max-w-full overflow-hidden rounded-md",
      props.className
    )}
    src={`data:${mediaType};base64,${base64}`}
  />
);
