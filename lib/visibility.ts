export type ResourceVisibility = "private" | "shared" | "public";

/** Settings and memories shared with every user on this deployment. */
export const ACCOUNT_SCOPE_ID = "__account__";

/** Explicit file/folder share values. Legacy `"account"` is not included. */
export const LIBRARY_SHARE_VALUES = ["shared", "public"] as const;

/** Skills and jobs still accept the older `"account"` share value. */
export const TEAM_SHARE_VALUES = ["shared", "public", "account"] as const;

export function parseVisibility(value: unknown): ResourceVisibility | undefined {
  if (value === "private" || value === "shared" || value === "public") return value;
  if (value === "account") return "shared";
  return undefined;
}

export function isResourceVisibility(value: unknown): value is ResourceVisibility {
  return parseVisibility(value) !== undefined;
}

export function normalizeVisibility(
  value: unknown,
  fallback: ResourceVisibility = "private",
): ResourceVisibility {
  return parseVisibility(value) ?? fallback;
}

/**
 * Files and folders used to default to stored `"account"` without an explicit share.
 * Keep that implicit default private. `"shared"` and `"public"` stay explicit.
 */
export function normalizeLibraryVisibility(
  visibility: unknown,
  isPublic?: boolean,
): ResourceVisibility {
  if (isPublic || visibility === "public") return "public";
  if (visibility === "shared") return "shared";
  return "private";
}

export function resolveFileVisibility(input: {
  readonly visibility?: unknown;
  readonly isPublic?: boolean;
  readonly currentVisibility?: ResourceVisibility;
}): ResourceVisibility {
  const parsed = input.visibility === undefined ? undefined : parseVisibility(input.visibility);
  if (parsed) {
    if (input.isPublic === true) return "public";
    if (input.isPublic === false && parsed === "public") return "shared";
    return parsed;
  }
  if (input.isPublic === true) return "public";
  if (input.isPublic === false) {
    return input.currentVisibility === "public" ? "shared" : (input.currentVisibility ?? "private");
  }
  return input.currentVisibility ?? "private";
}

export function isPublicVisibility(visibility: ResourceVisibility): boolean {
  return visibility === "public";
}

export function isSharedWithAccount(visibility: ResourceVisibility | undefined): boolean {
  const value = normalizeVisibility(visibility);
  return value === "shared" || value === "public";
}

export function isOwnedBy(resource: { readonly userId: string }, viewerId: string): boolean {
  return resource.userId === viewerId;
}

export function isVisibleToViewer(
  resource: { readonly userId: string; readonly visibility?: ResourceVisibility },
  viewerId: string,
): boolean {
  return isOwnedBy(resource, viewerId) || isSharedWithAccount(resource.visibility);
}

export function canEditResource(
  resource: { readonly userId: string; readonly visibility?: ResourceVisibility },
  viewerId: string,
): boolean {
  return isVisibleToViewer(resource, viewerId);
}
