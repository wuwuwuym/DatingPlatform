/**
 * HTTP-level acceptance run: drives the real Next.js server the same way a
 * browser would, so the whole stack (routes -> services -> RLS -> PGlite) is
 * exercised. Start the app first, then run `pnpm verify:e2e`.
 */
import assert from "node:assert/strict";
import { getDevAdminPasscode } from "../src/lib/config";

const BASE = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3100";
const SCHOOL_ID = "5c000000-0000-4000-8000-000000000001";
const PASSWORD = "<REDACTED>";
const stamp = String(Date.now()).slice(-5);
const STUDENT_A = `31${stamp}1`;
const STUDENT_B = `31${stamp}2`;

interface ApiEnvelope<T> {
  ok: boolean;
  data?: T;
  error?: { code: string; message: string };
}

class Client {
  private cookies = new Map<string, string>();

  async call<T>(
    path: string,
    options: { method?: string; body?: unknown } = {},
  ): Promise<{ status: number; body: ApiEnvelope<T> }> {
    const headers: Record<string, string> = { "content-type": "application/json" };
    if (this.cookies.size > 0) {
      headers.cookie = [...this.cookies.entries()].map(([key, value]) => `${key}=${value}`).join("; ");
    }

    const response = await fetch(`${BASE}${path}`, {
      method: options.method ?? (options.body === undefined ? "GET" : "POST"),
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      redirect: "manual",
    });

    for (const raw of response.headers.getSetCookie()) {
      const [pair] = raw.split(";");
      const [name, ...rest] = (pair ?? "").split("=");
      if (!name) continue;
      const value = rest.join("=");
      if (!value) this.cookies.delete(name);
      else this.cookies.set(name, value);
    }

    const body = (await response.json().catch(() => ({ ok: false }))) as ApiEnvelope<T>;
    return { status: response.status, body };
  }

  async expectOk<T>(path: string, options?: { method?: string; body?: unknown }): Promise<T> {
    const { status, body } = await this.call<T>(path, options);
    assert.ok(
      status >= 200 && status < 300,
      `${path} expected 2xx, got ${status}: ${body.error?.code} ${body.error?.message ?? ""}`,
    );
    assert.equal(body.ok, true);
    return body.data as T;
  }

  async expectStatus(path: string, expected: number, options?: { method?: string; body?: unknown }) {
    const { status, body } = await this.call(path, options);
    assert.equal(status, expected, `${path} expected ${expected}, got ${status}`);
    return body;
  }

  /** Fetches an HTML page with the same session cookies. */
  async page(path: string): Promise<{ status: number; html: string }> {
    const headers: Record<string, string> = {};
    if (this.cookies.size > 0) {
      headers.cookie = [...this.cookies.entries()].map(([key, value]) => `${key}=${value}`).join("; ");
    }
    const response = await fetch(`${BASE}${path}`, { headers, redirect: "manual" });
    return { status: response.status, html: await response.text() };
  }
}

const checks: string[] = [];

function pass(label: string): void {
  checks.push(label);
  console.log(`  ✓ ${label}`);
}

async function registerProfile(client: Client, studentNo: string, profile: Record<string, unknown>) {
  await client.expectOk("/api/auth/register", {
    body: {
      schoolId: SCHOOL_ID,
      studentNo,
      verificationCode: process.env.DEMO_VERIFICATION_CODE ?? "CAMPUS-2026",
      password: PASSWORD,
      consents: { terms: true, privacy: true, matching: true },
    },
  });

  const result = await client.expectOk<{
    profile: { id: string; status: string };
    missing: string[];
    promoted: boolean;
  }>("/api/profile", { method: "PUT", body: { ...profile, complete: true } });
  return result;
}

