"use client";

import { Check, Flag, ShieldCheck } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { Sheet } from "@/components/landing/sheet";
import { cn } from "@/components/ui";
import { errorMessage } from "@/lib/api-client";

const REASONS = [
  { id: "harassment", label: "骚扰或不适" },
  { id: "fake", label: "虚假身份" },
  { id: "content", label: "不当内容" },
  { id: "other", label: "其他" },
] as const;

export function ReportSheet({
  open,
  targetName,
  demo,
  onSubmit,
  onClose,
}: {
  open: boolean;
  targetName: string;
  demo: boolean;
  onSubmit: (reason: string, detail: string) => Promise<void>;
  onClose: () => void;
}) {
  const [reason, setReason] = useState<string>("harassment");
  const [detail, setDetail] = useState("");
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setReason("harassment");
    setDetail("");
    setDone(false);
    setSubmitting(false);
    setError(null);
  }, [open]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(reason, detail);
      setDone(true);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title={`举报 ${targetName || "该用户"}`}>
      {done ? (
        <div className="py-6 text-center">
          <span className="mx-auto grid size-14 place-items-center rounded-full bg-mint-soft text-mint-deep">
            <ShieldCheck size={28} aria-hidden="true" />
          </span>
          <h2 className="mt-4 text-[20px] font-bold tracking-[-0.03em] text-ink">举报已记录</h2>
          <p className="mx-auto mt-2 max-w-[300px] text-pretty text-[12px] leading-5 text-muted">
            {demo
              ? "这是产品演示，不会发送真实举报。真实产品中，管理员会在工作时间内查看，且不会通知对方。"
              : "举报已提交给管理员，处理结果不会通知对方。如遇紧急情况，请联系学校保卫处或辅导员。"}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="mt-6 inline-flex min-h-11 items-center justify-center rounded-full bg-ink px-6 py-3 text-[12px] font-semibold text-canvas"
          >
            知道了
          </button>
        </div>
      ) : (
        <form onSubmit={submit}>
          <div className="pr-11">
            <span className="grid size-11 place-items-center rounded-full bg-coral-soft text-coral-deep">
              <Flag size={20} aria-hidden="true" />
            </span>
            <h2 className="mt-4 text-[22px] font-bold tracking-[-0.04em] text-ink">
              举报 {targetName || "该用户"}
            </h2>
            <p className="mt-2 text-pretty text-[11.5px] leading-5 text-muted">
              举报内容仅管理员可见，不会通知对方。请选择最接近的情况。
            </p>
          </div>

          <div className="mt-5">
            <p className="mb-2 text-[11px] font-semibold text-ink">发生了什么？</p>
            <div role="group" aria-label="举报原因" className="grid grid-cols-2 gap-2">
              {REASONS.map((item) => {
                const active = reason === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setReason(item.id)}
                    className={cn(
                      "inline-flex min-h-11 items-center justify-between gap-2 rounded-2xl border px-3 py-2.5 text-left text-[11.5px] font-medium",
                      active
                        ? "border-brand bg-brand-soft text-brand-deep"
                        : "border-line bg-surface text-ink-soft",
                    )}
                  >
                    {item.label}
                    {active ? <Check size={14} aria-hidden="true" /> : null}
                  </button>
                );
              })}
            </div>
          </div>

          <label className="mt-5 block">
            <span className="mb-1.5 flex items-baseline justify-between text-[11px] font-semibold text-ink">
              补充说明
              <span className="text-[9.5px] font-normal text-muted">可选 · 最多 200 字</span>
            </span>
            <textarea
              value={detail}
              onChange={(event) => setDetail(event.target.value)}
              maxLength={200}
              rows={3}
              placeholder="发生了什么？越具体越有助于处理。"
              className="field-input resize-none text-[12.5px]"
            />
          </label>

          {error ? (
            <p
              role="alert"
              className="mt-4 rounded-2xl bg-coral-soft px-3.5 py-2.5 text-[11.5px] leading-5 text-coral-deep"
            >
              {error}
            </p>
          ) : null}

          <div className="mt-5 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex min-h-12 flex-1 items-center justify-center rounded-full border border-line bg-surface px-4 py-3 text-[12px] font-medium text-ink-soft"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex min-h-12 flex-[1.4] items-center justify-center rounded-full bg-coral-deep px-4 py-3 text-[12px] font-semibold text-white disabled:opacity-60"
            >
              {submitting ? "提交中…" : "提交举报"}
            </button>
          </div>

          <p className="mt-3 text-center text-[9.5px] leading-4 text-muted">
            如需紧急帮助，请联系学校保卫处或辅导员。
          </p>
        </form>
      )}
    </Sheet>
  );
}
