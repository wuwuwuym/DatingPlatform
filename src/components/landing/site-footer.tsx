import { ArrowUp } from "lucide-react";

const FOOTER_GROUPS = [
  {
    title: "产品",
    links: [
      { label: "发现同学", href: "#discover" },
      { label: "兴趣匹配", href: "#interests" },
      { label: "安全与信任", href: "#safety" },
    ],
  },
  {
    title: "关于",
    links: [
      { label: "关于同频", href: "#top" },
      { label: "校园合作", href: "#safety" },
      { label: "加入我们", href: "#safety" },
    ],
  },
  {
    title: "帮助",
    links: [
      { label: "常见问题", href: "#safety" },
      { label: "隐私说明", href: "#safety" },
      { label: "举报指引", href: "#safety" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-paper pb-28 md:pb-0">
      <div className="landing-shell py-12 sm:py-14">
        <div className="grid gap-9 md:grid-cols-[1.3fr_repeat(3,0.7fr)] md:gap-10">
          <div className="md:col-span-1">
            <a href="#top" className="inline-flex items-center gap-2.5" aria-label="回到校园同频首页">
              <span className="relative grid size-9 place-items-center rounded-full bg-ink" aria-hidden="true">
                <span className="absolute left-2 size-3.5 rounded-full border-[1.5px] border-canvas" />
                <span className="absolute right-2 size-3.5 rounded-full border-[1.5px] border-coral" />
              </span>
              <span className="flex items-baseline gap-1.5">
                <span className="text-[16px] font-bold tracking-[-0.04em] text-ink">同频</span>
                <span className="text-[9px] font-medium tracking-[0.16em] text-muted uppercase">
                  campus
                </span>
              </span>
            </a>
            <p className="mt-4 max-w-[260px] text-pretty text-[12px] leading-5 text-ink-soft">
              让认识同学这件事，轻一点、真一点。只对同校开放，互关才可聊天。
            </p>
            <p className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-mint-soft px-2.5 py-1 text-[9.5px] font-medium text-mint-deep">
              <span className="size-1.5 rounded-full bg-mint" aria-hidden="true" />
              仅限在校学生
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4 md:contents">
            {FOOTER_GROUPS.map((group) => (
              <nav key={group.title} aria-label={group.title}>
                <p className="text-[10px] font-semibold tracking-[0.16em] text-muted uppercase">
                  {group.title}
                </p>
                <ul className="mt-4 space-y-2.5">
                  {group.links.map((link) => (
                    <li key={link.label}>
                      <a
                        href={link.href}
                        className="inline-flex min-h-11 items-center text-[12px] text-ink-soft hover:text-ink"
                      >
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[10px] leading-5 text-muted">
            © 2026 同频 Campus · 产品演示，页面人物与数据均为虚构。
          </p>
          <a
            href="#top"
            className="inline-flex min-h-11 items-center gap-1.5 self-start rounded-full border border-line bg-canvas px-3 py-1.5 text-[10.5px] font-medium text-ink-soft sm:self-auto"
          >
            回到顶部
            <ArrowUp size={12} aria-hidden="true" />
          </a>
        </div>
      </div>
    </footer>
  );
}
