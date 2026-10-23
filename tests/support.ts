import { createPgliteDb, type Db } from "@/server/db";
import { runMigrations } from "@/server/migrate";

export const SCHOOL_ID = "5c000000-0000-4000-8000-000000000001";
export const OTHER_SCHOOL_ID = "5c000000-0000-4000-8000-000000000002";

export async function createTestDb(): Promise<Db> {
  const db = await createPgliteDb();
  await runMigrations(db);
  return db;
}

/**
 * Boots the application singleton against an in-memory database so tests can
 * exercise the real service layer (same code path as the HTTP routes).
 */
export async function useServiceDatabase(): Promise<Db> {
  process.env.PGLITE_DIR = "memory";
  process.env.STUDENT_NO_PEPPER = "test-pepper-0123456789abcdef";
  process.env.SESSION_SECRET = "test-session-0123456789abcdef";
  process.env.ADMIN_PASSCODE = "test-admin-passcode";

  const { getDb } = await import("@/server/db");
  const { runMigrations: migrate } = await import("@/server/migrate");
  const db = await getDb();
  await migrate(db);
  return db;
}

export interface SeedUserInput {
  nickname?: string;
  schoolId?: string;
  gender?: "male" | "female";
  mbti?: string;
  zodiac?: string;
  hobbies?: string[];
  personalityTags?: string[];
  matchGenderPref?: "same" | "opposite";
  status?: "incomplete" | "matchable" | "banned";
  bio?: string;
}

export async function seedUser(db: Db, input: SeedUserInput = {}): Promise<string> {
  const {
    nickname = "测试同学",
    schoolId = SCHOOL_ID,
    gender = "female",
    mbti = "INFJ",
    zodiac = "pisces",
    hobbies = ["摄影"],
    personalityTags = ["温和"],
    matchGenderPref = "opposite",
    status = "matchable",
    bio = "",
  } = input;

  return db.withSystem(async (tx) => {
    const rows = await tx.query<{ id: string }>(
      `insert into users
         (school_id, nickname, gender, mbti, zodiac, hobbies, personality_tags,
          match_gender_pref, status, bio)
       values ($1, $2, $3::gender_type, $4, $5, $6::text[], $7::text[],
          $8::match_pref, $9::user_status, $10)
       returning id`,
      [
        schoolId,
        nickname,
        gender,
        mbti,
        zodiac,
        hobbies,
        personalityTags,
        matchGenderPref,
        status,
        bio,
      ],
    );
    return rows[0]!.id;
  });
}

export async function seedFriendship(db: Db, a: string, b: string): Promise<string> {
  return db.withSystem(async (tx) => {
    const rows = await tx.query<{ id: string }>(
      `insert into friendships (user_a, user_b)
       values (least($1::uuid, $2::uuid), greatest($1::uuid, $2::uuid))
       returning id`,
      [a, b],
    );
    return rows[0]!.id;
  });
}

export async function seedConversation(db: Db, a: string, b: string): Promise<string> {
  return db.withSystem(async (tx) => {
    const rows = await tx.query<{ id: string }>(
      `insert into conversations (user_a, user_b)
       values (least($1::uuid, $2::uuid), greatest($1::uuid, $2::uuid))
       returning id`,
      [a, b],
    );
    return rows[0]!.id;
  });
}

export async function seedPost(
  db: Db,
  authorId: string,
  body: string,
  options: { media?: unknown[]; status?: string; createdAt?: string } = {},
): Promise<string> {
  return db.withSystem(async (tx) => {
    const rows = await tx.query<{ id: string }>(
      `insert into posts (author_id, school_id, body, media, status, created_at)
       values (
         $1,
         (select school_id from users where id = $1),
         $2,
         $3::jsonb,
         $4::post_status,
         coalesce($5::timestamptz, now())
       )
       returning id`,
      [
        authorId,
        body,
        JSON.stringify(options.media ?? []),
        options.status ?? "published",
        options.createdAt ?? null,
      ],
    );
    return rows[0]!.id;
  });
}
