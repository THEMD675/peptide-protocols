import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-semibold select-none ring-offset-background transition-all duration-500 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 focus-visible:ring-offset-0 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:stroke-[1.75] [&_svg]:transition-transform [&_svg]:duration-300 active:scale-[0.97]",
  {
    variants: {
      variant: {
        default: [
          "bg-gradient-to-br from-primary via-primary to-primary/90 text-primary-foreground",
          "shadow-[0_0_25px_-8px_hsl(var(--primary)/0.5),0_4px_12px_rgba(0,0,0,0.15)]",
          "hover:shadow-[0_0_45px_-8px_hsl(var(--primary)/0.7),0_8px_32px_rgba(0,0,0,0.25)]",
          "hover:-translate-y-1 hover:scale-[1.03] active:scale-[0.98]",
          "before:absolute before:inset-0 before:rounded-full before:bg-gradient-to-t before:from-transparent before:to-white/15 before:opacity-0 before:transition-all before:duration-300 hover:before:opacity-100",
          "relative overflow-visible transition-all duration-300 ease-out",
          "font-semibold tracking-tight",
        ].join(" "),
        destructive: [
          "bg-gradient-to-b from-destructive to-destructive/90 text-destructive-foreground",
          "shadow-[0_0_20px_-5px_hsl(var(--destructive)/0.4)]",
          "hover:shadow-[0_0_40px_-5px_hsl(var(--destructive)/0.6)]",
          "hover:-translate-y-0.5",
        ].join(" "),
        outline: [
          "border border-border bg-card text-foreground",
          "hover:bg-primary hover:text-primary-foreground hover:border-primary/80",
          "hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-0.5 hover:scale-[1.02]",
          "transition-all duration-300 ease-out",
        ].join(" "),
        secondary: [
          "bg-muted text-foreground",
          "hover:bg-muted/80 hover:-translate-y-0.5",
          "shadow-sm hover:shadow-md",
        ].join(" "),
        ghost: [
          "hover:bg-muted hover:text-foreground",
          "transition-colors",
        ].join(" "),
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        // WCAG 2.2 Target Size (Enhanced) requires 48x48px minimum
        default: "h-12 min-h-[48px] px-5 py-2.5",
        sm: "h-11 min-h-[44px] rounded-full px-4",
        lg: "h-12 min-h-[48px] rounded-full px-10 text-base",
        icon: "h-12 w-12 min-h-[48px] min-w-[48px] rounded-full",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, onClick, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    const isDisabled = Boolean(disabled);
    const handleClick: React.MouseEventHandler<HTMLElement> = (event) => {
      if (isDisabled) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }

      onClick?.(event as React.MouseEvent<HTMLButtonElement>);
    };
    const componentProps = asChild
      ? {
          ...props,
          onClick: handleClick,
          "aria-disabled": isDisabled || undefined,
          tabIndex: isDisabled ? -1 : props.tabIndex,
        }
      : { type: props.type ?? "button", onClick: handleClick, disabled, ...props };
    return (
      <Comp 
        className={cn(
          buttonVariants({ variant, size, className }),
          isDisabled ? "pointer-events-none opacity-50" : undefined
        )} 
        ref={ref} 
        {...componentProps} 
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };

