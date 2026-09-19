import * as React from "react";

import { cn } from "@/lib/utils";

function Card({
  className,
  nested = false,
  ...props
}: React.ComponentProps<"div"> & {
  /**
   * Set on a card rendered *inside* another card. A nested card steps one
   * level down the surface ladder; see the note below.
   */
  nested?: boolean;
}) {
  return (
    <div
      data-slot="card"
      className={cn(
        // Fonda v4 (FONDA_SANA_REDESIGN.md §0.1): a card is a WELL — warm grey
        // on the white canvas — at 16px radius, with NO shadow and NO border.
        //
        // The v3 card was the inverse: white, floating on a grey page, and the
        // resting shadow was load-bearing because a white-on-grey step had no
        // other tell. Inverted, the shadow is not just unnecessary but wrong —
        // a drop shadow under a well is the floating-AI-card look the system
        // exists to remove. Shadows are for overlays now (see the elevation
        // tokens in globals.css); if you want one here, you want a Dialog.
        //
        // Nesting also gets simpler. v3's nested card needed a hairline because
        // both it and its parent were white, so there was no tonal step to
        // read. v4 has one — well #f6f3ee → nested #ece7dd is 1.11:1, the same
        // size of move as canvas → well — so a nested card steps down the
        // ladder and needs no border either.
        //
        // Two rules ride on the nested fill and are enforced by the caller, not
        // here: --fonda-text-3 (4.51:1 on it — passing, with little room) is the
        // last muted step allowed, and --destructive (4.38:1) is NOT — error
        // copy belongs at the top of a card, not three fills deep. There is no
        // fourth level; `nested` on a nested card is a bug.
        "rounded-[16px] text-card-foreground",
        nested ? "bg-surface-2" : "bg-card",
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
