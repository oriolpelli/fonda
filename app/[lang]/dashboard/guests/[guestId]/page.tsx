import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { loadDictionary } from "@/app/[lang]/dictionaries";
import { GuestAvatar } from "@/components/dashboard/guest-avatar";
import { Fact, Section } from "@/components/dashboard/guest-context-panel";
import { GuestNotes } from "@/components/dashboard/guest-notes";
import { GuestTags } from "@/components/dashboard/guest-tags";
import { inferGuestProfile, shouldInfer } from "@/lib/guest-inference";
import { loadGuestRecord } from "@/lib/guests";
import { intlLocale, type Locale } from "@/lib/i18n/config";
import { localizedHref } from "@/lib/i18n/navigation";
import { plural, t } from "@/lib/i18n/format";
import { createClient } from "@/lib/supabase/server";

/**
 * Guests v1 — the record (APP_UX_PROPOSAL.md §5.4).
 *
 * A 280px left column of facts, tags and the staff note, and a timeline on the
 * right that merges mail, arrival-time requests and prior stays into one
 * reverse-chronological list. Not three tabs: what a GM is reconstructing is a
 * sequence, and tabs make the reader do the interleaving.
 */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string; guestId: string }>;
}): Promise<Metadata> {
  const { dict } = await loadDictionary((await params).lang);
  return { title: dict.guests.title };
}

function displayName(
  locale: Locale,
  type: "region" | "language",
  code: string | null
): string | null {
  if (!code) return null;
  try {
    return new Intl.DisplayNames([intlLocale[locale]], { type }).of(code) ?? code;
  } catch {
    return code;
  }
}

