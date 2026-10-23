# 校园同频 · 技术设计说明

版本：1.1（新增校园圈）
对应需求：`1022.md` V1.1 + 校园圈增量需求

## 1. 设计目标

1. **可演示**：一条命令启动，无需云账号；注册 → 匹配 → 聊天 → 打卡 → 校园圈 → 举报全流程可在 5 分钟内走完。
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
| 动态媒体 | 对象存储 / data URL + 外链 | 图片压缩为 ≤360KB 的 JPEG data URL（单条 ≤4 张）；视频只存 https 外链，避免上传、转码与存储成本 |
| 内容审核 | 第三方审核 / 本地屏蔽词 + 人工 | 本地 `sensitive_words`（归一化匹配）+ 结构校验 + 举报/管理端处置：离线可演示，词表可维护 |
| 敏感词 | 外部审核 API / 本地表 | 本地表 + 归一化匹配：离线可演示，管理端可维护 |
| 密码 | bcrypt / argon2 / scrypt | scrypt（Node 内置）：无原生编译依赖，参数随哈希存储便于升级 |

## 4. 数据模型要点

- `users` 只存匿名身份与资料，`password_hash` 通过列级权限对应用角色完全隐藏。
- `identity_verifications` 保存 `student_no_hash`，`unique(school_id, student_no_hash)` 承担防重复注册；该表对应用角色没有任何 RLS 策略。
- `follows` 单向；双向成立时由系统写入 `friendships(user_a < user_b)`，用排序约束防重复。
- `conversations` 与 `friendships` 同样用 `user_a < user_b` 保证一对一唯一。
- `checkins` 的唯一约束是 `(pair_key, user_id, checkin_date)`，`pair_key` 由 `app.pair_key()` 生成，语义与 TS 侧 `pairKeyOf()` 一致。
- `match_recommendations` 按 `(user_id, target_id, batch_date)` upsert，天然形成每日批次快照。
- `posts` 以 `author_id + school_id` 归属，媒体为 `jsonb` 数组（`image`/`video`），`status` 三态：`published / hidden / removed`；作者只能把状态改成 `removed`，隐藏只能由管理端系统路径执行。
- `post_comments` 与 `post_likes` 都以 `post_id` 收敛，查询时通过「动态是否可见」间接过滤；点赞计数与评论计数在查询时 `count(*)` 聚合，不做冗余计数列，避免漂移。
- `reports` 增加可空的 `target_post_id`，并用 `num_nonnulls(target_user_id, target_post_id) = 1` 保证举报对象二选一。
- 举报与动态的关系：举报动态时 `target_user_id` 为空，管理端列表通过 `left join posts` 还原摘要与作者。

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

## 8. 校园圈

- **可见性**：RLS 限制 `school_id = app.current_school_id()` 且 `status = 'published'`；作者分支放行自己的全部状态；被当前用户拉黑的作者内容不进入时间线。跨校查询在数据库层直接返回 0 行，服务层无需额外过滤。
- **发布**：资料完整（`matchable`）+ 频率限制 → 结构与媒体校验 → 屏蔽词 → 插入 `posts`。正文与评论共用 `moderateText`，命中即 `422 SENSITIVE_CONTENT`，不写入数据库。
- **互动**：点赞以 `(post_id, user_id)` 为主键 + `on conflict do nothing` 实现幂等；评论插入策略要求动态仍为 `published`；评论删除只允许作者本人。
- **关注作者**：复用 `follows`。互关逻辑不变，因此在校园圈关注对方与在「发现」关注效果一致（互关成为好友、解锁私聊）。
- **分页**：`(created_at, id)` 复合游标，避免 offset 在新增内容时重复或漏项；每页多取 1 条用于判断 `nextCursor`。
- **治理**：动态举报写 `reports(target_post_id)`；管理端可 `hide / restore / remove`；封禁用户时批量把其 `published` 动态改为 `hidden`。动态被隐藏后，其评论与点赞因策略中的 `exists (select 1 from posts ...)` 自动失效。
- **审核边界**：当前是「词表 + 结构校验 + 人工处置」，没有图片识别与语义模型；词表可被管理端实时增删，误伤时可通过管理端移除词条立即恢复。

## 9. 测试策略

| 层级 | 文件 | 覆盖 |
| --- | --- | --- |
| 数据库/RLS | `tests/db.test.ts` | 迁移幂等、策略隔离、列级权限、伪造消息、资料门槛、校园圈跨校/拉黑/伪造/隐藏 |
| 领域纯函数 | `tests/domain.test.ts` | 密码、学号哈希、会话签名、匹配评分、敏感词、连续打卡、限流、动态媒体与审核 |
| 服务集成 | `tests/services.test.ts` | AC-01~AC-09 与 C-01~C-05 的真实服务调用链（内存数据库） |
| HTTP 全链路 | `scripts/verify-e2e.ts` | 真实服务器：注册→推荐→聊天→打卡→校园圈→举报→封禁→页面渲染 |

选择理由：纯函数用最快反馈；RLS 必须打在真实 Postgres 上；服务集成覆盖业务规则；HTTP 层只保留跨层契约与页面渲染，避免重型 E2E 拖慢迭代。

## 10. 风险与后续

| 风险 | 现状 | 后续 |
| --- | --- | --- |
| 单实例限流 | 进程内滑窗 | 多实例换 Redis |
| PGlite 单进程 | 本地开发/演示足够 | 生产直接用 Supabase |
| SSE 轮询开销 | 单连接 1.2s 一次查询 | 切 Supabase Realtime 或 Postgres LISTEN/NOTIFY |
| 敏感词误伤 | 归一化子串匹配 | 引入分词与白名单；校园圈与私聊共用词表 |
| 校园圈媒体体积 | 图片压缩后存 jsonb | 接对象存储后改存 URL，接口字段不变 |
| 审核能力有限 | 本地词表 + 人工 | 接入内容安全服务、图片识别与自动折叠 |
| 冷启动匹配池小 | 8 个演示用户 | 邀请机制 + 每日批次曝光 |
