# 校园同频 · 校园学生交友平台 MVP

面向**同校大学生**的轻量交友平台：学校 + 学号一次性核验 → 完善 MBTI/星座/性格/爱好 → 同校匹配（可解释评分）→ 互关成好友 → 私聊 → 每日打卡解锁成就 → 举报与极简管理后台。

> 参赛方向：校园 / 垂直社区全栈 MVP 平台。
> 核心边界：**学号只核验不流转，匹配有规则可解释，聊天仅好友可见，打卡轻量可演示，全栈闭环可验收。**

---

## 1. 快速开始（零配置）

```bash
pnpm install
pnpm db:migrate      # 建表 + RLS + 基础数据（内置 PGlite，无需安装数据库）
pnpm db:seed         # 可选：写入 8 个演示用户、好友关系、会话与打卡记录
pnpm dev             # http://localhost:3100
```

无需 Docker、无需 Supabase、无需 `.env`。本地首次运行会自动生成 `.data/dev-secrets.json`（已被 gitignore），用于签发会话 Cookie 与学号哈希 pepper。

> 注意：`pnpm start`（生产模式）不会使用开发密钥，必须提供 `STUDENT_NO_PEPPER`、`SESSION_SECRET`、`ADMIN_PASSCODE` 三个环境变量；本地演示请直接用 `pnpm dev`。

### 演示账号

| 学号 | 昵称 | 说明 |
| --- | --- | --- |
| `20210001` | 林小满 | 已与 2 位好友建立关系，有会话与历史打卡（连续 2 天，今天打卡即可解锁「初识火花」） |
| `20210002` ~ `20210008` | — | 同校可匹配用户，用于体验推荐与互关 |

统一密码：`<REDACTED>`。

### 管理后台

访问 `/admin`，口令由本地密钥文件生成：

```bash
pnpm admin:passcode
```

生产环境请改为设置 `ADMIN_PASSCODE` 环境变量（详见 `.env.example`）。

---

## 2. 技术栈

| 层级 | 选型 | 说明 |
| --- | --- | --- |
| 框架 | Next.js 15.5 App Router + React 19 + TypeScript strict | 前端只做展示与交互，业务全部走 Route Handler |
| 样式 | Tailwind CSS v4 + 自建组件层 | 移动端优先，无重型 UI 依赖 |
| 数据 | PostgreSQL（Supabase 兼容） | 本地默认 `@electric-sql/pglite`（进程内真实 Postgres/WASM），设置 `DATABASE_URL` 即切到 Supabase |
| 权限 | RLS + 应用角色 `app_authenticated` | 数据库是最后一道隔离防线，可被测试直接证明 |
| 认证 | 自建：scrypt 密码 + HMAC 签名 Cookie | 学号 HMAC-SHA256 哈希存储，唯一索引防重复注册 |
| 实时 | SSE 服务端推送（~1.2s） | 不依赖 Supabase Realtime，本地与云端行为一致 |
| 测试 | Vitest + HTTP 级验收脚本 | 单测 / 服务集成 / 全链路三层 |

## 3. 目录结构

```
src/
  app/
    (auth)/            登录、注册
    (app)/             受保护页面：发现 / 好友 / 消息 / 打卡 / 我的 / 资料
    admin/             极简管理后台
    api/               REST 接口（认证、资料、匹配、社交、聊天、打卡、举报、管理）
  components/          设计系统与业务组件
  lib/                 纯函数：匹配算法、敏感词、连续打卡、密码、学号哈希、会话签名
  server/              数据访问、鉴权、服务层（业务规则都在这里）
supabase/migrations/   SQL 迁移（含 RLS 策略），Supabase 可直接执行
scripts/               迁移、演示数据、管理口令、HTTP 验收脚本
tests/                 单元测试与服务级验收测试
docs/                  设计说明与验收对照
```

## 4. 数据隔离（RLS）是怎么落地的

1. 所有业务表开启 `ENABLE ROW LEVEL SECURITY`，策略对象是应用角色 `app_authenticated`。
2. 每个用户请求在事务内执行 `set_config('role', 'app_authenticated')` 与 `set_config('app.user_id', <uid>, true)`；**没有 `app.user_id` 时所有策略一律拒绝**。
3. 会话、消息、打卡、推荐、同意记录都按参与者过滤；`identity_verifications` 与 `verification_codes` 对应用角色**没有任何策略**，只有服务端系统路径（注册、登录）能访问。
4. `users.password_hash` 用列级权限隔离，应用角色连读都读不到；`users.status/role` 也不能被应用角色直接改，只能通过 `app.mark_profile_matchable()` 这个带完整性校验的 `SECURITY DEFINER` 函数升级。
5. 管理员路径走表 owner（绕过 RLS），但必须在服务端通过管理员会话校验。

对应的可执行证据见 `tests/db.test.ts`：越权读取返回 0 行、伪造发送者被拒、列级更新被拒、无身份上下文读不到任何数据。

## 5. 匹配算法（可解释）

硬性过滤在 SQL 完成：同校、状态可匹配、符合配对性别偏好、非本人、非好友、互不拉黑。
软性加权在 `src/lib/match/score.ts`：

| 维度 | 权重 | 上限 |
| --- | --- | --- |
| 共同爱好 | 每个 +8 | 24 |
| MBTI 关键维度（N/S、T/F）一致 | 每个 +6 | 12 |
| 性格标签重叠 | 每个 +5 | 15 |
| 星座同象 | +2 | 2 |

