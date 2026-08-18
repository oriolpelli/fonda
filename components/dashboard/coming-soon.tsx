import type { Dictionary } from "@/app/[lang]/dictionaries";
import {
  EmptyState,
  isEmptyStateIcon,
} from "@/components/dashboard/empty-state";
import { roadmapFeature, type RoadmapKey } from "@/lib/roadmap";

/**
 * The shared "not built yet" page state for anything in `lib/roadmap.ts`.
 *
 * Deliberately inert: a mono eyebrow saying Coming soon, the feature's name,
 * and one line about what it will do. No buttons that don't work, no sample
 * numbers, no spinner pretending something is loading — a GM who clicks it
 * mid-demo should learn what's coming, not wonder whether it broke.
 */
export function ComingSoon({
  featureKey,
  dict,
}: {
  featureKey: RoadmapKey;
  dict: Dictionary;
}) {
  const feature = roadmapFeature(featureKey);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-1">
        <span className="font-mono text-[12px] font-medium uppercase tracking-[0.14em] text-[var(--fonda-text-3)]">
          {dict.roadmap.badge}
        </span>
        <h1 className="text-3xl font-semibold tracking-[-0.025em] text-foreground">
          {feature.label(dict)}
        </h1>
      </div>
      {/* A roadmap key without its own icon falls back to the generic one, so
          adding a feature never means touching this component. */}
      <EmptyState
        icon={isEmptyStateIcon(featureKey) ? featureKey : "upcoming"}
        message={feature.blurb(dict)}
      />
    </div>
  );
}
