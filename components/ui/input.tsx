import * as React from "react";

import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        // v3 (§9): white field on the grey ground. Focus keeps the Signal
        // shape — accent border + 3px ring — but the ring tint is
        // --fonda-accent-tint, NOT the generic --accent, which is now a warm
        // neutral (§3.1) and would read as a muddy halo rather than a focus
        // signal. This is the one interaction cue still allowed to be blue.
        "flex h-11 w-full rounded-[10px] border border-input bg-surface px-4 py-2.5 text-sm transition-colors duration-[180ms] file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-[var(--fonda-text-3)] focus-visible:outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-[var(--fonda-accent-tint)] disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
}

export { Input };
