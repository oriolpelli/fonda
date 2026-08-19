import * as React from "react";

import { cn } from "@/lib/utils";

function Card({
  className,
  nested = false,
  ...props
}: React.ComponentProps<"div"> & {
  /**
   * Set on a card rendered *inside* another card. Nested cards keep the
   * hairline and drop the shadow; see the note below for why.
   */
  nested?: boolean;
}) {
  return (
    <div
      data-slot="card"
      className={cn(
        // Fonda v3 (§6): white surface floating on the grey page ground,
        // 18px radius.
        //
        // Top-level cards are borderless — the page→card tonal step plus the
        // resting whisper shadow does the separating. Nested cards can't use
        // that trick: both they and their parent are white, so there is no
        // tonal step to read, and stacking shadows inside a card looks muddy.
        // They get a hairline and no shadow instead.
        "rounded-[18px] bg-card text-card-foreground",
        nested
          ? "border border-border"
          : "shadow-card transition-shadow duration-[180ms] hover:shadow-card-hover",
        className
      )}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn("flex flex-col gap-1.5 p-6", className)}
      {...props}
    />
  );
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn(
        "font-semibold leading-none tracking-[-0.01em]",
        className
      )}
      {...props}
    />
  );
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  );
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("p-6 pt-0", className)}
      {...props}
    />
  );
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn("flex items-center p-6 pt-0", className)}
      {...props}
    />
  );
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
};
