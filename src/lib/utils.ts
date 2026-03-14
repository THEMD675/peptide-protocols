import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export const inputClassName = 'w-full rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 px-4 py-3 text-sm text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-900/30 focus:border-emerald-500 dark:focus:border-emerald-600 transition-colors';


export function arPlural(count: number, singular: string, dual: string, plural: string, accusative?: string): string {
  const n = Math.max(0, Math.floor(count));
  if (n === 0) return `0 ${plural}`;
  if (n === 1) return singular;
  if (n === 2) return dual;
  if (n >= 3 && n <= 10) return `${n} ${plural}`;
  return `${n} ${accusative ?? singular}`;
}

/**
 * Copy text to clipboard with fallback for in-app browsers (Instagram, TikTok, etc.)
 * where navigator.clipboard.writeText is blocked.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.cssText = 'position:fixed;left:-9999px;top:-9999px';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      return true;
    } catch {
      return false;
    }
  }
}

/** Strip HTML and limit length — use before any DB insert of user text.
 *  Escapes < and > instead of stripping tags to prevent unclosed-tag XSS bypass. */
export function sanitizeInput(s: string, maxLength = 2000): string {
  return s.trim().replace(/</g, '&lt;').replace(/>/g, '&gt;').slice(0, maxLength);
}

/**
 * AbortSignal.timeout() polyfill for Safari 15 and older browsers.
 * Native AbortSignal.timeout() crashes on Safari 15.
 */
export function timeoutSignal(ms: number): AbortSignal {
  if (typeof AbortSignal !== 'undefined' && 'timeout' in AbortSignal) {
    return AbortSignal.timeout(ms);
  }
  const controller = new AbortController();
  setTimeout(() => controller.abort(new DOMException('Signal timed out', 'TimeoutError')), ms);
  return controller.signal;
}

/**
 * Escape HTML special characters — use when inserting user-supplied data
 * into innerHTML template strings (e.g. PDF export canvases).
 * Prevents XSS via stored data rendered into hidden DOM nodes.
 */
export function escapeHtml(s: string | number | null | undefined): string {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}
