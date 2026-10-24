"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

export function Reveal({
  children,
  className,
  delay = 0,
  amount = 0.16,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  amount?: number;
}) {
  const reduce = useReducedMotion();

  if (reduce) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount }}
      transition={{ duration: 0.4, ease: "easeOut", delay }}
    >
      {children}
    </motion.div>
  );
}
