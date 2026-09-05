import { readFile } from "node:fs/promises";
import path from "node:path";
import { getEnabledBuiltinSkills, type BuiltinSkillDoc } from "@/lib/app-config";
import { parseSkillDocument } from "@/lib/skill-document";

export async function getEnabledBuiltinSkillDocs(): Promise<BuiltinSkillDoc[]> {
  const skills = getEnabledBuiltinSkills();
  return Promise.all(
    skills.map(async (skill) => {
      try {
        const source = await readFile(
          path.join(process.cwd(), "agent", "skills", skill.slug, "SKILL.md"),
          "utf8",
        );
        return { ...skill, markdown: parseSkillDocument(source).body };
      } catch {
        return { ...skill, markdown: "" };
      }
    }),
  );
}
