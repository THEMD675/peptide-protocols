/**
 * Dev-only logger — production builds emit nothing.
 */
export function logError(msg: string, err?: unknown): void {
  if (import.meta.env.DEV) console.error(msg, err);
}

export function logWarn(msg: string, data?: unknown): void {
  if (import.meta.env.DEV) console.warn(msg, data);
}

export function logDebug(msg: string, data?: unknown): void {
  if (import.meta.env.DEV) console.log(msg, data);
}
