"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { PencilIcon, SparklesIcon, Trash2Icon } from "lucide-react";
import { InstructionPrompt } from "@/components/instruction-prompt";
import { VoiceMicButton } from "@/components/voice-mic-button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  MONTH_INTERVAL_OPTIONS,
  NTH_WEEKDAY_OPTIONS,
  WEEKDAY_FULL_NAMES,
  WEEKDAY_LABELS,
  alignWeekdayOfMonth,
  cadenceKey,
  cadenceWithOnceDate,
  cadenceWithTime,
  formatCadenceSummary,
  formatZonedDateTime,
  inferJobCadence,
  intervalParts,
  minutesFromInterval,
  pad,
  retargetCadence,
  toggleCadenceMonthDay,
  toggleCadenceWeekday,
  type JobCadence,
  type JobCadenceKind,
  type WeekdayOfMonthNth,
} from "@/lib/job-cadence";
import {
  composeSchedulePrompt,
  parseSchedulePrompt,
  schedulePreviewText,
} from "@/lib/schedule-prompt";
import type { ScheduledJob } from "@/lib/types";
import { cn } from "@/lib/utils";

const SAVE_DEBOUNCE_MS = 500;
const HOURLY_MINUTES = [0, 15, 30, 45];
const FREQUENCY_OPTIONS: { value: JobCadenceKind; label: string }[] = [
  { value: "once", label: "Does not repeat" },
  { value: "hourly", label: "Every hour" },
  { value: "daily", label: "Every day" },
  { value: "weekly", label: "Every week" },
  { value: "monthly", label: "Day of the month" },
  { value: "weekdayOfMonth", label: "Weekday of the month" },
  { value: "interval", label: "Custom" },
];

