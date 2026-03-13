/**
 * Errors always log (dev + prod) so we have visibility into production issues.
 * Warnings log in dev + prod. Debug only in dev.
 */
export function logError(msg: string, err?: unknown): void {
  console.error(msg, err);
}

export function logWarn(msg: string, data?: unknown): void {
  console.warn(msg, data);
}

export function logDebug(msg: string, data?: unknown): void {
  if (import.meta.env.DEV) console.log(msg, data);
}
