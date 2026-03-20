import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merges Tailwind class names safely, handling conflicts correctly. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/** Formats a date as "Mar 20, 2026" */
export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
}

/** Returns the relative time from now, e.g. "3 days ago" */
export function formatRelativeTime(date: Date | string): string {
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  const diffMs = new Date(date).getTime() - Date.now();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (Math.abs(diffDays) < 1) {
    const diffHours = Math.round(diffMs / (1000 * 60 * 60));
    if (Math.abs(diffHours) < 1) {
      const diffMinutes = Math.round(diffMs / (1000 * 60));
      return rtf.format(diffMinutes, "minute");
    }
    return rtf.format(diffHours, "hour");
  }
  return rtf.format(diffDays, "day");
}

/** Truncates a string to a max length with an ellipsis */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + "...";
}

/** Maps a difficulty string to a color class */
export function difficultyColor(
  difficulty: "EASY" | "MEDIUM" | "HARD" | "UNKNOWN"
): string {
  switch (difficulty) {
    case "EASY":
      return "text-green-400";
    case "MEDIUM":
      return "text-yellow-400";
    case "HARD":
      return "text-red-400";
    default:
      return "text-muted-foreground";
  }
}

/** Maps a recall rating to its SM-2 quality number (0-5 scale) */
export function ratingToQuality(
  rating: "AGAIN" | "HARD" | "GOOD" | "EASY"
): number {
  switch (rating) {
    case "AGAIN":
      return 0;
    case "HARD":
      return 3;
    case "GOOD":
      return 4;
    case "EASY":
      return 5;
  }
}
