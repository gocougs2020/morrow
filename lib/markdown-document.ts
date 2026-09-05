const headingMatch = /^(#{1,3})\s+(.*)$/;
const unorderedMatch = /^[-*]\s+(.*)$/;
const orderedMatch = /^\d+\.\s+(.*)$/;

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function unescapeHtml(value: string): string {
  return value
    .replaceAll("&quot;", '"')
    .replaceAll("&gt;", ">")
    .replaceAll("&lt;", "<")
    .replaceAll("&amp;", "&");
}

function inlineMarkdownToHtml(value: string): string {
  return escapeHtml(value)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[\s(])\*(.+?)\*(?=[\s).,]|$)/g, "$1<em>$2</em>")
    .replace(/`(.+?)`/g, "<code>$1</code>");
}

function inlineHtmlToMarkdown(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent ?? "";
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return "";

  const element = node as HTMLElement;
  const tag = element.tagName.toLowerCase();
  const inner = Array.from(element.childNodes).map(inlineHtmlToMarkdown).join("");

  if (tag === "strong" || tag === "b") return inner ? `**${inner}**` : "";
  if (tag === "em" || tag === "i") return inner ? `*${inner}*` : "";
  if (tag === "code") return inner ? `\`${inner}\`` : "";
  if (tag === "br") return " ";
  return inner;
}

function isBlockStart(line: string): boolean {
  return headingMatch.test(line) || unorderedMatch.test(line) || orderedMatch.test(line);
}

export function markdownToSafeHtml(markdown: string): string {
  const lines = markdown.replaceAll("\r\n", "\n").split("\n");
  const html: string[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index] ?? "";
    if (!line.trim()) {
      index += 1;
      continue;
    }

    const heading = line.match(headingMatch);
    if (heading) {
      const level = heading[1].length;
      html.push(`<h${level}>${inlineMarkdownToHtml(heading[2] ?? "")}</h${level}>`);
      index += 1;
      continue;
    }

    if (unorderedMatch.test(line)) {
      const items: string[] = [];
      while (index < lines.length && unorderedMatch.test(lines[index] ?? "")) {
        items.push(`<li>${inlineMarkdownToHtml(lines[index]?.replace(unorderedMatch, "$1") ?? "")}</li>`);
        index += 1;
      }
      html.push(`<ul>${items.join("")}</ul>`);
      continue;
    }

    if (orderedMatch.test(line)) {
      const items: string[] = [];
      while (index < lines.length && orderedMatch.test(lines[index] ?? "")) {
        items.push(`<li>${inlineMarkdownToHtml(lines[index]?.replace(orderedMatch, "$1") ?? "")}</li>`);
        index += 1;
      }
      html.push(`<ol>${items.join("")}</ol>`);
      continue;
    }

    const paragraph: string[] = [];
    while (index < lines.length) {
      const current = lines[index] ?? "";
      if (!current.trim() || isBlockStart(current)) break;
      paragraph.push(current);
      index += 1;
    }
    html.push(`<p>${inlineMarkdownToHtml(paragraph.join(" "))}</p>`);
  }

  return html.join("");
}

function serializeBlocks(element: HTMLElement): string {
  const tag = element.tagName.toLowerCase();
  const text = inlineHtmlToMarkdown(element).trim();

  if (tag === "h1") return text ? `# ${text}` : "";
  if (tag === "h2") return text ? `## ${text}` : "";
  if (tag === "h3") return text ? `### ${text}` : "";
  if (tag === "p" || tag === "div") return text;
  if (tag === "blockquote") return text ? `> ${text}` : "";
  if (tag === "ul") {
    return Array.from(element.children)
      .filter((child) => child.tagName.toLowerCase() === "li")
      .map((child) => `- ${inlineHtmlToMarkdown(child).trim()}`)
      .filter(Boolean)
      .join("\n");
  }
  if (tag === "ol") {
    return Array.from(element.children)
      .filter((child) => child.tagName.toLowerCase() === "li")
      .map((child, itemIndex) => `${itemIndex + 1}. ${inlineHtmlToMarkdown(child).trim()}`)
      .filter((line) => !line.endsWith(". "))
      .join("\n");
  }
  return text;
}

export function htmlToMarkdown(root: HTMLElement): string {
  const blocks = Array.from(root.childNodes)
    .map((node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        return (node.textContent ?? "").trim();
      }
      if (node.nodeType === Node.ELEMENT_NODE) {
        return serializeBlocks(node as HTMLElement);
      }
      return "";
    })
    .filter(Boolean);

  return blocks.join("\n\n").trim();
}

export function normalizeInstructionMarkdown(value: string): string {
  return unescapeHtml(value).replace(/\n{3,}/g, "\n\n").trim();
}
