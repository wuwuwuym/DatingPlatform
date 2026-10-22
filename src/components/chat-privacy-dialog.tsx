"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Flag, LockKeyhole, ShieldCheck, X } from "lucide-react";
import { useEffect, useRef } from "react";

export function ChatPrivacyDialog({
  open,
  onClose,
  onReport,
}: {
  open: boolean;
  onClose: () => void;
  onReport: () => void;
}) {
  const reduce = useReducedMotion();
  const closeRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onCloseRef.current();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
      previous?.focus();
    };
  }, [open]);

  return (
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center px-4 pb-4 sm:items-center">
          <motion.div
            initial={reduce ? false : { opacity: 0 }}
            animate={reduce ? undefined : { opacity: 1 }}
            exit={reduce ? undefined : { opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            onClick={onClose}
            className="absolute inset-0 bg-ink/45 backdrop-blur-sm"
            aria-hidden="true"
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="聊天隐私与安全"
            initial={reduce ? false : { opacity: 0, y: 20 }}
            animate={reduce ? undefined : { opacity: 1, y: 0 }}
            exit={reduce ? undefined : { opacity: 0, y: 14 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="relative w-full max-w-[430px] rounded-panel border border-line bg-paper p-5 shadow-float"
          >
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              aria-label="关闭"
              className="absolute top-4 right-4 grid size-10 place-items-center rounded-full bg-surface-soft text-ink-soft"
            >
              <X size={17} aria-hidden="true" />
            </button>

            <span className="grid size-11 place-items-center rounded-full bg-mint-soft text-mint-deep">
              <ShieldCheck size={21} aria-hidden="true" />
            </span>
            <h2 className="mt-4 pr-10 text-[20px] font-bold tracking-[-0.035em] text-ink">
              聊天隐私与安全
            </h2>
            <p className="mt-2 text-[11.5px] leading-5 text-muted">
              这段会话只对你们双方可见。你的学号、宿舍和精确位置不会展示给对方。
            </p>

            <div className="mt-4 space-y-2.5">
              <div className="flex items-start gap-2.5 rounded-2xl bg-surface p-3">
                <LockKeyhole size={15} className="mt-0.5 shrink-0 text-brand" aria-hidden="true" />
                <p className="text-[10.5px] leading-5 text-ink-soft">
                  互相关注成为好友后才会开启会话；解除好友关系后会话关闭。
                </p>
              </div>
              <div className="flex items-start gap-2.5 rounded-2xl bg-surface p-3">
                <ShieldCheck size={15} className="mt-0.5 shrink-0 text-mint-deep" aria-hidden="true" />
                <p className="text-[10.5px] leading-5 text-ink-soft">
                  消息会经过敏感词拦截；聊天内容不会用于推荐或广告。
                </p>
              </div>
              <div className="flex items-start gap-2.5 rounded-2xl bg-surface p-3">
                <Flag size={15} className="mt-0.5 shrink-0 text-coral-deep" aria-hidden="true" />
                <p className="text-[10.5px] leading-5 text-ink-soft">
                  举报仅管理员可见，不会通知对方。遇到不适请立即停止对话。
                </p>
              </div>
            </div>

            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="inline-flex min-h-11 flex-1 items-center justify-center rounded-full border border-line bg-surface px-4 py-2.5 text-[11.5px] font-medium text-ink-soft"
              >
                关闭
              </button>
              <button
                type="button"
                onClick={onReport}
                className="inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-full bg-coral-deep px-4 py-2.5 text-[11.5px] font-semibold text-white"
              >
                <Flag size={13} aria-hidden="true" />
                举报此对话
              </button>
            </div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