export function ScheduleRow({
  job,
  onJobChange,
  onRefresh,
}: {
  readonly job: ScheduledJob;
  readonly onJobChange: (job: ScheduledJob) => void;
  readonly onRefresh: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [brief, setBrief] = useState(() => parseSchedulePrompt(job.prompt).brief);
  const [cadence, setCadence] = useState(() => inferJobCadence(job));
  const [aiPrompt, setAiPrompt] = useState("");
  const [showAi, setShowAi] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string>();
  const savedBrief = useRef(parseSchedulePrompt(job.prompt).brief);
  const savedCadence = useRef(cadenceKey(inferJobCadence(job)));
  const saveGeneration = useRef(0);
  const onJobChangeRef = useRef(onJobChange);
  onJobChangeRef.current = onJobChange;
  savedBrief.current = parseSchedulePrompt(job.prompt).brief;

  useEffect(() => {
    const next = inferJobCadence(job);
    const nextBrief = parseSchedulePrompt(job.prompt).brief;
    setBrief(nextBrief);
    setCadence(next);
    savedBrief.current = nextBrief;
    savedCadence.current = cadenceKey(next);
  }, [job.id]);

  useEffect(() => {
    if (brief === parseSchedulePrompt(job.prompt).brief) return;
    let ignore = false;
    const handle = window.setTimeout(() => {
      const nextBrief = brief.trim();
      if (!nextBrief || nextBrief === savedBrief.current) return;
      void savePrompt(job, nextBrief).then((next) => {
        if (!next || ignore) return;
        savedBrief.current = parseSchedulePrompt(next.prompt).brief;
        onJobChangeRef.current(next);
      });
    }, SAVE_DEBOUNCE_MS);
    return () => {
      ignore = true;
      window.clearTimeout(handle);
    };
  }, [brief, job.id, job.prompt]);

  const saveCadence = (next: JobCadence) => {
    setCadence(next);
    setError(undefined);
    const key = cadenceKey(next);
    if (key === savedCadence.current) return;
    savedCadence.current = key;
    const generation = ++saveGeneration.current;
    void patchJob(job.id, { cadence: next }).then((updated) => {
      if (generation !== saveGeneration.current) return;
      if (!updated) {
        setError("Unable to update this schedule.");
        return;
      }
      onJobChangeRef.current(updated);
    });
  };

  const generate = async () => {
    const trimmed = aiPrompt.trim();
    if (!trimmed || generating) return;
    setGenerating(true);
    setError(undefined);
    try {
      const response = await fetch("/api/jobs/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentCadence: cadence,
          currentPrompt: job.prompt,
          prompt: trimmed,
          timezone: cadence.timezone,
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        brief?: string;
        cadence?: JobCadence;
        error?: string;
      };
      if (!response.ok || !payload.cadence || !payload.brief) {
        throw new Error(payload.error || "Unable to update this schedule.");
      }
      setBrief(payload.brief);
      setCadence(payload.cadence);
      savedCadence.current = cadenceKey(payload.cadence);
      const updated = await patchJob(job.id, {
        cadence: payload.cadence,
        prompt: composeSchedulePrompt({
          brief: payload.brief,
          skill: parseSchedulePrompt(job.prompt).skill,
        }),
      });
      if (!updated) throw new Error("Unable to update this schedule.");
      savedBrief.current = parseSchedulePrompt(updated.prompt).brief;
      onJobChange(updated);
      setAiPrompt("");
      setShowAi(false);
    } catch (generateError) {
      setError(generateError instanceof Error ? generateError.message : "Unable to update.");
    } finally {
      setGenerating(false);
    }
  };

  const nextRunLabel = formatZonedDateTime(job.nextRunAt, cadence.timezone);
  const preview = schedulePreviewText(job.prompt);
  const interval = cadence.kind === "interval" ? intervalParts(cadence.everyMinutes) : null;
  const timeValue =
    cadence.kind === "once"
      ? cadence.at.slice(11, 16)
      : "hour" in cadence
        ? `${pad(cadence.hour)}:${pad(cadence.minute)}`
        : "";
  const monthIntervals =
    cadence.kind === "weekdayOfMonth" &&
    !MONTH_INTERVAL_OPTIONS.some((option) => option.value === cadence.intervalMonths)
      ? [...MONTH_INTERVAL_OPTIONS, { value: cadence.intervalMonths, label: `Every ${cadence.intervalMonths} months` }]
      : MONTH_INTERVAL_OPTIONS;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <div className="flex items-center justify-between gap-3 rounded-md border px-3 py-2">
          <button
            aria-expanded={open}
            className="min-w-0 flex-1 rounded-sm text-left"
            type="button"
            onClick={() => setOpen(true)}
          >
            <p className="line-clamp-2 font-medium text-sm">{preview}</p>
            <p className="text-muted-foreground text-xs">{formatCadenceSummary(cadence)}</p>
          </button>
          <div className="flex items-center gap-2">
            <Button
              aria-expanded={open}
              aria-label="Edit schedule"
              size="icon-sm"
              type="button"
              variant="ghost"
              onClick={() => setOpen(true)}
            >
              <PencilIcon />
            </Button>
            {open ? (
            <PopoverContent
              align="end"
              className="flex max-h-[var(--radix-popover-content-available-height)] w-[min(36rem,calc(100vw-2rem))] flex-col gap-0 overflow-hidden p-0"
              collisionPadding={16}
              onCloseAutoFocus={(event) => event.preventDefault()}
              onInteractOutside={(event) => {
                const target = event.target as HTMLElement | null;
                if (target?.closest("[data-slot='select-content']")) {
                  event.preventDefault();
                }
              }}
              onOpenAutoFocus={(event) => event.preventDefault()}
            >
              <PopoverHeader className="shrink-0 border-b px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <PopoverTitle>Edit schedule</PopoverTitle>
                    <PopoverDescription>
                      Change the prompt or timing. Use AI for cadences like the first Tuesday of
                      every other month.
                    </PopoverDescription>
                  </div>
                  <Button
                    aria-controls={`${job.id}-ai-prompt`}
                    aria-expanded={showAi}
                    className="shrink-0"
                    disabled={generating}
                    size="sm"
                    type="button"
                    variant={showAi ? "secondary" : "outline"}
                    onClick={() => {
                      setShowAi((openAi) => !openAi);
                      setError(undefined);
                    }}
                  >
                    <SparklesIcon />
                    Update with AI
                  </Button>
                </div>
              </PopoverHeader>
              <div className="min-h-0 space-y-4 overflow-y-auto overscroll-contain px-4 py-3">
                {showAi ? (
                  <div className="space-y-2" id={`${job.id}-ai-prompt`}>
                    <p className="text-muted-foreground text-xs">
                      Describe when this should run, or what the next run should do.
                    </p>
                    <InstructionPrompt
                      autoFocus={false}
                      generating={generating}
                      id={`${job.id}-instruction-prompt`}
                      placeholder="Every first Tuesday of every other month at 9am…"
                      prompt={aiPrompt}
                      onGenerate={() => void generate()}
                      onPromptChange={setAiPrompt}
                    />
                  </div>
                ) : null}
                <div className="space-y-1.5">
                  <Label htmlFor={`${job.id}-brief`}>Prompt</Label>
                  <SchedulePromptField
                    disabled={generating}
                    id={`${job.id}-brief`}
                    value={brief}
                    onChange={setBrief}
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-[10rem_minmax(0,1fr)] sm:items-start">
                  <FrequencyField
                    id={`${job.id}-frequency`}
                    value={cadence.kind}
                    onChange={(kind) => saveCadence(retargetCadence(cadence, kind))}
                  />
                  {cadence.kind === "once" ? (
                    <div className="flex flex-wrap items-end gap-2">
                      <Field label="Date" htmlFor={`${job.id}-date`}>
                        <Input
                          className="w-auto"
                          id={`${job.id}-date`}
                          type="date"
                          value={cadence.at.slice(0, 10)}
                          onChange={(event) => {
                            if (!event.target.value) return;
                            saveCadence(cadenceWithOnceDate(cadence, event.target.value));
                          }}
                        />
                      </Field>
                      <TimeField
                        id={`${job.id}-time`}
                        value={timeValue}
                        onChange={(hour, minute) => saveCadence(cadenceWithTime(cadence, hour, minute))}
                      />
                    </div>
                  ) : null}
                  {cadence.kind === "hourly" ? (
                    <HourlyMinuteField
                      id={`${job.id}-minute`}
                      value={cadence.minute}
                      onChange={(minute) => saveCadence({ ...cadence, minute })}
                    />
                  ) : null}
                  {cadence.kind === "daily" ? (
                    <TimeField
                      id={`${job.id}-time`}
                      value={timeValue}
                      onChange={(hour, minute) => saveCadence(cadenceWithTime(cadence, hour, minute))}
                    />
                  ) : null}
                  {cadence.kind === "weekly" ? (
                    <div className="space-y-2">
                      <TimeField
                        id={`${job.id}-time`}
                        value={timeValue}
                        onChange={(hour, minute) => saveCadence(cadenceWithTime(cadence, hour, minute))}
                      />
                      <div className="space-y-1.5">
                        <Label className="text-muted-foreground text-xs">Days</Label>
                        <div className="flex flex-wrap gap-1">
                          {WEEKDAY_LABELS.map((label, day) => (
                            <ToggleChip
                              key={`${label}-${day}`}
                              pressed={cadence.weekdays.includes(day)}
                              onClick={() => saveCadence(toggleCadenceWeekday(cadence, day))}
                            >
                              {label}
                            </ToggleChip>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : null}
                  {cadence.kind === "monthly" ? (
                    <div className="space-y-2">
                      <TimeField
                        id={`${job.id}-time`}
                        value={timeValue}
                        onChange={(hour, minute) => saveCadence(cadenceWithTime(cadence, hour, minute))}
                      />
                      <div className="space-y-1.5">
                        <Label className="text-muted-foreground text-xs">Days of the month</Label>
                        <div className="grid max-w-xs grid-cols-7 gap-1">
                          {Array.from({ length: 31 }, (_, index) => index + 1).map((day) => (
                            <ToggleChip
                              key={day}
                              pressed={cadence.monthDays.includes(day)}
                              onClick={() => saveCadence(toggleCadenceMonthDay(cadence, day))}
                            >
                              {day}
                            </ToggleChip>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : null}
                  {cadence.kind === "weekdayOfMonth" ? (
                    <div className="space-y-2">
                      <TimeField
                        id={`${job.id}-time`}
                        value={timeValue}
                        onChange={(hour, minute) => saveCadence(cadenceWithTime(cadence, hour, minute))}
                      />
                      <div className="flex flex-wrap items-end gap-2">
                        <Field htmlFor={`${job.id}-nth`} label="On the">
                          <Select
                            value={String(cadence.nth)}
                            onValueChange={(value) => {
                              const nth = Number(value) as WeekdayOfMonthNth;
                              if (nth !== 1 && nth !== 2 && nth !== 3 && nth !== 4 && nth !== -1) return;
                              saveCadence(alignWeekdayOfMonth({ ...cadence, nth }));
                            }}
                          >
                            <SelectTrigger className="w-28" id={`${job.id}-nth`} size="sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent align="start">
                              {NTH_WEEKDAY_OPTIONS.map((option) => (
                                <SelectItem key={option.value} value={String(option.value)}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </Field>
                        <Field htmlFor={`${job.id}-weekday`} label="Weekday">
                          <Select
                            value={String(cadence.weekday)}
                            onValueChange={(value) => {
                              const weekday = Number(value);
                              if (weekday < 0 || weekday > 6) return;
                              saveCadence(alignWeekdayOfMonth({ ...cadence, weekday }));
                            }}
                          >
                            <SelectTrigger className="w-36" id={`${job.id}-weekday`} size="sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent align="start">
                              {WEEKDAY_FULL_NAMES.map((name, weekday) => (
                                <SelectItem key={name} value={String(weekday)}>
                                  {name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </Field>
                        <Field htmlFor={`${job.id}-month-interval`} label="Repeats">
                          <Select
                            value={String(cadence.intervalMonths)}
                            onValueChange={(value) => {
                              const intervalMonths = Number(value);
                              if (!Number.isFinite(intervalMonths) || intervalMonths < 1) return;
                              saveCadence(alignWeekdayOfMonth({ ...cadence, intervalMonths }));
                            }}
                          >
                            <SelectTrigger className="w-44" id={`${job.id}-month-interval`} size="sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent align="start">
                              {monthIntervals.map((option) => (
                                <SelectItem key={option.value} value={String(option.value)}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </Field>
                      </div>
                    </div>
                  ) : null}
                  {cadence.kind === "interval" && interval ? (
                    <div className="flex flex-wrap items-end gap-2">
                      <Field label="Every" htmlFor={`${job.id}-every`}>
                        <Input
                          className="w-20"
                          id={`${job.id}-every`}
                          inputMode="numeric"
                          min={1}
                          type="number"
                          value={interval.value}
                          onChange={(event) => {
                            const value = Number(event.target.value);
                            if (!Number.isFinite(value) || value < 1) return;
                            saveCadence({
                              ...cadence,
                              everyMinutes: minutesFromInterval(value, interval.unit),
                            });
                          }}
                        />
                      </Field>
                      <Select
                        value={interval.unit}
                        onValueChange={(unit) => {
                          if (unit !== "minutes" && unit !== "hours" && unit !== "days") return;
                          saveCadence({
                            ...cadence,
                            everyMinutes: minutesFromInterval(interval.value, unit),
                          });
                        }}
                      >
                        <SelectTrigger aria-label="Repeat unit" className="w-32" size="sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent align="start">
                          <SelectItem value="minutes">minutes</SelectItem>
                          <SelectItem value="hours">hours</SelectItem>
                          <SelectItem value="days">days</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  ) : null}
                </div>
                <p className="text-muted-foreground text-xs">
                  {formatCadenceSummary(cadence)}
                  {nextRunLabel ? ` · Next ${nextRunLabel}` : ""}
                </p>
                {error ? (
                  <p className="text-destructive text-sm" role="alert">
                    {error}
                  </p>
                ) : null}
              </div>
            </PopoverContent>
            ) : null}
            <Switch
              aria-label={job.enabled ? "Pause schedule" : "Resume schedule"}
              checked={job.enabled}
              onCheckedChange={(enabled) => {
                void patchJob(job.id, { enabled }).then((next) => {
                  if (next) onJobChange(next);
                });
              }}
            />
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  aria-label="Delete schedule"
                  className="text-muted-foreground hover:text-muted-foreground"
                  size="icon-sm"
                  type="button"
                  variant="ghost"
                >
                  <Trash2Icon />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this schedule?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This permanently removes the scheduled run.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => {
                      void fetch("/api/jobs", {
                        method: "DELETE",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ id: job.id }),
                      }).then(() => onRefresh());
                    }}
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </PopoverAnchor>
    </Popover>
  );
}

function SchedulePromptField({
  disabled,
  id,
  onChange,
  value,
}: {
  readonly disabled?: boolean;
  readonly id: string;
  readonly onChange: (value: string) => void;
  readonly value: string;
}) {
  return (
    <div className="relative">
      <Textarea
        aria-label="Schedule prompt"
        className="min-h-28 pb-12 pr-12"
        disabled={disabled}
        id={id}
        placeholder="This-run facts: who, what, which file, deadline…"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      <VoiceMicButton
        className="absolute right-2 bottom-2"
        disabled={disabled}
        onTranscript={(text) => {
          onChange(value.trim() ? `${value.trim()} ${text}` : text);
        }}
      />
    </div>
  );
}

function FrequencyField({
  id,
  onChange,
  value,
}: {
  readonly id: string;
  readonly onChange: (kind: JobCadenceKind) => void;
  readonly value: JobCadenceKind;
}) {
  return (
    <Field htmlFor={id} label="Repeats">
      <Select
        value={value}
        onValueChange={(next) => {
          const kind = FREQUENCY_OPTIONS.find((option) => option.value === next)?.value;
          if (kind) onChange(kind);
        }}
      >
        <SelectTrigger className="w-full min-w-40" id={id} size="sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent align="start">
          {FREQUENCY_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  );
}

function TimeField({
  id,
  onChange,
  value,
}: {
  readonly id: string;
  readonly onChange: (hour: number, minute: number) => void;
  readonly value: string;
}) {
  return (
    <Field htmlFor={id} label="Time">
      <Input
        className="w-32"
        id={id}
        type="time"
        value={value}
        onChange={(event) => {
          const match = /^(\d{1,2}):(\d{2})/.exec(event.target.value);
          if (!match) return;
          const hour = Number(match[1]);
          const minute = Number(match[2]);
          if (hour > 23 || minute > 59) return;
          onChange(hour, minute);
        }}
      />
    </Field>
  );
}

function HourlyMinuteField({
  id,
  onChange,
  value,
}: {
  readonly id: string;
  readonly onChange: (minute: number) => void;
  readonly value: number;
}) {
  const options = HOURLY_MINUTES.includes(value) ? HOURLY_MINUTES : [...HOURLY_MINUTES, value].sort((a, b) => a - b);
  return (
    <Field htmlFor={id} label="At">
      <Select value={String(value)} onValueChange={(next) => onChange(Number(next))}>
        <SelectTrigger className="w-32" id={id} size="sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent align="start">
          {options.map((minute) => (
            <SelectItem key={minute} value={String(minute)}>
              :{pad(minute)} past the hour
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  );
}

function Field({
  children,
  htmlFor,
  label,
}: {
  readonly children: ReactNode;
  readonly htmlFor: string;
  readonly label: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-muted-foreground text-xs" htmlFor={htmlFor}>
        {label}
      </Label>
      {children}
    </div>
  );
}

function ToggleChip({
  children,
  onClick,
  pressed,
}: {
  readonly children: ReactNode;
  readonly onClick: () => void;
  readonly pressed: boolean;
}) {
  return (
    <Button
      aria-pressed={pressed}
      className={cn("min-w-8 px-2", pressed && "border-transparent")}
      size="xs"
      type="button"
      variant={pressed ? "default" : "outline"}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}

async function savePrompt(job: ScheduledJob, brief: string): Promise<ScheduledJob | undefined> {
  try {
    const prompt = composeSchedulePrompt({
      brief,
      skill: parseSchedulePrompt(brief).skill ?? parseSchedulePrompt(job.prompt).skill,
    });
    return await patchJob(job.id, { prompt });
  } catch {
    return undefined;
  }
}

async function patchJob(
  id: string,
  patch: { prompt?: string; enabled?: boolean; cadence?: JobCadence },
): Promise<ScheduledJob | undefined> {
  try {
    const response = await fetch("/api/jobs", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...patch }),
    });
    if (!response.ok) return undefined;
    const payload = (await response.json()) as { job?: ScheduledJob };
    return payload.job;
  } catch {
    return undefined;
  }
}
