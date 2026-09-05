import { AsyncLocalStorage } from "node:async_hooks";

export type UsageScope = {
  readonly userId: string;
  readonly chatId?: string | null;
};

const usageScope = new AsyncLocalStorage<UsageScope>();

export function runWithUsageScope<T>(scope: UsageScope, fn: () => T): T {
  return usageScope.run(scope, fn);
}

export function getUsageScope(): UsageScope | undefined {
  return usageScope.getStore();
}
