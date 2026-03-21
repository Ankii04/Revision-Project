import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merges Tailwind class names safely, handling conflicts correctly. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/** Formats a date safely as "Mar 20, 2026" */
export function formatDate(date?: Date | string | null): string {
  if (!date) return "N/A";
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return "N/A";
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(d);
  } catch {
    return "N/A";
  }
}

/** Returns the relative time safely from now, e.g. "3 days ago" */
export function formatRelativeTime(date?: Date | string | null): string {
  if (!date) return "Just now";
  
  try {
    const d = new Date(date);
    const ms = d.getTime();
    if (isNaN(ms)) return "Just now";

    const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
    const diffMs = ms - Date.now();
    
    // Convert to units
    const diffMin = Math.round(diffMs / (1000 * 60));
    const diffHr = Math.round(diffMs / (1000 * 60 * 60));
    const diffDay = Math.round(diffMs / (1000 * 60 * 60 * 24));

    if (Math.abs(diffMin) < 60) return rtf.format(diffMin, "minute");
    if (Math.abs(diffHr) < 24) return rtf.format(diffHr, "hour");
    return rtf.format(diffDay, "day");
  } catch {
    return "Just now";
  }
}

/** Truncates a string to a max length with an ellipsis */
export function truncate(str: string, maxLength: number): string {
  if (!str) return "";
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + "...";
}

/** Maps a difficulty string to a color class */
export function difficultyColor(
  difficulty?: "EASY" | "MEDIUM" | "HARD" | "UNKNOWN"
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
    default:
      return 3;
  }
}
