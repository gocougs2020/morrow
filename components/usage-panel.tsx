"use client";

import { useState } from "react";
import { AppHeader } from "@/components/app-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EXA_SEARCH_MODEL_ID } from "@/lib/model-prices";
import {
  formatCount,
  formatTokenCount,
  formatUsd,
  type DailyUsageRow,
  type UsageBreakdownRow,
  type UsagePageSnapshot,
  type UsageUserRow,
} from "@/lib/usage";

const usageTabTriggerClassName = "flex-none rounded-none border-none px-0 shadow-none";

function isSearchRow(row: UsageBreakdownRow): boolean {
  return row.key === "web_search" || row.key === EXA_SEARCH_MODEL_ID;
}

function TotalsTable({ rows }: { readonly rows: readonly UsageBreakdownRow[] }) {
  if (rows.length === 0) {
    return <p className="text-muted-foreground text-sm">Nothing recorded yet.</p>;
  }
  return (
    <div className="overflow-hidden rounded-xl border">
      {rows.map((row, index) => (
        <div key={row.key}>
          {index > 0 ? <div className="h-px bg-border" /> : null}
          <div className="flex items-start justify-between gap-4 px-4 py-3 text-sm">
            <div className="min-w-0">
              <p className="truncate font-medium">{row.label}</p>
              <p className="text-muted-foreground text-xs">
                {formatTokenCount(row.totals.inputTokens + row.totals.outputTokens)} tokens
                {isSearchRow(row) && row.totals.calls > 0
                  ? ` · ${formatCount(row.totals.calls)} searches`
                  : row.totals.calls > 0
                    ? ` · ${formatCount(row.totals.calls)} calls`
                    : ""}
              </p>
            </div>
            <span className="shrink-0 font-medium tabular-nums">{formatUsd(row.totals.costUsd)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function utcDayLabel(date: string, style: "short" | "medium" = "short"): string {
  const [year, month, day] = date.split("-").map(Number);
  if (!year || !month || !day) return date;
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString(undefined, {
    day: "numeric",
    month: style === "medium" ? "short" : "narrow",
    timeZone: "UTC",
    ...(style === "medium" ? { year: "numeric" } : {}),
  });
}

function lastUtcDays(count: number): string[] {
  const days: string[] = [];
  const now = new Date();
  const end = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  for (let index = count - 1; index >= 0; index -= 1) {
    days.push(new Date(end - index * 86_400_000).toISOString().slice(0, 10));
  }
  return days;
}

function DailySpendChart({ rows }: { readonly rows: readonly DailyUsageRow[] }) {
  const byDate = new Map(rows.map((row) => [row.date, row]));
  const window = lastUtcDays(30);
  const firstActivity = [...rows].map((row) => row.date).sort()[0];
  const days = firstActivity
    ? window.filter((date) => date >= firstActivity)
    : window;
  const peak = Math.max(...days.map((date) => byDate.get(date)?.totals.costUsd ?? 0), 0);

  if (days.length === 0 || peak <= 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="flex h-36 items-end gap-1">
        {days.map((date) => {
          const cost = byDate.get(date)?.totals.costUsd ?? 0;
          const height = cost > 0 ? Math.max(8, Math.round((cost / peak) * 100)) : 0;
          return (
            <div className="flex h-full min-w-0 flex-1 items-end" key={date}>
              <div
                aria-label={`${utcDayLabel(date, "medium")}: ${formatUsd(cost)}`}
                className="w-full rounded-sm bg-foreground"
                style={{ height: height ? `${height}%` : "2px", opacity: height ? 1 : 0.2 }}
                title={`${utcDayLabel(date, "medium")} · ${formatUsd(cost)}`}
              />
            </div>
          );
        })}
      </div>
      <div className="flex justify-between text-muted-foreground text-xs">
        <span>{utcDayLabel(days[0] ?? "", "medium")}</span>
        <span>Spend by day (UTC)</span>
        <span>{utcDayLabel(days.at(-1) ?? "", "medium")}</span>
      </div>
    </div>
  );
}

function UsageTotalsGrid({ data }: { readonly data: UsagePageSnapshot }) {
  const { totals } = data;
  return (
    <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
      <Card className="gap-2 py-4">
        <CardHeader className="px-4">
          <CardDescription>Total cost</CardDescription>
          <CardTitle className="tabular-nums">{formatUsd(totals.costUsd)}</CardTitle>
        </CardHeader>
      </Card>
      <Card className="gap-2 py-4">
        <CardHeader className="px-4">
          <CardDescription>Sessions</CardDescription>
          <CardTitle className="tabular-nums">{formatCount(data.sessions)}</CardTitle>
        </CardHeader>
      </Card>
      <Card className="gap-2 py-4">
        <CardHeader className="px-4">
          <CardDescription>Turns</CardDescription>
          <CardTitle className="tabular-nums">{formatCount(data.turns)}</CardTitle>
        </CardHeader>
      </Card>
      <Card className="gap-2 py-4">
        <CardHeader className="px-4">
          <CardDescription>Model calls</CardDescription>
          <CardTitle className="tabular-nums">{formatCount(data.modelCalls)}</CardTitle>
        </CardHeader>
      </Card>
      <Card className="gap-2 py-4">
        <CardHeader className="px-4">
          <CardDescription>Tokens</CardDescription>
          <CardTitle className="tabular-nums">
            {formatTokenCount(totals.inputTokens + totals.outputTokens)}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 text-muted-foreground text-xs">
          {formatTokenCount(totals.inputTokens)} in · {formatTokenCount(totals.outputTokens)} out
        </CardContent>
      </Card>
    </div>
  );
}

function PeopleTable({ rows }: { readonly rows: readonly UsageUserRow[] }) {
  if (rows.length === 0) {
    return <p className="text-muted-foreground text-sm">No people recorded yet.</p>;
  }
  return (
    <div className="overflow-hidden rounded-xl border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Person</TableHead>
            <TableHead className="text-right">Sessions</TableHead>
            <TableHead className="text-right">Turns</TableHead>
            <TableHead className="text-right">Tokens</TableHead>
            <TableHead className="text-right">Cost</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.userId}>
              <TableCell>
                <div className="min-w-0">
                  <p className="truncate font-medium">{row.name}</p>
                  {row.email ? (
                    <p className="truncate text-muted-foreground text-xs">{row.email}</p>
                  ) : null}
                </div>
              </TableCell>
              <TableCell className="text-right tabular-nums">{formatCount(row.sessions)}</TableCell>
              <TableCell className="text-right tabular-nums">{formatCount(row.turns)}</TableCell>
              <TableCell className="text-right tabular-nums">
                {formatTokenCount(row.totals.inputTokens + row.totals.outputTokens)}
              </TableCell>
              <TableCell className="text-right font-medium tabular-nums">
                {formatUsd(row.totals.costUsd)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function UsageBreakdown({
  data,
  showPeople,
}: {
  readonly data: UsagePageSnapshot;
  readonly showPeople?: boolean;
}) {
  return (
    <div className="flex flex-col gap-6">
      <UsageTotalsGrid data={data} />
      {showPeople ? (
        <section className="space-y-2">
          <h2 className="font-medium text-sm">By person</h2>
          <PeopleTable rows={data.byUser} />
        </section>
      ) : null}
      <section className="space-y-3">
        <div className="space-y-1">
          <h2 className="font-medium text-sm">By day</h2>
          <p className="text-muted-foreground text-xs">
            Sessions and turns are unique. Daily sessions are conversations started that
            UTC day; daily turns are the first model or search activity in a turn.
          </p>
        </div>
        {data.byDay.length === 0 ? (
          <p className="text-muted-foreground text-sm">No daily usage yet.</p>
        ) : (
          <>
            <DailySpendChart rows={data.byDay} />
            <div className="overflow-hidden rounded-xl border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Sessions</TableHead>
                    <TableHead className="text-right">Turns</TableHead>
                    <TableHead className="text-right">Model calls</TableHead>
                    <TableHead className="text-right">Tokens</TableHead>
                    <TableHead className="text-right">Cost</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.byDay.map((row) => (
                    <TableRow key={row.date}>
                      <TableCell className="font-medium">{utcDayLabel(row.date, "medium")}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatCount(row.sessions)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatCount(row.turns)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatCount(row.modelCalls)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatTokenCount(row.totals.inputTokens + row.totals.outputTokens)}
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums">
                        {formatUsd(row.totals.costUsd)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </section>
      <section className="space-y-2">
        <h2 className="font-medium text-sm">By model</h2>
        <TotalsTable rows={data.byModel} />
      </section>
      <section className="space-y-2">
        <h2 className="font-medium text-sm">By activity</h2>
        <TotalsTable rows={data.byPurpose} />
      </section>
    </div>
  );
}

export function UsagePanel({
  you,
  account,
}: {
  readonly you: UsagePageSnapshot;
  readonly account?: UsagePageSnapshot;
}) {
  const showAccount = Boolean(account);
  const [view, setView] = useState<"you" | "account">(showAccount ? "account" : "you");

  return (
    <div className="flex min-h-dvh flex-col bg-background pb-[env(safe-area-inset-bottom)]">
      <AppHeader />
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 pt-8 pb-20" id="main" tabIndex={-1}>
        <div className="space-y-1">
          <h1 className="text-pretty font-medium text-lg tracking-tight">AI Usage</h1>
          <p className="text-muted-foreground text-sm">
            AI usage is tracked using AI Gateway API calls. 
            Usage is estimated and may vary slightly from actual model calls.
            Hosting, database, and object storage costs are not included.
          </p>
        </div>
        {account ? (
          <Tabs
            value={view}
            onValueChange={(value) => {
              setView(value === "account" ? "account" : "you");
            }}
          >
            <TabsList className="h-auto flex-wrap gap-5 p-0" variant="line">
              <TabsTrigger className={usageTabTriggerClassName} value="account">
                Account
              </TabsTrigger>
              <TabsTrigger className={usageTabTriggerClassName} value="you">
                You
              </TabsTrigger>
            </TabsList>
            <TabsContent className="mt-6" value="account">
              <UsageBreakdown data={account} showPeople />
            </TabsContent>
            <TabsContent className="mt-6" value="you">
              <UsageBreakdown data={you} />
            </TabsContent>
          </Tabs>
        ) : (
          <UsageBreakdown data={you} />
        )}
      </main>
    </div>
  );
}
