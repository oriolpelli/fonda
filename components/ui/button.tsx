import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

// Fonda v3 "Fonda × Sana" (§9) — soft-cornered buttons (10px radius). No pills,
// no shadows. The `ink` (warm near-black) variant is the CTA; `default` resolves
// to ink too, since --primary maps onto --fonda-ink.
//
// v2's navy `accent` and `link` variants are GONE as of the Phase 8 sweep. Both
// filled a chrome control with --fonda-accent, which v3 §3.2 forbids ("must not
// color nav, active states, chips, links-in-chrome, or icons"), and neither had
// a single call site left. They were removed rather than recolored so nobody
// reaches for a navy button by tab-completion. For a text link inside the app,
// use a plain <a>/LocaleLink in --fonda-text with an underline — the pattern
// components/dashboard/chat/chat-thread.tsx already uses for "Open ›".
//
// A round icon-only button (the chat send, `size="icon"` + `rounded-full`) is
// the one permitted round control: an icon button, not a pill text button.
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[10px] text-sm font-medium tracking-[-0.01em] transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground hover:bg-[var(--primary-hover)]",
        ink: "bg-ink text-primary-foreground hover:bg-ink-hover",
        destructive:
          "bg-destructive text-destructive-foreground hover:opacity-90",
        outline:
          "border border-[var(--fonda-border-2)] bg-transparent text-foreground hover:border-[var(--fonda-text-3)]",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-[var(--fonda-inset)]",
        ghost: "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
      },
      size: {
        default: "h-10 px-6",
        sm: "h-9 rounded-[8px] px-4 text-[13px]",
        lg: "h-12 rounded-[12px] px-8 text-[15px]",
        icon: "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
