import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn(
        // v4 (§0.1): --fonda-surface-2 is the default because a skeleton is
        // usually laid on the CANVAS, where it needs to be seen — #ece7dd is
        // 1.19:1 on white, against --fonda-surface's 1.11:1. Inside a well it
        // is faint (1.07:1); pass `bg-inset` there, which is 1.19:1 on the well
        // and the same size of step the default gets on the canvas.
        "animate-pulse rounded-[10px] bg-surface-2",
        className
      )}
      {...props}
    />
  );
}

export { Skeleton };