原始分上限 53，线性归一化到 0–100，并取贡献最高的 2–3 项生成中文理由（例如「你们都想聊 摄影、咖啡」）。每次推荐会写入 `match_recommendations` 快照，便于复盘与展示。

## 6. 接口清单

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/auth/schools` | 学校列表 |
| POST | `/api/auth/register` | 学校 + 学号 + 核验码 + 密码 + 分层同意 |
| POST | `/api/auth/login` | 学校 + 学号 + 密码 |
| POST | `/api/auth/logout` | 退出 |
| GET | `/api/auth/me` | 当前会话 |
| GET / PUT | `/api/profile` | 读取 / 更新资料，`complete: true` 时校验并进入匹配池 |
| GET | `/api/match/recommendations` | 同校推荐 + 分数 + 理由 |
| POST | `/api/follow` | `follow` / `unfollow` / `block` / `unblock` |
| GET | `/api/friends` | 好友 / 我关注的 / 关注我的 |
| GET | `/api/conversations` | 会话列表（含未读数） |
| POST | `/api/conversations/open` | 打开或创建与好友的会话 |
| GET / POST | `/api/conversations/{id}/messages` | 读取 / 发送消息（敏感词拦截） |
| GET | `/api/conversations/{id}/stream` | SSE 实时消息 |
| POST | `/api/checkin` | 好友每日打卡，返回连续天数与解锁成就 |
| GET | `/api/achievements` | 成就列表与进度 |
| POST | `/api/report` | 一键举报 |
| GET / POST / DELETE | `/api/admin/session` | 管理端登录状态 / 登录 / 退出 |
| GET / POST | `/api/admin/reports` | 举报列表 / 更新处理状态 |
| POST | `/api/admin/users` | 封禁 / 解封 |
| GET / POST / DELETE | `/api/admin/words` | 敏感词维护 |
| GET / POST | `/api/admin/codes` | 生成与查看演示核验码 |
| GET | `/api/admin/overview` | 后台概览 + 敏感词 |

## 7. 测试与验收

```bash
pnpm lint        # ESLint
pnpm typecheck   # tsc --noEmit
pnpm test        # Vitest：数据库/RLS、领域纯函数、服务级验收
pnpm verify:e2e  # 需要先启动 pnpm dev，跑真实 HTTP 全链路
pnpm build       # 生产构建
```

`pnpm verify:e2e` 会创建临时账号并完整走一遍：注册 → 资料 → 推荐 → 关注 → 互关 → 聊天 → 未读 → 敏感词 → 打卡 → 重复打卡 → 举报 → 管理端处理 → 封禁 → 封禁后登录失败 → 页面渲染。详见 `docs/acceptance.md`。

## 8. 切换到 Supabase

1. 在 Supabase SQL Editor 依次执行 `supabase/migrations/0001_init.sql`、`0002_seed.sql`。
2. 在 `.env.local` 或部署平台配置：

```env
DATABASE_URL=postgres://postgres:<password>@db.<project>.supabase.co:5432/postgres
STUDENT_NO_PEPPER=<长随机串>
SESSION_SECRET=<长随机串>
ADMIN_PASSCODE=<管理口令>
```

3. 重新部署，代码无需改动：`src/server/db.ts` 会自动改用 `pg` 连接池。
4. 注意：迁移里创建了 `app_authenticated` 角色与 `app` schema，需要在 Supabase 上以 owner 身份执行；RLS 策略使用 `app.user_id` 会话变量，不依赖 Supabase Auth。

部署到 Vercel 时把以上变量加入项目环境变量即可；设置 `DATABASE_URL` 后不再使用本地 PGlite 文件库。

## 9. 与需求文档的四处偏离（均已评估）

1. **Realtime 用 SSE**：需求写 Supabase Realtime，本地优先方案下改为服务端轮询 + SSE 推送（约 1.2s），接口与 UI 行为一致，`src/app/api/conversations/[id]/stream/route.ts` 是唯一替换点。
2. **头像不接对象存储**：前端压缩为 ≤160px 的 data URL 存 `avatar_url`，避免 Vercel 只读文件系统与额外密钥。
3. **管理端为口令登录**：不做多级权限，服务端校验 `users.role = 'admin'` + 管理会话 Cookie。
4. **学号哈希带 pepper**：需求写「哈希存储」，实现为 `HMAC-SHA256(pepper, school:student_no)`，比裸 SHA-256 抗彩虹表；语义仍是「只存哈希、不存明文」。

## 10. 隐私与安全

- 学号明文不落库、不进日志、不出现在任何响应中（仅 `maskStudentNo` 用于日志脱敏）。
- 密码使用 scrypt（N=16384, r=8, p=1）+ 随机盐，参数随哈希存储。
- 会话 Cookie：`httpOnly`、`sameSite=lax`、生产环境 `secure`、HMAC 签名、7 天过期。
- 敏感词在发送前做 NFKC 归一化并去除空白/标点/零宽字符，`代 考`、`代-考` 同样拦截。
- 封禁在服务端全链路生效：登录、推荐、关注、会话、消息、打卡均拒绝。
- 频率限制：注册、登录、发消息、打卡、举报、管理端操作均有进程内滑窗限流（多实例部署请换 Redis）。

## 11. 已知边界（MVP 范围内）

- 单实例部署；进程内限流与 PGlite 均为单节点方案。
- 消息历史一次最多 100 条，未做分页加载。
- 不做群聊、动态广场、支付、精确地理位置、通讯录导入。
- 管理端不做举报处理通知（P1）。
