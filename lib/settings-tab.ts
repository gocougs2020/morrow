export const SETTINGS_TABS = [
  "instructions",
  "skills",
  "memory",
  "inbox",
  "schedules",
  "connections",
] as const;
export type SettingsTab = (typeof SETTINGS_TABS)[number];

export function parseSettingsTab(value?: string): SettingsTab {
  if (value === "jobs") return "schedules";
  return SETTINGS_TABS.includes(value as SettingsTab) ? (value as SettingsTab) : "instructions";
}
