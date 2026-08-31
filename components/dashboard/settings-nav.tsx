import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import type { SettingsGroup, SettingsGroupKey } from "@/lib/settings-groups";
import { cn } from "@/lib/utils";

/**
 * The header every Settings group page shares: a way back to the menu, the
 * group's title and blurb, and a sub-nav across the sibling groups so moving
 * between them never costs a trip through the menu.
 *
 * A plain Server Component — the active group is passed in by the page that
 * renders it, so nothing here needs the pathname (or the client).
 *
 * States are monochrome, like the icon rail (FONDA_SANA_REDESIGN.md §5.2): the
 * active tab is darkness on a greige inset, never a hue.
 */
export function SettingsGroupHeader({
  title,
  desc,
  groups,
  active,
  navLabel,
  backHref,
  backLabel,
}: {
  title: string;
  desc: string;
  groups: SettingsGroup[];
  active: SettingsGroupKey;
  /** Accessible name for the sub-nav landmark. */
  navLabel: string;
  /** The Settings menu this group was clicked into from. */
  backHref: string;
  backLabel: string;
}) {
  return (
    <div className="flex flex-col gap-5">
      <Link
        href={backHref}
        className="inline-flex w-fit items-center gap-1.5 text-[13px] font-medium text-[var(--fonda-text-3)] transition-colors duration-[180ms] hover:text-foreground"
      >
        <ArrowLeft className="size-[14px]" strokeWidth={1.5} />
        {backLabel}
      </Link>

      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-semibold tracking-[-0.025em] text-foreground">
          {title}
        </h1>
        <p className="text-muted-foreground">{desc}</p>
      </div>

      {/* Horizontally scrollable rather than wrapping: three chips fit a phone
          in English, but not in every language. */}
      <nav
        aria-label={navLabel}
        className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1"
      >
        {groups.map((group) => {
          const isActive = group.key === active;
          return (
            <Link
              key={group.key}
              href={group.href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "shrink-0 rounded-[10px] px-3 py-2 text-sm font-medium transition-colors duration-[180ms]",
                isActive
                  ? "bg-[var(--fonda-inset)] text-foreground"
                  : "text-[var(--fonda-text-2)] hover:bg-[var(--fonda-surface-2)] hover:text-foreground"
              )}
            >
              {group.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
