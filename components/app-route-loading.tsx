import { AppHeader } from "@/components/app-header";
import { Skeleton } from "@/components/ui/skeleton";

export function SessionMessagesLoading() {
  return (
    <div className="mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col gap-4 overflow-y-auto px-4 pt-8 sm:px-6">
      <Skeleton className="h-20" />
      <Skeleton className="h-32" />
      <Skeleton className="h-32" />
    </div>
  );
}

export function SessionContentLoading() {
  return (
    <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden" id="main" tabIndex={-1}>
      <div className="flex shrink-0 items-center gap-2 border-b border-border px-3 py-2">
        <Skeleton className="h-8 w-8 md:hidden" />
        <Skeleton className="h-5 w-40" />
        <Skeleton className="ml-auto h-8 w-24" />
      </div>
      <SessionMessagesLoading />
      <div className="mx-auto flex w-full max-w-3xl shrink-0 px-4 pb-6 sm:px-6">
        <Skeleton className="h-16 w-full rounded-[28px]" />
      </div>
    </main>
  );
}

export function AppRouteLoading({
  sidebar = false,
}: {
  readonly sidebar?: boolean;
}) {
  return (
    <div
      className={
        sidebar
          ? "flex h-dvh flex-col overflow-hidden bg-background"
          : "flex min-h-dvh flex-col bg-background"
      }
    >
      <AppHeader hideOnMobile={sidebar} />
      {sidebar ? (
        <div className="flex min-h-0 flex-1">
          <div className="hidden w-72 border-r border-border p-3 md:block">
            <Skeleton className="mb-3 h-8" />
            <Skeleton className="mb-2 h-14" />
            <Skeleton className="mb-2 h-14" />
            <Skeleton className="h-14" />
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-3 p-6">
            <Skeleton className="h-10 w-1/3" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
        </div>
      ) : (
        <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 px-4 pt-8 pb-20" id="main" tabIndex={-1}>
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-4 w-72" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </main>
      )}
    </div>
  );
}
