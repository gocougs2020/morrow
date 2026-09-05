"use client";

import { useEffect, useMemo, useState } from "react";
import {
  availableSkillFromUser,
  getBuiltinAvailableSkills,
  mergeAvailableSkills,
  type AvailableSkill,
} from "@/lib/available-skills";
import type { UserSkill } from "@/lib/types";

export function useAvailableSkills() {
  const builtin = useMemo(() => getBuiltinAvailableSkills(), []);
  const [userSkills, setUserSkills] = useState<AvailableSkill[]>([]);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/skills")
      .then((response) => (response.ok ? response.json() : { skills: [] }))
      .then((payload: { skills?: UserSkill[] }) => {
        if (cancelled) return;
        setUserSkills(
          (payload.skills ?? [])
            .filter((skill) => skill.enabled)
            .map(availableSkillFromUser),
        );
      })
      .catch(() => {
        if (!cancelled) setUserSkills([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return useMemo(() => mergeAvailableSkills(builtin, userSkills), [builtin, userSkills]);
}
