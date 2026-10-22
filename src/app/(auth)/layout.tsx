import Link from "next/link";
import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="shell py-8">
      <Link href="/" className="inline-flex items-center gap-2">
        <span className="grid size-8 place-items-center rounded-xl bg-brand text-[13px] font-semibold text-white">
          同
        </span>
        <span className="text-[13px] font-medium text-ink-soft">校园同频</span>
      </Link>
      <div className="animate-rise mt-8">{children}</div>
    </div>
  );
}
