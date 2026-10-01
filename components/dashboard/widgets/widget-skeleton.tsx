import { Skeleton } from "@/components/ui/skeleton";
import type { HomeWidgetKey } from "@/lib/home-widgets";
import { cn } from "@/lib/utils";

/**
 * Home's widget placeholders, in the three shapes Home's cards come in. Used
 * twice:
 *
 * - by `app/[lang]/dashboard/loading.tsx`, before anything is known — a
 *   generic rhythm, because the user's layout isn't known yet either;
 * - by Home itself, as each widget's `<Suspense>` fallback, once the layout IS
 *   known — so every slot holds its widget's own shape until that widget's
 *   data lands (docs/audits/2026-10-01-performance.md §4.4).
 *
 * Card material is exact — the well, `rounded-[16px]`, no outer hairline, no
 * shadow (FONDA_SANA_REDESIGN.md §0.1) — because that is what makes the swap
 * invisible whichever widget arrives. Blocks are `--fonda-surface-2` with a
 * gentle pulse (§11), which the global reduced-motion rule stills.
 */

export type WidgetSkeletonShape = "rows" | "band" | "list";

/** Which shape stands in for which widget. */
export function skeletonShapeFor(key: HomeWidgetKey): WidgetSkeletonShape {
  switch (key) {
    case "needs-you":
      return "rows";
    case "brief":
    case "numbers":
    case "outlook":
      return "band";
    default:
      return "list";
  }
}

/** One widget slot: the heading row every widget carries, then its card. */
export function WidgetSkeleton({
  shape,
  titleWidth = "w-32",
  rows = 3,
  className,
}: {
  shape: WidgetSkeletonShape;
  /** Roughly the width of a real title, so the row doesn't resize on swap. */
  titleWidth?: string;
  /** For "rows" and "list": how many lines to draw. */
  rows?: number;
  className?: string;
}) {
  return (
    <div className={className} aria-hidden="true">
      <div className="mb-3 flex items-baseline justify-between gap-4">
        <Skeleton className={cn("h-4", titleWidth)} />
        <Skeleton className="h-3 w-20" />
      </div>
      {shape === "rows" ? (
        <RowsCard rows={rows} />
      ) : shape === "band" ? (
        <BandCard />
      ) : (
        <ListCard rows={rows} />
      )}
    </div>
  );
}

/** "Needs you today": a ranked list — a marker and a line per item. */
function RowsCard({ rows }: { rows: number }) {
  return (
    <div className="flex flex-col divide-y divide-border-2 overflow-hidden rounded-[16px] bg-card">
      {Array.from({ length: rows }).map((_, row) => (
        <div key={row} className="flex items-start gap-3 px-6 py-4">
          <Skeleton className="mt-[7px] size-[7px] shrink-0 rounded-[2px]" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      ))}
    </div>
  );
}

/**
 * A full-width band: two lines and a meta line. Whatever goes here — a brief
 * teaser, the four numbers, the 14-night strip — is a card of roughly this
 * height.
 */
function BandCard() {
  return (
    <div className="flex flex-col gap-3 rounded-[16px] bg-card p-6">
      <div className="flex min-w-0 flex-col gap-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
      <Skeleton className="h-3 w-48" />
    </div>
  );
}

/**
 * The list card the half-width widgets share: an avatar, two lines, one meta.
 * No footer row: the "+N more" door only appears past eight guests, and a
 * skeleton must not promise a control the data may not bring.
 */
function ListCard({ rows }: { rows: number }) {
  return (
    <div className="flex flex-col divide-y divide-border-2 overflow-hidden rounded-[16px] bg-card">
      {Array.from({ length: rows }).map((_, row) => (
        <div
          key={row}
          className="flex items-start justify-between gap-4 px-6 py-4"
        >
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <Skeleton className="mt-0.5 size-8 shrink-0 rounded-full" />
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          </div>
          <Skeleton className="h-3 w-12 shrink-0" />
        </div>
      ))}
    </div>
  );
}
