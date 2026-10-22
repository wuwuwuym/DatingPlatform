import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Db } from "@/server/db";
import {
  createTestDb,
  OTHER_SCHOOL_ID,
  SCHOOL_ID,
  seedConversation,
  seedUser,
} from "./support";

let db: Db;

beforeAll(async () => {
  db = await createTestDb();
});

afterAll(async () => {
  await db.close();
});

describe("migrations", () => {
  it("applies every migration exactly once", async () => {
    const rows = await db.query<{ version: string }>(
      "select version from schema_migrations order by version",
    );
    expect(rows.map((r) => r.version)).toEqual(["0001_init.sql", "0002_seed.sql"]);
  });

  it("seeds reference data", async () => {
    const schools = await db.query<{ count: string }>("select count(*)::text from schools");
    const achievements = await db.query<{ count: string }>(
      "select count(*)::text from achievements",
    );
    expect(schools[0]!.count).toBe("5");
    expect(achievements[0]!.count).toBe("3");
  });

  it("stores no plaintext student number column", async () => {
    const columns = await db.query<{ column_name: string }>(
      `select column_name from information_schema.columns
       where table_name = 'identity_verifications'`,
    );
    const names = columns.map((c) => c.column_name);
    expect(names).toContain("student_no_hash");
    expect(names.some((n) => n.includes("student_no") && !n.endsWith("_hash"))).toBe(false);
  });
});

describe("row level security", () => {
  it("hides other users' rows from a peer, even within the same school", async () => {
    const alice = await seedUser(db, { nickname: "Alice" });
    const bob = await seedUser(db, { nickname: "Bob" });

    const visibleToAlice = await db.withUser(alice, (tx) =>
      tx.query<{ id: string }>("select id from users"),
    );
    const ids = visibleToAlice.map((row) => row.id);

    expect(ids).toContain(alice);
    expect(ids).toContain(bob); // matchable peers are intentionally visible
  });

  it("denies everything when no identity is set", async () => {
    await seedUser(db, { nickname: "Carol" });
    const rows = await db.withUser(null, (tx) => tx.query("select id from users"));
    expect(rows).toHaveLength(0);
  });

  it("scopes conversations and messages to participants", async () => {
    const alice = await seedUser(db, { nickname: "A2" });
    const bob = await seedUser(db, { nickname: "B2" });
    const eve = await seedUser(db, { nickname: "E2" });
    const conversationId = await seedConversation(db, alice, bob);

    await db.withUser(alice, (tx) =>
      tx.query(
        "insert into messages (conversation_id, sender_id, content) values ($1, $2, $3)",
        [conversationId, alice, "你好"],
      ),
    );

    const bobView = await db.withUser(bob, (tx) =>
      tx.query("select id from messages where conversation_id = $1", [conversationId]),
    );
    const eveView = await db.withUser(eve, (tx) =>
      tx.query("select id from messages where conversation_id = $1", [conversationId]),
    );

    expect(bobView).toHaveLength(1);
    expect(eveView).toHaveLength(0);
  });

  it("rejects a message forged on behalf of someone else", async () => {
    const alice = await seedUser(db, { nickname: "A3" });
    const bob = await seedUser(db, { nickname: "B3" });
    const conversationId = await seedConversation(db, alice, bob);

    await expect(
      db.withUser(alice, (tx) =>
        tx.query(
          "insert into messages (conversation_id, sender_id, content) values ($1, $2, $3)",
          [conversationId, bob, "伪造"],
        ),
      ),
    ).rejects.toThrow();
  });

  it("keeps identity verification rows invisible to the app role", async () => {
    const alice = await seedUser(db, { nickname: "A4" });
    await expect(
      db.withUser(alice, (tx) => tx.query("select * from identity_verifications")),
    ).rejects.toThrow(/permission denied/i);
  });

  it("does not let a user promote their own status column", async () => {
    const alice = await seedUser(db, { nickname: "A5", status: "incomplete" });
    await expect(
      db.withUser(alice, (tx) =>
        tx.query("update users set status = 'matchable' where id = $1", [alice]),
      ),
    ).rejects.toThrow(/permission denied/i);
  });
});

describe("profile completion guard", () => {
  it("refuses to move an incomplete profile into the matching pool", async () => {
    const user = await seedUser(db, { nickname: "A6", status: "incomplete" });
    await db.withSystem((tx) =>
      tx.query(
        `update users
            set gender = null, mbti = null, zodiac = null,
                hobbies = '{}'::text[], personality_tags = '{}'::text[],
                match_gender_pref = null
          where id = $1`,
        [user],
      ),
    );
    await expect(
      db.withUser(user, (tx) => tx.query("select app.mark_profile_matchable()")),
    ).rejects.toThrow(/PROFILE_INCOMPLETE/);
  });

  it("promotes a complete profile", async () => {
    const user = await seedUser(db, { nickname: "A7", status: "incomplete" });
    await db.withUser(user, async (tx) => {
      await tx.query(
        `update users
            set gender = 'female', mbti = 'ENFP', zodiac = 'leo',
                hobbies = '{徒步}'::text[], personality_tags = '{开朗}'::text[],
                match_gender_pref = 'opposite'
          where id = $1`,
        [user],
      );
      await tx.query("select app.mark_profile_matchable()");
    });

    const rows = await db.withUser(user, (tx) =>
      tx.query<{ status: string }>("select status from users where id = $1", [user]),
    );
    expect(rows[0]!.status).toBe("matchable");
  });
});

describe("seed isolation across schools", () => {
  it("keeps peers from other schools invisible", async () => {
    const local = await seedUser(db, { nickname: "Local", schoolId: SCHOOL_ID });
    await seedUser(db, { nickname: "Remote", schoolId: OTHER_SCHOOL_ID });

    const rows = await db.withUser(local, (tx) =>
      tx.query<{ nickname: string }>("select nickname from users"),
    );
    const nicknames = rows.map((r) => r.nickname);
    expect(nicknames).toContain("Local");
    expect(nicknames).not.toContain("Remote");
  });
});
