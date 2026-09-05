"use client";

import { useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Suggestion } from "@/components/ai-elements/suggestion";
import { useAvailableSkills } from "@/hooks/use-available-skills";
import { filterHomeSuggestedSkills, type AvailableSkill } from "@/lib/available-skills";

const skillGapPx = 8;

function subscribeNoop() {
  return () => undefined;
}

function shuffleSkills(skills: readonly AvailableSkill[]): AvailableSkill[] {
  const next = [...skills];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    const current = next[index];
    const swap = next[swapIndex];
    if (current && swap) {
      next[index] = swap;
      next[swapIndex] = current;
    }
  }
  return next;
}

function stableHomeSkills(skills: readonly AvailableSkill[]): AvailableSkill[] {
  return [
    ...skills.filter((skill) => skill.source === "user"),
    ...skills.filter((skill) => skill.source !== "user"),
  ];
}

function orderHomeSkills(skills: readonly AvailableSkill[]): AvailableSkill[] {
  return [
    ...shuffleSkills(skills.filter((skill) => skill.source === "user")),
    ...shuffleSkills(skills.filter((skill) => skill.source !== "user")),
  ];
}

function SkillPill({
  disabled,
  onSelect,
  skill,
}: {
  disabled: boolean;
  onSelect: (slug: string) => void;
  skill: AvailableSkill;
}) {
  return (
    <Suggestion
      className="border-black/15 px-4 py-4 text-sm font-normal text-muted-foreground shadow-none hover:bg-accent dark:border-white/15 dark:bg-secondary dark:hover:bg-secondary/80"
      disabled={disabled}
      onClick={() => {
        onSelect(skill.slug);
        requestAnimationFrame(() => {
          document.querySelector<HTMLElement>("[data-skill-prompt]")?.focus();
        });
      }}
      size="xs"
      suggestion={skill.slug}
      variant="outline"
    >
      {skill.emoji ? (
        <span aria-hidden className="mr-1 text-xs">
          {skill.emoji}
        </span>
      ) : null}
      <span className="text-sm">{skill.title}</span>
    </Suggestion>
  );
}

function countPillsForRows(
  pills: readonly HTMLElement[],
  available: number,
  maxRows: number,
): number {
  let rowWidth = 0;
  let rows = 1;
  let count = 0;

  for (const pill of pills) {
    const width = pill.offsetWidth;
    const next = rowWidth === 0 ? width : rowWidth + skillGapPx + width;
    if (rowWidth > 0 && next > available) {
      if (rows >= maxRows) break;
      rows += 1;
      rowWidth = width;
    } else {
      rowWidth = next;
    }
    count += 1;
  }

  return Math.max(1, count);
}

export function SkillSuggestions({
  disabled,
  maxRows = 1,
  onSelect,
}: {
  disabled: boolean;
  maxRows?: number;
  onSelect: (slug: string) => void;
}) {
  const available = useAvailableSkills();
  const skills = useMemo(() => filterHomeSuggestedSkills(available), [available]);
  const containerRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const slugsKey = skills.map((skill) => skill.slug).join("\0");
  // Shuffle only after hydration so SSR and the first client paint share a stable order.
  const randomized = useSyncExternalStore(subscribeNoop, () => true, () => false);
  const order = useMemo(
    () => (randomized ? orderHomeSkills(skills) : stableHomeSkills(skills)),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reshuffle only when the slug set changes
    [randomized, slugsKey],
  );
  const [visibleCount, setVisibleCount] = useState<number>(skills.length);

  useLayoutEffect(() => {
    const container = containerRef.current;
    const measure = measureRef.current;
    if (!container || !measure) return;

    const update = () => {
      setVisibleCount(
        countPillsForRows([...measure.children] as HTMLElement[], container.clientWidth, maxRows),
      );
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(container);
    return () => observer.disconnect();
  }, [maxRows, order]);

  if (skills.length === 0) return null;

  return (
    <div className="relative w-full overflow-hidden" ref={containerRef}>
      <div
        aria-hidden
        className="pointer-events-none invisible absolute top-0 left-0 flex w-max flex-nowrap gap-2"
        ref={measureRef}
      >
        {order.map((skill) => (
          <SkillPill disabled key={skill.slug} onSelect={onSelect} skill={skill} />
        ))}
      </div>
      <div
        className={
          maxRows > 1
            ? "flex flex-wrap items-center justify-center gap-2"
            : "flex flex-nowrap items-center justify-center gap-2"
        }
      >
        {order.slice(0, visibleCount).map((skill) => (
          <SkillPill disabled={disabled} key={skill.slug} onSelect={onSelect} skill={skill} />
        ))}
      </div>
    </div>
  );
}
