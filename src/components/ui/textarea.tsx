import * as React from "react";

import { cn } from "@/lib/utils";

// Type alias, not an empty interface — see input.tsx for rationale.
export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[80px] w-full rounded-md border px-3 py-2 text-sm shadow-sm",
          "border-input bg-background placeholder:text-muted-foreground",
          "transition-colors",
          "focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-1",
          "disabled:cursor-not-allowed disabled:opacity-50",
          // Prevent horizontal resize — vertical only makes sense in a layout
          "resize-y",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Textarea.displayName = "Textarea";

export { Textarea };
