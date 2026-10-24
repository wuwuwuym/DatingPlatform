# 发现页用户卡片 · 视觉重构

对应页面：`/match`（AppShell 里的「发现」）  
预览图：[已关注态](./match-desktop.png) · [移动端](./match-mobile.png) · [感兴趣态](./match-interested.png)

## 1. 范围与数据说明

- 只重构 `/match`，通过 `AppShell` 的 `usePathname()` 给外层加 `.match-v2`，与 `.circle-v2` 共用一套页面级 token；其他页面暂不迁移。
- **右上角的 25 不是年龄，是匹配分。** `PublicProfile` 目前没有 `age` 字段，所以胶囊显示为 `25 同频`，并用 `aria-label="同频度 25"` 说明。若确实要显示“25 岁”，需要给资料新增年龄字段（数据库 + API + 表单），不能用匹配分冒充年龄。
- 推荐、关注、互关横幅、换一批等业务逻辑未改；仅调用了原有的 `/api/match/recommendations` 与 `/api/follow`。

## 2. 卡片层级

| 区域 | 处理 |
| --- | --- |
| 头部 | 64px 头像，`rounded-2xl` + 1px `ring-slate-200`；姓名 20px 加粗；MBTI 为 Indigo 浅胶囊，院系为 slate-100 胶囊；右上角去掉 `ScoreRing`，改为半透明 Indigo 胶囊 `25 同频` |
| 简介 | 13px / 24px，`text-slate-600` |
| 爱好 | `bg-slate-100` 胶囊，`rounded-full`，gap 6px；不再使用下划线或大间距 |
| AI 分析卡 | 极浅 Indigo 渐变（`from-indigo-50 via-indigo-50/70 to-white`）+ 左上角 Sparkles 圆底图标 + 右上角 `AI` 小胶囊；推荐理由逐行排列，11.5px；底部说明“由兴趣、性格与 MBTI 共同计算”；右下角有低透明度 Sparkles 水印 |
| 操作栏 | 两个 48px 椭圆形按钮：跳过为 `bg-slate-100` + `text-slate-600`；感兴趣为 Indigo 实心；已关注为 `bg-rose-50` + `text-rose-600` + 实心 Heart |

卡片本体：无边框、`rounded-2xl`（16px）、`0 8px 30px rgb(15 23 42 / .06)` 弥散阴影。移除了原先独立的星座/性格标签行与匹配分项明细，减少纵向长度和视觉噪音。

## 3. 飞出动画

- 页头、卡片使用 Framer Motion；卡片进入 `opacity 0→1 / y 15→0`。
- 卡片外层用 `AnimatePresence` 包住，`exit` 时：
  - 跳过 → `x: -110vw`，轻微 `rotate(-4°)`，`opacity: 0`；
  - 已关注 / 感兴趣成功 → `x: 110vw`，`rotate(4°)`，`opacity: 0`；
  - 350ms `easeInOut`；`useReducedMotion()` 为真时只做淡出。
- `exitDir` 与 `cardVisible` 不能在同一批更新里移除卡片，否则 `AnimatePresence` 会继续使用上一帧的退出方向。`leave()` 先更新方向，再在 `requestAnimationFrame` 中移除卡片，确保“已关注”真正向右飞。
- 卡片退出期间按钮禁用；`onExitComplete` 后再递增 index、恢复按钮，避免连点切两张。

## 4. 验证

```bash
pnpm typecheck   # 通过
pnpm lint        # 0 error
pnpm test        # 76 passed
pnpm build       # 通过；/match 5.8 kB，First Load JS 160 kB
```

Chrome headless + CDP：

- 桌面 1440：卡片 424×415，`border-radius: 16px`、`border-width: 0`、阴影 `.06`；头像 64×64；右上角胶囊文本 `25 同频`；页面底色 `rgb(248,249,250)`。
- AI 卡：计算样式为 Indigo→白 的 linear-gradient；Sparkles 图标与 `AI` 胶囊存在。
- 按钮：跳过为 slate-100 灰底；已关注为 rose-50 粉底；切到下一位（周予安）后按钮为 Indigo 实心“感兴趣”。
- 动画：点击跳过 120ms 时卡片已明显左移；点击已关注 120ms 时明显右移，450ms 后进入第 2/3 位；`110vw` 保证桌面宽屏也能完全飞出。
- 移动 390：卡片 354×439，`scrollWidth === innerWidth === 390`；操作按钮底部 662.75px，首屏可见。
- 移除首屏阻塞的 `animate-rise` 双重动画，匹配页只由卡片自身入场。

## 5. 文件

```text
src/app/(app)/match/page.tsx    # 卡片、AI 分析、按钮、AnimatePresence
src/components/app-shell.tsx    # /match 的 .match-v2 作用域
src/app/globals.css             # .match-v2 token、卡片、页面底色、滚动裁剪
docs/match-desktop.png
docs/match-mobile.png
docs/match-interested.png
```
