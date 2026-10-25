# 新消息通知弹窗

对应页面：全站（由 `AppShell` 挂载）  
预览图：[桌面端](./message-notification.png) · [移动端](./message-notification-mobile.png)

## 1. 目标与范围

用户停留在发现、校园圈、好友、打卡等任意页面时，如果收到好友的新私聊消息，底部浮出一条消息通知卡片，提示发送者、消息预览与时间，并可直接进入会话。

- 只在应用内提示，不请求浏览器通知权限，不发送系统级推送。
- 只提示**本次打开应用之后**收到的消息；进入页面前的历史未读仍由消息列表的未读徽标承载。
- 只提示**别人发给我**的消息；自己发送的消息不会触发。
- 停留在当前会话时不再弹窗，避免和聊天气泡重复。

## 2. 交互

| 场景 | 行为 |
| --- | --- |
| 收到新消息 | 白色浮层从底部上浮 16px + 淡入，展示头像、昵称、`新消息`、时间、消息预览 |
| 点击卡片 | 进入 `/chat/[conversationId]`，并关闭当前通知 |
| 关闭按钮 | 立即消失；如果队列里还有别的会话，继续展示下一条 |
| 5 秒无操作 | 自动消失（符合 toast 3–5 秒的反馈规范） |
| 鼠标悬停 / 键盘聚焦 | 暂停自动消失，移开或失焦后重新计时 |
| 同一会话连续来消息 | 更新当前卡片内容并重置计时，不堆叠多条相同通知 |
| 不同会话同时来消息 | 按到达顺序排队，每条展示 5 秒 |
| 正在该会话聊天 | 不弹窗；消息已由聊天气泡和 SSE 呈现 |
| 正在另一个会话聊天 | 正常弹窗，点击可切到新会话 |
| `prefers-reduced-motion` | 去掉位移与缩放，仅保留必要的透明度变化 |

## 3. 视觉

- 白色 95% 背景 + `backdrop-blur(24px)`，`rounded-2xl`，细白边与 `0 18px 45px -18px` 浮层阴影。
- 40px 圆形头像，右下角 Indigo 消息小徽标，和聊天室头像体系一致。
- 昵称 13px `slate-800`，预览 12px `slate-600`，时间 10px `slate-500`；`新消息` 使用 Indigo-500。
- 底部 2px Indigo → Violet → Rose 渐变线，作为新消息的品牌提示。
- 位置：普通页面 `bottom: calc(88px + safe-area)`，聊天室内抬到 `164px`，避开固定输入框；宽度最大 420px，移动端左右各 16px。
- 关闭按钮 44×44px；卡片整体可点击进入会话。

## 4. 技术实现

### 4.1 全局 SSE

新增 `GET /api/messages/stream?after=<ISO>`：

- 使用 `requireUser()` 鉴权，只返回当前用户参与的会话；
- 服务端每 1.5s 查询一次 `messages` 中 `sender_id <> 当前用户` 且 `created_at > after` 的记录；
- 通过 `text/event-stream` 推送 `message` 事件，负载：

```json
{
  "conversationId": "3bd058bf-...",
  "partner": { "id": "...", "nickname": "苏辞", "avatarUrl": null },
  "message": { "id": "...", "content": "今晚一起去看展吗？", "createdAt": "2026-10-25T08:40:00.000Z" }
}
```

客户端 `after` 取组件挂载时刻，因此不会把旧消息当成新通知；连接断开后 EventSource 自动重连，客户端用消息 id 去重。

### 4.2 组件

`src/components/message-notifier.tsx`：

- `EventSource` 只建立一次，路由切换不重连；
- 用 `pathRef` 读取当前路径，在事件回调里判断是否正在该会话；
- 队列按会话合并，5 秒计时器在 `paused` 时暂停；
- `AnimatePresence mode="wait"` 做卡片切换；
- `role="status"` + `aria-live="polite"` + `aria-atomic="true"`，不抢焦点。

`AppShell` 挂载 `<MessageNotifier />`，所有登录后的页面自动获得通知能力。

## 5. 验证

```bash
pnpm typecheck   # 通过
pnpm lint        # 0 error
pnpm test        # 81 passed（新增消息通知服务测试）
pnpm build       # 通过
```

Chrome headless + CDP（1440×950 / 390×844）：

- 在 `/match` 让苏辞发送消息：通知出现，文本为「苏辞 / 新消息 / 16:40 / 今晚一起去看展吗？」，链接指向 `/chat/3bd...`，卡片宽 420px、底部 766px，导航顶部 791.5px，背景模糊 24px。
- 点击通知：成功进入 `/chat/3bd...`。
- 停留在该聊天室时再发消息：不出现通知。
- 移动端 `/circle`：卡片宽 358px、左右 16px、底部 756px，导航顶部 782.5px；`scrollWidth === innerWidth === 390`。
- 关闭按钮可立即关闭；等待 5.5s 后自动消失。
- 通知只包含对方消息；服务测试同时断言发送方不会收到自己消息的通知。

## 6. 文件

```text
src/components/message-notifier.tsx          # 通知卡片、SSE、队列、计时
src/components/app-shell.tsx                 # 全站挂载
src/app/api/messages/stream/route.ts         # 全局消息 SSE
src/server/services/chat-service.ts          # listMessageNotifications
src/lib/types.ts                             # ChatNotification
tests/services.test.ts                       # 只通知对方消息的测试
docs/message-notification.png
docs/message-notification-mobile.png
```
