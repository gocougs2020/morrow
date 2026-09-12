/** Continuation token for `to(eve, target).send(...)`. */
export function eveReceiveAddress(target: Readonly<Record<string, unknown>>): string {
  const address = target.address;
  if (typeof address === "string") {
    const trimmed = address.trim();
    if (trimmed) return trimmed;
  }
  return crypto.randomUUID();
}
