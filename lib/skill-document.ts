/**
 * Agent Skills SKILL.md helpers.
 * @see https://agentskills.io/specification
 */

export const SKILL_NAME_MAX = 64;
export const SKILL_DESCRIPTION_MAX = 1024;

/** Lowercase letters, numbers, and single hyphens. No leading/trailing/consecutive hyphens. */
export const SKILL_NAME_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const FRONTMATTER_PATTERN = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/;

export type SkillDocument = {
  name: string;
  description: string;
  body: string;
};

export type ParsedSkillDocument = {
  name?: string;
  description?: string;
  body: string;
};

export class SkillDocumentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SkillDocumentError";
  }
}

export function parseSkillDocument(markdown: string): ParsedSkillDocument {
  const source = markdown.replaceAll("\r\n", "\n");
  const match = source.match(FRONTMATTER_PATTERN);
  if (!match) {
    return { body: source.trim() };
  }

  const frontmatter = match[1] ?? "";
  const body = source.slice(match[0].length).trim();
  return {
    name: readYamlScalar(frontmatter, "name"),
    description: readYamlScalar(frontmatter, "description"),
    body,
  };
}

export function wrapSkillDocument(document: SkillDocument): string {
  return [
    "---",
    `name: ${document.name}`,
    `description: ${formatYamlString(document.description)}`,
    "---",
    "",
    document.body.trim(),
    "",
  ].join("\n");
}

export function toSkillDocument(
  input: {
    slug: string;
    description: string;
    markdown: string;
  },
  options?: { loose?: boolean },
): SkillDocument {
  const parsed = parseSkillDocument(String(input.markdown ?? ""));
  const rawName = String(input.slug ?? "").trim() || parsed.name || "";
  const rawDescription = String(input.description ?? "").trim() || parsed.description || "";
  if (options?.loose) {
    return {
      name: sanitizeSkillName(rawName),
      description: sanitizeSkillDescription(rawDescription),
      body: parsed.body,
    };
  }
  return {
    name: normalizeSkillName(rawName),
    description: normalizeSkillDescription(rawDescription),
    body: parsed.body,
  };
}

function sanitizeSkillName(value: string): string {
  const name = value
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, SKILL_NAME_MAX);
  return name || "custom-skill";
}

function sanitizeSkillDescription(value: string): string {
  const description = value.replaceAll(/\s+/g, " ").trim().slice(0, SKILL_DESCRIPTION_MAX);
  return description || "Use when this user's custom skill applies.";
}

export function normalizeSkillName(value: string): string {
  const name = value.trim();
  if (!name) {
    throw new SkillDocumentError("Skill name is required.");
  }
  if (name.length > SKILL_NAME_MAX) {
    throw new SkillDocumentError(`Skill name must be ${SKILL_NAME_MAX} characters or fewer.`);
  }
  if (!SKILL_NAME_PATTERN.test(name)) {
    throw new SkillDocumentError(
      "Skill name must be lowercase letters, numbers, and single hyphens.",
    );
  }
  return name;
}

export function normalizeSkillDescription(value: string): string {
  const description = value.replaceAll(/\s+/g, " ").trim();
  if (!description) {
    throw new SkillDocumentError("Skill description is required.");
  }
  if (description.length > SKILL_DESCRIPTION_MAX) {
    throw new SkillDocumentError(
      `Skill description must be ${SKILL_DESCRIPTION_MAX} characters or fewer.`,
    );
  }
  return description;
}

function formatYamlString(value: string): string {
  return JSON.stringify(value);
}

function readYamlScalar(frontmatter: string, key: string): string | undefined {
  const lines = frontmatter.replaceAll("\r\n", "\n").split("\n");
  const start = lines.findIndex((line) => new RegExp(`^${key}:\\s*`).test(line));
  if (start === -1) return undefined;

  const line = lines[start] ?? "";
  const rest = line.slice(key.length + 1).trim();

  if (rest === ">" || rest === "|") {
    const folded: string[] = [];
    for (const next of lines.slice(start + 1)) {
      if (!next.startsWith(" ") && !next.startsWith("\t")) break;
      folded.push(next.trim());
    }
    const joined = rest === "|" ? folded.join("\n") : folded.join(" ");
    return joined.trim() || undefined;
  }

  if (!rest) return undefined;
  if (
    (rest.startsWith('"') && rest.endsWith('"')) ||
    (rest.startsWith("'") && rest.endsWith("'"))
  ) {
    try {
      return JSON.parse(rest.startsWith("'") ? `"${rest.slice(1, -1)}"` : rest) as string;
    } catch {
      return rest.slice(1, -1);
    }
  }
  return rest;
}
