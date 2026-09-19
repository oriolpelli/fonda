import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { loadDictionary } from "@/app/[lang]/dictionaries";
import { EmptyState } from "@/components/dashboard/empty-state";
import { GuestAvatar } from "@/components/dashboard/guest-avatar";
import { listGuests, type GuestView } from "@/lib/guests";
import { guestHref, localizedHref } from "@/lib/i18n/navigation";
import { intlLocale, type Locale } from "@/lib/i18n/config";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

/**
 * Guests v1 — the list (APP_UX_PROPOSAL.md §5.4).
 *
 * View and search both live in the URL, read on the server. Same property the
 * inbox has: the page you are looking at is the page you can link somebody to,
 * and nothing re-sorts itself after paint.
 */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { dict } = await loadDictionary((await params).lang);
  return { title: dict.guests.title };
}

function Chip({ children }: { children: React.ReactNode }) {
  // 12px, full-round, NO hue (§7.3 — colour is content, and a tag is chrome).
  return (
    <span className="shrink-0 rounded-full bg-[var(--fonda-bg)] px-2 py-0.5 text-[12px] leading-[1.5] text-[var(--fonda-text-2)] ring-1 ring-[var(--fonda-border-2)]">
      {children}
    </span>
  );
}

function stayLine(
  locale: Locale,
  arrival: string | null,
  departure: string | null
): string | null {
  if (!arrival && !departure) return null;
  const fmt = new Intl.DateTimeFormat(intlLocale[locale], {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
  const at = (d: string) => fmt.format(new Date(`${d}T00:00:00Z`));
  if (arrival && departure) return `${at(arrival)} – ${at(departure)}`;
  return at((arrival ?? departure)!);
}

export default async function GuestsPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const [{ lang }, query] = await Promise.all([params, searchParams]);
  const { locale, dict } = await loadDictionary(lang);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("users")
    .select("hotel_id")
    .eq("id", user?.id ?? "")
    .maybeSingle();
  if (!profile?.hotel_id) redirect(localizedHref(locale, "/dashboard"));

  const view: GuestView =
    query.view === "all" ? "all" : "in_house_and_arriving";
  const q = typeof query.q === "string" ? query.q : "";

  const guests = await listGuests(profile.hotel_id, { view, q });

  const viewHref = (next: GuestView) => {
    const p = new URLSearchParams();
    if (next === "all") p.set("view", "all");
    if (q) p.set("q", q);
    const search = p.toString();
    return localizedHref(
      locale,
      `/dashboard/guests${search ? `?${search}` : ""}`
    );
  };

  const purposeLabels = dict.guests.purpose as Record<string, string>;
  const occasionLabels = dict.guests.occasion as Record<string, string>;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <span className="font-mono text-[12px] font-medium uppercase tracking-[0.14em] text-[var(--fonda-text-3)]">
          {dict.guests.eyebrow}
        </span>
        <h1 className="text-3xl font-semibold tracking-[-0.025em] text-foreground">
          {dict.guests.title}
        </h1>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {/* A GET form, so the query lands in the URL and the server reads it. */}
        <form action={localizedHref(locale, "/dashboard/guests")} className="flex-1">
          {view === "all" ? (
            <input type="hidden" name="view" value="all" />
          ) : null}
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder={dict.guests.search}
            aria-label={dict.guests.search}
            className="h-11 w-full max-w-[380px] rounded-[10px] border border-input bg-surface px-4 text-sm transition-colors duration-[180ms] placeholder:text-[var(--fonda-text-3)] focus-visible:border-ring focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--fonda-accent-tint)]"
          />
        </form>

        <div
          role="group"
          className="inline-flex shrink-0 rounded-[10px] border border-[var(--fonda-border-2)] p-0.5"
        >
          {(["in_house_and_arriving", "all"] as const).map((value) => (
            <Link
              key={value}
              href={viewHref(value)}
              aria-current={view === value ? "page" : undefined}
              className={cn(
                "rounded-[8px] px-3 py-1.5 text-[13px] font-medium transition-colors",
                view === value
                  ? "bg-[var(--fonda-ink)] text-[var(--fonda-text-inv)]"
                  : "text-[var(--fonda-text-2)] hover:text-foreground"
              )}
            >
              {value === "all" ? dict.guests.viewAll : dict.guests.viewInHouse}
            </Link>
          ))}
        </div>
      </div>

      {guests.length === 0 ? (
        <EmptyState
          icon="guests"
          message={
            q
              ? dict.guests.emptySearch
              : view === "all"
                ? dict.guests.emptyAll
                : dict.guests.empty
          }
        />
      ) : (
        <div className="flex flex-col divide-y divide-border-2 overflow-hidden rounded-[16px] bg-card">
          {guests.map((g) => (
            <Link
              key={g.customerId}
              href={guestHref(locale, g.customerId)}
              className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-[color-mix(in_srgb,var(--fonda-inset)_50%,transparent)]"
            >
              <GuestAvatar name={g.name} />
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="truncate text-sm font-medium text-foreground">
                  {g.name}
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  {[stayLine(locale, g.arrival, g.departure), g.roomType]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </div>
              <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
                {g.tripPurpose && g.tripPurpose !== "unknown" ? (
                  <Chip>{purposeLabels[g.tripPurpose] ?? g.tripPurpose}</Chip>
                ) : null}
                {g.occasion ? (
                  <Chip>{occasionLabels[g.occasion] ?? g.occasion}</Chip>
                ) : null}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
