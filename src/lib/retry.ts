export async function withRetry<T>(
  fn: () => Promise<T>,
  { retries = 2, delay = 500 }: { retries?: number; delay?: number } = {}
): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (e) {
      lastError = e;
      if (i < retries) await new Promise(r => setTimeout(r, delay * (i + 1)));
    }
  }
  throw lastError;
}
