"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass, Flame, Globe2, MessageCircle, User, Users } from "lucide-react";
import type { ReactNode } from "react";
import { Avatar, cn } from "./ui";

const NAV = [
  { href: "/match", label: "发现", icon: Compass },
  { href: "/circle", label: "校园圈", icon: Globe2 },
  { href: "/friends", label: "好友", icon: Users },
  { href: "/chat", label: "消息", icon: MessageCircle },
  { href: "/checkin", label: "打卡", icon: Flame },
  { href: "/me", label: "我的", icon: User },
];

export function AppShell({
  children,
  nickname,
  avatarUrl,
  schoolName,
  status,
}: {
  children: ReactNode;
  nickname: string;
  avatarUrl: string | null;
  schoolName: string;
  status: string;
}) {
  const pathname = usePathname();

  return (
    <div className="shell pb-28">
      <header className="flex items-center justify-between pt-6 pb-5">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-muted">
            campus sync
          </p>
          <p className="mt-1 text-[13px] font-medium text-ink-soft">{schoolName}</p>
        </div>
        <Link href="/me" className="flex items-center gap-2">
          {status === "incomplete" ? (
            <span className="rounded-full bg-accent-soft px-2.5 py-1 text-[11px] font-medium text-accent">
              待完善资料
            </span>
          ) : null}
          <Avatar name={nickname || "我"} src={avatarUrl} size={38} />
        </Link>
      </header>

      <main className="animate-rise">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[460px] items-center justify-between px-4 pt-2.5 pb-[calc(10px+env(safe-area-inset-bottom))]">
          {NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} className={cn("nav-item")} data-active={active}>
                <Icon size={21} strokeWidth={active ? 2.4 : 1.8} />
                <span className={active ? "font-medium" : undefined}>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
