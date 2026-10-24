"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/components/ui";

export function MatchButton({
  children,
  onAction,
  className,
}: {
  children: ReactNode;
  onAction: () => void;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const [glowKey, setGlowKey] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  function handleClick() {
    if (reduce) {
      onAction();
      return;
    }

    setGlowKey((value) => value + 1);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(onAction, 320);
  }

  return (
    <motion.button
      type="button"
      onClick={handleClick}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 520, damping: 32, mass: 0.5 }}
      className={cn(
        "group relative inline-flex min-h-12 items-center justify-center gap-2 overflow-hidden rounded-full bg-brand px-6 py-3 text-sm font-semibold text-white shadow-[0_16px_32px_-20px_rgba(91,108,255,0.9)]",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-full bg-white opacity-0 transition-opacity duration-200 group-hover:opacity-10"
      />
      <span className="relative z-10">{children}</span>
      <ArrowUpRight
        size={16}
        strokeWidth={2.2}
        className="relative z-10 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
        aria-hidden="true"
      />
      {glowKey > 0 ? (
        <motion.span
          key={glowKey}
          aria-hidden="true"
          initial={{ opacity: 0, scale: 0.72 }}
          animate={{ opacity: [0, 0.62, 0], scale: 1.14 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="pointer-events-none absolute inset-0 rounded-full bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.9),rgba(255,255,255,0)_68%)]"
        />
      ) : null}
    </motion.button>
  );
}
