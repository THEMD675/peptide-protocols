import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function withTimeout<T>(promise: Promise<T>, ms = 15000): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Request timeout')), ms)),
  ]);
}

export function arPlural(count: number, singular: string, dual: string, plural: string, accusative?: string): string {
  const n = Math.max(0, Math.floor(count));
  if (n === 0) return `0 ${plural}`;
  if (n === 1) return singular;
  if (n === 2) return dual;
  if (n >= 3 && n <= 10) return `${n} ${plural}`;
  return `${n} ${accusative ?? singular}`;
}
