import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { dateKey, shiftDateKey } from "@/lib/checkin/streak";
import { pairKeyOf } from "@/lib/pair";
import type { ProfileUpdateInput } from "@/lib/validation";
import { ApiError } from "@/server/http";
import {
  adminLogin,
  getOverview,
  listReports,
  setUserBanned,
  updateReportStatus,
} from "@/server/services/admin-service";
import { login, register } from "@/server/services/auth-service";
import {
  createComment,
  createPost,
  listAdminPosts,
  listComments,
  listFeed,
  moderatePost,
  removePost,
  setLike,
} from "@/server/services/circle-service";
import { checkin } from "@/server/services/checkin-service";
import {
  listConversations,
  listMessageNotifications,
  listMessages,
  openConversation,
  sendMessage,
} from "@/server/services/chat-service";
import { getLandingData, LANDING_STUDENT_LIMIT } from "@/server/services/landing-service";
import { getRecommendations } from "@/server/services/match-service";
import { getMyProfile, updateMyProfile } from "@/server/services/profile-service";
import { createReport } from "@/server/services/report-service";
import {
  blockUser,
  followUser,
  listBlocked,
  listFriends,
  unblockUser,
  unfollowUser,
} from "@/server/services/social-service";
import { findUserById, type SessionUser } from "@/server/user-repo";
import { OTHER_SCHOOL_ID, SCHOOL_ID, useServiceDatabase } from "./support";

const DEFAULTS: ProfileUpdateInput = {
  gender: "female",
  mbti: "ENFP",
  zodiac: "gemini",
  hobbies: ["摄影", "咖啡", "旅行"],
  personalityTags: ["幽默", "乐观"],
  matchGenderPref: "opposite",
  bio: "喜欢记录日常",
};

const PIXEL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

let counter = 0;

async function makeUser(
  patch: Partial<ProfileUpdateInput> = {},
  options: { schoolId?: string; complete?: boolean } = {},
): Promise<{ id: string; user: SessionUser; studentNo: string }> {
  counter += 1;
  const studentNo = `2026${String(counter).padStart(4, "0")}`;
  const { userId } = await register(
    {
      schoolId: options.schoolId ?? SCHOOL_ID,
      studentNo,
      verificationCode: "CAMPUS-2026",
      password: "<REDACTED>",
      consents: { terms: true, privacy: true, matching: true },
    },
    `ip-${studentNo}`,
  );

  const sessionUser = (await findUserById(userId))!;
  await updateMyProfile(sessionUser, {
    ...DEFAULTS,
    nickname: `同学${studentNo.slice(-4)}`,
    ...patch,
    complete: options.complete ?? true,
  });

  const user = (await findUserById(userId))!;
  return { id: userId, user, studentNo };
}

async function expectApiError(promise: Promise<unknown>, code: string): Promise<ApiError> {
  try {
    await promise;
  } catch (error) {
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).code).toBe(code);
    return error as ApiError;
  }
  throw new Error(`expected ApiError ${code}, but the call succeeded`);
}

