export const APP_TIME_ZONE = "Asia/Shanghai";

const dateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: APP_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Calendar date in the app time zone, formatted as YYYY-MM-DD. */
export function dateKey(date: Date = new Date()): string {
  return dateFormatter.format(date);
}

export function shiftDateKey(key: string, days: number): string {
  const [year, month, day] = key.split("-").map(Number);
  if (!year || !month || !day) throw new Error(`invalid date key: ${key}`);
  const utc = new Date(Date.UTC(year, month - 1, day));
  utc.setUTCDate(utc.getUTCDate() + days);
  return utc.toISOString().slice(0, 10);
}

/** Consecutive days ending today. Missing today means the streak is broken. */
export function computeStreak(dates: readonly string[], today: string): number {
  const seen = new Set(dates);
  let streak = 0;
  let cursor = today;
  while (seen.has(cursor)) {
    streak += 1;
    cursor = shiftDateKey(cursor, -1);
  }
  return streak;
}

export function longestStreak(dates: readonly string[]): number {
  const sorted = [...new Set(dates)].sort();
  let best = 0;
  let current = 0;
  let previous: string | null = null;

  for (const day of sorted) {
    if (previous !== null && shiftDateKey(previous, 1) === day) {
      current += 1;
    } else {
      current = 1;
    }
    previous = day;
    if (current > best) best = current;
  }
  return best;
}

/** Achievement thresholds reached exactly on this check-in. */
export function reachedThresholds(
  streak: number,
  thresholds: readonly number[],
): number[] {
  return thresholds.filter((threshold) => threshold === streak);
}
