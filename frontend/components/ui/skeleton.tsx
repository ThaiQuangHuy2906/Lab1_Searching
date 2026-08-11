import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("animate-pulse rounded-lg bg-surface-border/60 motion-reduce:animate-none", className)} {...props} />;
}

export { Skeleton };
