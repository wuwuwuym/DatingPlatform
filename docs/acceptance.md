# 验收对照表（AC-01 ~ AC-10 + 校园圈 C-01 ~ C-07）

执行环境：Windows / Node 24.15 / pnpm 11.7 / Next.js 15.5.4 / PGlite 0.5.11
最近一次全量验证：2026-10-24

## 1. 原始需求 AC-01 ~ AC-10

| 编号 | 验收项 | 证据 | 结果 |
| --- | --- | --- | --- |
| AC-01 | 新用户可选择学校、输入学号与核验码完成注册；数据库中无学号明文 | `tests/services.test.ts` → “AC-01: registers with hashed identity and layered consents”；`tests/db.test.ts` → “stores no plaintext student number column”；`pnpm verify:e2e` 注册检查 | 通过 |
| AC-02 | 未完成必填资料的用户无法进入匹配池 | `tests/services.test.ts` → “AC-02: an incomplete profile cannot enter the matching pool”（`PROFILE_INCOMPLETE`）；数据库 `users_matchable_complete` 约束兜底 | 通过 |
| AC-03 | 匹配推荐仅出现同校、符合性别偏好、非拉黑非好友用户，并展示匹配分与理由 | `tests/services.test.ts` → “AC-03: recommendations are filtered, scored and explained”；`pnpm verify:e2e` 输出“得分 66 且有 3 条理由” | 通过 |
| AC-04 | 双方互相关注后成为好友，聊天入口解锁 | `tests/services.test.ts` → “AC-04: mutual follow creates a friendship and unlocks chat”；`pnpm verify:e2e` 互关与开会话 | 通过 |
| AC-05 | 非好友无法读取或发送会话消息；RLS 直接查询也无法越权 | `tests/db.test.ts` → “scopes conversations and messages to participants”；`tests/services.test.ts` → “AC-05/AC-06”；`pnpm verify:e2e` 未读数与 422 敏感词 | 通过 |
| AC-06 | 同一好友对每日重复打卡被唯一约束拒绝 | `tests/services.test.ts` → “AC-06/AC-07: daily check-in is unique…”；`pnpm verify:e2e` → 第二次打卡返回 409 `ALREADY_CHECKED_IN` | 通过 |
| AC-07 | 连续打卡 3/7/21 天可分别解锁对应成就卡片 | `tests/services.test.ts` → 3 天解锁 `spark`、7 天解锁 `tacit`；阈值来自 `achievements` 表，21 天为 `longterm` | 通过 |
| AC-08 | 用户可一键举报，管理端可查看并封禁用户；封禁后不可登录和聊天 | `tests/services.test.ts` → “AC-08: report -> admin handling -> ban…”；`pnpm verify:e2e` → 举报、列表、标记、封禁、封禁后登录 403 | 通过 |
| AC-09 | 分层隐私同意记录可查询，包含版本与时间 | `tests/services.test.ts` → “AC-09: consent records carry version and timestamp”（3 条 scope，`policy_version = 2026-01`） | 通过 |
| AC-10 | 公网 URL 完成“注册→资料→匹配→关注→聊天→打卡→成就→举报”全流程演示 | 本地已用 `pnpm verify:e2e` 跑通全链路（34 项断言）。公网部署待配置 Vercel + Supabase 后执行 | 本地通过，公网待部署 |

## 1.1 首页接入验收 H-01 ~ H-04

| 编号 | 验收项 | 证据 | 结果 |
| --- | --- | --- | --- |
| H-01 | 游客访问 `/` 看到明确标注「演示内容」的示例卡片；点击关注进入 `/register` | Chrome 无头实测：游客首页出现「以上人物与数据均为演示内容」「示例卡片」，点击「登录后关注」后 `location.pathname === "/register"` | 通过 |
| H-02 | 已登录且进入匹配池的用户，首页展示同校实时推荐；好友、跨校、拉黑用户不出现 | `tests/services.test.ts` → “homepage: a matchable visitor reads the live same-school pool…”; `pnpm verify:e2e` → 登录用户首页出现「同校匹配池实时同步」且无演示标注 | 通过 |
| H-03 | 首页关注调用真实接口；举报进入管理端队列 | Chrome 无头实测：登录 20210001 → 打开卡片 → 关注 周予安 → 出现「已关注 周予安」；举报卡片 → 提交 → 出现「举报已提交给管理员」；`POST /api/follow`、`POST /api/report` 均返回 2xx | 通过 |
| H-04 | 未进入匹配池的用户看到示例卡片并被引导完善资料；实时卡片不伪造在线状态 | `tests/services.test.ts` → “homepage: guests and incomplete profiles keep the labelled demo cards”；`getLandingData` 仅在 `status = 'matchable'` 时返回 `mode: "live"`；实时卡片 `online === null`，组件不渲染在线点 | 通过 |

