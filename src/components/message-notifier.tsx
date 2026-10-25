"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { MessageCircle, X } from "lucide-react";
import { CircleAvatar } from "@/components/avatar-ring";
import { cn } from "@/lib/cn";
import { formatClock } from "@/lib/format";
import type { ChatNotification } from "@/lib/types";

function enqueue(
  current: ChatNotification[],
  next: ChatNotification,
): ChatNotification[] {
  if (current.length === 0) return [next];

  // Keep one toast per conversation: a burst from the same sender updates the
  // visible card instead of queueing five near-identical popups.
  if (current[0]!.conversationId === next.conversationId) {
    return [next, ...current.slice(1)];
  }
  const queued = current.findIndex(
    (item, index) => index > 0 && item.conversationId === next.conversationId,
  );
  if (queued > 0) {
    const copy = [...current];
    copy[queued] = next;
    return copy;
  }
  return [...current, next];
}

export function MessageNotifier() {
  const pathname = usePathname();
  const reduce = useReducedMotion();
  const [queue, setQueue] = useState<ChatNotification[]>([]);
  const [paused, setPaused] = useState(false);
  const seen = useRef<Set<string>>(new Set());
  const pathRef = useRef(pathname);
  pathRef.current = pathname;

  const visible = queue[0] ?? null;
  const inChatRoom = pathname.startsWith("/chat/");

  useEffect(() => {
    const after = new Date().toISOString();
    const source = new EventSource(
      `/api/messages/stream?after=${encodeURIComponent(after)}`,
    );

    source.onmessage = (event) => {
      try {
        const notification = JSON.parse(event.data) as ChatNotification;
        if (!notification.message?.id) return;
        if (seen.current.has(notification.message.id)) return;
        seen.current.add(notification.message.id);

        // The open conversation already renders the message; a toast would
        // duplicate it. Still mark it as seen so it never fires later.
        if (pathRef.current === `/chat/${notification.conversationId}`) return;
        setQueue((current) => enqueue(current, notification));
      } catch {
        // Ignore malformed frames; EventSource keeps the stream alive.
      }
    };

    return () => source.close();
  }, []);

  useEffect(() => {
    if (!visible || paused) return;
    const timer = setTimeout(() => {
      setQueue((current) => current.slice(1));
    }, 5_000);
    return () => clearTimeout(timer);
  }, [visible, paused]);

  function dismiss(id: string) {
    setQueue((current) => current.filter((item) => item.message.id !== id));
  }

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className={cn(
        "pointer-events-none fixed inset-x-0 z-50 flex justify-center px-4",
        inChatRoom
          ? "bottom-[calc(164px+env(safe-area-inset-bottom))]"
          : "bottom-[calc(88px+env(safe-area-inset-bottom))]",
      )}
    >
      <AnimatePresence initial={false} mode="wait">
        {visible ? (
          <motion.div
            key={visible.message.id}
            initial={reduce ? false : { opacity: 0, y: 16, scale: 0.97 }}
            animate={reduce ? undefined : { opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? undefined : { opacity: 0, y: 8, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 420, damping: 32, mass: 0.8 }}
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
            onFocusCapture={() => setPaused(true)}
            onBlurCapture={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                setPaused(false);
              }
            }}
            className="pointer-events-auto relative w-full max-w-[420px] overflow-hidden rounded-2xl border border-white/80 bg-white/95 shadow-[0_18px_45px_-18px_rgba(15,23,42,0.28)] backdrop-blur-xl"
          >
            <div className="flex items-center gap-2 p-3 pr-2">
              <Link
                href={`/chat/${visible.conversationId}`}
                onClick={() => dismiss(visible.message.id)}
                aria-label={`查看 ${visible.partner.nickname} 的新消息`}
                className="flex min-w-0 flex-1 items-center gap-3 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/60"
              >
                <span className="relative shrink-0">
                  <CircleAvatar
                    name={visible.partner.nickname}
                    src={visible.partner.avatarUrl}
                    size={40}
                  />
                  <span
                    className="absolute -right-1 -bottom-1 grid size-4 place-items-center rounded-full bg-indigo-500 text-white ring-2 ring-white"
                    aria-hidden="true"
                  >
                    <MessageCircle size={9} strokeWidth={2.3} />
                  </span>
                </span>

                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline gap-2">
                    <span className="truncate text-[13px] font-semibold text-slate-800">
                      {visible.partner.nickname}
                    </span>
                    <span className="shrink-0 text-[10px] font-medium text-indigo-500">
                      新消息
                    </span>
                    <span className="ml-auto shrink-0 text-[10px] text-slate-500">
                      {formatClock(visible.message.createdAt)}
                    </span>
                  </span>
                  <span className="mt-0.5 block truncate text-[12px] leading-5 text-slate-600">
                    {visible.message.content}
                  </span>
                </span>
              </Link>

              <button
                type="button"
                aria-label="关闭消息通知"
                onClick={() => dismiss(visible.message.id)}
                className="grid size-11 shrink-0 place-items-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 active:scale-95"
              >
                <X size={16} strokeWidth={1.5} />
              </button>
            </div>

            <span
              aria-hidden="true"
              className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-indigo-500 via-violet-500 to-rose-300"
            />
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
