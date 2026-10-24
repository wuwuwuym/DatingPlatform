import { Avatar, cn } from "@/components/ui";

export function CircleAvatar({
  name,
  src,
  size = 40,
  online = false,
  className,
}: {
  name: string;
  src?: string | null;
  size?: number;
  online?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 rounded-full ring-1 ring-slate-200",
        className,
      )}
    >
      <span className="overflow-hidden rounded-full">
        <Avatar name={name} src={src} size={size} />
      </span>
      {online ? (
        <span
          className="absolute -right-0.5 -bottom-0.5 size-3 rounded-full bg-emerald-400 ring-2 ring-[#f8f9fa]"
          aria-hidden="true"
        />
      ) : null}
    </span>
  );
}
