"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-[color,background-color,border-color,box-shadow,transform] duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-algo-frontier focus-visible:ring-offset-2 focus-visible:ring-offset-surface-panel disabled:pointer-events-none disabled:opacity-55 disabled:active:scale-100 [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-algo-frontier/90 text-surface shadow-[0_6px_16px_rgb(var(--algo-frontier)/0.20)] hover:bg-algo-frontier hover:shadow-[0_8px_20px_rgb(var(--algo-frontier)/0.28)] font-bold",
        secondary: "border border-surface-border bg-surface-control/85 text-ink shadow-sm hover:border-surface-strong hover:bg-surface-raised",
        ghost: "text-ink-dim hover:bg-surface-control hover:text-ink",
        destructive: "bg-goal text-white hover:bg-goal/90",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 px-3 text-xs",
        lg: "h-11 px-6 text-base",
        icon: "h-9 w-9",
        iconSm: "h-9 w-9",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
