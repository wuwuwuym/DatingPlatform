# 校园圈内容流 · 视觉重构说明

对应页面：`/circle`  
实现栈：React 19 + Next.js App Router + Tailwind CSS v4 + Framer Motion + lucide-react  
预览图：[桌面端](./circle-desktop.png) · [移动端](./circle-mobile.png)

## 1. 范围

这次只迁移 `/circle`，不改其他页面的全局 token：

- 通过 `AppShell` 的 `usePathname()` 判断，给 `/circle` 外层加 `.circle-v2`。
- 所有颜色、圆角、阴影、背景在 `.circle-v2` 作用域内覆盖，其他页面继续使用原 token。
- 业务逻辑、接口、审核规则、权限完全保持不变。

## 2. 设计 Token

| 语义 | 值 | 用途 |
| --- | --- | --- |
| 页面背景 | `#F8F9FA` | 全局冷灰底 |
| 卡片 | `#FFFFFF` | 内容流、发布器、页头 |
| 主色 | `Indigo-500 #6366F1` | 主按钮、选中态、关注、链接 |
| 主色深 | `#4F46E5` | hover |
| 主色浅 | `#EEF2FF` | 图标底、浅标签 |
| 强调色 | `Rose-300 #FDA4AF` | 点赞心形、柔和强调 |
| 强调文字 | `Rose-600 #E11D48` | 已关注、点赞数字（保证对比度） |
| 标题 | `Slate-800 #1E293B` | 页面标题、作者名 |
| 正文 | `Slate-600 #475569` | 动态正文、说明 |
| 次要 | `Slate-500 #64748B` | 时间、计数、辅助文字 |
| 卡片圆角 | `16px` | `rounded-2xl`；页头用 24px 作为层级区分 |
| 卡片阴影 | `0 8px 30px rgb(15 23 42 / .06)` + `0 1px 2px rgb(15 23 42 / .03)` | 弥散阴影 |
| 发布器 | 浅色渐变 + `backdrop-blur(18px)` | 磨砂玻璃质感 |
| 头像 | 圆形 + 1px `slate-200` 细边 | 顶部头像带 12px 在线绿点 |
| 图标 | lucide，`strokeWidth={1.5}` | 统一细线 |

**两处有意偏离规范**：

1. 卡片阴影从 `0 8px 30px rgb(0 0 0 / .04)` 略加深到 `.06`，否则在 `#F8F9FA` 上几乎看不见卡片边界；仍是无边框弥散阴影。
2. 小字号次要文字使用 `slate-500` 而非 `slate-400`，并把玫瑰色文字加深到 `rose-600`；`slate-400` / `rose-300` 保留给图标、填充和装饰。这样 10–12px 文本仍满足 4.5:1 对比度。

## 3. 页面结构

| 区块 | 处理 |
| --- | --- |
| 顶栏 | 保留品牌与学校信息；右上角头像改为 40px 圆形 + 细边 + 右下角 12px 在线绿点 |
| 页头卡片 | 白底 24px 圆角、径向渐变光斑、点阵纹理、`仅同校可见 / 友善互动 / 记录日常` 三个浅色标签 |
| 发布器 | 浅白→靛蓝→玫瑰的极浅渐变 + 18px 磨砂背景；输入聚焦白底 + 靛蓝发光；44px 圆形附件按钮；盾牌图标提示 |
| 分段筛选 | 白色胶囊容器；选中项 Indigo 实心、未选中 slate-500 |
| 动态列表 | 白卡、16px（rounded-2xl）圆角、无边框、弥散阴影；40px 圆形作者头像 + 细边；MBTI/院系改为浅色胶囊；正文 14px/28px；图片 12px 圆角可放大；点赞 Rose + spring 弹动、评论 Indigo |
| 评论面板 | `slate-50` 内嵌面板；输入框无边框；发送按钮 44px Indigo 圆形 |
| 底部导航 | 移动端全宽白条 + 上浮阴影；≥768px 变为居中的 616px 悬浮胶囊 |

桌面端内容宽 680px（内宽 616px），移动端 18px 边距；390px 下无横向溢出。

## 4. 动效

