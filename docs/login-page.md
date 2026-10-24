# 校园同频 · 登录页视觉与交互说明

对应页面：`/login`（注册页 `/register` 复用同一套左右分屏与表单组件）  
实现栈：React 19 + Next.js App Router + Tailwind CSS v4 + Framer Motion + lucide-react  
预览图：[桌面端](./login-desktop.png) · [移动端](./login-mobile.png)

## 1. 设计目标

登录页从「后台系统表单」改为「校园产品入口」：左侧负责品牌与情绪，右侧只负责一件事——让用户安心地完成身份核验。

- **清爽**：奶油白到极浅靛蓝的柔和渐变，不使用高饱和撞色。
- **有亲和力**：大号「欢迎回来」、口语化副标题、圆角无边框输入框。
- **青春但克制**：三个缓慢漂浮的几何图形，幅度 10px、周期 4.6–6s，不做弹跳或炫光。
- **可信**：盾牌图标 +「学号仅用于校内身份核验」的隐私说明，真实接口，不做假登录。

## 2. 布局

| 区域 | 桌面端（≥1024px） | 移动端（<1024px） |
| --- | --- | --- |
| 左侧品牌区 | 60%（`3fr`），`hidden lg:flex` | 隐藏 |
| 右侧表单区 | 40%（`2fr`），纯白底，垂直居中 | 100%，顶部保留小号品牌标 |
| 左侧内容 | 徽标 + 大号 Logo「同频 CAMPUS」+ Slogan + 三项信任点 | — |
| 右侧内容 | 标题、隐私说明、学校/学号/密码、主按钮、去注册 | 同左，输入框全宽 |

- 桌面端使用 `lg:grid lg:grid-cols-[3fr_2fr]`，整页 `h-dvh`，左右各自不产生横向滚动。
- 右侧是独立滚动列：注册页表单较长时在列内滚动，左侧品牌区保持满屏。
- 移动端在表单上方显示 36px 品牌标（点击回首页），并隐藏左侧插画，避免首屏被装饰挤压。

## 3. 视觉细节

### 左侧品牌区

```text
背景：linear-gradient(155deg, #FFFDF8 0%, #FAF5EA 45%, #EDF0FC 100%)
光斑：brand/10 + coral/10，blur 120–130px
点阵：26px 间距，径向遮罩淡出，避免死板网格
```

- 三个 Framer Motion 浮动元素：毕业帽玻璃卡片、珊瑚描边圆环、薄荷小圆点。
- 所有装饰层 `aria-hidden`，不进入读屏顺序。
- 品牌标沿用深灰圆底 + 双环图形，与站内其他页面保持同一识别。
- 底部版权与「仅限校内使用」居中，避开 Next.js 开发指示器。

### 右侧表单

| 元素 | 规格 |
| --- | --- |
| 标题 | 32px / 34px，`font-bold`，`tracking-[-0.03em]`，`text-slate-900` |
| 副标题 | 13px / 行高 24px，`text-slate-500` |
| 隐私说明 | 12px，`bg-brand-soft/70`，圆角 12px，`ShieldCheck` 图标 |
| 输入框 | 高 48px，`#F3F4F6` 无边框，12px 圆角，左侧 18px 图标 |
| Focus | 背景变白 + `inset 1.5px rgba(91,108,255,.5)` + 4px `brand/10` 外晕，200ms |
| 主按钮 | 48px 胶囊，`bg-brand`，`shadow-lg shadow-brand/25`，hover 加深到 `/35` |
| 错误条 | `#FEF2F2` 底、`#B4442A` 字，`role="alert"`，AnimatePresence 进出 |
| 去注册 | 右下角，`text-brand`，hover 变 `brand-deep`，下划线 `scale-x` 0→1 |

图标：学校 `GraduationCap`、学号 `User`、密码 `Lock`、隐私 `ShieldCheck`、显示密码 `Eye/EyeOff`、错误 `CircleAlert`、加载 `LoaderCircle`。

## 4. 动效清单

