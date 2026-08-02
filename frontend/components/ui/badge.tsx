import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-lg border px-2 py-0.5 text-xs font-medium",
  {
    variants: {
      variant: {
        default: "border-surface-border bg-surface-control text-ink",
        ok: "border-start/30 bg-start/10 text-ink before:size-1.5 before:rounded-full before:bg-start",
        warn: "border-algo-path/30 bg-algo-path/10 text-ink before:size-1.5 before:rounded-full before:bg-algo-path",
        danger: "border-goal/30 bg-goal/10 text-ink before:size-1.5 before:rounded-full before:bg-goal",
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
