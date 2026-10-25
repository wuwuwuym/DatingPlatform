"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass, Flame, Globe2, MessageCircle, User, Users } from "lucide-react";
import type { ReactNode } from "react";
import { CircleAvatar } from "@/components/avatar-ring";
import { MessageNotifier } from "@/components/message-notifier";
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
  const circle = pathname === "/circle" || pathname.startsWith("/circle/");
  const match = pathname === "/match" || pathname.startsWith("/match/");
  const checkin = pathname === "/checkin" || pathname.startsWith("/checkin/");
  const chat = pathname === "/chat" || pathname.startsWith("/chat/");

  return (
    <div
      className={cn(
        circle && "circle-v2",
        match && "match-v2",
        checkin && "checkin-v2",
        chat && "chat-v2",
      )}
    >
      <MessageNotifier />
      <div className={cn("shell pb-28", circle && "md:max-w-[680px] md:px-8")}>
        <header className="flex items-center justify-between pt-6 pb-5">
          <div className="flex items-center gap-2.5">
            <span className="relative grid size-8 place-items-center rounded-full bg-ink" aria-hidden="true">
              <span className="absolute left-1.5 size-3 rounded-full border-[1.5px] border-canvas" />
              <span className="absolute right-1.5 size-3 rounded-full border-[1.5px] border-coral" />
            </span>
            <div>
              <p className="text-[9px] font-medium uppercase tracking-[0.2em] text-muted">同频 campus</p>
              <p className="mt-0.5 text-[13px] font-medium text-ink-soft">{schoolName}</p>
            </div>
          </div>
          <Link
            href="/me"
            aria-label={circle ? "我的主页，在线" : "我的主页"}
            className="flex items-center gap-2"
          >
            {status === "incomplete" ? (
              <span className="rounded-full bg-accent-soft px-2.5 py-1 text-[11px] font-medium text-accent">
                待完善资料
              </span>
            ) : null}
            {circle ? (
              <CircleAvatar
                name={nickname || "我"}
                src={avatarUrl}
                size={40}
                online
                className="shadow-sm"
              />
            ) : (
              <Avatar name={nickname || "我"} src={avatarUrl} size={38} />
            )}
          </Link>
        </header>

        <main className={cn(!circle && !match && !chat && "animate-rise")}>{children}</main>

        <nav className={cn("fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface/85 backdrop-blur-xl", circle && "circle-nav")}>
          <div
            className={cn(
              "mx-auto flex items-center justify-between px-4 pt-2.5 pb-[calc(10px+env(safe-area-inset-bottom))]",
              circle ? "max-w-[680px]" : "max-w-[460px]",
            )}
          >
            {NAV.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              const Icon = item.icon;
              return (
                <Link key={item.href} href={item.href} className={cn("nav-item")} data-active={active}>
                  <Icon size={21} strokeWidth={active ? 2 : 1.5} />
                  <span className={active ? "font-medium" : undefined}>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}
