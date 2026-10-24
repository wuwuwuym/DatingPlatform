# 校园同频 · 首页视觉与动效说明

对应页面：`/`（官网 / 产品首页）  
实现栈：React 19 + Next.js App Router + Tailwind CSS v4 + Framer Motion + lucide-react  
预览图：[桌面端](./preview-desktop.png) · [移动端](./preview-mobile.png)

## 1. 视觉方向

关键词：**清爽、可信、轻社交、低压力、青春但不幼稚**。

- 奶油白纸张底 + 深灰文字，避免“社交 App 常见的高饱和渐变”。
- 三个强调色只承担三种语义：珊瑚粉 = 人的温度，薄荷绿 = 安全/在线，靛蓝 = 操作/匹配。
- 标题使用大字号、紧字距、600–700 字重；正文 400–500，行高 1.6–1.75。
- 插画使用平面几何 + 细线，配合 SVG 手绘头像，不依赖网络图片，首屏无图片阻塞。
- 安全区使用深灰大卡片作为节奏锚点，其余区块保持浅色；卡片统一 20px 圆角，标签与按钮为胶囊形。

## 2. 页面结构

| 区块 | 内容 | 关键交互 |
| --- | --- | --- |
| 顶部导航 | 品牌、发现/兴趣/安全、登录、开始匹配 | 移动端隐藏文字导航，保留 CTA |
| 首屏 | 低压力 slogan、搜索、开始匹配、4 个浮动兴趣标签、校园插画、产品卡预览 | 搜索过滤；CTA 光晕；标签缓慢浮动 |
| 发现 | 6 张 mock 用户卡（桌面网格 / 移动横滑）、筛选 tab、空状态 | 卡片 hover / 按压缩放；认证徽章 tooltip；隐私/举报入口；详情 sheet |
| 兴趣匹配 | 16 个兴趣标签云、已选摘要、匹配人数 | hover 浮起；点击筛选；查看匹配结果 |
| 安全与信任 | 学生认证说明、两个隐私开关、举报入口、校园照片 | 开关本地持久化；举报 sheet；图片懒加载 |
| 页脚 | 品牌、产品/关于/帮助链接、演示声明 | 回到顶部 |
| 移动端 Tab | 首页 / 发现 / 兴趣 / 安全 | 滚动高亮 + 锚点跳转；`safe-area-inset-bottom` |

## 3. 文件结构

```text
src/
├─ app/
│  ├─ globals.css                     # 设计 token、基础层、关键帧、reduced-motion
│  ├─ layout.tsx                      # metadata / viewport
│  ├─ page.tsx                        # 服务端读取会话，选择 CTA 目的地
│  └─ (app)/chat/[id]/page.tsx        # 聊天页新增隐私入口与举报入口
├─ components/
│  ├─ landing/
│  │  ├─ landing-page.tsx             # 首页状态编排（搜索/筛选/弹层/toast）
│  │  ├─ site-header.tsx
│  │  ├─ hero.tsx                     # 首屏 + 校园插画 + 浮动标签 + 预览卡
│  │  ├─ discover.tsx                 # 筛选与卡片列表 / 空状态
│  │  ├─ user-card.tsx                # 用户卡片（hover/press/认证/在线/隐私/举报）
│  │  ├─ avatar-art.tsx               # 6 个 SVG 手绘头像
│  │  ├─ verified-badge.tsx           # 认证徽章 tooltip + 在线状态点
│  │  ├─ interests.tsx               # 兴趣标签云
│  │  ├─ safety.tsx                   # 安全与信任区 + 隐私开关
│  │  ├─ site-footer.tsx
│  │  ├─ mobile-tab-bar.tsx           # 移动端底部 Tab + scroll spy
│  │  ├─ match-button.tsx             # 主 CTA + 300ms 光晕
│  │  ├─ sheet.tsx                    # 通用 bottom sheet（焦点陷阱/Esc/滚动锁）
│  │  ├─ profile-sheet.tsx
│  │  ├─ privacy-sheet.tsx
│  │  ├─ report-sheet.tsx
│  │  ├─ empty-matches.tsx            # 空状态插画
│  │  ├─ reveal.tsx                   # 视口进入动画
│  │  ├─ switch.tsx                   # 无障碍 switch
│  │  └─ toast.tsx
│  └─ chat-privacy-dialog.tsx         # 聊天页“隐私与安全”弹层
└─ lib/
   └─ landing-data.ts                 # 兴趣、mock 用户、浮动标签数据
docs/
├─ preview-desktop.png
├─ preview-mobile.png
└─ visual-design.md                   # 本文件
```

## 4. 设计 Token

