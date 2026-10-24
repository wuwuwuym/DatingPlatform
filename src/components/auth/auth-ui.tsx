"use client";

import Link from "next/link";
import { useId, useState } from "react";
import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  ChevronDown,
  CircleAlert,
  Eye,
  EyeOff,
  LoaderCircle,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/cn";

const FIELD_SHELL =
  "group relative flex items-center rounded-xl bg-[#F3F4F6] transition-all duration-200 focus-within:bg-white focus-within:shadow-[inset_0_0_0_1.5px_rgba(91,108,255,0.5),0_0_0_4px_rgba(91,108,255,0.1)]";

const FIELD_CONTROL =
  "h-12 w-full bg-transparent text-[15px] text-slate-900 placeholder:text-slate-500 focus:outline-none focus-visible:outline-none";

export function AuthField({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <label htmlFor={htmlFor} className="text-[13px] font-medium text-slate-700">
          {label}
        </label>
        {hint ? <span className="text-[11px] leading-4 text-slate-500">{hint}</span> : null}
      </div>
      {children}
    </div>
  );
}

export function AuthInput({
  icon: Icon,
  className,
  id,
  type = "text",
  ...rest
}: InputHTMLAttributes<HTMLInputElement> & { icon: LucideIcon }) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const [revealed, setRevealed] = useState(false);
  const isPassword = type === "password";

  return (
    <div className={FIELD_SHELL}>
      <Icon
        className="pointer-events-none absolute left-4 size-[18px] text-slate-500 transition-colors duration-200 group-focus-within:text-brand"
        strokeWidth={1.8}
        aria-hidden="true"
      />
      <input
        {...rest}
        id={inputId}
        type={isPassword && revealed ? "text" : type}
        className={cn(FIELD_CONTROL, "pl-11", isPassword ? "pr-12" : "pr-4", className)}
      />
      {isPassword ? (
        <button
          type="button"
          onClick={() => setRevealed((current) => !current)}
          aria-label={revealed ? "隐藏密码" : "显示密码"}
          aria-pressed={revealed}
          className="absolute right-0.5 grid size-11 place-items-center rounded-lg text-slate-500 transition-colors duration-200 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50"
        >
          {revealed ? (
            <EyeOff className="size-[18px]" strokeWidth={1.8} aria-hidden="true" />
          ) : (
            <Eye className="size-[18px]" strokeWidth={1.8} aria-hidden="true" />
          )}
        </button>
      ) : null}
    </div>
  );
}

export function AuthSelect({
  icon: Icon,
  className,
  id,
  children,
  ...rest
}: SelectHTMLAttributes<HTMLSelectElement> & { icon: LucideIcon }) {
  return (
    <div className={cn(FIELD_SHELL, "has-[:disabled]:opacity-60")}>
      <Icon
        className="pointer-events-none absolute left-4 size-[18px] text-slate-500 transition-colors duration-200 group-focus-within:text-brand"
        strokeWidth={1.8}
        aria-hidden="true"
      />
      <select
        {...rest}
        id={id}
        className={cn(FIELD_CONTROL, "appearance-none pl-11 pr-10", className)}
      >
        {children}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-3.5 size-4 text-slate-500"
        strokeWidth={1.8}
        aria-hidden="true"
      />
    </div>
  );
}

export function AuthError({ message }: { message: string | null }) {
  return (
    <AnimatePresence initial={false}>
      {message ? (
        <motion.div
          key="auth-error"
          role="alert"
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="flex items-start gap-2.5 rounded-xl bg-[#FEF2F2] px-3.5 py-3 text-[13px] leading-5 text-[#B4442A]"
        >
          <CircleAlert className="mt-0.5 size-4 shrink-0" strokeWidth={1.8} aria-hidden="true" />
          <span>{message}</span>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

export function AuthSubmit({
  loading,
  loadingText = "请稍候…",
  children,
}: {
  loading: boolean;
  loadingText?: string;
  children: ReactNode;
}) {
  const reduce = useReducedMotion();

  return (
    <motion.button
      type="submit"
      disabled={loading}
      aria-busy={loading}
      whileHover={reduce || loading ? undefined : { y: -2 }}
      whileTap={reduce || loading ? undefined : { scale: 0.97 }}
      transition={{ type: "spring", stiffness: 420, damping: 26 }}
      className="group mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-brand text-[15px] font-medium text-white shadow-lg shadow-brand/25 transition-[background-color,box-shadow,opacity] duration-200 hover:bg-brand-deep hover:shadow-xl hover:shadow-brand/35 disabled:cursor-not-allowed disabled:opacity-70 disabled:shadow-none"
    >
      {loading ? (
        <>
          <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
          {loadingText}
        </>
      ) : (
        children
      )}
    </motion.button>
  );
}

export function AuthSwitch({
  prompt,
  href,
  label,
}: {
  prompt: string;
  href: string;
  label: string;
}) {
  return (
    <div className="mt-8 flex items-center justify-between gap-4 text-[13px] text-slate-500">
      <span>{prompt}</span>
      <Link
        href={href}
        className="group relative inline-flex items-center gap-1 font-medium text-brand transition-colors duration-200 hover:text-brand-deep"
      >
        {label}
        <ArrowRight
          className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5"
          strokeWidth={2}
          aria-hidden="true"
        />
        <span
          className="absolute -bottom-1 left-0 h-px w-full origin-left scale-x-0 bg-current transition-transform duration-300 group-hover:scale-x-100"
          aria-hidden="true"
        />
      </Link>
    </div>
  );
}
