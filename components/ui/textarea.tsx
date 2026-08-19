import * as React from "react";

import { cn } from "@/lib/utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        // v3 (§9): matches Input exactly — white field, accent border on
        // focus, 3px --fonda-accent-tint ring. See the note in input.tsx.
        "flex min-h-[110px] w-full rounded-[10px] border border-input bg-surface px-4 py-2.5 text-sm transition-colors duration-[180ms] placeholder:text-[var(--fonda-text-3)] focus-visible:outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-[var(--fonda-accent-tint)] disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
}

export { Textarea };