```css
@theme {
  /* surfaces */
  --color-canvas: #faf9f6;
  --color-paper: #fffdf9;
  --color-surface: #ffffff;
  --color-surface-soft: #f4efe7;

  /* text */
  --color-ink: #1f2937;
  --color-ink-soft: #475467;
  --color-muted: #5f6673;
  --color-line: #e9e2d8;
  --color-line-strong: #d9cfc1;

  /* accent 1: indigo */
  --color-brand: #5b6cff;
  --color-brand-deep: #4050e0;
  --color-brand-soft: #eef0ff;

  /* accent 2: coral */
  --color-coral: #f28c8c;
  --color-coral-deep: #b64f4f;
  --color-coral-soft: #fdeeee;

  /* accent 3: mint */
  --color-mint: #7bc9a6;
  --color-mint-deep: #2f7a5b;
  --color-mint-soft: #eaf7f0;

  /* shape */
  --radius-card: 20px;
  --radius-panel: 28px;
  --radius-pill: 999px;

  /* elevation */
  --shadow-soft: 0 18px 50px -34px rgba(31, 41, 55, 0.3);
  --shadow-card: 0 14px 34px -28px rgba(31, 41, 55, 0.35);
  --shadow-float: 0 24px 48px -28px rgba(31, 41, 55, 0.4);

  /* type */
  --font-sans: "PingFang SC", "Hiragino Sans GB", "Source Han Sans SC",
    "Noto Sans CJK SC", "Microsoft YaHei", system-ui, -apple-system, sans-serif;
}
```

色彩对比说明：浅色底上的正文使用 `--color-ink` / `--color-ink-soft` / `--color-muted`（对比度 ≥ 4.5:1）；珊瑚、薄荷、靛蓝的亮色只做填充与装饰，文字使用对应的 `*-deep` 色。

## 5. 动效参数表

| # | 触发条件 | 动画对象 | 属性 | 时长 | 缓动 | 延迟 | 可中断 | 降级方案 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 首屏挂载，无限循环 | 4 个 `.float-tag` | `transform: translateY(0 → -4px → 0)`（移动端 -2px） | 4.8s / 5.4s / 5.9s / 5.1s | `ease-in-out` | -0.4s / -1.9s / -3.1s / -2.4s（错峰） | 否（环境动画） | `prefers-reduced-motion: reduce` → `animation: none`，静态标签 |
| 2 | 进入视口 16%，仅一次 | `Reveal` 包裹的区块 | `opacity 0→1`，`translateY(12px→0)` | 400ms | `ease-out` | 0 / 60 / 100ms（按区块） | 触发后不可打断；`once: true` | reduced-motion 下直接渲染最终状态 |
| 3 | 指针 hover / focus-within | 用户卡片 + 阴影层 | 卡片 `translateY(0→-2px)`；阴影层 `opacity 0→1`（静态阴影） | 160ms | `ease-out` | 0 | 是，移出反向 | reduced-motion 关闭位移；阴影仍以极短透明度变化保留层级 |
| 4 | 指针按下 / tap | 用户卡片 | `scale(1→0.98→1)` | 160ms | `ease-out` | 0 | 是，松开回弹 | reduced-motion 关闭缩放 |
| 5 | 挂载，无限循环 | `.online-dot` | `opacity 0.55↔1` | 2s | `ease-in-out` | 0 | 否（呼吸感） | reduced-motion → `animation: none; opacity: 1` |
| 6 | 点击“开始匹配” | 按钮内光晕层 | `opacity 0→0.62→0`，`scale 0.72→1.14`；光晕完整播放后 320ms 跳转 | 300ms | `ease-out` | 0 | 可重复点击重新触发（key 重挂载） | reduced-motion 不创建光晕，直接执行跳转 |
| 7 | 指针 hover | CTA 白色提亮层 | `opacity 0→0.1` | 200ms | `ease-out` | 0 | 是 | reduced-motion 下瞬时切换 |
| 8 | 指针 hover / tap | 兴趣标签 chip | `translateY(0→-4px)`；按下 `scale .97` | 弹簧 ~200ms | `spring(420, 26, 0.55)` | 0 | 是 | reduced-motion 关闭位移与缩放 |
| 9 | hover / tap / focus | 认证 tooltip | `opacity 0→1`，`translateY(4px→0)` | 160ms | `ease-out` | 0 | 是 | MotionConfig 处理；仅保留内容显示 |
| 10 | 打开/关闭弹层 | 遮罩 + 面板 | 遮罩 `opacity 0→1`；面板 `opacity 0→1`，`y 28px→0`，`scale .985→1` | 200ms / 240ms | `ease-out` | 0 | 是（Esc / 点击遮罩关闭） | reduced-motion 即时打开，关闭不播放位移动画 |
| 11 | 切换隐私开关 | 旋钮 | `translateX(0↔20px)` | 200ms | `ease-out` | 0 | 是 | reduced-motion 时长 0 |
| 12 | 卡片进入视口，仅一次 | 同频度进度条 | `scaleX(0→score/100)`，`transform-origin: left` | 600ms | `ease-out` | 0 | 触发后不可打断 | reduced-motion 直接展示最终比例 |
| 13 | Toast 出现/消失 | Toast | `opacity 0→1`，`translateY(10px→0)` | 180ms | `ease-out` | 0 | 是（新消息替换） | reduced-motion 即时显示 |
| 14 | 滚动进入新区块 | 移动端 Tab 高亮 | 即时状态切换（不做位移动画） | 0ms | — | — | — | 始终可用 |

