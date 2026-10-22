import { longestStreak } from "@/lib/checkin/streak";
import type { AchievementItem } from "@/lib/types";
import type { Tx } from "../db";
import { iso } from "../sql";

interface AchievementRow {
  code: string;
  name: string;
  description: string;
  threshold: number;
  obtainedAt: unknown;
  pairKey: string | null;
}

/**
 * Achievement progress is "best streak with any single friend", which is what
 * the three streak achievements actually measure. Runs under the caller's RLS
 * context, so only their own check-ins are counted.
 */
export async function listAchievementsFor(tx: Tx, userId: string): Promise<AchievementItem[]> {
  const rows = await tx.query<AchievementRow>(
    `select a.code,
            a.name,
            a.description,
            a.threshold,
            ua.obtained_at as "obtainedAt",
            ua.pair_key as "pairKey"
       from achievements a
       left join user_achievements ua
         on ua.achievement_id = a.id and ua.user_id = $1
      order by a.threshold asc`,
    [userId],
  );

  const checkins = await tx.query<{ pairKey: string; day: string }>(
    `select pair_key as "pairKey", checkin_date::text as day
       from checkins
      where user_id = $1
      order by checkin_date asc`,
    [userId],
  );

  const byPair = new Map<string, string[]>();
  for (const row of checkins) {
    const days = byPair.get(row.pairKey) ?? [];
    days.push(row.day);
    byPair.set(row.pairKey, days);
  }

  let best = 0;
  for (const days of byPair.values()) best = Math.max(best, longestStreak(days));

  return rows.map((row) => ({
    code: row.code,
    name: row.name,
    description: row.description,
    threshold: row.threshold,
    obtainedAt: row.obtainedAt ? iso(row.obtainedAt) : null,
    pairKey: row.pairKey,
    progress: best,
  }));
}