## 2. 校园圈增量验收 C-01 ~ C-07

| 编号 | 验收项 | 证据 | 结果 |
| --- | --- | --- | --- |
| C-01 | 同校成员可见动态；跨校成员、未登录上下文查询返回 0 行 | `tests/db.test.ts` → “shows published posts to same-school peers only”；`tests/services.test.ts` → “C-01: same-school feed…” | 通过 |
| C-02 | 支持发布文案与图片；正文≤800 字、图片≤4 张、图片为白名单 data URL；图片可点击全屏查看 | `tests/domain.test.ts` → “circle content moderation”（媒体校验）；`pnpm verify:e2e` → 带图动态发布成功且 `media.length = 1`；Chrome 无头实测：点击图片打开查看器、多图 1/2 ↔ 2/2 切换、Esc 关闭并恢复页面滚动 | 通过 |
| C-03 | 同校成员可点赞、评论；计数回传时间线 | `tests/services.test.ts` → “C-01”；`pnpm verify:e2e` → 点赞 1、评论 1、计数回传 | 通过 |
| C-04 | 侮辱性屏蔽词触发拦截，内容不落库；空格/零宽/标点规避同样命中 | `tests/domain.test.ts` → “blocks insult words, including spaced or decorated obfuscation”；`tests/services.test.ts` → `SENSITIVE_CONTENT`；`pnpm verify:e2e` → “你这傻 逼” 返回 422 | 通过 |
| C-05 | 动态可被举报；管理端可隐藏/恢复/删除；隐藏后同校不可见、作者仍可见 | `tests/services.test.ts` → “C-02”“C-04”；`pnpm verify:e2e` → 举报入队、隐藏、恢复 | 通过 |
| C-06 | 用户可在校园圈关注动态作者；「我关注的」时间线按 `follows` 过滤 | `tests/services.test.ts` → “C-01” 的 following scope 断言；`pnpm verify:e2e` → `scope=following` 命中 | 通过 |
| C-07 | 被拉黑作者的内容不进入对方时间线；封禁作者后其动态自动隐藏 | `tests/db.test.ts` → “hides an author's posts from users who blocked them”；`tests/services.test.ts` → “C-05: banning an author…” | 通过 |

### 校园圈实现边界（与需求对齐说明）

- 需求写“文案、图片、视频”：文案与图片为端到端实现；视频采用 **https 外链**（每条 1 个，图文不混排），不做服务端上传与转码，原因见 README 第 10 节偏离说明。
- 需求写“基础审核”：实现为**发布前屏蔽词 + 结构校验 + 发布后举报/人工处置**三层；未接入第三方内容安全服务与图片识别。
- 需求写“屏蔽词机制”：复用私聊同一张 `sensitive_words` 表，`0003_circle.sql` 预置常见侮辱性词汇，管理端可增删。

## 3. 复现命令

```bash
pnpm install
pnpm db:migrate
pnpm db:seed          # 可选，演示账号与校园圈动态
pnpm lint
pnpm typecheck
pnpm test             # 76 项（17 DB/RLS + 39 领域 + 20 服务）
pnpm build

# 终端 A
pnpm dev
# 终端 B
pnpm verify:e2e       # 37 项 HTTP 断言
```

## 4. 最近一次执行结果

- `pnpm test`：3 个文件 / 76 项全部通过
- `pnpm verify:e2e`：37 项全部通过
- `pnpm lint`：0 error / 0 warning
- `pnpm typecheck`：0 error
- `pnpm build`：构建成功（首页改为按会话读取同校实时推荐）

## 5. 未覆盖（明确说明）

- 公网部署（AC-10 的后半句）尚未执行：需要 Vercel 账号与 Supabase 项目。
- 真实设备上的 SSE 弱网重连只做了逻辑保证（`retry: 3000` + 去重），未做真机压测。
- 21 天成就未做端到端长周期验证，仅由阈值表与 7 天用例推导（同一代码路径）。
- 校园圈未做真实设备图片选择/压缩的自动化测试（`createImageBitmap` 依赖浏览器）；HTTP 层用 1×1 PNG data URL 验证了服务端链路。
- 未做第三方内容安全服务与图片识别，审核能力以词表与人工为主。
- 首页实时推荐不提供在线状态（产品暂无 presence 信号）；「隐私开关」仍是浏览器本地演示，未写入账号。
- 首页交互（关注 / 举报 / 游客跳转）由 Chrome 无头脚本做人工可复现验证，未固化为仓库内的自动化 UI 测试依赖。
- `pnpm verify:e2e` 会写入以「验收」开头的临时账号与动态；需要干净演示数据时，按 README 第 8 节重置本地库后重新 `db:seed`。

