import { computeStreak, dateKey } from "@/lib/checkin/streak";
import { pairKeyOf } from "@/lib/pair";
import type { FriendItem, FollowItem, PublicProfile } from "@/lib/types";
import type { SessionUser } from "../auth";
import { getDb } from "../db";
import { ApiError } from "../http";
import { iso, PROFILE_COLUMNS } from "../sql";

interface FriendRow extends PublicProfile {
  followedAt: unknown;
}

export async function followUser(
  user: SessionUser,
  targetId: string,
): Promise<{ friend: boolean; following: boolean }> {
  if (targetId === user.id) {
    throw new ApiError(400, "CANNOT_FOLLOW_SELF", "不能关注自己");
  }

  const db = await getDb();
  const mutual = await db.withUser(user.id, async (tx) => {
    const target = await tx.query<{ id: string }>(
      "select id from users where id = $1 and status = 'matchable'",
      [targetId],
    );
    if (target.length === 0) {
      // Deliberately vague: do not reveal whether the account exists.
      throw new ApiError(404, "USER_NOT_FOUND", "该用户暂不可关注");
    }

    const blocked = await tx.query(
      `select 1 from blocks
        where (blocker_id = $1 and blocked_id = $2)
           or (blocker_id = $2 and blocked_id = $1)`,
      [user.id, targetId],
    );
    if (blocked.length > 0) {
      throw new ApiError(403, "FORBIDDEN", "暂时无法关注该用户");
    }

    await tx.query(
      "insert into follows (follower_id, followee_id) values ($1, $2) on conflict do nothing",
      [user.id, targetId],
    );

    const reverse = await tx.query(
      "select 1 from follows where follower_id = $1 and followee_id = $2",
      [targetId, user.id],
    );
    return reverse.length > 0;
  });

  if (mutual) {
    await db.withSystem((tx) =>
      tx.query(
        `insert into friendships (user_a, user_b)
         values (least($1::uuid, $2::uuid), greatest($1::uuid, $2::uuid))
         on conflict (user_a, user_b) do nothing`,
        [user.id, targetId],
      ),
    );
  }

  return { friend: mutual, following: true };
}

export async function unfollowUser(
  user: SessionUser,
  targetId: string,
): Promise<{ friend: boolean; following: boolean }> {
  const db = await getDb();
  await db.withUser(user.id, (tx) =>
    tx.query("delete from follows where follower_id = $1 and followee_id = $2", [
      user.id,
      targetId,
    ]),
  );
  await closePair(db, user.id, targetId, "unfollow");
  return { friend: false, following: false };
}

export async function blockUser(
  user: SessionUser,
  targetId: string,
): Promise<{ blocked: true }> {
  if (targetId === user.id) {
    throw new ApiError(400, "CANNOT_BLOCK_SELF", "不能拉黑自己");
  }

  const db = await getDb();
  await db.withUser(user.id, (tx) =>
    tx.query(
      "insert into blocks (blocker_id, blocked_id) values ($1, $2) on conflict do nothing",
      [user.id, targetId],
    ),
  );

  await db.withSystem(async (tx) => {
    await tx.query(
      `delete from follows
        where (follower_id = $1 and followee_id = $2)
           or (follower_id = $2 and followee_id = $1)`,
      [user.id, targetId],
    );
  });
  await closePair(db, user.id, targetId, "block");
  return { blocked: true };
}

export async function unblockUser(
  user: SessionUser,
  targetId: string,
): Promise<{ blocked: false }> {
  const db = await getDb();
  await db.withUser(user.id, (tx) =>
    tx.query("delete from blocks where blocker_id = $1 and blocked_id = $2", [
      user.id,
      targetId,
    ]),
  );
  return { blocked: false };
}

