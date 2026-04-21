import { BadgeCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export function VerifiedBadge({
  size = "sm",
  className,
}: {
  size?: "sm" | "md";
  className?: string;
}) {
  return (
    <span
      title="Verified stakeholder"
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-[var(--saffron)]/15 font-semibold uppercase tracking-wider text-[var(--indigo-night)]",
        size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-3 py-1 text-xs",
        className,
      )}
    >
      <BadgeCheck className={size === "sm" ? "h-3 w-3" : "h-4 w-4"} />
      Verified
    </span>
  );
}