"use client";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { isSharedWithAccount, normalizeVisibility, type ResourceVisibility } from "@/lib/visibility";

export function VisibilityToggle({
  disabled,
  id,
  size = "sm",
  value,
  onChange,
}: {
  readonly disabled?: boolean;
  readonly id: string;
  readonly size?: "sm" | "default";
  readonly value: ResourceVisibility;
  readonly onChange: (next: ResourceVisibility) => void;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 text-foreground">
      <Label className="text-xs font-medium" htmlFor={id}>
        Shared
      </Label>
      <Switch
        aria-label="Share with everyone on this app"
        checked={isSharedWithAccount(value)}
        disabled={disabled}
        id={id}
        size={size}
        onCheckedChange={(checked) => onChange(checked ? "shared" : "private")}
      />
    </span>
  );
}

const FILE_VISIBILITY_OPTIONS: {
  readonly value: ResourceVisibility;
  readonly label: string;
  readonly hint: string;
}[] = [
  { value: "private", label: "Private", hint: "Only you and your sessions" },
  { value: "shared", label: "Shared", hint: "Everyone on this app can view and edit" },
  { value: "public", label: "Public", hint: "Shared, plus a public internet link" },
];

export function FileVisibilitySelect({
  disabled,
  id,
  value,
  onChange,
}: {
  readonly disabled?: boolean;
  readonly id: string;
  readonly value: ResourceVisibility;
  readonly onChange: (next: ResourceVisibility) => void;
}) {
  return (
    <Select
      disabled={disabled}
      value={normalizeVisibility(value)}
      onValueChange={(next) => {
        const parsed = FILE_VISIBILITY_OPTIONS.find((option) => option.value === next)?.value;
        if (parsed) onChange(parsed);
      }}
    >
      <SelectTrigger
        aria-label="Who can access this file"
        className="h-7 min-h-7 w-[7.5rem] px-2 text-xs"
        id={id}
        size="sm"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="start">
        {FILE_VISIBILITY_OPTIONS.map((option) => (
          <SelectItem
            key={option.value}
            description={
              <span className="text-muted-foreground text-xs">{option.hint}</span>
            }
            textValue={option.label}
            value={option.value}
          >
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function visibilityBadgeLabel(visibility: ResourceVisibility): string | null {
  const value = normalizeVisibility(visibility);
  if (value === "public") return "Public";
  if (value === "shared") return "Shared";
  return null;
}
