import { cjk } from "@streamdown/cjk";
import { code } from "@streamdown/code";
import { math } from "@streamdown/math";
import { mermaid } from "@streamdown/mermaid";
import type { ComponentProps } from "react";
import { Streamdown } from "streamdown";

export const streamdownPlugins = { cjk, code, math, mermaid };

export const defaultStreamdownProps = {
  plugins: streamdownPlugins,
  skipHtml: true,
  linkSafety: { enabled: true },
} satisfies Partial<ComponentProps<typeof Streamdown>>;
