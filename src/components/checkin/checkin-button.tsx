"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Check, Flame } from "lucide-react";
import { Spinner } from "@/components/ui";
import { cn } from "@/lib/cn";

const CONFETTI = ["#FDA4AF", "#FDBA74", "#A5B4FC", "#6EE7B7", "#F9A8D4", "#C4B5FD"];

function Burst() {
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-20 overflow-visible"
    >
      {CONFETTI.map((color, index) => {
        const angle = (index / CONFETTI.length) * Math.PI * 2;
        const distance = 22 + (index % 3) * 7;
        return (
          <motion.span
            key={color}
            initial={{ x: 0, y: 0, opacity: 1, scale: 1, rotate: 0 }}
            animate={{
              x: Math.cos(angle) * distance,
              y: Math.sin(angle) * distance - 6,
              opacity: 0,
              scale: 0.4,
              rotate: 180,
            }}
            transition={{ duration: 0.65, ease: "easeOut", delay: index * 0.015 }}
            className="absolute top-1/2 left-1/2 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-[1px]"
            style={{ backgroundColor: color }}
          />
        );
      })}
    </span>
  );
}

export function CheckinButton({
  checked,
  busy,
  celebrate,
  onCheckin,
  label,
}: {
  checked: boolean;
  busy: boolean;
  celebrate: boolean;
  onCheckin: () => void;
  label: string;
}) {
  const reduce = useReducedMotion();

  return (
    <div className="relative">
      <button
        type="button"
        onClick={onCheckin}
        disabled={checked || busy}
        aria-label={checked ? `${label}，今日已打卡` : `与${label}打卡`}
        className={cn(
          "relative inline-flex h-10 items-center justify-center gap-1.5 overflow-hidden rounded-full px-4 text-[12.5px] font-medium transition-all duration-200 active:scale-[0.97]",
          checked
            ? "bg-emerald-50 text-emerald-600"
            : "bg-gradient-to-r from-rose-400 via-orange-400 to-indigo-500 text-white shadow-lg shadow-rose-500/20 hover:-translate-y-px hover:shadow-xl",
          busy && "opacity-80",
        )}
      >
        {!checked ? (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 animate-[shimmer-sweep_2.6s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/35 to-transparent"
          />
        ) : null}
        <span className="relative z-10 inline-flex items-center gap-1.5">
          {busy ? (
            <Spinner className="size-4" />
          ) : checked ? (
            <Check size={15} strokeWidth={2} aria-hidden="true" />
          ) : (
            <Flame size={15} strokeWidth={1.5} aria-hidden="true" />
          )}
          {busy ? "打卡中" : checked ? "今日已打卡" : "打卡"}
        </span>
      </button>
      {celebrate && !reduce ? <Burst /> : null}
    </div>
  );
}
