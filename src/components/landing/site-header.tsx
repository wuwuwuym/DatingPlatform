import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

const NAV_LINKS = [
  { href: "#discover", label: "发现" },
  { href: "#interests", label: "兴趣" },
  { href: "#safety", label: "安全" },
];

export function SiteHeader({
  signedIn,
  destination,
}: {
  signedIn: boolean;
  destination: string;
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-canvas/85 backdrop-blur-xl">
      <div className="landing-shell flex h-16 items-center justify-between gap-4">
        <Link href="#top" className="flex items-center gap-2.5" aria-label="校园同频首页">
          <span className="relative grid size-9 place-items-center rounded-full bg-ink" aria-hidden="true">
            <span className="absolute left-2 size-3.5 rounded-full border-[1.5px] border-canvas" />
            <span className="absolute right-2 size-3.5 rounded-full border-[1.5px] border-coral" />
          </span>
          <span className="flex items-baseline gap-1.5">
            <span className="text-[17px] font-bold tracking-[-0.04em] text-ink">同频</span>
            <span className="text-[9px] font-medium tracking-[0.16em] text-muted uppercase">
              campus
            </span>
          </span>
        </Link>

        <nav aria-label="页面导航" className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="inline-flex min-h-11 items-center rounded-full px-4 py-2 text-[12.5px] font-medium text-ink-soft hover:bg-surface-soft"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href={signedIn ? "/me" : "/login"}
            className="hidden min-h-11 items-center rounded-full px-3 py-2 text-[12px] font-medium text-ink-soft sm:inline-flex"
          >
            {signedIn ? "我的" : "登录"}
          </Link>
          <Link
            href={destination}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-ink px-4 py-2.5 text-[12px] font-semibold text-canvas"
          >
            {signedIn ? "进入发现" : "开始匹配"}
            <ArrowUpRight size={14} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </header>
  );
}
