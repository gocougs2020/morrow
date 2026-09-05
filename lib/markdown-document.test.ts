import { describe, expect, it } from "vitest";
import { markdownToSafeHtml } from "@/lib/markdown-document";

describe("markdownToSafeHtml", () => {
  it("escapes a script tag instead of emitting one", () => {
    const html = markdownToSafeHtml("<script>alert(1)</script>");
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
  });

  it("still wraps markdown bold in strong", () => {
    const html = markdownToSafeHtml("**bold**");
    expect(html).toContain("<strong>bold</strong>");
  });
});
