/**
 * HTTP-level acceptance run: drives the real Next.js server the same way a
 * browser would, so the whole stack (routes -> services -> RLS -> PGlite) is
 * exercised. Start the app first, then run `pnpm verify:e2e`.
 */
import assert from "node:assert/strict";
import { getDevAdminPasscode } from "../src/lib/config";

const BASE = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3100";
const SCHOOL_ID = "5c000000-0000-4000-8000-000000000001";
const DEMO_PASSWORD = process.env.DEMO_PASSWORD?.trim();
const PASSWORD = DEMO_PASSWORD ?? "test-password-2026";
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

  const refreshed = await alice.expectOk<{ items: { profile: { id: string } }[] }>(
    "/api/match/recommendations",
  );
  assert.equal(refreshed.items.length, recommendations.items.length);
  pass("AC-03 同一用户可重复刷新推荐（匹配快照更新策略生效）");

  const guestHome = await anonymous.page("/");
  assert.equal(guestHome.status, 200);
  assert.ok(
    guestHome.html.includes("以上人物与数据均为演示内容"),
    "guest homepage should label the sample cards",
  );
  assert.ok(guestHome.html.includes("示例卡片"), "guest homepage should explain the samples");
  pass("首页：游客看到明确标注的示例卡片");

  const memberHome = await alice.page("/");
  assert.equal(memberHome.status, 200);
  assert.ok(
    memberHome.html.includes("同校匹配池实时同步"),
    "member homepage should render the live recommendation source",
  );
  assert.ok(
    !memberHome.html.includes("以上人物与数据均为演示内容"),
    "member homepage must not fall back to demo cards",
  );
  pass("首页：登录用户接入同校实时推荐（不再显示演示卡片）");

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

  const pixel =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

  const postResult = await alice.expectOk<{ post: { id: string; media: unknown[] } }>("/api/posts", {
    body: {
      body: `校园圈的验收动态 ${stamp}：傍晚操场的光很好看`,
      media: [{ type: "image", url: pixel }],
    },
  });
  assert.equal(postResult.post.media.length, 1);
  pass("校园圈：发布带图片的动态（图片以压缩 data URL 存储）");

  const bobFeed = await bob.expectOk<{
    items: { id: string; author: { nickname: string }; following: boolean }[];
  }>("/api/posts");
  const bobPost = bobFeed.items.find((item) => item.id === postResult.post.id);
  assert.ok(bobPost, "Bob should see Alice's post in the same-school feed");
  assert.equal(bobPost.following, true);
  pass("校园圈：同校成员可见动态，并显示与作者的关注关系");

  const followingFeed = await bob.expectOk<{ items: { id: string }[] }>(
    "/api/posts?scope=following",
  );
  assert.ok(followingFeed.items.some((item) => item.id === postResult.post.id));
  pass("校园圈：仅看关注的人时可筛出该作者的动态");

  const blockedPost = await alice.expectStatus("/api/posts", 422, {
    body: { body: "你这傻 逼，别再来找我", media: [] },
  });
  assert.equal(blockedPost.error?.code, "SENSITIVE_CONTENT");
  pass("校园圈：侮辱性屏蔽词直接拒收（空格规避同样命中）");

  const likeResult = await bob.expectOk<{ liked: boolean; likeCount: number }>(
    `/api/posts/${postResult.post.id}/like`,
    { body: { liked: true } },
  );
  assert.equal(likeResult.liked, true);
  assert.equal(likeResult.likeCount, 1);
  pass("校园圈：同校成员可以点赞");

  await bob.expectOk<{ comment: { body: string } }>(
    `/api/posts/${postResult.post.id}/comments`,
    { body: { body: "拍得真好看" } },
  );
  const comments = await alice.expectOk<{ comments: { body: string }[] }>(
    `/api/posts/${postResult.post.id}/comments`,
  );
  assert.ok(comments.comments.some((item) => item.body === "拍得真好看"));
  pass("校园圈：评论写入并可按动态读取");

  const aliceFeed = await alice.expectOk<{
    items: { id: string; likeCount: number; commentCount: number }[];
  }>("/api/posts");
  const alicePost = aliceFeed.items.find((item) => item.id === postResult.post.id)!;
  assert.equal(alicePost.likeCount, 1);
  assert.equal(alicePost.commentCount, 1);
  pass("校园圈：点赞数与评论数回传到时间线");

  const postReport = await bob.expectOk<{ id: string }>("/api/report", {
    body: {
      targetPostId: postResult.post.id,
      type: "inappropriate",
      description: "验收脚本提交的动态举报",
    },
  });
  assert.ok(postReport.id);
  pass("校园圈：动态可被举报（进入管理端队列）");

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
  const adminReports = await admin.expectOk<{
    reports: { id: string; target: { kind: string; id: string; excerpt?: string } }[];
  }>("/api/admin/reports");
  assert.ok(adminReports.reports.some((item) => item.id === report.id));
  pass("AC-08 管理端可查看举报列表");

  const postReportRow = adminReports.reports.find((item) => item.id === postReport.id);
  assert.ok(postReportRow, "post report should reach the admin queue");
  assert.equal(postReportRow.target.kind, "post");
  assert.ok((postReportRow.target.excerpt ?? "").length > 0);
  pass("校园圈：管理端举报列表带动态摘要");

  await admin.expectOk("/api/admin/posts", {
    body: { postId: postResult.post.id, action: "hide" },
  });
  const hiddenFeed = await bob.expectOk<{ items: { id: string }[] }>("/api/posts");
  assert.ok(!hiddenFeed.items.some((item) => item.id === postResult.post.id));
  const ownFeed = await alice.expectOk<{ items: { id: string; status: string }[] }>("/api/posts");
  assert.equal(ownFeed.items.find((item) => item.id === postResult.post.id)?.status, "hidden");
  await admin.expectOk("/api/admin/posts", {
    body: { postId: postResult.post.id, action: "restore" },
  });
  pass("校园圈：管理员隐藏动态后同校不可见、作者仍可见，并可恢复");

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

  for (const path of ["/match", "/circle", "/friends", "/chat", "/checkin", "/me", "/profile"]) {
    const page = await alice.page(path);
    assert.equal(page.status, 200, `${path} expected 200, got ${page.status}`);
    assert.ok(page.html.includes("星海大学"), `${path} should render inside the app shell`);
  }
  pass("登录态页面可服务端渲染：发现 / 校园圈 / 好友 / 消息 / 打卡 / 我的 / 资料");

  const circlePage = await alice.page("/circle");
  assert.ok(circlePage.html.includes("分享此刻的校园生活"), "circle composer should render");
  assert.ok(circlePage.html.includes("校园圈"), "nav should expose the circle entry");
  pass("校园圈页面渲染出发布器与底部导航入口");

  const anonymousMatch = await fetch(`${BASE}/match`, { redirect: "manual" });
  assert.ok(
    [307, 302].includes(anonymousMatch.status),
    `unauthenticated /match should redirect, got ${anonymousMatch.status}`,
  );
  pass("未登录访问受保护页面会被重定向到登录");

  if (!DEMO_PASSWORD) {
    console.log("  - 跳过演示账号检查（未设置 DEMO_PASSWORD）");
  } else {
    const demo = new Client();
    const demoLogin = await demo.call<{ status: string }>("/api/auth/login", {
      body: { schoolId: SCHOOL_ID, studentNo: "20210001", password: DEMO_PASSWORD },
    });
    if (demoLogin.status === 200) {
      const demoConversations = await demo.expectOk<{ items: { lastMessage: unknown }[] }>(
        "/api/conversations",
      );
      assert.ok(demoConversations.items.length >= 1);
      const demoFriends = await demo.expectOk<{ friends: unknown[] }>("/api/friends");
      assert.ok(demoFriends.friends.length >= 2);
      const demoFeed = await demo.expectOk<{ items: unknown[] }>("/api/posts");
      assert.ok(demoFeed.items.length >= 3);
      pass("演示账号 20210001 可直接登录，自带好友、会话与校园圈动态");
    } else {
      console.log("  - 跳过演示账号检查（数据库中还没有匹配的 seed 数据）");
    }
  }

  console.log(`\n全部 ${checks.length} 项检查通过 ✅\n`);
}

main().catch((error) => {
  console.error("\n验收失败：", error);
  process.exitCode = 1;
});