| 场景 | 实现 |
| --- | --- |
| 页头 / 发布器 / 筛选 / 动态 | `initial={{ opacity: 0, y: 15 }}` → `animate={{ opacity: 1, y: 0 }}`，500ms ease-out |
| 动态列表错峰 | 每条延迟 `0.14 + min(index, 6) × 0.05s` |
| 卡片 hover | `translateY(-1px)` + 阴影加深（`@media (hover: hover)`） |
| 主按钮 hover | `translateY(-1px)` + Indigo 阴影加深 |
| 主按钮 / 点赞 / 评论 tap | `scale(0.97)` / `0.95` 回弹 |
| 点赞 hover | 心形 `scale(1.18)` + `rotate(-6°)`，spring `stiffness: 480 / damping: 14`；已赞状态保持 `1.08` |
| 输入聚焦 | 背景变白 + `0 0 0 4px rgba(99,102,241,.12)` 外发光 + `inset 0 0 0 1.5px rgba(99,102,241,.55)` |
| 图片 hover | 轻微 `scale(1.02)` |
| 减少动态 | `useReducedMotion()` 取消入场位移；CSS 关闭 hover/active 位移 |

## 5. 无障碍

- 主要互动按钮高度统一到 44px（点赞、评论、删除、举报、发布、评论发送、图片/视频附件）；关注按钮视觉高度 28px，通过 `after` 伪元素扩展到 44px 触控区。
- 点赞有 `aria-pressed` + `aria-label`（点赞/取消点赞）；评论有 `aria-expanded` + `aria-label`（查看/收起评论）。
- 页头标签、装饰光斑、点阵全部 `aria-hidden`。
- 输入框保留可见 `aria-label`；图片按钮 `aria-label="查看大图"`。
- 全局 `:focus-visible` 轮廓保留；卡片内按钮有明确的 hover / focus 反馈。
- 图片保持 `loading="lazy"`；卡片高度由内容决定，避免 CLS。

## 6. 工程实现

- `.circle-v2` 内覆盖 `--color-*` / `--radius-*` / `--shadow-*`；Tailwind 的 `bg-*`、`text-*`、`rounded-*`、`shadow-*` 自动跟随。
- `.card`、`.field-input` 在作用域内改为无边框；`.circle-btn`、`.circle-card-lift` 提供统一 hover/tap。
- 新增 `CircleAvatar`：圆形裁剪 + `ring-1 ring-slate-200` 细边；顶部用户头像额外渲染 12px Emerald 在线点，并由链接的 `aria-label` 说明“在线”。
- 发布器使用 `.circle-composer`：极浅三色渐变 + `backdrop-filter: blur(18px)` + 内高光，兼顾磨砂质感和文字对比度。
- 动态元信息从 `INFJ · 中文系 · 时间` 改为 MBTI / 院系浅色胶囊 + 时间文本；点赞按钮用 Framer Motion `motion.span` 包裹心形，hover 时变 Rose-500 并 spring 弹动。
- `body:has(.circle-v2)` 同步页面底色，避免滚动到边缘时露出原奶油底。
- 页头光斑原使用 `blur-2xl` + `overflow-hidden`，在 Chrome 合成层边缘出现黄色彩边（靛蓝补色）；改为 **径向渐变**，去掉 filter 图层后消除。
- 禁用态发布按钮不再带彩色阴影；可发布时才出现 sRGB 阴影，避免 `oklab` 阴影 + opacity 在 Chrome 下的黄色伪影。
- 登录/接口逻辑未改；`/api/posts`、点赞、评论、关注、举报仍走原服务层。

## 7. 验证

```bash
pnpm typecheck   # 通过
pnpm lint        # 0 error
pnpm test        # 76 passed
pnpm build       # 通过；/circle 9.46 kB，First Load JS 162 kB
```

Chrome headless + CDP 实测：

- 桌面 1440：内容 616px，卡片 `border-width: 0`、`border-radius: 16px`、阴影 `.06`，页面底色 `rgb(248,249,250)`；底部导航与卡片同宽对齐（x=412）。
- 移动 390：`scrollWidth === innerWidth === 390`；首条动态的互动行底部 776.75px，导航顶部 782.5px，首屏可见。
- 发布器：计算样式为三色 linear-gradient，`backdrop-filter: blur(18px)`。
- 在线头像：右上角 12px Emerald 圆点；作者/评论头像为圆形 + 1px 细边。
- 元信息：MBTI 为 Indigo 浅胶囊，院系为 Rose 浅胶囊，时间保留次要文本。
- 输入聚焦：真实点击后背景 `rgb(255,255,255)`，外发光 `4px rgba(99,102,241,.12)`，内描边 `1.5px rgba(99,102,241,.55)`。
- 点赞 hover：图标变 Rose-500，Framer Motion 实际变换矩阵约 `scale(1.17) rotate(-6°)`；点击后 `aria-pressed` 从 `false` 变 `true`。
- 评论：展开后面板、输入框、发送按钮正常渲染。
- 发布：输入正文后按钮由禁用变可用，出现 Indigo 柔和阴影。
- 页头 / 发布器 / 筛选 / 动态均按 15px 位移入场，无控制台异常。
