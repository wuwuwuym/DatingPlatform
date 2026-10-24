"use client";

import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/components/ui";

export function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  const reduce = useReducedMotion();

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className="relative inline-flex h-11 w-12 shrink-0 items-center justify-center rounded-full"
    >
      <span
        aria-hidden="true"
        className={cn(
          "absolute h-7 w-12 rounded-full",
          checked ? "bg-brand" : "bg-line-strong",
        )}
      />
      <span
        aria-hidden="true"
        className="absolute top-1/2 left-1 -translate-y-1/2"
      >
        <motion.span
          animate={{ x: checked ? 20 : 0 }}
          transition={{ duration: reduce ? 0 : 0.2, ease: "easeOut" }}
          className="block size-5 rounded-full bg-white shadow-[0_2px_6px_rgba(31,41,55,0.22)]"
        />
      </span>
    </button>
  );
}
