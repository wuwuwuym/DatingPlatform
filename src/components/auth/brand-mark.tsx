import Link from "next/link";
import { cn } from "@/lib/cn";

const SIZES = {
  sm: {
    mark: "size-9",
    ring: "border-[1.4px]",
    gap: "gap-2.5",
    title: "text-[15px]",
    sub: "text-[8px] tracking-[0.16em] mt-1",
    align: "items-center",
  },
  lg: {
    mark: "size-16",
    ring: "border-2",
    gap: "gap-4",
    title: "text-[42px]",
    sub: "text-[11px] tracking-[0.38em] mt-2",
    align: "items-center",
  },
} as const;

export function BrandMark({
  size = "sm",
  href = "/",
  className,
}: {
  size?: keyof typeof SIZES;
  href?: string | null;
  className?: string;
}) {
  const scale = SIZES[size];

  const body = (
    <>
      <span
        className={cn("relative grid shrink-0 place-items-center rounded-full bg-ink", scale.mark)}
        aria-hidden="true"
      >
        <span className={cn("absolute left-[16%] size-[34%] rounded-full border-canvas", scale.ring)} />
        <span className={cn("absolute right-[16%] size-[34%] rounded-full border-coral", scale.ring)} />
      </span>
      <span className={cn("flex flex-col", scale.align)}>
        <span className={cn("font-bold leading-none tracking-[-0.04em] text-ink", scale.title)}>同频</span>
        <span className={cn("font-medium uppercase text-muted", scale.sub)}>campus</span>
      </span>
    </>
  );

  if (!href) {
    return <span className={cn("inline-flex items-center", scale.gap, className)}>{body}</span>;
  }

  return (
    <Link
      href={href}
      aria-label="同频 CAMPUS 首页"
      className={cn(
        "inline-flex items-center rounded-lg p-1 -m-1 transition-opacity duration-200 hover:opacity-80",
        scale.gap,
        className,
      )}
    >
      {body}
    </Link>
  );
}
