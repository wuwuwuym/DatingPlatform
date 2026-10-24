"use client";

import { motion, useReducedMotion } from "framer-motion";
import { GraduationCap, ShieldCheck, Sparkles, Users } from "lucide-react";
import { BrandMark } from "./brand-mark";

const GRADIENT = "linear-gradient(155deg, #FFFDF8 0%, #FAF5EA 45%, #EDF0FC 100%)";

const DOTS = {
  backgroundImage: "radial-gradient(rgba(31, 41, 55, 0.09) 1px, transparent 1px)",
  backgroundSize: "26px 26px",
  maskImage: "radial-gradient(ellipse at 50% 45%, black 0%, transparent 72%)",
  WebkitMaskImage: "radial-gradient(ellipse at 50% 45%, black 0%, transparent 72%)",
} as const;

export function AuthBrandPanel() {
  const reduce = useReducedMotion();

  function float(delay: number, duration: number, distance = 10) {
    if (reduce) return undefined;
    return { y: [0, -distance, 0] };
  }

  return (
    <aside
      aria-label="同频 CAMPUS 品牌介绍"
      className="relative hidden min-h-dvh overflow-hidden border-r border-black/[0.04] lg:flex lg:flex-col"
      style={{ background: GRADIENT }}
    >
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute -left-28 top-1/3 size-[440px] rounded-full bg-brand/10 blur-[120px]" />
        <div className="absolute -right-24 -top-28 size-[400px] rounded-full bg-coral/10 blur-[130px]" />
        <div className="absolute inset-0" style={DOTS} />
      </div>

      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <motion.div
          className="absolute right-[7%] top-[13%]"
          animate={float(0, 5.4)}
          transition={{ duration: 5.4, repeat: Infinity, ease: "easeInOut", delay: 0 }}
        >
          <div className="grid size-24 -rotate-6 place-items-center rounded-[26px] border border-white/80 bg-white/60 shadow-[0_24px_60px_-30px_rgba(64,80,224,0.55)] backdrop-blur-md xl:size-28">
            <GraduationCap className="size-9 text-brand/70 xl:size-10" strokeWidth={1.4} />
          </div>
        </motion.div>

        <motion.div
          className="absolute left-[6%] bottom-[13%]"
          animate={float(1.1, 6, 8)}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1.1 }}
        >
          <div className="relative size-32 rounded-full border border-coral/40 xl:size-36">
            <span className="absolute -right-1 top-1/2 size-2.5 -translate-y-1/2 rounded-full bg-coral/60" />
            <span className="absolute left-1/2 -top-1 size-1.5 -translate-x-1/2 rounded-full bg-coral/40" />
          </div>
        </motion.div>

        <motion.div
          className="absolute left-[13%] top-[27%]"
          animate={float(0.6, 4.6, 10)}
          transition={{ duration: 4.6, repeat: Infinity, ease: "easeInOut", delay: 0.6 }}
        >
          <span className="block size-3 rounded-full bg-mint/80 shadow-[0_0_0_9px_rgba(123,201,166,0.14)]" />
        </motion.div>

        <Sparkles
          className="absolute right-[15%] bottom-[29%] size-6 text-brand/25"
          strokeWidth={1.4}
        />
      </div>

      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-10 py-16 text-center">
        <span className="mb-9 inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/55 px-3.5 py-1.5 text-[11px] font-medium tracking-[0.14em] text-slate-500 backdrop-blur">
          <span className="size-1.5 rounded-full bg-mint" aria-hidden="true" />
          校园学生交友平台
        </span>

        <BrandMark size="lg" href={null} />

        <p className="mt-9 max-w-[420px] text-[20px] font-medium leading-9 tracking-[0.01em] text-slate-600">
          在云端，遇见同频的校园灵魂
        </p>
        <p className="mt-3 text-[13px] leading-6 text-slate-500">
          同校身份核验 · 兴趣同频匹配 · 自在开启对话
        </p>

        <div className="mt-10 flex items-center gap-5 text-[11px] text-slate-500">
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck className="size-3.5 text-brand/70" strokeWidth={1.8} aria-hidden="true" />
            学号加密
          </span>
          <span className="h-3 w-px bg-slate-300/80" aria-hidden="true" />
          <span className="inline-flex items-center gap-1.5">
            <Users className="size-3.5 text-brand/70" strokeWidth={1.8} aria-hidden="true" />
            仅同校可见
          </span>
        </div>
      </div>

      <div className="relative z-10 flex items-center justify-center gap-5 px-8 pb-8 text-[11px] tracking-wide text-slate-500">
        <span>© 2026 同频 CAMPUS</span>
        <span className="h-3 w-px bg-slate-300/80" aria-hidden="true" />
        <span className="inline-flex items-center gap-1.5">
          <ShieldCheck className="size-3.5" strokeWidth={1.8} aria-hidden="true" />
          仅限校内使用
        </span>
      </div>
    </aside>
  );
}
