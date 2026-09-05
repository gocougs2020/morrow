import type { ReactNode } from "react";
import { BrandHero } from "@/components/brand-hero";
import { SkillSuggestions } from "@/components/skill-suggestions";

export function SessionEmptyCanvas({
  children,
  disabled,
  onSelectSkill,
}: {
  readonly children?: ReactNode;
  readonly disabled: boolean;
  readonly onSelectSkill: (slug: string) => void;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-4 py-8">
        <div className="flex w-full max-w-2xl flex-col items-center gap-8">
          <BrandHero />
          <SkillSuggestions disabled={disabled} maxRows={3} onSelect={onSelectSkill} />
          {children}
        </div>
      </div>
    </div>
  );
}
