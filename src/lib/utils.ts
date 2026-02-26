import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function arPlural(count: number, singular: string, dual: string, plural: string, accusative?: string): string {
  if (count === 0) return `0 ${plural}`;
  if (count === 1) return `${singular}`;
  if (count === 2) return dual;
  if (count >= 3 && count <= 10) return `${count} ${plural}`;
  return `${count} ${accusative ?? singular}`;
}
