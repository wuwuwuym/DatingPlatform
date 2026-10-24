"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  const reduce = useReducedMotion();

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;

    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus({ preventScroll: true });

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onCloseRef.current();
        return;
      }

      if (event.key !== "Tab") return;

      const focusable = [...(panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])];
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;

      const active = document.activeElement;
      if (event.shiftKey && (active === first || active === panelRef.current)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
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
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6">
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
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            tabIndex={-1}
            initial={reduce ? false : { opacity: 0, y: 28, scale: 0.985 }}
            animate={reduce ? undefined : { opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? undefined : { opacity: 0, y: 20 }}
            transition={{ duration: 0.24, ease: "easeOut" }}
            className="relative max-h-[90dvh] w-full max-w-[540px] overflow-y-auto rounded-t-panel border border-line bg-paper p-5 shadow-float outline-none sm:rounded-panel sm:p-6"
          >
            <div
              aria-hidden="true"
              className="mx-auto mb-3 h-1 w-10 rounded-full bg-line-strong sm:hidden"
            />
            <button
              ref={closeRef}
              type="button"
              aria-label="关闭"
              onClick={onClose}
              className="absolute top-4 right-4 grid size-10 place-items-center rounded-full bg-surface-soft text-ink-soft"
            >
              <X size={17} aria-hidden="true" />
            </button>
            {children}
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
