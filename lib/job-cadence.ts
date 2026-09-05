import { z } from "zod";

export const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"] as const;
export const WEEKDAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
export const WEEKDAY_FULL_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;
export const NTH_WEEKDAY_OPTIONS = [
  { value: 1, label: "First" },
  { value: 2, label: "Second" },
  { value: 3, label: "Third" },
  { value: 4, label: "Fourth" },
  { value: -1, label: "Last" },
] as const;
export const MONTH_INTERVAL_OPTIONS = [
  { value: 1, label: "Every month" },
  { value: 2, label: "Every other month" },
  { value: 3, label: "Every 3 months" },
  { value: 6, label: "Every 6 months" },
  { value: 12, label: "Every year" },
] as const;
export const CADENCE_KINDS = [
  "once",
  "hourly",
  "daily",
  "weekly",
  "monthly",
  "weekdayOfMonth",
  "interval",
] as const;
export type JobCadenceKind = (typeof CADENCE_KINDS)[number];
export type WeekdayOfMonthNth = 1 | 2 | 3 | 4 | -1;

const timeZoneSchema = z
  .string()
  .min(1)
  .max(64)
  .refine((value) => isValidTimeZone(value), "Use a valid IANA time zone.");

const hourSchema = z.number().int().min(0).max(23);
const minuteSchema = z.number().int().min(0).max(59);

export const jobCadenceSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("once"),
    timezone: timeZoneSchema,
    at: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "Use YYYY-MM-DDTHH:mm."),
  }),
  z.object({
    kind: z.literal("hourly"),
    timezone: timeZoneSchema,
    minute: minuteSchema,
  }),
  z.object({
    kind: z.literal("daily"),
    timezone: timeZoneSchema,
    hour: hourSchema,
    minute: minuteSchema,
  }),
  z.object({
    kind: z.literal("weekly"),
    timezone: timeZoneSchema,
    weekdays: z.array(z.number().int().min(0).max(6)).min(1).max(7),
    hour: hourSchema,
    minute: minuteSchema,
  }),
  z.object({
    kind: z.literal("monthly"),
    timezone: timeZoneSchema,
    monthDays: z.array(z.number().int().min(1).max(31)).min(1).max(31),
    hour: hourSchema,
    minute: minuteSchema,
  }),
  z.object({
    kind: z.literal("weekdayOfMonth"),
    timezone: timeZoneSchema,
    weekday: z.number().int().min(0).max(6),
    nth: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(-1)]),
    intervalMonths: z.number().int().min(1).max(24),
    monthMod: z.number().int().min(0).max(23).optional(),
    hour: hourSchema,
    minute: minuteSchema,
  }),
  z.object({
    kind: z.literal("interval"),
    timezone: timeZoneSchema,
    everyMinutes: z.number().int().min(1).max(525_600),
  }),
]);

export type JobCadence = z.infer<typeof jobCadenceSchema>;

type ZonedParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  weekday: number;
};

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

export function defaultTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

