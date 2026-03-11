import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}


export function arPlural(count: number, singular: string, dual: string, plural: string, accusative?: string): string {
  const n = Math.max(0, Math.floor(count));
  if (n === 0) return `0 ${plural}`;
  if (n === 1) return singular;
  if (n === 2) return dual;
  if (n >= 3 && n <= 10) return `${n} ${plural}`;
  return `${n} ${accusative ?? singular}`;
}

/** Strip HTML tags and limit length — use before any DB insert of user text */
export function sanitizeInput(s: string, maxLength = 2000): string {
  return s.trim().replace(/<[^>]+>/g, '').slice(0, maxLength);
}
