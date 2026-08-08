"use client";

import * as React from "react";
import * as SwitchPrimitives from "@radix-ui/react-switch";
import { cn } from "@/lib/utils";

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitives.Root
    ref={ref}
    className={cn(
      "peer inline-flex h-9 w-12 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-algo-frontier focus-visible:ring-offset-2 focus-visible:ring-offset-surface-panel disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-algo-frontier data-[state=unchecked]:bg-ink-dim/35",
      className,
    )}
    {...props}
  >
    <SwitchPrimitives.Thumb className="pointer-events-none block size-7 rounded-full bg-white shadow-sm ring-1 ring-black/15 transition-transform data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0" />
  </SwitchPrimitives.Root>
));
Switch.displayName = SwitchPrimitives.Root.displayName;

export { Switch };