所有需要动画的属性仅使用 `transform` 与 `opacity`；阴影增强通过独立阴影层的 `opacity` 实现，避免触发布局/绘制抖动。

## 6. 交互与安全

- 认证徽章：点击 / hover / focus 显示“已通过学生认证”，只说明认证状态，不展示学号、学院内部信息或时间。
- 卡片隐私入口：打开“隐私设置”sheet；开关写入 `localStorage`（仅演示）。
- 卡片举报入口：打开举报 sheet，含举报原因、补充说明、成功态；不会写后端。
- 聊天页：头部增加盾牌按钮，打开“聊天隐私与安全”弹层，可从弹层直接进入现有举报流程。
- 搜索 / 标签筛选：搜索匹配昵称、专业、简介、兴趣；多选兴趣按“命中任意一个”过滤；无结果展示空状态插画与重置按钮。
- 焦点管理：sheet 打开时锁定滚动、聚焦面板、Tab 循环、Esc 关闭、关闭后恢复原焦点。
- 移动端底部 Tab 使用 `safe-area-inset-bottom`；内容区预留底部空间，避免被固定栏遮挡。

## 7. 性能与验证

- 首屏不加载位图：主视觉为用户卡 + SVG 插画 + 手绘头像；安全区两张照片使用 `next/image` + `loading="lazy"`。
- 首页路由 First Load JS：约 180 kB（包含 Framer Motion）；未引入 Three.js 或重型动画库。
- `prefers-reduced-motion: reduce` 下已验证：浮动标签与在线点 `animationName` 均为 `none`。
- 320 / 375 / 390 / 414 / 768 / 1024 px 验证 `scrollWidth === innerWidth`，无页面级横向溢出。
- `tsc --noEmit`、`eslint .`、`next build` 均通过。

## 8. 数据接入（2026-10-24）

首页不再是纯静态演示，`/` 现在是服务端组件，按会话状态选择数据源：

| 访问者 | 数据源 | 卡片行为 |
| --- | --- | --- |
| 未登录 | `src/lib/landing-data.ts` 的示例卡片 | 顶部/卡片按钮跳转注册；发现区底部标注「演示内容」 |
| 已登录、资料未完善 | 同上 | 关注按钮跳转 `/profile` 引导完善资料 |
| 已登录、已进入匹配池 | `getLandingData()` → 同校匹配池实时推荐（最多 6 人） | 关注 / 打招呼 / 举报全部调用真实接口 |

实现要点：

- **只读复用匹配算法**：`getRecommendations(user, { record: false })` 复用同校、性别偏好、非好友、互不拉黑等硬过滤与可解释评分，但不写 `match_recommendations` 快照，避免营销页访问污染复盘数据。
- **真实字段映射**：昵称、年级、院系、简介、爱好、匹配分来自 `users` / 评分结果；`toLandingStudent()` 负责降级（空简介、空爱好、空院系都有兜底）。
- **不伪造在线状态**：本期没有在线信号，实时卡片不展示「在线 / 最近活跃」，`OnlineStatus` 在 `online === null` 时直接不渲染；示例卡片保留在线点用于设计演示。
- **头像策略**：真实用户有 `avatarUrl` 时显示上传头像；没有时用昵称首字渐变头像，避免随机插画与真实性别不符；示例卡片继续使用 6 个手绘头像。
- **动作接入**：
  - 关注 → `POST /api/follow`（`targetUserId` + `action: "follow"`），成功后卡片与服务端状态同步；若对方已回关，提示可以直接聊天。
  - 打招呼 → 已互关时 `POST /api/conversations/open` 并跳转 `/chat/{id}`；未互关时明确提示「先关注 / 等对方回关」。
  - 举报 → `POST /api/report`（`targetUserId` + 映射后的 `harassment | fake_identity | inappropriate | other`），提交中禁用按钮，失败在弹层内展示错误。
- **明确的演示边界**：游客与未完善资料用户看到的示例卡片，举报仍只在本机完成；隐私开关仍只写入 `localStorage`，文案已注明「仅保存在当前浏览器」。

验证：`tests/domain.test.ts` 覆盖卡片映射与降级；`tests/services.test.ts` 覆盖实时/示例两种模式、好友与拉黑过滤、只读不写快照；`pnpm verify:e2e` 增加游客与登录用户的首页断言；真实 Chrome 无头测试跑通「登录 → 首页实时卡片 → 关注 → 举报提交 → 退出 → 游客示例 → 点击关注跳注册」。
