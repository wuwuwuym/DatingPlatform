import type { ReactNode } from "react";
import { AuthBrandPanel } from "@/components/auth/auth-brand-panel";
import { BrandMark } from "@/components/auth/brand-mark";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-white lg:grid lg:h-dvh lg:grid-cols-[3fr_2fr] lg:overflow-hidden">
      <AuthBrandPanel />

      <div className="flex min-h-dvh flex-col bg-white lg:h-dvh lg:min-h-0 lg:overflow-y-auto">
        <div className="flex min-h-full flex-1 flex-col justify-center px-5 py-10 sm:px-8 lg:px-10 lg:py-14">
          <div className="mx-auto w-full max-w-[380px]">
            <div className="mb-9 lg:hidden">
              <BrandMark />
            </div>
            {children}
          </div>
        </div>

        <footer className="px-5 pb-6 text-center text-[11px] tracking-wide text-slate-500 lg:hidden">
          © 2026 同频 CAMPUS · 仅限校内使用
        </footer>
      </div>
    </div>
  );
}
