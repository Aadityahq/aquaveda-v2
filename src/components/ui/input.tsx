import * as React from "react";

import { cn } from "@/lib/utils";

// A type alias, not an empty interface — an interface with no members
// adds nothing over its supertype and trips
// @typescript-eslint/no-empty-object-type. Kept as a named export so call
// sites can still reference `InputProps` explicitly.
export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          // Layout
          "flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-sm",
          // Colors — semantic tokens only, never raw hex
          "border-input bg-background placeholder:text-muted-foreground",
          // Transitions
          "transition-colors",
          // File input reset — prevents browser-default file button styles
          "file:border-0 file:bg-transparent file:text-sm file:font-medium",
          // Focus — ring-1 is intentionally lighter than the global :focus-visible
          // ring-2 so it reads as "active field" rather than "keyboard focus"
          "focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-1",
          // Disabled
          "disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
