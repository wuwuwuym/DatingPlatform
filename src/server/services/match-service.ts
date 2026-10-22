import { scoreMatch } from "@/lib/match/score";
import type { PublicProfile, RecommendationItem } from "@/lib/types";
import type { SessionUser } from "../auth";
import { getDb } from "../db";
import { ApiError } from "../http";
import { PROFILE_COLUMNS } from "../sql";

export const RECOMMENDATION_LIMIT = 20;

export async function getRecommendations(user: SessionUser): Promise<RecommendationItem[]> {
  if (user.status !== "matchable") {
    throw new ApiError(403, "PROFILE_INCOMPLETE", "请先完善资料，加入匹配池");
  }
  if (!user.gender || !user.matchGenderPref) {
    throw new ApiError(403, "PROFILE_INCOMPLETE", "请先设置性别与配对偏好");
  }

  const db = await getDb();

  return db.withUser(user.id, async (tx) => {
    const candidates = await tx.query<PublicProfile>(
      `select ${PROFILE_COLUMNS}
         from users u
         join schools s on s.id = u.school_id
        where u.school_id = $2
          and u.status = 'matchable'
          and u.id <> $1
          and case
                when $3::match_pref = 'same' then u.gender = $4::gender_type
                else u.gender <> $4::gender_type
              end
          and not exists (
            select 1 from blocks b
             where (b.blocker_id = $1 and b.blocked_id = u.id)
                or (b.blocker_id = u.id and b.blocked_id = $1)
          )
          and not exists (
            select 1 from friendships f
             where f.user_a = least($1::uuid, u.id)
               and f.user_b = greatest($1::uuid, u.id)
          )
        order by u.created_at desc
        limit 60`,
      [user.id, user.schoolId, user.matchGenderPref, user.gender],
    );

    const followedRows = await tx.query<{ id: string }>(
      "select followee_id as id from follows where follower_id = $1",
      [user.id],
    );
    const following = new Set(followedRows.map((row) => row.id));

    const me = {
      hobbies: user.hobbies,
      personalityTags: user.personalityTags,
      mbti: user.mbti,
      zodiac: user.zodiac,
    };

    const items: RecommendationItem[] = candidates
      .map((candidate) => {
        const result = scoreMatch(me, {
          hobbies: candidate.hobbies,
          personalityTags: candidate.personalityTags,
          mbti: candidate.mbti,
          zodiac: candidate.zodiac,
        });
        return {
          profile: candidate,
          score: result.score,
          reasons: result.reasons,
          breakdown: result.breakdown,
          following: following.has(candidate.id),
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, RECOMMENDATION_LIMIT);

    for (const item of items) {
      await tx.query(
        `insert into match_recommendations (user_id, target_id, score, reasons, breakdown)
         values ($1, $2, $3, $4::text[], $5::jsonb)
         on conflict (user_id, target_id, batch_date)
         do update set score = excluded.score,
                       reasons = excluded.reasons,
                       breakdown = excluded.breakdown,
                       created_at = now()`,
        [
          user.id,
          item.profile.id,
          item.score,
          item.reasons,
          JSON.stringify(item.breakdown),
        ],
      );
    }

    return items;
  });
}