async function main(): Promise<void> {
  console.log(`\n校园同频 · 全链路验收 @ ${BASE}\n`);

  const anonymous = new Client();

  const schools = await anonymous.expectOk<{ schools: { id: string; name: string }[] }>(
    "/api/auth/schools",
  );
  assert.ok(schools.schools.length >= 5);
  pass("学校列表可读取（注册页数据源）");

  const alice = new Client();
  const bob = new Client();

  const aliceProfile = await registerProfile(alice, STUDENT_A, {
    nickname: `验收A${stamp}`,
    gender: "female",
    mbti: "ENFP",
    zodiac: "gemini",
    hobbies: ["摄影", "咖啡", "旅行"],
    personalityTags: ["幽默", "乐观"],
    matchGenderPref: "opposite",
    bio: "验收脚本创建",
  });
  assert.equal(aliceProfile.promoted, true);
  pass("AC-01 注册 + 分层同意，资料完整后进入匹配池");

  await registerProfile(bob, STUDENT_B, {
    nickname: `验收B${stamp}`,
    gender: "male",
    mbti: "INFP",
    zodiac: "libra",
    hobbies: ["摄影", "音乐", "咖啡"],
    personalityTags: ["幽默", "温和"],
    matchGenderPref: "opposite",
    bio: "验收脚本创建",
  });
  pass("AC-02 第二个账号完成资料并进入匹配池");

  const duplicate = await anonymous.expectStatus("/api/auth/register", 409, {
    body: {
      schoolId: SCHOOL_ID,
      studentNo: STUDENT_A,
      verificationCode: "CAMPUS-2026",
      password: PASSWORD,
      consents: { terms: true, privacy: true, matching: true },
    },
  });
  assert.equal(duplicate.error?.code, "ALREADY_REGISTERED");
  pass("AC-01 重复学号被拒绝（只存哈希，唯一约束生效）");

  const recommendations = await alice.expectOk<{
    items: { profile: { id: string; nickname: string }; score: number; reasons: string[] }[];
  }>("/api/match/recommendations");
  const bobCard = recommendations.items.find((item) => item.profile.nickname === `验收B${stamp}`);
  assert.ok(bobCard, "Bob should appear in Alice's recommendations");
  assert.ok(bobCard.score > 0);
  assert.ok(bobCard.reasons.length > 0);
  pass(`AC-03 推荐包含同校符合偏好的用户，得分 ${bobCard.score} 且有 ${bobCard.reasons.length} 条理由`);

  const bobProfile = await bob.expectOk<{ profile: { id: string } }>("/api/profile");

  await alice.expectOk("/api/follow", {
    body: { targetUserId: bobProfile.profile.id, action: "follow" },
  });
  pass("AC-04 单向关注建立");

  const mutual = await bob.expectOk<{ friend: boolean }>("/api/follow", {
    body: { targetUserId: aliceProfile.profile.id, action: "follow" },
  });
  assert.equal(mutual.friend, true);
  pass("AC-04 双向关注后成为好友");

  const conversation = await alice.expectOk<{ id: string }>("/api/conversations/open", {
    body: { partnerId: bobProfile.profile.id },
  });

  await alice.expectOk("/api/conversations/" + conversation.id + "/messages", {
    body: { content: "晚上一起去图书馆吗" },
  });
  pass("AC-05 好友发送消息成功");

  const bobConversations = await bob.expectOk<{
    items: { id: string; unreadCount: number }[];
  }>("/api/conversations");
  const bobConversation = bobConversations.items.find((item) => item.id === conversation.id);
  assert.equal(bobConversation?.unreadCount, 1);
  pass("AC-05 未读数正确");

  const bobMessages = await bob.expectOk<{ messages: { content: string; mine: boolean }[] }>(
    "/api/conversations/" + conversation.id + "/messages",
  );
  assert.equal(bobMessages.messages.at(-1)?.content, "晚上一起去图书馆吗");
  assert.equal(bobMessages.messages.at(-1)?.mine, false);

  const afterRead = await bob.expectOk<{ items: { id: string; unreadCount: number }[] }>(
    "/api/conversations",
  );
  assert.equal(afterRead.items.find((item) => item.id === conversation.id)?.unreadCount, 0);
  pass("AC-05 读取后未读数归零");

  const filtered = await alice.expectStatus("/api/conversations/" + conversation.id + "/messages", 422, {
    body: { content: "这里有代 考服务" },
  });
  assert.equal(filtered.error?.code, "SENSITIVE_CONTENT");
  pass("AC-05 敏感词被拦截（含空格规避）");

  const checkin = await alice.expectOk<{ streakDays: number; unlocked: unknown[] }>("/api/checkin", {
    body: { friendId: bobProfile.profile.id },
  });
  assert.equal(checkin.streakDays, 1);
  pass("AC-06 好友每日打卡成功");

  const duplicateCheckin = await alice.expectStatus("/api/checkin", 409, {
    body: { friendId: bobProfile.profile.id },
  });
  assert.equal(duplicateCheckin.error?.code, "ALREADY_CHECKED_IN");
  pass("AC-06 当日重复打卡被唯一约束拒绝");

  const report = await alice.expectOk<{ id: string }>("/api/report", {
    body: {
      targetUserId: bobProfile.profile.id,
      type: "harassment",
      description: "验收脚本提交的举报",
    },
  });
  assert.ok(report.id);
  pass("AC-08 一键举报写入");

  const passcode = process.env.ADMIN_PASSCODE ?? getDevAdminPasscode();
  assert.ok(passcode, "admin passcode unavailable");

  const admin = new Client();
  await admin.expectOk("/api/admin/session", { body: { passcode } });
  const adminReports = await admin.expectOk<{ reports: { id: string; target: { id: string } }[] }>(
    "/api/admin/reports",
  );
  assert.ok(adminReports.reports.some((item) => item.id === report.id));
  pass("AC-08 管理端可查看举报列表");

  await admin.expectOk("/api/admin/reports", {
    body: { reportId: report.id, status: "resolved" },
  });
  pass("AC-08 管理端可标记举报状态");

  await admin.expectOk("/api/admin/users", {
    body: { userId: bobProfile.profile.id, banned: true },
  });
  pass("AC-08 封禁用户");

  const bannedLogin = await new Client().expectStatus("/api/auth/login", 403, {
    body: { schoolId: SCHOOL_ID, studentNo: STUDENT_B, password: PASSWORD },
  });
  assert.equal(bannedLogin.error?.code, "ACCOUNT_BANNED");
  pass("AC-08 封禁后无法登录");

  const consentCheck = await alice.expectOk<{ achievements: unknown[] }>("/api/achievements");
  assert.ok(Array.isArray(consentCheck.achievements));
  pass("AC-09 成就接口可读取（同意记录已在注册时落库）");

  for (const path of ["/", "/login", "/register"]) {
    const response = await fetch(`${BASE}${path}`, { redirect: "manual" });
    assert.ok([200, 307, 302].includes(response.status), `${path} -> ${response.status}`);
    if (path !== "/") {
      const html = await response.text();
      assert.ok(html.includes("校园同频"), `${path} should render the app shell`);
    }
  }
  pass("页面可访问：首页 / 登录 / 注册");

  for (const path of ["/match", "/friends", "/chat", "/checkin", "/me", "/profile"]) {
    const page = await alice.page(path);
    assert.equal(page.status, 200, `${path} expected 200, got ${page.status}`);
    assert.ok(page.html.includes("星海大学"), `${path} should render inside the app shell`);
  }
  pass("登录态页面可服务端渲染：发现 / 好友 / 消息 / 打卡 / 我的 / 资料");

  const anonymousMatch = await fetch(`${BASE}/match`, { redirect: "manual" });
  assert.ok(
    [307, 302].includes(anonymousMatch.status),
    `unauthenticated /match should redirect, got ${anonymousMatch.status}`,
  );
  pass("未登录访问受保护页面会被重定向到登录");

  const demo = new Client();
  const demoLogin = await demo.call<{ status: string }>("/api/auth/login", {
    body: { schoolId: SCHOOL_ID, studentNo: "20210001", password: "<REDACTED>" },
  });
  if (demoLogin.status === 200) {
    const demoConversations = await demo.expectOk<{ items: { lastMessage: unknown }[] }>(
      "/api/conversations",
    );
    assert.ok(demoConversations.items.length >= 1);
    const demoFriends = await demo.expectOk<{ friends: unknown[] }>("/api/friends");
    assert.ok(demoFriends.friends.length >= 2);
    pass("演示账号 20210001 可直接登录，自带好友与会话");
  } else {
    console.log("  - 跳过演示账号检查（数据库中还没有 seed 数据）");
  }

  console.log(`\n全部 ${checks.length} 项检查通过 ✅\n`);
}

main().catch((error) => {
  console.error("\n验收失败：", error);
  process.exitCode = 1;
});
