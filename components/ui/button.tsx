import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

// Fonda v2 "Signal" — soft-cornered buttons (10px radius). No pills, no shadows.
// The `ink` (near-black) variant is the default CTA; `default` resolves to ink too.
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[10px] text-sm font-medium tracking-[-0.01em] transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground hover:bg-[var(--primary-hover)]",
        ink: "bg-ink text-primary-foreground hover:bg-ink-hover",
        accent:
          "bg-[var(--fonda-accent)] text-white hover:bg-[var(--fonda-accent-hover)]",
        destructive:
          "bg-destructive text-destructive-foreground hover:opacity-90",
        outline:
          "border border-[var(--fonda-border-2)] bg-transparent text-foreground hover:border-[var(--fonda-text-3)]",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-[var(--fonda-inset)]",
        ghost: "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
        link: "text-[var(--fonda-accent)] underline-offset-4 hover:underline",
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