| 场景 | 实现 | 参数 |
| --- | --- | --- |
| 表单进入 | `motion.div` opacity 0→1、y 15→0 | 500ms，`easeOut` |
| 左侧图形浮动 | `animate={{ y: [0, -10, 0] }}` | 5.4s / 6s / 4.6s，无限循环，延迟 0 / 1.1s / 0.6s |
| 输入框聚焦 | `transition-all duration-200` + `focus-within` 阴影 | 200ms |
| 按钮 hover | `whileHover={{ y: -2 }}`，阴影加深 | spring 420/26 |
| 按钮按压 | `whileTap={{ scale: 0.97 }}` | spring 420/26 |
| 去注册 hover | 颜色过渡 + 下划线 `scale-x-0 → 100` | 200ms / 300ms |
| 错误提示 | opacity + y -4→0 | 200ms，`easeOut` |

`useReducedMotion()` 为真时：取消入场位移与浮动动画，保留即时可见的表单；全局 `prefers-reduced-motion` 规则同时关闭过渡。

## 5. 无障碍与可用性

- 每个输入都有可见 `<label>`（非 placeholder-only），`htmlFor` 与 `id` 对应。
- 输入框高 48px，密码显隐按钮 44×44px，主按钮 48px，满足触控目标。
- 密码显隐使用 `aria-label` + `aria-pressed`；提交按钮 `aria-busy`。
- 错误信息 `role="alert"`，不依赖颜色单独传达（同时有图标与文本）。
- 文字对比：正文 `slate-500` 起，辅助提示不再使用 `slate-400`；占位符同步加深。
- 键盘：全局 `:focus-visible` 轮廓保留；输入框聚焦态同时改变背景、图标色与内描边。
- 表单使用原生 `required`，提交前浏览器先做必填校验。

## 6. 行为与数据

- 学校列表来自 `GET /api/auth/schools`；加载中下拉禁用并显示「加载中…」。
- 登录调用 `POST /api/auth/login`，成功后按 `status` 跳转 `/match` 或 `/profile`。
- 登录/注册成功后使用 `window.location.assign()` 做整页跳转：登录是会话边界，整页导航确保新的 httpOnly 会话 Cookie 一定被服务端树读取，也避免 App Router 客户端缓存在 `replace + refresh` 时反复刷新、导航不提交。
- 注册页复用 `AuthField / AuthInput / AuthSelect / AuthSubmit / AuthError / AuthSwitch`，保证两个入口视觉一致。
- **演示账号属于「星海大学」**：`20210001`–`20210008`，密码 `<REDACTED>`。登录时学校下拉需选择星海大学，否则会返回「学号或密码不正确」。

## 7. 文件

```text
src/app/(auth)/layout.tsx              # 左右分屏 + 移动端品牌标 + 移动端页脚
src/components/auth/
├─ auth-brand-panel.tsx                # 左侧渐变、浮动几何、Logo/Slogan
├─ brand-mark.tsx                      # 品牌标（sm / lg，服务端安全）
├─ auth-ui.tsx                         # 输入框/下拉/错误/按钮/切换链接
├─ login-form.tsx                      # 登录表单与跳转
└─ register-form.tsx                   # 注册表单（复用同一套控件）
src/lib/cn.ts                          # 从客户端 ui.tsx 抽出的类名工具，服务端可用
docs/login-desktop.png
docs/login-mobile.png
```

## 8. 验证

```bash
pnpm typecheck   # 通过
pnpm lint        # 0 error
pnpm test        # 76 passed
pnpm build       # 通过
```

浏览器（Chrome headless + CDP，1440×950 / 390×844）实测：

- 输入框聚焦：背景 `rgb(255,255,255)`，内描边 `rgba(91,108,255,.5)`，外晕 4px，图标转品牌色。
- 按钮 hover：`matrix(1,0,0,1,0,-2)`，阴影由 25% 加深到 35%。
- 去注册 hover：颜色变为 `rgb(64,80,224)`，下划线 `scale` 从 0 到 1。
- 三个装饰元素在 1.8s 内均产生不同相位的 `translateY`。
- 错误密码：显示「学号或密码不正确」，停留在 `/login`。
- 正确账号 + 星海大学：`POST /api/auth/login 200`，跳转 `/match`。
- 移动端 390px：`scrollWidth === innerWidth === 390`，无横向溢出。
