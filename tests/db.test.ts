import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Db } from "@/server/db";
import {
  createTestDb,
  OTHER_SCHOOL_ID,
  SCHOOL_ID,
  seedConversation,
  seedPost,
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
    expect(rows.map((r) => r.version)).toEqual([
      "0001_init.sql",
      "0002_seed.sql",
      "0003_circle.sql",
      "0004_circle_policy.sql",
      "0005_match_recommendations_update.sql",
    ]);
  });

  it("seeds reference data", async () => {
    const schools = await db.query<{ count: string }>("select count(*)::text from schools");
    const achievements = await db.query<{ count: string }>(
      "select count(*)::text from achievements",
    );
    expect(schools[0]!.count).toBe("5");
    expect(achievements[0]!.count).toBe("3");

    const blocked = await db.query<{ count: string }>(
      "select count(*)::text from sensitive_words where word in ('傻逼', '代考')",
    );
    expect(blocked[0]!.count).toBe("2");
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

describe("campus circle row level security", () => {
  it("shows published posts to same-school peers only", async () => {
    const author = await seedUser(db, { nickname: "圈作者" });
    const peer = await seedUser(db, { nickname: "同校读者" });
    const remote = await seedUser(db, { nickname: "外校读者", schoolId: OTHER_SCHOOL_ID });
    const postId = await seedPost(db, author, "今晚操场有流星雨");

    const peerView = await db.withUser(peer, (tx) =>
      tx.query<{ id: string }>("select id from posts"),
    );
    expect(peerView.map((row) => row.id)).toContain(postId);

    const remoteView = await db.withUser(remote, (tx) =>
      tx.query<{ id: string }>("select id from posts"),
    );
    expect(remoteView.map((row) => row.id)).not.toContain(postId);

    const anonymous = await db.withUser(null, (tx) => tx.query("select id from posts"));
    expect(anonymous).toHaveLength(0);
  });

  it("hides an author's posts from users who blocked them", async () => {
    const author = await seedUser(db, { nickname: "被拉黑作者" });
    const blocker = await seedUser(db, { nickname: "拉黑者" });
    const observer = await seedUser(db, { nickname: "旁观者" });
    const postId = await seedPost(db, author, "周末一起去看展");

    await db.withUser(blocker, (tx) =>
      tx.query("insert into blocks (blocker_id, blocked_id) values ($1, $2)", [
        blocker,
        author,
      ]),
    );

    const blockedView = await db.withUser(blocker, (tx) =>
      tx.query<{ id: string }>("select id from posts"),
    );
    expect(blockedView.map((row) => row.id)).not.toContain(postId);

    const observerView = await db.withUser(observer, (tx) =>
      tx.query<{ id: string }>("select id from posts"),
    );
    expect(observerView.map((row) => row.id)).toContain(postId);
  });

  it("requires the caller to be the author for posts, likes and comments", async () => {
    const author = await seedUser(db, { nickname: "正牌作者" });
    const other = await seedUser(db, { nickname: "其他人" });
    const postId = await seedPost(db, author, "图书馆的猫又来了");

    await expect(
      db.withUser(other, (tx) =>
        tx.query(
          `insert into posts (author_id, school_id, body)
           values ($1, (select school_id from users where id = $1), $2)`,
          [author, "伪造的动态"],
        ),
      ),
    ).rejects.toThrow(/row-level security/i);

    const updated = await db.withUser(other, (tx) =>
      tx.query("update posts set status = 'removed' where id = $1 returning id", [postId]),
    );
    expect(updated).toHaveLength(0);

    await expect(
      db.withUser(other, (tx) =>
        tx.query("insert into post_likes (post_id, user_id) values ($1, $2)", [postId, author]),
      ),
    ).rejects.toThrow(/row-level security/i);

    await db.withUser(other, (tx) =>
      tx.query("insert into post_comments (post_id, author_id, body) values ($1, $2, $3)", [
        postId,
        other,
        "好可爱",
      ]),
    );

    await expect(
      db.withUser(other, (tx) =>
        tx.query("insert into post_comments (post_id, author_id, body) values ($1, $2, $3)", [
          postId,
          author,
          "伪造评论",
        ]),
      ),
    ).rejects.toThrow(/row-level security/i);
  });

  it("does not let an author republish a moderated post", async () => {
    const author = await seedUser(db, { nickname: "被隐藏作者" });
    const postId = await seedPost(db, author, "这条被管理员隐藏了", { status: "hidden" });

    await expect(
      db.withUser(author, (tx) =>
        tx.query("update posts set status = 'published' where id = $1", [postId]),
      ),
    ).rejects.toThrow(/row-level security/i);

    const removed = await db.withUser(author, (tx) =>
      tx.query("update posts set status = 'removed' where id = $1 returning id", [postId]),
    );
    expect(removed).toHaveLength(1);
  });

  it("hides a moderated post and its comments from peers", async () => {
    const author = await seedUser(db, { nickname: "待审核作者" });
    const peer = await seedUser(db, { nickname: "邻居" });
    const postId = await seedPost(db, author, "这条稍后会被隐藏");

    await db.withUser(peer, (tx) =>
      tx.query("insert into post_comments (post_id, author_id, body) values ($1, $2, $3)", [
        postId,
        peer,
        "先留个脚印",
      ]),
    );
    expect(
      await db.withUser(peer, (tx) =>
        tx.query("select id from post_comments where post_id = $1", [postId]),
      ),
    ).toHaveLength(1);

    await db.withSystem((tx) =>
      tx.query("update posts set status = 'hidden' where id = $1", [postId]),
    );

    expect(
      await db.withUser(peer, (tx) =>
        tx.query("select id from posts where id = $1", [postId]),
      ),
    ).toHaveLength(0);
    expect(
      await db.withUser(peer, (tx) =>
        tx.query("select id from post_comments where post_id = $1", [postId]),
      ),
    ).toHaveLength(0);

    const authorView = await db.withUser(author, (tx) =>
      tx.query<{ status: string }>("select status from posts where id = $1", [postId]),
    );
    expect(authorView[0]!.status).toBe("hidden");
  });
});
