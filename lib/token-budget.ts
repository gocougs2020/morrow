import { appConfig } from "../app.config";

/** Hard cap for a single prompt/turn, in tokens. */
export const TURN_TOKEN_HARD_CAP = 256_000;

/** Compact once usage reaches this fraction of the model's context window. */
export const MODEL_CAPACITY_COMPACTION_RATIO = 0.9;

/** Fallback when a model is not in the local catalog. */
export const DEFAULT_MODEL_CONTEXT_WINDOW = 1_050_000;

export const MODEL_CONTEXT_WINDOWS: Readonly<Record<string, number>> = {
  ...appConfig.models.contextWindows,
};

export function modelContextWindowTokens(modelId: string): number {
  return MODEL_CONTEXT_WINDOWS[modelId] ?? DEFAULT_MODEL_CONTEXT_WINDOW;
}

/** Compact when a turn hits the lower of 256k tokens or 90% of model capacity. */
export function turnContextWindowTokens(modelId: string): number {
  return Math.min(
    TURN_TOKEN_HARD_CAP,
    Math.floor(modelContextWindowTokens(modelId) * MODEL_CAPACITY_COMPACTION_RATIO),
  );
}
