# 打卡页与聊天页 · 视觉重构

对应页面：`/checkin`、`/chat`、`/chat/[id]`  
实现栈：React 19 + Next.js App Router + Tailwind CSS v4 + Framer Motion + lucide-react  
预览图：[打卡页](./checkin-desktop.png) · [打卡后](./checkin-checked.png) · [打卡移动端](./checkin-mobile.png)  
[聊天室](./chat-desktop.png) · [输入态](./chat-typed.png) · [聊天移动端](./chat-mobile.png) · [会话列表](./chat-list.png)

## 1. 作用域

- 只迁移 `/checkin` 与 `/chat`、`/chat/[id]`；`AppShell` 按路径加 `.checkin-v2` / `.chat-v2`，共享 circle/match 的冷灰底、Indigo/Rose、16px 卡片、无边框弥散阴影。
- 其他页面暂未迁移。
- 业务接口、SSE、权限、审核逻辑均未改。

## 2. 打卡页

| 区域 | 处理 |
| --- | --- |
| 连续打卡 Hero | 取好友中的最高连续天数，做 56px 渐变大数字（Rose → Orange → Indigo），旁边配 34px 火焰图标和浅色光斑；下方显示今天已打卡人数 |
| 好友卡 | 44px 圆形头像 + 细边；昵称加粗；MBTI/院系浅色胶囊；右侧 26px 渐变大数字 + “连续天数” |
| 打卡按钮 | 未打卡：Rose→Orange→Indigo 渐变胶囊 + 2.6s 的白色高光扫过；点击后原地变成 Emerald 浅底 + Check “今日已打卡” |
| 打卡反馈 | 成功后 8 颗彩色碎屑从按钮中心弹出（650ms），并在按钮上方显示成功 Banner；`useReducedMotion` 时跳过碎屑 |
| 成就卡片 | 已解锁：Indigo→Violet 渐变 + 白色 Trophy + Sparkles 角标 + 3.8s 白色高光扫过；未解锁：`bg-slate-100` + 灰色图标/文字 + 灰色进度条 |

验证时给「陈一诺」打卡，保留了「苏辞」的未打卡状态，方便你直接体验渐变按钮与碎屑效果。

## 3. 聊天页

| 区域 | 处理 |
| --- | --- |
| 头部 | 白色 80% 毛玻璃 + 上浮阴影；返回键 40px；伙伴 36px 圆形头像；名称 15px 加粗；MBTI/院系/实时绿点 |
| 自己的气泡 | `rounded-2xl rounded-br-sm`；Indigo→Violet 渐变；白字；柔和 Indigo 阴影；右下角时间 |
| 对方气泡 | `rounded-2xl rounded-bl-sm`；纯白；`0 4px 20px rgb(0 0 0 / .04)` 极弱阴影；无边框 |
| 头像 | 对方每条消息左侧 30px 圆形头像 + 细边，与气泡底部对齐 |
| 输入框 | 固定在底部（导航上方 72px）；毛玻璃胶囊 `bg-white/70 + backdrop-blur(24px)`；聚焦 4px Indigo 光晕 |
| 发送按钮 | 44px 圆形；无内容/发送中为 `bg-slate-200 text-slate-400`；有内容才变为 Indigo 实心 + 阴影 |
| 新消息 | 历史消息静态渲染；仅新增消息（发送成功 / SSE 收到）标记 `newIds`，以 `opacity 0 / y 16 / scale .98 → 1` 的 spring 从底部弹出 |
| 底部安全区 | 消息列表末尾加 160px spacer，避免最后一条被固定输入框盖住 |

## 4. 无障碍与动效

- 主要按钮 40–48px；发送按钮 44px；打卡按钮 40px，整卡可读。
- 打卡按钮 `aria-label` 区分“与某某打卡 / 今日已打卡”；发送按钮 `aria-label="发送"`；输入框 `aria-label="消息内容"`。
- 装饰碎屑、光斑、Sparkles 水印均为 `aria-hidden`。
- `prefers-reduced-motion`：关闭碎屑、spring 入场、shimmer 扫光和按钮位移。
- 输入聚焦有可见光晕；图片/按钮保留全局 `:focus-visible`。

## 5. 验证

```bash
pnpm typecheck   # 通过
pnpm lint        # 0 error
pnpm test        # 76 passed
pnpm build       # 通过；/checkin 5.98 kB，/chat/[id] 4.95 kB
```

Chrome headless + CDP：

- 打卡页：Hero 数字 56px 渐变；两个好友未打卡按钮均为渐变；点击后一个变 Emerald 勾选、一个保持渐变；成就 1/3 解锁；卡片 `border-radius: 16px`；页面底色 `rgb(248,249,250)`。
- 聊天室：3 条种子消息，自己的气泡 `border-radius: 16px 16px 4px` + 渐变；对方气泡 `16px 16px 16px 4px` + 白底 `.04` 阴影；3 个圆形头像；输入框 `blur(24px)`、胶囊；发送按钮禁用 `slate-200`，输入内容后 `rgb(99,102,241)`。
- 发送/实时链路：修复 StrictMode 下 `seen` 副作用导致消息被丢弃的问题；发送后气泡即时追加，SSE 新消息同样即时出现。详见 [bugfix-round1.md](./bugfix-round1.md)。
- 移动端 390：`scrollWidth === innerWidth === 390`；输入框底部 772px，导航之上；聊天输入不遮挡最后一条消息。
- 已清理验证过程中产生的今日重复聊天消息与测试打卡，保留种子对话和 1 条已打卡状态用于演示。

## 6. 文件

```text
src/app/(app)/checkin/page.tsx              # Hero、好友卡、成就墙
src/components/checkin/checkin-button.tsx   # 渐变/勾选/碎屑
src/app/(app)/chat/page.tsx                 # 会话列表
src/app/(app)/chat/[id]/page.tsx            # 聊天气泡、输入框、spring
src/components/avatar-ring.tsx              # 共享圆形头像（circle/chat/checkin）
src/components/app-shell.tsx                # 路径级 .checkin-v2 / .chat-v2
src/app/globals.css                         # 共享 token、shimmer 关键帧
docs/checkin-desktop.png
docs/checkin-checked.png
docs/checkin-mobile.png
docs/chat-desktop.png
docs/chat-typed.png
docs/chat-mobile.png
docs/chat-list.png
```
