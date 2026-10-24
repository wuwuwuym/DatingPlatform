"use client";

import { AnimatePresence, motion } from "framer-motion";
import { BadgeCheck, ShieldCheck } from "lucide-react";
import { useId, useState } from "react";
import { cn } from "@/components/ui";

export function OnlineStatus({
  online,
  className,
}: {
  online: boolean | null;
  className?: string;
}) {
  if (online === null) return null;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-[10.5px] font-medium",
        online ? "text-mint-deep" : "text-muted",
        className,
      )}
    >
      {online ? (
        <span className="online-dot" aria-hidden="true" />
      ) : (
        <span className="size-2 rounded-full bg-line-strong" aria-hidden="true" />
      )}
      {online ? "在线" : "最近活跃"}
    </span>
  );
}

export function VerifiedBadge({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const tooltipId = useId();

  return (
    <span className={cn("relative inline-flex", className)}>
      <button
        type="button"
        aria-label="学生认证状态"
        aria-describedby={open ? tooltipId : undefined}
        aria-expanded={open}
        onClick={(event) => {
          event.stopPropagation();
          setOpen((value) => !value);
        }}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        className="relative grid size-7 place-items-center rounded-full text-brand after:absolute after:-inset-2 after:content-['']"
      >
        <BadgeCheck size={16} strokeWidth={2.2} aria-hidden="true" />
      </button>

      <AnimatePresence initial={false}>
        {open ? (
          <span className="pointer-events-none absolute bottom-full left-1/2 z-30 -translate-x-1/2 pb-2.5">
            <motion.span
              id={tooltipId}
              role="tooltip"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.16, ease: "easeOut" }}
              className="flex items-center gap-1.5 whitespace-nowrap rounded-full bg-ink px-3 py-1.5 text-[10.5px] font-medium text-white shadow-float"
            >
              <ShieldCheck size={12} className="text-mint" aria-hidden="true" />
              已通过学生认证
            </motion.span>
          </span>
        ) : null}
      </AnimatePresence>
    </span>
  );
}
