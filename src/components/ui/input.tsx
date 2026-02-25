/**
 * Input - Styled text input with RTL/LTR support
 *
 * Auto-detects direction based on type:
 * - LTR: email, tel, url, number, password
 * - RTL: text, search (Arabic default)
 *
 * @example
 * <Input type="email" placeholder="Email" />
 */
import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    const isLTRType = type === 'email' || type === 'tel' || type === 'url' || type === 'number' || type === 'password';
    return (
      <input
        type={type}
        dir={isLTRType ? 'ltr' : undefined}
        className={cn(
          // Base styles - clean and modern (explicit pl/pr for LTR, separate for overridability)
          "flex h-12 w-full rounded-lg border border-border bg-background ps-4 pe-4 py-3",
          // Typography - LTR global app, placeholder slightly darker for visibility
          "text-base text-foreground placeholder:text-muted-foreground text-start placeholder:text-start caret-primary",
          // Focus states - subtle ring with glow
          "ring-offset-background focus-visible:outline-none",
          "focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-0",
          "focus-visible:border-primary/50",
          "focus-visible:shadow-[0_0_20px_-5px_hsl(var(--primary)/0.2)]",
          // Invalid state - consistent destructive emphasis
          "aria-[invalid=true]:border-destructive/60",
          "aria-[invalid=true]:focus-visible:ring-destructive/30",
          "aria-[invalid=true]:focus-visible:border-destructive/60",
          "aria-[invalid=true]:focus-visible:shadow-[0_0_20px_-8px_hsl(var(--destructive)/0.35)]",
          // Hover state
          "hover:border-primary/30 transition-all duration-300",
          // Disabled state
          "disabled:cursor-not-allowed disabled:opacity-50",
          // File input
          "file:border-0 file:bg-transparent file:text-sm file:font-medium file:me-3",
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
