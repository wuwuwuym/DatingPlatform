"use client";

import { Eye, Flag, LockKeyhole, Radio, ShieldCheck } from "lucide-react";
import { Sheet } from "@/components/landing/sheet";
import { Switch } from "@/components/landing/switch";
import type { PrivacyState } from "@/components/landing/safety";

export function PrivacySheet({
  open,
  privacy,
  onChange,
  onClose,
  onReport,
}: {
  open: boolean;
  privacy: PrivacyState;
  onChange: (next: PrivacyState) => void;
  onClose: () => void;
  onReport: () => void;
}) {
  return (
    <Sheet open={open} onClose={onClose} title="隐私设置">
      <div className="pr-11">
        <span className="grid size-11 place-items-center rounded-full bg-mint-soft text-mint-deep">
          <LockKeyhole size={20} aria-hidden="true" />
        </span>
        <h2 className="mt-4 text-[22px] font-bold tracking-[-0.04em] text-ink">先决定，谁能看见你</h2>
        <p className="mt-2 text-pretty text-[11.5px] leading-5 text-muted">
          这些开关只影响演示页面。真实产品中，你可以随时隐身，也可以只对同校认证学生可见。
        </p>
      </div>

      <div className="mt-5 divide-y divide-line rounded-card border border-line bg-surface px-4">
        <div className="flex min-h-16 items-center justify-between gap-4 py-2">
          <span className="flex items-start gap-2.5">
            <Eye size={16} className="mt-0.5 text-brand" aria-hidden="true" />
            <span>
              <span className="block text-[12px] font-medium text-ink">允许同校同学发现我</span>
              <span className="mt-0.5 block text-[10px] leading-4 text-muted">
                关闭后，你不会出现在推荐与兴趣匹配中。
              </span>
            </span>
          </span>
          <Switch
            checked={privacy.discoverable}
            onChange={(next) => onChange({ ...privacy, discoverable: next })}
            label="允许同校同学发现我"
          />
        </div>

        <div className="flex min-h-16 items-center justify-between gap-4 py-2">
          <span className="flex items-start gap-2.5">
            <Radio size={16} className="mt-0.5 text-coral-deep" aria-hidden="true" />
            <span>
              <span className="block text-[12px] font-medium text-ink">展示在线状态</span>
              <span className="mt-0.5 block text-[10px] leading-4 text-muted">
                关闭后，别人只会看到「最近活跃」。
              </span>
            </span>
          </span>
          <Switch
            checked={privacy.showOnline}
            onChange={(next) => onChange({ ...privacy, showOnline: next })}
            label="展示在线状态"
          />
        </div>
      </div>

      <div className="mt-4 rounded-card bg-surface-soft p-4">
        <p className="flex items-center gap-1.5 text-[10.5px] font-semibold text-ink">
          <ShieldCheck size={13} className="text-mint-deep" aria-hidden="true" />
          我们不会展示这些信息
        </p>
        <ul className="mt-2 space-y-1.5 text-[10.5px] leading-5 text-muted">
          <li>· 学号、手机号、宿舍与精确位置</li>
          <li>· 聊天内容不会用于推荐或广告</li>
          <li>· 认证只保留「已通过」状态与徽章</li>
        </ul>
      </div>

      <div className="mt-5 flex items-center justify-between gap-3 border-t border-line pt-4">
        <p className="text-[9.5px] text-muted">设置会自动保存在当前浏览器</p>
        <button
          type="button"
          onClick={onReport}
          className="inline-flex min-h-10 items-center gap-1.5 rounded-full px-3 py-2 text-[10.5px] font-medium text-coral-deep hover:bg-coral-soft"
        >
          <Flag size={12} aria-hidden="true" />
          举报入口
        </button>
      </div>
    </Sheet>
  );
}