async function closePair(
  db: Awaited<ReturnType<typeof getDb>>,
  me: string,
  other: string,
  reason: string,
): Promise<void> {
  await db.withSystem(async (tx) => {
    await tx.query(
      `delete from friendships
        where user_a = least($1::uuid, $2::uuid)
          and user_b = greatest($1::uuid, $2::uuid)`,
      [me, other],
    );
    await tx.query(
      `update conversations
          set closed_at = now()
        where user_a = least($1::uuid, $2::uuid)
          and user_b = greatest($1::uuid, $2::uuid)
          and closed_at is null`,
      [me, other],
    );
  });
  void reason;
}

export async function listFriends(user: SessionUser): Promise<FriendItem[]> {
  const db = await getDb();
  return db.withUser(user.id, async (tx) => {
    const rows = await tx.query<FriendRow>(
      `select ${PROFILE_COLUMNS}
         from friendships f
         join users u
           on u.id = case when f.user_a = $1 then f.user_b else f.user_a end
         join schools s on s.id = u.school_id
        where f.user_a = $1 or f.user_b = $1
        order by f.created_at desc`,
      [user.id],
    );

    const checkins = await tx.query<{ pairKey: string; day: string }>(
      `select pair_key as "pairKey", checkin_date::text as day
         from checkins
        where user_id = $1
        order by checkin_date asc`,
      [user.id],
    );

    const today = dateKey();
    const daysByPair = new Map<string, string[]>();
    for (const row of checkins) {
      const days = daysByPair.get(row.pairKey) ?? [];
      days.push(row.day);
      daysByPair.set(row.pairKey, days);
    }

    const mineToday = await tx.query<{ id: string }>(
      "select partner_id as id from checkins where user_id = $1 and checkin_date = $2::date",
      [user.id, today],
    );
    const partnerToday = await tx.query<{ id: string }>(
      "select user_id as id from checkins where partner_id = $1 and checkin_date = $2::date",
      [user.id, today],
    );

    const mySet = new Set(mineToday.map((row) => row.id));
    const partnerSet = new Set(partnerToday.map((row) => row.id));

    return rows.map((row) => ({
      profile: row,
      streakDays: computeStreak(daysByPair.get(pairKeyOf(user.id, row.id)) ?? [], today),
      checkedInToday: mySet.has(row.id),
      partnerCheckedInToday: partnerSet.has(row.id),
    }));
  });
}

export async function listFollowing(user: SessionUser): Promise<FollowItem[]> {
  const db = await getDb();
  return db.withUser(user.id, async (tx) => {
    const rows = await tx.query<FriendRow>(
      `select ${PROFILE_COLUMNS}, f.created_at as "followedAt",
              exists (
                select 1 from follows back
                 where back.follower_id = u.id and back.followee_id = $1
              ) as mutual
         from follows f
         join users u on u.id = f.followee_id
         join schools s on s.id = u.school_id
        where f.follower_id = $1
        order by f.created_at desc`,
      [user.id],
    );
    return rows.map((row) => ({
      profile: row,
      followedAt: iso(row.followedAt),
      mutual: Boolean((row as unknown as { mutual: boolean }).mutual),
    }));
  });
}

export async function listFollowers(user: SessionUser): Promise<FollowItem[]> {
  const db = await getDb();
  return db.withUser(user.id, async (tx) => {
    const rows = await tx.query<FriendRow>(
      `select ${PROFILE_COLUMNS}, f.created_at as "followedAt",
              exists (
                select 1 from follows back
                 where back.follower_id = $1 and back.followee_id = u.id
              ) as mutual
         from follows f
         join users u on u.id = f.follower_id
         join schools s on s.id = u.school_id
        where f.followee_id = $1
        order by f.created_at desc`,
      [user.id],
    );
    return rows.map((row) => ({
      profile: row,
      followedAt: iso(row.followedAt),
      mutual: Boolean((row as unknown as { mutual: boolean }).mutual),
    }));
  });
}

export async function areFriends(userId: string, otherId: string): Promise<boolean> {
  const db = await getDb();
  return db.withUser(userId, async (tx) => {
    const rows = await tx.query(
      `select 1 from friendships
        where user_a = least($1::uuid, $2::uuid)
          and user_b = greatest($1::uuid, $2::uuid)`,
      [userId, otherId],
    );
    return rows.length > 0;
  });
}
