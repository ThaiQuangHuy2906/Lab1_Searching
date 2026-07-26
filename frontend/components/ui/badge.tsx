import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-lg px-2 py-0.5 text-xs font-medium",
  {
    variants: {
      variant: {
        default: "bg-surface-border text-ink",
        ok: "bg-start/15 text-start",
        warn: "bg-algo-path/15 text-algo-path",
        danger: "bg-goal/15 text-goal",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge };
