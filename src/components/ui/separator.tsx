import { cn } from "@/lib/utils";

/**
 * A thin rule used to visually separate sections of content.
 * Not a Radix primitive here — Radix Separator adds ARIA role="separator"
 * which is correct for interactive separators but wrong for decorative
 * dividers. This is a pure presentational component; callers who need
 * semantic separation add aria-hidden="true" or role="presentation"
 * at the call site, depending on intent.
 */
interface SeparatorProps {
  className?: string;
  orientation?: "horizontal" | "vertical";
}

export function Separator({
  className,
  orientation = "horizontal",
}: SeparatorProps) {
  return (
    <div
      role="none"
      className={cn(
        "bg-border shrink-0",
        orientation === "horizontal" ? "h-px w-full" : "h-full w-px",
        className,
      )}
    />
  );
}
