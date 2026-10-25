# 功能 BUG 修复记录（2026-10-25）

对应页面：`/match`、`/chat/[id]`、`/friends`

## 1. 「换一批」点击无反应

**现象**：在发现页对第一张推荐卡片不感兴趣，点击右上角「换一批」，卡片和页码都不变。

**根因**：按钮只执行 `setReloadKey(key + 1)`。`/api/match/recommendations` 按匹配分排序返回同一份每日批次，重新请求后 `index` 又被重置为 0，因此仍然显示同一个人；接口本身没有随机或翻页参数。

**修复**：按 FR-16「每日推荐一批」的约束，在同一批次内轮换，而不是重复拉取同一列表：

- 「换一批」复用卡片的左滑退场动画，退出完成后 `index + 1`；
- 已到最后一位时回绕到第一位，避免按钮走到死路；
- 「跳过」仍保持原语义，看完最后一位进入「今天的推荐看完啦」；
- 轮换期间与其他操作共用 `leaving` 锁，避免连点切两张。

## 2. 自己发送的消息不立即出现

**现象**：输入内容点击发送后，输入框清空、接口返回 201，但气泡不出现；退出聊天室再进入才看到。

**根因**：`append()` 在 `setMessages` 的 updater 内部修改 `seen` 集合：

```ts
setMessages((current) => {
  if (seen.current.has(message.id)) continue;
  seen.current.add(message.id); // 副作用
  merged.push(message);
  return merged;
});
```

React 开发模式的 StrictMode 会把 updater 调用两次。第一次把 id 写入 `seen` 并返回含新消息的数组；第二次因 `seen` 已存在而跳过，返回不含新消息的旧数组，React 最终采用第二次结果，消息被丢弃。SSE 收到的消息同样会丢，而且服务端 `sent` 集合不会重发。

**修复**：

- 新增纯函数 [`mergeMessages`](../src/lib/chat/merge.ts)，只根据传入数组去重、追加，不读写外部状态；
- 在调用 `setMessages` **之前**完成 `seen` / `newIds` 的登记，再把 `fresh` 交给纯函数；
- 这样 StrictMode 两次执行得到一致结果，自己发送与 SSE 实时消息都会立即进入列表。

## 3. 拉黑后无法取消

**现象**：在好友页点「拉黑」后，对方从好友列表消失，页面没有任何黑名单入口，无法恢复。

**根因**：后端已有 `action: "unblock"` 和 `unblockUser()`，但前端只传 `unfollow | block | follow`，且 `/api/friends` 只返回 friends / following / followers，没有拉黑列表。

**修复**：

- `BlockedItem` 类型 + `listBlocked()` 查询（按拉黑时间倒序）；
- `/api/friends` 增加 `blocked` 字段；
- 好友页新增「黑名单」标签与数量；每张卡展示拉黑时间，并提供「取消拉黑」按钮；
- 取消成功后刷新列表并提示「已取消拉黑，对方会重新进入推荐池」。

## 4. 验证

```bash
pnpm typecheck   # 通过
pnpm lint        # 0 error
pnpm test        # 80 passed（新增 3 个 merge 测试、1 个黑名单服务测试）
pnpm build       # 通过
```

Chrome headless + CDP（1440×950）：

- `/match`：江野 → 点「换一批」→ 周予安 → 再点 → 沈知白；
- `/chat/3bd...`：发送「修复验证消息」后气泡数 7 → 8，输入框清空；苏辞通过接口发来「来自苏辞的实时消息」，2.2s 内 SSE 气泡出现，数量 9；
- `/friends`：拉黑苏辞后好友 0、黑名单 2；切到黑名单可见「取消拉黑」，点击后黑名单 2 → 1，出现成功提示；已验证重新关注可恢复好友关系。

## 5. 涉及文件

```text
src/app/(app)/match/page.tsx              # 换一批轮换
src/app/(app)/chat/[id]/page.tsx          # 发送/SSE 追加
src/lib/chat/merge.ts                     # 纯函数合并
src/app/(app)/friends/page.tsx            # 黑名单标签、取消拉黑
src/server/services/social-service.ts     # listBlocked
src/app/api/friends/route.ts              # blocked 字段
src/lib/types.ts                          # BlockedItem
tests/chat-merge.test.ts                  # 合并回归测试
tests/services.test.ts                    # 拉黑/取消拉黑测试
```