export default async function GuestRecordPage({
  params,
}: {
  params: Promise<{ lang: string; guestId: string }>;
}) {
  const { lang, guestId } = await params;
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

  const customerId = decodeURIComponent(guestId);
  const record = await loadGuestRecord(profile.hotel_id, customerId);
  if (!record) notFound();

  /**
   * Inference runs LAZILY, here, on first view — never on a cron.
   *
   * Inferring about every guest of every hotel nightly would be expensive and
   * slightly rude: most records are never opened, and a guess nobody reads is a
   * guess not worth making. `shouldInfer` also rate-limits it to once a day
   * unless new mail has arrived since.
   */
  let guestProfile = record.profile;
  if (shouldInfer(guestProfile, record.latestEmailAt)) {
    const weekendStay = Boolean(
      record.arrival &&
        [5, 6].includes(new Date(`${record.arrival}T00:00:00Z`).getUTCDay())
    );
    guestProfile = await inferGuestProfile({
      hotelId: profile.hotel_id,
      customerMewsId: customerId,
      emails: record.timeline
        .filter((e) => e.kind === "email")
        .slice(0, 12)
        .map((e) => ({ subject: e.title, body: null })),
      stay: {
        adults: record.adults,
        children: record.children,
        nights: record.nights,
        weekend: weekendStay,
        leadTimeDays: null,
      },
      names: [{ first: record.name.split(" ")[0] ?? null, last: record.name.split(" ").slice(1).join(" ") || null }],
      existing: guestProfile,
    });
  }

  const dateFmt = new Intl.DateTimeFormat(intlLocale[locale], {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const stayDates =
    record.arrival && record.departure
      ? `${dateFmt.format(new Date(`${record.arrival}T00:00:00Z`))} – ${dateFmt.format(new Date(`${record.departure}T00:00:00Z`))}`
      : null;

  const kindLabel: Record<string, string> = {
    email: dict.guests.kindEmail,
    chaser: dict.guests.kindChaser,
    stay: dict.guests.kindStay,
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <GuestAvatar name={record.name} />
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-semibold tracking-[-0.02em] text-foreground">
            {record.name}
          </h1>
          {record.priorStays > 0 ? (
            <p className="text-[12px] text-[var(--fonda-text-3)]">
              {t(
                plural(
                  record.priorStays,
                  dict.guestContext.returningOne,
                  dict.guestContext.returningOther
                ),
                { count: record.priorStays }
              )}
            </p>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <div className="flex flex-col gap-5 rounded-[16px] bg-card p-5">
          <Section title={dict.guestContext.stay}>
            <Fact label={dict.guestContext.stay} value={stayDates} />
            <Fact
              label={dict.guestContext.nights}
              value={
                record.nights
                  ? t(
                      plural(
                        record.nights,
                        dict.guestContext.nightsOne,
                        dict.guestContext.nights
                      ),
                      { count: record.nights }
                    )
                  : null
              }
            />
            <Fact label={dict.guestContext.roomType} value={record.roomType} />
          </Section>

          <Section title={dict.guestContext.facts}>
            <Fact
              label={dict.guestContext.nationality}
              value={displayName(locale, "region", record.nationalityCode)}
            />
            <Fact
              label={dict.guestContext.language}
              value={displayName(locale, "language", record.languageCode)}
            />
            <Fact
              label={dict.guestContext.adults}
              value={record.adults ? String(record.adults) : null}
            />
            <Fact
              label={dict.guestContext.children}
              value={record.children ? String(record.children) : null}
            />
          </Section>

          <div>
            <p className="pb-2 font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--fonda-text-3)]">
              {dict.guests.tagsTitle}
            </p>
            <GuestTags
              customerId={record.customerId}
              tripPurpose={guestProfile.tripPurpose}
              occasion={guestProfile.occasion}
              inferredAt={guestProfile.inferredAt}
            />
          </div>

          {guestProfile.preferences.length > 0 ? (
            <div>
              <p className="pb-2 font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--fonda-text-3)]">
                {dict.guests.preferencesTitle}
              </p>
              <ul className="flex flex-col gap-1.5">
                {guestProfile.preferences.map((pref) => (
                  <li
                    key={pref.text}
                    title={
                      pref.source === "staff"
                        ? dict.guests.sourceStaff
                        : pref.source === "email"
                          ? dict.guests.sourceEmail
                          : dict.guests.sourceReservation
                    }
                    className="text-[13px] leading-snug text-[var(--fonda-text-2)]"
                  >
                    {pref.text}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div>
            <p className="pb-2 font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--fonda-text-3)]">
              {dict.guests.notesTitle}
            </p>
            <GuestNotes
              customerId={record.customerId}
              initialNotes={guestProfile.notes}
            />
          </div>
        </div>

        <div className="rounded-[16px] bg-card p-5">
          <p className="pb-3 font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--fonda-text-3)]">
            {dict.guests.timelineTitle}
          </p>
          {record.timeline.length === 0 ? (
            <p className="text-[13px] text-[var(--fonda-text-3)]">
              {dict.guests.timelineEmpty}
            </p>
          ) : (
            <ol className="flex flex-col divide-y divide-border-2">
              {record.timeline.map((entry, i) => (
                <li key={`${entry.kind}-${entry.at}-${i}`} className="py-3">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--fonda-text-3)]">
                      {kindLabel[entry.kind]}
                    </span>
                    <span className="shrink-0 text-[12px] text-[var(--fonda-text-3)]">
                      {dateFmt.format(new Date(entry.at))}
                    </span>
                  </div>
                  <p className="mt-1 text-[13px] text-[var(--fonda-text)]">
                    {entry.href ? (
                      <Link
                        href={localizedHref(locale, entry.href)}
                        className="underline-offset-4 hover:underline"
                      >
                        {entry.title || kindLabel[entry.kind]}
                      </Link>
                    ) : (
                      entry.title || kindLabel[entry.kind]
                    )}
                    {entry.detail ? (
                      <span className="text-[var(--fonda-text-3)]">
                        {" · "}
                        {entry.detail}
                      </span>
                    ) : null}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </div>
  );
}