export function isValidTimeZone(value: string): boolean {
  try {
    Intl.DateTimeFormat("en-US", { timeZone: value }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

export function parseJobCadence(value: unknown): JobCadence | null {
  const parsed = jobCadenceSchema.safeParse(value);
  return parsed.success ? normalizeJobCadence(parsed.data) : null;
}

export function normalizeJobCadence(cadence: JobCadence, from = new Date()): JobCadence {
  if (cadence.kind === "weekly") {
    return {
      ...cadence,
      weekdays: uniqueSorted(cadence.weekdays),
    };
  }
  if (cadence.kind === "monthly") {
    return {
      ...cadence,
      monthDays: uniqueSorted(cadence.monthDays),
    };
  }
  if (cadence.kind === "weekdayOfMonth") {
    const intervalMonths = cadence.intervalMonths;
    const monthMod =
      cadence.monthMod != null && cadence.monthMod >= 0 && cadence.monthMod < intervalMonths
        ? cadence.monthMod
        : monthModFromNext(cadence, from);
    return { ...cadence, intervalMonths, monthMod };
  }
  return cadence;
}

export function cadenceKey(cadence: JobCadence): string {
  return JSON.stringify(normalizeJobCadence(cadence));
}

export function inferJobCadence(
  job: { cadence?: JobCadence | null; everyMinutes: number | null; nextRunAt: string },
  timeZone = defaultTimeZone(),
): JobCadence {
  const stored = parseJobCadence(job.cadence);
  if (stored) return stored;

  const zone = isValidTimeZone(timeZone) ? timeZone : "UTC";
  const parts = zonedParts(parseInstant(job.nextRunAt) ?? new Date(), zone);
  const time = { hour: parts.hour, minute: parts.minute };

  if (!job.everyMinutes) {
    return { kind: "once", timezone: zone, at: wallTime(parts) };
  }
  if (job.everyMinutes === 60) {
    return { kind: "hourly", timezone: zone, minute: parts.minute };
  }
  if (job.everyMinutes === 1_440) {
    return { kind: "daily", timezone: zone, ...time };
  }
  if (job.everyMinutes === 10_080) {
    return { kind: "weekly", timezone: zone, weekdays: [parts.weekday], ...time };
  }
  return { kind: "interval", timezone: zone, everyMinutes: job.everyMinutes };
}

export function everyMinutesForCadence(cadence: JobCadence): number | null {
  switch (cadence.kind) {
    case "once":
      return null;
    case "hourly":
      return 60;
    case "daily":
      return 1_440;
    case "weekly":
      return cadence.weekdays.length === 1 ? 10_080 : null;
    case "monthly":
    case "weekdayOfMonth":
      return null;
    case "interval":
      return cadence.everyMinutes;
  }
}

export function scheduleFieldsFromCadence(cadence: JobCadence, from = new Date()) {
  const normalized = normalizeJobCadence(cadence);
  const next = nextRunAtFromCadence(normalized, from);
  return {
    cadence: normalized,
    everyMinutes: everyMinutesForCadence(normalized),
    nextRunAt: (next ?? from).toISOString(),
  };
}

export function nextRunAtFromCadence(cadence: JobCadence, from = new Date()): Date | null {
  const normalized = normalizeJobCadence(cadence);
  switch (normalized.kind) {
    case "once":
      return wallTimeToUtc(normalized.at, normalized.timezone);
    case "interval":
      return new Date(from.getTime() + normalized.everyMinutes * 60_000);
    case "hourly":
      return nextHourly(normalized, from);
    case "daily":
      return nextDaily(normalized, from);
    case "weekly":
      return nextWeekly(normalized, from);
    case "monthly":
      return nextMonthly(normalized, from);
    case "weekdayOfMonth":
      return nextWeekdayOfMonth(normalized, from);
  }
}

export function advanceJobAfterRun(job: {
  cadence?: JobCadence | null;
  everyMinutes: number | null;
  nextRunAt: string;
}): { enabled: boolean; nextRunAt?: string } {
  const cadence = parseJobCadence(job.cadence);
  if (!cadence) {
    if (!job.everyMinutes) return { enabled: false };
    return {
      enabled: true,
      nextRunAt: new Date(Date.now() + job.everyMinutes * 60_000).toISOString(),
    };
  }
  if (cadence.kind === "once") return { enabled: false };
  const next = nextRunAtFromCadence(cadence, new Date());
  if (!next) return { enabled: false };
  return { enabled: true, nextRunAt: next.toISOString() };
}

export function formatCadenceSummary(cadence: JobCadence): string {
  const zone = timeZoneLabel(cadence.timezone);
  const time = "hour" in cadence ? formatWallTime(cadence.hour, cadence.minute) : undefined;
  switch (cadence.kind) {
    case "once": {
      const at = wallTimeToUtc(cadence.at, cadence.timezone);
      return at ? `Once on ${formatZonedDateTime(at, cadence.timezone)}` : "Once";
    }
    case "hourly":
      return `Every hour at :${pad(cadence.minute)} ${zone}`;
    case "daily":
      return `Every day at ${time} ${zone}`;
    case "weekly":
      return `${formatWeekdays(cadence.weekdays)} at ${time} ${zone}`;
    case "monthly":
      return `Monthly on the ${formatMonthDays(cadence.monthDays)} at ${time} ${zone}`;
    case "weekdayOfMonth":
      return `The ${formatNthWeekday(cadence.nth)} ${WEEKDAY_FULL_NAMES[cadence.weekday]} of ${formatMonthInterval(cadence.intervalMonths)} at ${time} ${zone}`;
    case "interval":
      return `Every ${formatInterval(cadence.everyMinutes)}`;
  }
}

export function formatZonedDateTime(value: Date | string, timeZone: string): string {
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "";
  const zone = isValidTimeZone(timeZone) ? timeZone : "UTC";
  return new Intl.DateTimeFormat(undefined, {
    timeZone: zone,
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(date);
}

export function timeZoneLabel(timeZone: string): string {
  try {
    const parts = new Intl.DateTimeFormat(undefined, {
      timeZone,
      timeZoneName: "short",
    }).formatToParts(new Date());
    return parts.find((part) => part.type === "timeZoneName")?.value ?? timeZone;
  } catch {
    return timeZone;
  }
}

export function retargetCadence(cadence: JobCadence, kind: JobCadenceKind, from = new Date()): JobCadence {
  const timezone = cadence.timezone;
  const parts = clockParts(from, timezone);
  const hour = "hour" in cadence ? cadence.hour : parts.hour;
  const minute = "minute" in cadence ? cadence.minute : parts.minute;
  switch (kind) {
    case "once": {
      const at = cadence.kind === "once" ? cadence.at : `${parts.date}T${pad(hour)}:${pad(minute)}`;
      const instant = wallTimeToUtc(at, timezone);
      if (instant && instant.getTime() > from.getTime()) {
        return { kind, timezone, at };
      }
      const tomorrow = addDays(parts, 1);
      return { kind, timezone, at: `${tomorrow.year}-${pad(tomorrow.month)}-${pad(tomorrow.day)}T${pad(hour)}:${pad(minute)}` };
    }
    case "hourly":
      return { kind, timezone, minute };
    case "daily":
      return { kind, timezone, hour, minute };
    case "weekly":
      return {
        kind,
        timezone,
        weekdays: cadence.kind === "weekly" ? cadence.weekdays : [parts.weekday],
        hour,
        minute,
      };
    case "monthly":
      return {
        kind,
        timezone,
        monthDays: cadence.kind === "monthly" ? cadence.monthDays : [parts.day],
        hour,
        minute,
      };
    case "weekdayOfMonth": {
      const next = {
        kind,
        timezone,
        weekday: cadence.kind === "weekdayOfMonth" ? cadence.weekday : cadence.kind === "weekly" ? (cadence.weekdays[0] ?? parts.weekday) : parts.weekday,
        nth: cadence.kind === "weekdayOfMonth" ? cadence.nth : 1,
        intervalMonths: cadence.kind === "weekdayOfMonth" ? cadence.intervalMonths : 1,
        hour,
        minute,
      } as const;
      return normalizeJobCadence(next, from);
    }
    case "interval":
      return {
        kind,
        timezone,
        everyMinutes: cadence.kind === "interval" ? cadence.everyMinutes : 60,
      };
  }
}

export function cadenceWithTime(cadence: JobCadence, hour: number, minute: number): JobCadence {
  switch (cadence.kind) {
    case "once":
      return { ...cadence, at: `${cadence.at.slice(0, 10)}T${pad(hour)}:${pad(minute)}` };
    case "hourly":
      return { ...cadence, minute };
    case "daily":
    case "weekly":
    case "monthly":
    case "weekdayOfMonth":
      return { ...cadence, hour, minute };
    case "interval":
      return cadence;
  }
}

export function cadenceWithOnceDate(cadence: Extract<JobCadence, { kind: "once" }>, date: string): JobCadence {
  return { ...cadence, at: `${date}T${cadence.at.slice(11, 16)}` };
}

export function toggleCadenceWeekday(
  cadence: Extract<JobCadence, { kind: "weekly" }>,
  day: number,
): JobCadence {
  const weekdays = cadence.weekdays.includes(day)
    ? cadence.weekdays.filter((value) => value !== day)
    : [...cadence.weekdays, day];
  return { ...cadence, weekdays: weekdays.length > 0 ? uniqueSorted(weekdays) : cadence.weekdays };
}

export function toggleCadenceMonthDay(
  cadence: Extract<JobCadence, { kind: "monthly" }>,
  day: number,
): JobCadence {
  const monthDays = cadence.monthDays.includes(day)
    ? cadence.monthDays.filter((value) => value !== day)
    : [...cadence.monthDays, day];
  return { ...cadence, monthDays: monthDays.length > 0 ? uniqueSorted(monthDays) : cadence.monthDays };
}

export function alignWeekdayOfMonth(
  cadence: Extract<JobCadence, { kind: "weekdayOfMonth" }>,
  from = new Date(),
): JobCadence {
  return normalizeJobCadence(
    {
      ...cadence,
      monthMod: undefined,
    },
    from,
  );
}

export function intervalParts(minutes: number): {
  value: number;
  unit: "minutes" | "hours" | "days";
} {
  if (minutes % 1_440 === 0) return { value: minutes / 1_440, unit: "days" };
  if (minutes % 60 === 0) return { value: minutes / 60, unit: "hours" };
  return { value: minutes, unit: "minutes" };
}

export function minutesFromInterval(value: number, unit: "minutes" | "hours" | "days"): number {
  const amount = Math.max(1, Math.round(value) || 1);
  if (unit === "days") return Math.min(525_600, amount * 1_440);
  if (unit === "hours") return Math.min(525_600, amount * 60);
  return Math.min(525_600, amount);
}

export function clockParts(value: Date | string, timeZone: string) {
  const date = typeof value === "string" ? (parseInstant(value) ?? new Date()) : value;
  const parts = zonedParts(date, isValidTimeZone(timeZone) ? timeZone : "UTC");
  return {
    ...parts,
    date: `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`,
    time: `${pad(parts.hour)}:${pad(parts.minute)}`,
  };
}

export function pad(value: number): string {
  return String(value).padStart(2, "0");
}

export function formatWallTime(hour: number, minute: number): string {
  const date = new Date(Date.UTC(2020, 0, 1, hour, minute));
  return new Intl.DateTimeFormat(undefined, {
    timeZone: "UTC",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function nextHourly(cadence: Extract<JobCadence, { kind: "hourly" }>, from: Date): Date | null {
  const parts = zonedParts(from, cadence.timezone);
  const sameHour = { ...parts, minute: cadence.minute, hour: parts.hour };
  const same = zonedDate(sameHour, cadence.timezone);
  if (same && same.getTime() > from.getTime()) return same;
  const next = addHours(parts, 1);
  next.minute = cadence.minute;
  return zonedDate(next, cadence.timezone);
}

function nextDaily(cadence: Extract<JobCadence, { kind: "daily" }>, from: Date): Date | null {
  const parts = zonedParts(from, cadence.timezone);
  for (let offset = 0; offset < 3; offset += 1) {
    const day = addDays(parts, offset);
    const candidate = zonedDate({ ...day, hour: cadence.hour, minute: cadence.minute }, cadence.timezone);
    if (candidate && candidate.getTime() > from.getTime()) return candidate;
  }
  return null;
}

function nextWeekly(cadence: Extract<JobCadence, { kind: "weekly" }>, from: Date): Date | null {
  const parts = zonedParts(from, cadence.timezone);
  const days = new Set(cadence.weekdays);
  for (let offset = 0; offset < 8; offset += 1) {
    const day = addDays(parts, offset);
    if (!days.has(day.weekday)) continue;
    const candidate = zonedDate({ ...day, hour: cadence.hour, minute: cadence.minute }, cadence.timezone);
    if (candidate && candidate.getTime() > from.getTime()) return candidate;
  }
  return null;
}

function nextMonthly(cadence: Extract<JobCadence, { kind: "monthly" }>, from: Date): Date | null {
  const parts = zonedParts(from, cadence.timezone);
  const days = uniqueSorted(cadence.monthDays);
  for (let monthOffset = 0; monthOffset < 14; monthOffset += 1) {
    const month = addMonths(parts, monthOffset);
    const lastDay = daysInMonth(month.year, month.month);
    for (const day of days) {
      if (day > lastDay) continue;
      const candidate = zonedDate(
        { ...month, day, hour: cadence.hour, minute: cadence.minute, weekday: 0 },
        cadence.timezone,
      );
      if (candidate && candidate.getTime() > from.getTime()) return candidate;
    }
  }
  return null;
}

function nextWeekdayOfMonth(
  cadence: Extract<JobCadence, { kind: "weekdayOfMonth" }>,
  from: Date,
): Date | null {
  const parts = zonedParts(from, cadence.timezone);
  const intervalMonths = Math.max(1, cadence.intervalMonths);
  const monthMod =
    cadence.monthMod != null && cadence.monthMod >= 0 && cadence.monthMod < intervalMonths
      ? cadence.monthMod
      : monthIndex(parts) % intervalMonths;
  for (let monthOffset = 0; monthOffset < 48; monthOffset += 1) {
    const month = addMonths(parts, monthOffset);
    if (monthIndex(month) % intervalMonths !== monthMod) continue;
    const day = nthWeekdayInMonth(month.year, month.month, cadence.weekday, cadence.nth);
    if (day == null) continue;
    const candidate = zonedDate(
      { ...month, day, hour: cadence.hour, minute: cadence.minute, weekday: 0 },
      cadence.timezone,
    );
    if (candidate && candidate.getTime() > from.getTime()) return candidate;
  }
  return null;
}

function monthModFromNext(
  cadence: Extract<JobCadence, { kind: "weekdayOfMonth" }>,
  from: Date,
): number {
  const next = nextWeekdayOfMonth({ ...cadence, intervalMonths: 1, monthMod: 0 }, from);
  if (!next) return 0;
  return monthIndex(zonedParts(next, cadence.timezone)) % Math.max(1, cadence.intervalMonths);
}

function nthWeekdayInMonth(
  year: number,
  month: number,
  weekday: number,
  nth: WeekdayOfMonthNth,
): number | null {
  const last = daysInMonth(year, month);
  if (nth === -1) {
    const lastWeekday = weekdayOfDate(year, month, last);
    return last - ((lastWeekday - weekday + 7) % 7);
  }
  const firstWeekday = weekdayOfDate(year, month, 1);
  const firstOccurrence = 1 + ((weekday - firstWeekday + 7) % 7);
  const day = firstOccurrence + (nth - 1) * 7;
  return day > last ? null : day;
}

function weekdayOfDate(year: number, month: number, day: number): number {
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

function monthIndex(parts: { year: number; month: number }): number {
  return parts.year * 12 + (parts.month - 1);
}

function zonedParts(date: Date, timeZone: string): ZonedParts {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const map = Object.fromEntries(formatter.formatToParts(date).map((part) => [part.type, part.value]));
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: Number(map.hour),
    minute: Number(map.minute),
    weekday: WEEKDAY_INDEX[map.weekday ?? ""] ?? 0,
  };
}

function zonedDate(parts: ZonedParts, timeZone: string): Date | null {
  let utc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, 0);
  for (let i = 0; i < 4; i += 1) {
    const actual = zonedParts(new Date(utc), timeZone);
    const target = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, 0);
    const got = Date.UTC(actual.year, actual.month - 1, actual.day, actual.hour, actual.minute, 0);
    const delta = target - got;
    if (delta === 0) return new Date(utc);
    utc += delta;
  }
  return new Date(utc);
}

function wallTime(parts: ZonedParts): string {
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}T${pad(parts.hour)}:${pad(parts.minute)}`;
}

function wallTimeToUtc(at: string, timeZone: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(at);
  if (!match) return null;
  return zonedDate(
    {
      year: Number(match[1]),
      month: Number(match[2]),
      day: Number(match[3]),
      hour: Number(match[4]),
      minute: Number(match[5]),
      weekday: 0,
    },
    timeZone,
  );
}

function addDays(parts: ZonedParts, days: number): ZonedParts {
  const utc = Date.UTC(parts.year, parts.month - 1, parts.day + days, 12, 0, 0);
  const next = new Date(utc);
  const weekday = (parts.weekday + ((days % 7) + 7)) % 7;
  return {
    year: next.getUTCFullYear(),
    month: next.getUTCMonth() + 1,
    day: next.getUTCDate(),
    hour: parts.hour,
    minute: parts.minute,
    weekday,
  };
}

function addHours(parts: ZonedParts, hours: number): ZonedParts {
  let hour = parts.hour + hours;
  let dayDelta = 0;
  while (hour >= 24) {
    hour -= 24;
    dayDelta += 1;
  }
  while (hour < 0) {
    hour += 24;
    dayDelta -= 1;
  }
  return { ...addDays(parts, dayDelta), hour };
}

function addMonths(parts: ZonedParts, months: number): ZonedParts {
  const monthIndex = parts.month - 1 + months;
  const year = parts.year + Math.floor(monthIndex / 12);
  const month = ((monthIndex % 12) + 12) % 12;
  return {
    ...parts,
    year,
    month: month + 1,
    day: 1,
  };
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function parseInstant(value: string): Date | null {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function uniqueSorted(values: readonly number[]): number[] {
  return [...new Set(values)].sort((a, b) => a - b);
}

function formatWeekdays(weekdays: readonly number[]): string {
  const days = uniqueSorted(weekdays);
  if (days.length === 7) return "Every day";
  if (days.length === 5 && days.every((day, index) => day === index + 1)) return "Every weekday";
  if (days.length === 2 && days[0] === 0 && days[1] === 6) return "Every weekend";
  if (days.length === 1) return `Every ${WEEKDAY_NAMES[days[0] ?? 0]}`;
  return `Every ${days.map((day) => WEEKDAY_NAMES[day]).join(", ")}`;
}

function formatMonthDays(days: readonly number[]): string {
  const values = uniqueSorted(days);
  if (values.length === 1) return ordinal(values[0] ?? 1);
  return values.map(ordinal).join(", ");
}

function ordinal(value: number): string {
  const teen = value % 100;
  if (teen >= 11 && teen <= 13) return `${value}th`;
  switch (value % 10) {
    case 1:
      return `${value}st`;
    case 2:
      return `${value}nd`;
    case 3:
      return `${value}rd`;
    default:
      return `${value}th`;
  }
}

function formatNthWeekday(nth: WeekdayOfMonthNth): string {
  switch (nth) {
    case 1:
      return "first";
    case 2:
      return "second";
    case 3:
      return "third";
    case 4:
      return "fourth";
    case -1:
      return "last";
  }
}

function formatMonthInterval(months: number): string {
  if (months === 1) return "every month";
  if (months === 2) return "every other month";
  if (months === 12) return "every year";
  return `every ${months} months`;
}

function formatInterval(minutes: number): string {
  if (minutes % 1_440 === 0) {
    const days = minutes / 1_440;
    return days === 1 ? "day" : `${days} days`;
  }
  if (minutes % 60 === 0) {
    const hours = minutes / 60;
    return hours === 1 ? "hour" : `${hours} hours`;
  }
  return minutes === 1 ? "minute" : `${minutes} minutes`;
}
