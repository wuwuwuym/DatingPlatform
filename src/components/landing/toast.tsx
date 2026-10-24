"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check } from "lucide-react";

export function Toast({ message }: { message: string | null }) {
  const reduce = useReducedMotion();

  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex justify-center px-4 md:bottom-8"
    >
      <AnimatePresence initial={false}>
        {message ? (
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 10 }}
            animate={reduce ? undefined : { opacity: 1, y: 0 }}
            exit={reduce ? undefined : { opacity: 0, y: 8 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="flex max-w-[420px] items-center gap-2 rounded-full bg-ink px-4 py-2.5 text-[11.5px] font-medium text-white shadow-float"
          >
            <span className="grid size-5 shrink-0 place-items-center rounded-full bg-mint/20 text-mint">
              <Check size={11} strokeWidth={2.8} aria-hidden="true" />
            </span>
            {message}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
