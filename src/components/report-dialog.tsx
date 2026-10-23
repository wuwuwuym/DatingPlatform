"use client";

import { useState } from "react";
import { REPORT_TYPE_OPTIONS } from "@/lib/constants";
import { api, errorMessage } from "@/lib/api-client";
import { Banner, Button, Chip, Field, Textarea } from "@/components/ui";

export function ReportDialog({
  targetUserId,
  targetPostId,
  targetName,
  onClose,
  onDone,
}: {
  targetUserId?: string;
  targetPostId?: string;
  targetName: string;
  onClose: () => void;
  onDone?: () => void;
}) {
  const [type, setType] = useState<string>("harassment");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true);
    setError(null);
    try {
      await api("/api/report", { body: { targetUserId, targetPostId, type, description } });
      setDone(true);
      onDone?.();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/35 px-4 pb-4 backdrop-blur-sm">
      <div className="w-full max-w-[430px] rounded-3xl bg-surface p-5 shadow-2xl">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <p className="text-[16px] font-semibold text-ink">举报 {targetName}</p>
            <p className="mt-1 text-[11.5px] text-muted">举报信息仅管理员可见，请如实填写。</p>
          </div>
          <button type="button" onClick={onClose} className="text-[12px] text-muted">
            关闭
          </button>
        </div>

        {done ? (
          <div className="space-y-4">
            <Banner tone="success">已提交举报，管理员会尽快处理。</Banner>
            <Button className="w-full" onClick={onClose}>
              好的
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <p className="mb-2 text-[13px] font-medium text-ink-soft">举报类型</p>
              <div className="flex flex-wrap gap-2">
                {REPORT_TYPE_OPTIONS.map((option) => (
                  <Chip
                    key={option.value}
                    selected={type === option.value}
                    onClick={() => setType(option.value)}
                  >
                    {option.label}
                  </Chip>
                ))}
              </div>
            </div>

            <Field label="补充说明" hint="可选，最多 300 字">
              <Textarea
                rows={3}
                value={description}
                maxLength={300}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="发生了什么？越具体越有助于处理。"
              />
            </Field>

            {error ? <Banner>{error}</Banner> : null}

            <div className="flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={onClose}>
                取消
              </Button>
              <Button className="flex-1" loading={loading} onClick={submit}>
                提交举报
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
