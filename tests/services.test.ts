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
import { checkin } from "@/server/services/checkin-service";
import {
  listConversations,
  listMessages,
  openConversation,
  sendMessage,
} from "@/server/services/chat-service";
import { getRecommendations } from "@/server/services/match-service";
import { getMyProfile, updateMyProfile } from "@/server/services/profile-service";
import { createReport } from "@/server/services/report-service";
import {
  blockUser,
  followUser,
  listFriends,
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
});
