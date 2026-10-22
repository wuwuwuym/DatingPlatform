# 校园同频 · 技术设计说明

版本：1.0（MVP 交付）
对应需求：`1022.md` V1.1

## 1. 设计目标

1. **可演示**：一条命令启动，无需云账号；注册 → 匹配 → 聊天 → 打卡 → 举报全流程可在 5 分钟内走完。
2. **可验证**：每条验收标准都能对应到可执行命令，不靠"看起来对"。
3. **可迁移**：本地与 Supabase 使用同一套 SQL、同一套服务层，只换连接串。
4. **可隔离**：数据边界由数据库 RLS 强制，应用层出 bug 也不会越权读取。

## 2. 架构

```
浏览器（React 19 客户端组件）
  │  fetch / SSE
  ▼
Next.js Route Handlers（薄层：鉴权 → 校验 → 调服务 → 统一响应）
  │
  ▼
服务层 src/server/services/*（业务规则，全部事务化）
  │  withUser(uid) / withSystem()
  ▼
数据访问层 src/server/db.ts
  ├─ PGlite（本地默认，进程内 Postgres）
  └─ pg Pool（DATABASE_URL 存在时，指向 Supabase/Postgres）
  │
  ▼
PostgreSQL：schema + RLS + SECURITY DEFINER 守卫
```

**为什么不在客户端直连数据库**：需求要求"身份核验与业务数据通过服务端路由处理"，且认证是自建的，Supabase Auth 不参与，因此所有读写都经服务端；RLS 作为最后一道防线而不是唯一防线。

## 3. 关键决策

| 决策 | 备选 | 结论与理由 |
| --- | --- | --- |
| 本地数据库 | Supabase 云 / Docker Postgres / PGlite | 选 PGlite：真实 Postgres 语义（RLS、枚举、数组、`SECURITY DEFINER` 全支持），零安装，测试可内存运行 |
| 身份上下文 | JWT 解析 / `current_setting` | 选 `app.user_id` 会话变量：与 Supabase Auth 解耦，且"无上下文即拒绝"可被测试证明 |
| 认证 | Supabase Auth / 自建 | 自建：需求要求"学校 + 学号 + 密码"，Supabase Auth 不适合以学号为凭据 |
| 实时 | Supabase Realtime / WebSocket / SSE | SSE：单实例零依赖，1.2s 轮询在企业微信/校园网等弱网环境更稳；替换点只有一个文件 |
| 头像 | 对象存储 / data URL | data URL（≤160px、JPEG 0.82）：避免 Vercel 只读文件系统与额外密钥，单条 ≤ 30KB |
| 敏感词 | 外部审核 API / 本地表 | 本地表 + 归一化匹配：离线可演示，管理端可维护 |
| 密码 | bcrypt / argon2 / scrypt | scrypt（Node 内置）：无原生编译依赖，参数随哈希存储便于升级 |

## 4. 数据模型要点

- `users` 只存匿名身份与资料，`password_hash` 通过列级权限对应用角色完全隐藏。
- `identity_verifications` 保存 `student_no_hash`，`unique(school_id, student_no_hash)` 承担防重复注册；该表对应用角色没有任何 RLS 策略。
- `follows` 单向；双向成立时由系统写入 `friendships(user_a < user_b)`，用排序约束防重复。
- `conversations` 与 `friendships` 同样用 `user_a < user_b` 保证一对一唯一。
- `checkins` 的唯一约束是 `(pair_key, user_id, checkin_date)`，`pair_key` 由 `app.pair_key()` 生成，语义与 TS 侧 `pairKeyOf()` 一致。
- `match_recommendations` 按 `(user_id, target_id, batch_date)` upsert，天然形成每日批次快照。
- `reports` 记录举报人/被举报人/类型/状态，管理端处理后写 `handled_by/handled_at`。

## 5. 权限模型

三层：

1. **路由层**：`requireUser / requireMatchable / requireAdmin`，负责 401/403 与封禁拦截。
2. **服务层**：业务前置条件（好友关系、会话状态、对方封禁、频率限制）。
3. **数据库层**：RLS + 列级权限 + CHECK 约束 + `SECURITY DEFINER` 守卫函数。

典型的"防绕过"设计：

- 用户不能直接 `update users set status = 'matchable'`（无列权限），必须调用 `app.mark_profile_matchable()`，该函数在数据库内再次校验资料完整性。
- 用户不能读 `password_hash`、`identity_verifications`、`verification_codes`。
- 消息发送要求 `sender_id = 当前用户` 且 `app.is_conversation_member(conversation_id)`，伪造发送者会被 RLS 拒绝。
- 封禁由管理员（系统路径）写入，用户侧任何入口都无法解除。

## 6. 匹配算法

见 `src/lib/match/score.ts` 与 README 第 5 节。要点：

- 硬过滤在 SQL，避免把全量数据拉到内存。
- 软加权是纯函数，输入输出确定，便于单测与调参。
- 理由由贡献度排序生成，最多 3 条，绝不输出"黑箱百分比"。
- 得分归一化到 0–100，同时返回各维度明细，前端展示明细。

## 7. 聊天与实时

- 会话在首次进入时创建（`conversations` 按 user_a/user_b 排序 upsert）。
- 发送前：校验好友关系 → 校验会话未关闭 → 校验对方未封禁 → 敏感词 → 入库。
- 未读数 = 对方消息中 `created_at > 我的 last_read_at` 的条数；读取消息时更新 `last_read_at`。
- SSE 每 1.2s 拉取增量（`created_at > cursor`），按 id 去重，附带心跳；连接中断自动重连（`retry: 3000`）。

## 8. 测试策略

| 层级 | 文件 | 覆盖 |
| --- | --- | --- |
| 数据库/RLS | `tests/db.test.ts` | 迁移幂等、策略隔离、列级权限、伪造消息、资料门槛 |
| 领域纯函数 | `tests/domain.test.ts` | 密码、学号哈希、会话签名、匹配评分、敏感词、连续打卡、限流 |
| 服务集成 | `tests/services.test.ts` | AC-01~AC-09 的真实服务调用链（内存数据库） |
| HTTP 全链路 | `scripts/verify-e2e.ts` | 真实服务器：注册→推荐→聊天→打卡→举报→封禁→页面渲染 |

选择理由：纯函数用最快反馈；RLS 必须打在真实 Postgres 上；服务集成覆盖业务规则；HTTP 层只保留跨层契约与页面渲染，避免重型 E2E 拖慢迭代。

## 9. 风险与后续

| 风险 | 现状 | 后续 |
| --- | --- | --- |
| 单实例限流 | 进程内滑窗 | 多实例换 Redis |
| PGlite 单进程 | 本地开发/演示足够 | 生产直接用 Supabase |
| SSE 轮询开销 | 单连接 1.2s 一次查询 | 切 Supabase Realtime 或 Postgres LISTEN/NOTIFY |
| 敏感词误伤 | 归一化子串匹配 | 引入分词与白名单 |
| 冷启动匹配池小 | 8 个演示用户 | 邀请机制 + 每日批次曝光 |
