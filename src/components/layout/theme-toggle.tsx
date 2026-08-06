"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * Must be a Client Component — it reads resolvedTheme from localStorage
 * via next-themes, which only exists in the browser.
 *
 * The mounted guard is not optional. Without it:
 * - Server renders with resolvedTheme === undefined
 * - Client renders with "dark" or "light"
 * - React flags a hydration mismatch and either logs an error or
 *   silently produces the wrong UI on first paint
 *
 * The guard renders a visually identical placeholder (same size,
 * same variant) until the client has mounted and next-themes has
 * resolved the stored preference. This avoids both the hydration
 * error and a visible layout shift when the icon appears.
 */
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    // Placeholder matches the real button's dimensions exactly.
    // aria-hidden keeps screen readers from announcing a meaningless button.
    return (
      <Button
        variant="ghost"
        size="icon"
        aria-hidden="true"
        tabIndex={-1}
        className="opacity-0"
      />
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </Button>
  );
}