describe("campus MVP service flow", () => {
  beforeAll(async () => {
    await useServiceDatabase();
  });

  afterAll(async () => {
    const { getDb } = await import("@/server/db");
    const db = await getDb();
    await db.close();
  });

  it("AC-01: registers with hashed identity and layered consents", async () => {
    const { id } = await makeUser({ nickname: "合规同学" });
    const profile = await getMyProfile(id);
    expect(profile.nickname).toBe("合规同学");

    const { getDb } = await import("@/server/db");
    const db = await getDb();

    const verifications = await db.withSystem((tx) =>
      tx.query<{ student_no_hash: string }>(
        "select student_no_hash from identity_verifications where user_id = $1",
        [id],
      ),
    );
    expect(verifications[0]!.student_no_hash).toMatch(/^[0-9a-f]{64}$/);

    const consents = await db.withSystem((tx) =>
      tx.query<{ scope: string; policy_version: string }>(
        "select scope, policy_version from consents where user_id = $1 order by scope",
        [id],
      ),
    );
    expect(consents.map((row) => row.scope).sort()).toEqual(["matching", "privacy", "terms"]);
    expect(consents.every((row) => row.policy_version.length > 0)).toBe(true);
  });

  it("AC-01: rejects a duplicate student number and missing consent", async () => {
    const duplicate = register(
      {
        schoolId: SCHOOL_ID,
        studentNo: "20260001",
        verificationCode: "CAMPUS-2026",
        password: "<REDACTED>",
        consents: { terms: true, privacy: true, matching: true },
      },
      "ip-duplicate",
    );
    await expectApiError(duplicate, "ALREADY_REGISTERED");

    const missingConsent = register(
      {
        schoolId: SCHOOL_ID,
        studentNo: "20269999",
        verificationCode: "CAMPUS-2026",
        password: "<REDACTED>",
        consents: { terms: true, privacy: false, matching: true },
      },
      "ip-consent",
    );
    await expectApiError(missingConsent, "CONSENT_REQUIRED");
  });

  it("AC-02: an incomplete profile cannot enter the matching pool", async () => {
    const { user } = await makeUser({ nickname: "半成品" }, { complete: false });
    await expectApiError(getRecommendations(user), "PROFILE_INCOMPLETE");
  });

  it("AC-03: recommendations are filtered, scored and explained", async () => {
    const alice = await makeUser({
      gender: "female",
      nickname: "Alice",
      hobbies: ["摄影", "咖啡", "徒步"],
      personalityTags: ["幽默", "温和"],
      mbti: "ENFP",
      zodiac: "gemini",
    });
    const bob = await makeUser({
      gender: "male",
      nickname: "Bob",
      hobbies: ["摄影", "咖啡", "游戏"],
      personalityTags: ["幽默", "理性"],
      mbti: "INFP",
      zodiac: "libra",
    });
    const blocked = await makeUser({ gender: "male", nickname: "Blocked" });
    await makeUser({ gender: "male", nickname: "Remote" }, { schoolId: OTHER_SCHOOL_ID });

    await blockUser(alice.user, blocked.id);

    const items = await getRecommendations(alice.user);
    const ids = items.map((item) => item.profile.id);

    expect(ids).toContain(bob.id);
    expect(ids).not.toContain(blocked.id);
    expect(ids).not.toContain(alice.id);
    expect(items.every((item) => item.profile.gender === "male")).toBe(true);
    expect(items.every((item) => item.profile.schoolName === "星海大学")).toBe(true);

    const bobCard = items.find((item) => item.profile.id === bob.id)!;
    expect(bobCard.score).toBeGreaterThan(0);
    expect(bobCard.score).toBeLessThanOrEqual(100);
    expect(bobCard.reasons.length).toBeGreaterThan(0);
    expect(bobCard.breakdown.hobby).toBe(16);
  });

  it("AC-03: recommendations can be refreshed for the same user (upsert keeps RLS happy)", async () => {
    const viewer = await makeUser({ gender: "female", nickname: "刷新推荐" });
    await makeUser({ gender: "male", nickname: "刷新对象" });

    const first = await getRecommendations(viewer.user);
    expect(first.length).toBeGreaterThan(0);

    const second = await getRecommendations(viewer.user);
    expect(second.map((item) => item.profile.id)).toEqual(first.map((item) => item.profile.id));
  });

  it("AC-20: blocked users can be listed and unblocked", async () => {
    const a = await makeUser({ gender: "female", nickname: "拉黑方" });
    const b = await makeUser({ gender: "male", nickname: "被拉黑方" });

    await blockUser(a.user, b.id);

    const blocked = await listBlocked(a.user);
    expect(blocked.map((item) => item.profile.id)).toContain(b.id);
    expect(blocked[0]!.blockedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(blocked[0]!.profile).not.toHaveProperty("blockedAt");

    await unblockUser(a.user, b.id);

    expect((await listBlocked(a.user)).map((item) => item.profile.id)).not.toContain(b.id);
    expect((await getRecommendations(a.user)).map((item) => item.profile.id)).toContain(b.id);
  });

  it("AC-04: mutual follow creates a friendship and unlocks chat", async () => {
    const a = await makeUser({ nickname: "关注方" });
    const b = await makeUser({ gender: "male", nickname: "被关注方" });

    const first = await followUser(a.user, b.id);
    expect(first).toEqual({ friend: false, following: true });

    const friendsBefore = await listFriends(a.user);
    expect(friendsBefore.some((item) => item.profile.id === b.id)).toBe(false);

    const second = await followUser(b.user, a.id);
    expect(second).toEqual({ friend: true, following: true });

    const friendsAfter = await listFriends(a.user);
    expect(friendsAfter.some((item) => item.profile.id === b.id)).toBe(true);

    const conversation = await openConversation(a.user, b.id);
    expect(conversation.id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("AC-05/AC-06: chat is friendship-only and messages respect the filter", async () => {
    const a = await makeUser({ nickname: "聊天方" });
    const b = await makeUser({ gender: "male", nickname: "聊天对象" });
    const outsider = await makeUser({ nickname: "路人" });

    await followUser(a.user, b.id);
    await followUser(b.user, a.id);
    const { id: conversationId } = await openConversation(a.user, b.id);

    await sendMessage(a.user, conversationId, "晚上一起去图书馆吗");

    const unread = await listConversations(b.user);
    expect(unread[0]!.unreadCount).toBe(1);

    const read = await listMessages(b.user, conversationId);
    expect(read.at(-1)!.content).toBe("晚上一起去图书馆吗");
    expect(read.at(-1)!.mine).toBe(false);

    const after = await listConversations(b.user);
    expect(after[0]!.unreadCount).toBe(0);

    await expectApiError(listMessages(outsider.user, conversationId), "CONVERSATION_NOT_FOUND");
    await expectApiError(
      sendMessage(outsider.user, conversationId, "我也想加入"),
      "CONVERSATION_NOT_FOUND",
    );

    await expectApiError(
      sendMessage(a.user, conversationId, "需要代考的同学联系我"),
      "SENSITIVE_CONTENT",
    );

    const stillClean = await listMessages(b.user, conversationId);
    expect(stillClean).toHaveLength(1);
  });

  it("AC-05: message notifications only include incoming messages", async () => {
    const sender = await makeUser({ nickname: "通知发送方" });
    const receiver = await makeUser({ gender: "male", nickname: "通知接收方" });

    await followUser(sender.user, receiver.id);
    await followUser(receiver.user, sender.id);
    const { id: conversationId } = await openConversation(sender.user, receiver.id);

    await sendMessage(sender.user, conversationId, "给你发一条消息");
    await sendMessage(receiver.user, conversationId, "我的回复不通知自己");

    const since = new Date(Date.now() - 60_000).toISOString();
    const forReceiver = await listMessageNotifications(receiver.user, since);
    expect(forReceiver).toHaveLength(1);
    expect(forReceiver[0]!.conversationId).toBe(conversationId);
    expect(forReceiver[0]!.message.content).toBe("给你发一条消息");
    expect(forReceiver[0]!.partner.id).toBe(sender.id);
    expect(forReceiver[0]!.partner.nickname).toBe("通知发送方");

    const forSender = await listMessageNotifications(sender.user, since);
    expect(forSender).toHaveLength(1);
    expect(forSender[0]!.message.content).toBe("我的回复不通知自己");
  });

  it("AC-06/AC-07: daily check-in is unique and unlocks streak achievements", async () => {
    const a = await makeUser({ nickname: "打卡甲" });
    const b = await makeUser({ gender: "male", nickname: "打卡乙" });
    await followUser(a.user, b.id);
    await followUser(b.user, a.id);

    const { getDb } = await import("@/server/db");
    const db = await getDb();
    const today = dateKey();
    const pairKey = pairKeyOf(a.id, b.id);

    for (const offset of [-1, -2]) {
      await db.withSystem((tx) =>
        tx.query(
          `insert into checkins (pair_key, user_id, partner_id, checkin_date)
           values ($1, $2, $3, $4::date)`,
          [pairKey, a.id, b.id, shiftDateKey(today, offset)],
        ),
      );
    }

    const result = await checkin(a.user, b.id);
    expect(result.streakDays).toBe(3);
    expect(result.unlocked.map((item) => item.code)).toContain("spark");

    await expectApiError(checkin(a.user, b.id), "ALREADY_CHECKED_IN");

    const friends = await listFriends(a.user);
    const friend = friends.find((item) => item.profile.id === b.id)!;
    expect(friend.streakDays).toBe(3);
    expect(friend.checkedInToday).toBe(true);
  });

  it("AC-07: a seven-day streak unlocks 默契养成", async () => {
    const a = await makeUser({ nickname: "七日甲" });
    const b = await makeUser({ gender: "male", nickname: "七日乙" });
    await followUser(a.user, b.id);
    await followUser(b.user, a.id);

    const { getDb } = await import("@/server/db");
    const db = await getDb();
    const today = dateKey();
    const pairKey = pairKeyOf(a.id, b.id);

    for (let offset = 1; offset <= 6; offset += 1) {
      await db.withSystem((tx) =>
        tx.query(
          `insert into checkins (pair_key, user_id, partner_id, checkin_date)
           values ($1, $2, $3, $4::date)`,
          [pairKey, a.id, b.id, shiftDateKey(today, -offset)],
        ),
      );
    }

    const result = await checkin(a.user, b.id);
    expect(result.streakDays).toBe(7);
    expect(result.unlocked.map((item) => item.code)).toContain("tacit");
  });

  it("AC-08: report -> admin handling -> ban takes effect everywhere", async () => {
    const reporter = await makeUser({ nickname: "举报人" });
    const target = await makeUser({ gender: "male", nickname: "被举报人" });

    const report = await createReport(reporter.user, {
      targetUserId: target.id,
      type: "harassment",
      description: "反复发送骚扰信息",
    });
    expect(report.id).toMatch(/^[0-9a-f-]{36}$/);

    const { adminId } = await adminLogin("test-admin-passcode");
    const admin = (await findUserById(adminId))!;

    const reports = await listReports("pending");
    expect(reports.some((item) => item.id === report.id)).toBe(true);

    await updateReportStatus(admin, report.id, "resolved");
    const resolved = await listReports("resolved");
    expect(resolved.some((item) => item.id === report.id)).toBe(true);

    const before = await getOverview();
    await setUserBanned(target.id, true);
    const after = await getOverview();
    expect(after.banned).toBe(before.banned + 1);

    const bannedUser = (await findUserById(target.id))!;
    expect(bannedUser.status).toBe("banned");

    await expectApiError(
      login(
        { schoolId: SCHOOL_ID, studentNo: target.studentNo, password: "<REDACTED>" },
        "ip-banned-login",
      ),
      "ACCOUNT_BANNED",
    );

    await setUserBanned(target.id, true);
    const stillBanned = (await findUserById(target.id))!;
    expect(stillBanned.status).toBe("banned");

    await setUserBanned(target.id, false);
    const unbanned = (await findUserById(target.id))!;
    expect(unbanned.status).toBe("matchable");
  });

  it("AC-09: unfollow revokes friendship and closes the conversation", async () => {
    const a = await makeUser({ nickname: "取关甲" });
    const b = await makeUser({ gender: "male", nickname: "取关乙" });
    await followUser(a.user, b.id);
    await followUser(b.user, a.id);
    await openConversation(a.user, b.id);

    await unfollowUser(a.user, b.id);

    const friends = await listFriends(a.user);
    expect(friends.some((item) => item.profile.id === b.id)).toBe(false);

    const conversations = await listConversations(a.user);
    const conversation = conversations.find((item) => item.partner.id === b.id);
    if (conversation) expect(conversation.closed).toBe(true);
  });

  it("AC-09: consent records carry version and timestamp", async () => {
    const { id } = await makeUser({ nickname: "同意记录" });
    const { getDb } = await import("@/server/db");
    const db = await getDb();
    const rows = await db.withSystem((tx) =>
      tx.query<{ scope: string; agreed_at: Date }>(
        "select scope, agreed_at from consents where user_id = $1",
        [id],
      ),
    );
    expect(rows).toHaveLength(3);
    expect(rows.every((row) => row.agreed_at instanceof Date)).toBe(true);
  });

  it("C-01: same-school feed supports publishing, following, likes and comments", async () => {
    const author = await makeUser({ nickname: "圈主" });
    const peer = await makeUser({ gender: "male", nickname: "同校同学" });
    const remote = await makeUser({ gender: "male", nickname: "外校同学" }, { schoolId: OTHER_SCHOOL_ID });

    const post = await createPost(author.user, {
      body: "食堂新出的桂花糖藕好吃，有人一起吗",
      media: [{ type: "image", url: PIXEL }],
    });
    expect(post.media).toHaveLength(1);
    expect(post.mine).toBe(true);

    const peerFeed = await listFeed(peer.user);
    const peerPost = peerFeed.items.find((item) => item.id === post.id)!;
    expect(peerPost.author.nickname).toBe("圈主");
    expect(peerPost.following).toBe(false);
    expect(peerPost.likeCount).toBe(0);

    const remoteFeed = await listFeed(remote.user);
    expect(remoteFeed.items.map((item) => item.id)).not.toContain(post.id);

    await followUser(peer.user, author.id);
    const followingFeed = await listFeed(peer.user, { scope: "following" });
    const followedPost = followingFeed.items.find((item) => item.id === post.id)!;
    expect(followedPost.following).toBe(true);

    const liked = await setLike(peer.user, post.id, true);
    expect(liked).toEqual({ liked: true, likeCount: 1 });
    const likedFeed = await listFeed(peer.user);
    expect(likedFeed.items.find((item) => item.id === post.id)!.liked).toBe(true);

    const comment = await createComment(peer.user, post.id, { body: "看饿了，明天去试试" });
    expect(comment.mine).toBe(true);

    const comments = await listComments(author.user, post.id);
    expect(comments.map((item) => item.body)).toEqual(["看饿了，明天去试试"]);
    const authorFeed = await listFeed(author.user);
    expect(authorFeed.items.find((item) => item.id === post.id)!.commentCount).toBe(1);

    const foreignLike = await expectApiError(setLike(remote.user, post.id, true), "POST_NOT_FOUND");
    expect(foreignLike.status).toBe(404);
    await expectApiError(
      createComment(remote.user, post.id, { body: "路过看看" }),
      "POST_NOT_FOUND",
    );
    await expectApiError(
      createComment(peer.user, post.id, { body: "傻 逼才去食堂" }),
      "SENSITIVE_CONTENT",
    );
    await expectApiError(
      createPost(peer.user, { body: "需要代考的联系我", media: [] }),
      "SENSITIVE_CONTENT",
    );
  });

  it("C-02: moderating a post removes it from peers while the author keeps it", async () => {
    const author = await makeUser({ nickname: "待审核作者" });
    const peer = await makeUser({ gender: "male", nickname: "审核旁观者" });

    const post = await createPost(author.user, { body: "周末一起去江边骑车", media: [] });

    const hidden = await moderatePost(post.id, "hide");
    expect(hidden.status).toBe("hidden");

    const peerFeed = await listFeed(peer.user);
    expect(peerFeed.items.map((item) => item.id)).not.toContain(post.id);

    const ownFeed = await listFeed(author.user);
    const ownPost = ownFeed.items.find((item) => item.id === post.id)!;
    expect(ownPost.status).toBe("hidden");

    await expectApiError(setLike(peer.user, post.id, true), "POST_NOT_FOUND");
    await expectApiError(
      createComment(peer.user, post.id, { body: "还能评论吗" }),
      "POST_NOT_FOUND",
    );

    await moderatePost(post.id, "restore");
    const restoredFeed = await listFeed(peer.user);
    expect(restoredFeed.items.map((item) => item.id)).toContain(post.id);

    const adminPosts = await listAdminPosts();
    expect(adminPosts.some((item) => item.id === post.id)).toBe(true);
  });

  it("C-03: only the author can remove a post, and removal hides it from peers", async () => {
    const author = await makeUser({ nickname: "删除者" });
    const peer = await makeUser({ gender: "male", nickname: "围观者" });
    const post = await createPost(author.user, { body: "晚霞照片稍后补上", media: [] });

    await expectApiError(removePost(peer.user, post.id), "POST_NOT_FOUND");
    await removePost(author.user, post.id);

    const ownFeed = await listFeed(author.user);
    expect(ownFeed.items.map((item) => item.id)).not.toContain(post.id);

    const peerFeed = await listFeed(peer.user);
    expect(peerFeed.items.map((item) => item.id)).not.toContain(post.id);

    const adminPosts = await listAdminPosts();
    expect(adminPosts.find((item) => item.id === post.id)!.status).toBe("removed");
  });

  it("C-04: a reported post reaches the admin queue with its excerpt", async () => {
    const author = await makeUser({ nickname: "被举报作者" });
    const reporter = await makeUser({ gender: "male", nickname: "举报同学" });
    const post = await createPost(author.user, {
      body: "这条动态会被举报，用来验证管理端队列展示",
      media: [],
    });

    const report = await createReport(reporter.user, {
      targetPostId: post.id,
      type: "inappropriate",
      description: "内容不合适",
    });

    const { adminId } = await adminLogin("test-admin-passcode");
    const admin = (await findUserById(adminId))!;
    expect(admin.role).toBe("admin");

    const pending = await listReports("pending");
    const row = pending.find((item) => item.id === report.id)!;
    expect(row.target.kind).toBe("post");
    if (row.target.kind !== "post") throw new Error("expected a post target");
    expect(row.target.id).toBe(post.id);
    expect(row.target.excerpt).toContain("这条动态会被举报");

    await expectApiError(
      createReport(author.user, {
        targetPostId: post.id,
        type: "other",
        description: "自举报",
      }),
      "CANNOT_REPORT_SELF",
    );
  });

  it("feed cursor pagination keeps pages stable and deduplicated", async () => {
    const author = await makeUser({ nickname: "多产作者" });
    const reader = await makeUser({ gender: "male", nickname: "翻页读者" });
    await followUser(reader.user, author.id);

    const { getDb } = await import("@/server/db");
    const db = await getDb();
    await db.withSystem(async (tx) => {
      for (let index = 0; index < 25; index += 1) {
        await tx.query(
          `insert into posts (author_id, school_id, body, created_at)
           values ($1, (select school_id from users where id = $1), $2,
                   now() - ($3 || ' minutes')::interval)`,
          [author.id, `分页动态 ${index}`, String(index)],
        );
      }
    });

    const first = await listFeed(reader.user, { scope: "following" });
    expect(first.items).toHaveLength(20);
    expect(first.nextCursor).toBeTruthy();

    const second = await listFeed(reader.user, {
      scope: "following",
      cursor: first.nextCursor!,
    });
    expect(second.items).toHaveLength(5);
    expect(second.nextCursor).toBeNull();

    const ids = new Set([...first.items, ...second.items].map((item) => item.id));
    expect(ids.size).toBe(25);
    expect(
      first.items.every(
        (item, index) => index === 0 || first.items[index - 1]!.createdAt >= item.createdAt,
      ),
    ).toBe(true);
  });

  it("homepage: a matchable visitor reads the live same-school pool without writing a batch", async () => {
    const viewer = await makeUser({
      gender: "female",
      nickname: "首页访客",
      hobbies: ["天文", "陶艺", "击剑"],
    });
    const mate = await makeUser({
      gender: "male",
      nickname: "首页同频",
      hobbies: ["天文", "陶艺", "击剑"],
    });
    const friend = await makeUser({ gender: "male", nickname: "首页好友" });
    await makeUser({ gender: "male", nickname: "外校路人" }, { schoolId: OTHER_SCHOOL_ID });

    await followUser(viewer.user, friend.id);
    await followUser(friend.user, viewer.id);

    const { getDb } = await import("@/server/db");
    const db = await getDb();
    const before = await db.withSystem((tx) =>
      tx.query<{ count: string }>(
        "select count(*)::text as count from match_recommendations where user_id = $1",
        [viewer.id],
      ),
    );

    const data = await getLandingData(viewer.user);

    expect(data.mode).toBe("live");
    expect(data.students.length).toBeGreaterThan(0);
    expect(data.students.length).toBeLessThanOrEqual(LANDING_STUDENT_LIMIT);
    expect(data.students.every((student) => student.demo === false)).toBe(true);
    expect(data.students.every((student) => student.online === null)).toBe(true);
    expect(data.students.every((student) => student.verified)).toBe(true);
    expect(data.students.every((student) => student.match > 0)).toBe(true);

    const ids = data.students.map((student) => student.id);
    expect(ids).toContain(mate.id);
    expect(ids).not.toContain(friend.id);
    expect(ids).not.toContain(viewer.id);
    expect(data.students.every((student) => student.avatar.length > 0)).toBe(true);

    const scores = data.students.map((student) => student.match);
    expect(scores).toEqual([...scores].sort((a, b) => b - a));

    const after = await db.withSystem((tx) =>
      tx.query<{ count: string }>(
        "select count(*)::text as count from match_recommendations where user_id = $1",
        [viewer.id],
      ),
    );
    expect(after[0]!.count).toBe(before[0]!.count);
  });

  it("homepage: guests and incomplete profiles keep the labelled demo cards", async () => {
    const guest = await getLandingData(null);
    expect(guest.mode).toBe("demo");
    expect(guest.students.length).toBeGreaterThan(0);
    expect(guest.students.every((student) => student.demo !== false)).toBe(true);

    const pending = await makeUser({ nickname: "首页未完善" }, { complete: false });
    const data = await getLandingData(pending.user);
    expect(data.mode).toBe("demo");
    expect(data.students).toEqual(guest.students);
  });

  it("C-05: banning an author also retires their published posts", async () => {
    const author = await makeUser({ nickname: "违规作者" });
    const peer = await makeUser({ gender: "male", nickname: "目击者" });
    const post = await createPost(author.user, { body: "即将被下架的动态", media: [] });

    expect((await listFeed(peer.user)).items.map((item) => item.id)).toContain(post.id);

    await setUserBanned(author.id, true);

    expect((await listFeed(peer.user)).items.map((item) => item.id)).not.toContain(post.id);
    const adminPosts = await listAdminPosts();
    expect(adminPosts.find((item) => item.id === post.id)!.status).toBe("hidden");
  });
});
