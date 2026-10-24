import type { ReactNode } from "react";

export function EmptyMatches({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center rounded-card border border-dashed border-line-strong bg-paper px-6 py-12 text-center">
      <svg
        viewBox="0 0 220 160"
        className="mb-5 h-auto w-[190px]"
        aria-hidden="true"
        focusable="false"
      >
        <circle cx="110" cy="78" r="62" fill="#EAF7F0" />
        <path d="M38 123h144" stroke="#D9CFC1" strokeWidth="2" strokeLinecap="round" />
        <path
          d="M67 123V88c0-9 7-16 16-16h54c9 0 16 7 16 16v35"
          fill="none"
          stroke="#5B6CFF"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
        <path d="M67 99h86" stroke="#5B6CFF" strokeWidth="2.4" strokeLinecap="round" />
        <path
          d="M85 123v14M135 123v14"
          stroke="#5B6CFF"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
        <path
          d="M58 60c0-8 6-14 14-14h20c8 0 14 6 14 14v9c0 8-6 14-14 14H72c-8 0-14-6-14-14z"
          fill="#FFFFFF"
          stroke="#F28C8C"
          strokeWidth="2.2"
        />
        <circle cx="76" cy="64" r="2.4" fill="#F28C8C" />
        <circle cx="84" cy="64" r="2.4" fill="#F28C8C" />
        <circle cx="92" cy="64" r="2.4" fill="#F28C8C" />
        <path
          d="M151 40l20-7-9 18-5-7-6-4z"
          fill="#FFFDF9"
          stroke="#7BC9A6"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <path d="M171 33l-9 18" stroke="#7BC9A6" strokeWidth="1.6" strokeLinecap="round" />
        <circle cx="168" cy="88" r="4" fill="#F28C8C" opacity="0.7" />
        <circle cx="55" cy="35" r="3" fill="#7BC9A6" opacity="0.8" />
        <path
          d="M47 91c7-8 13-12 19-12M174 104c-6-6-11-9-17-9"
          fill="none"
          stroke="#D9CFC1"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeDasharray="3 5"
        />
      </svg>

      <h3 className="text-[17px] font-semibold tracking-tight text-ink">{title}</h3>
      <p className="mt-2 max-w-[320px] text-pretty text-[12.5px] leading-5 text-muted">
        {description}
      </p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
