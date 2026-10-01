import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

import { loadDictionary, type Dictionary } from "@/app/[lang]/dictionaries";
import { GuestAvatar } from "@/components/dashboard/guest-avatar";
import { Fact, Section } from "@/components/dashboard/guest-context-panel";
import { GuestNotes } from "@/components/dashboard/guest-notes";
import { GuestTags } from "@/components/dashboard/guest-tags";
import { getHotel, getSessionProfile } from "@/lib/auth";
import {
  inferencePaused,
  inferGuestProfile,
  shouldInfer,
  type InferenceInput,
} from "@/lib/guest-inference";
import {
  loadGuestRecord,
  type GuestProfile,
  type GuestRecord,
} from "@/lib/guests";
import { intlLocale, type Locale } from "@/lib/i18n/config";
import { localizedHref } from "@/lib/i18n/navigation";
import { plural, t } from "@/lib/i18n/format";
import { timed } from "@/lib/timing";

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

  // Start the hotel read alongside the session (lib/auth.ts) — the record
  // loader needs its timezone and awaits this same promise.
  getHotel().catch(() => null);

  // Shared with the dashboard layout's lookup in the same render (lib/auth.ts).
  const profile = await timed("guest.session", getSessionProfile());
  if (!profile?.hotelId) redirect(localizedHref(locale, "/dashboard"));

  const customerId = decodeURIComponent(guestId);
  const record = await timed(
    "guest.record",
    loadGuestRecord(profile.hotelId, customerId)
  );
  if (!record) notFound();

  /**
   * Inference runs LAZILY, on first view — never on a cron.
   *
   * Inferring about every guest of every hotel nightly would be expensive and
   * slightly rude: most records are never opened, and a guess nobody reads is a
   * guess not worth making. `shouldInfer` also rate-limits it to once a day
   * unless new mail has arrived since, and a recent failure pauses it
   * (lib/guest-inference.ts).
   *
   * It no longer holds the page. The record renders at once from what is
   * stored; when a run is due, the tags and preferences stream in behind it
   * (`InferredProfile`), and until then show what was there in a quiet
   * "updating" state. Before 1 Oct the whole record waited one to three
   * seconds on the model, and on every view while it was failing
   * (docs/audits/2026-10-01-performance.md §4.7).
   */
  const inferring =
    shouldInfer(record.profile, record.latestEmailAt) &&
    !inferencePaused(profile.hotelId, customerId);
  const storedProfile = (
    <ProfileTags
      customerId={record.customerId}
      profile={record.profile}
      dict={dict}
      updating={inferring}
    />
  );

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

          {inferring ? (
            <Suspense fallback={storedProfile}>
              <InferredProfile
                input={inferenceInputFor(record, profile.hotelId, customerId)}
                customerId={record.customerId}
                dict={dict}
              />
            </Suspense>
          ) : (
            storedProfile
          )}

          {/* Outside the Suspense on purpose: inference never writes notes
              (lib/guest-inference.ts rule 1), so the editor is live from the
              first paint and nothing streaming in can remount it mid-sentence. */}
          <div>
            <p className="pb-2 font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--fonda-text-3)]">
              {dict.guests.notesTitle}
            </p>
            <GuestNotes
              customerId={record.customerId}
              initialNotes={record.profile.notes}
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

/** What the model is given about this record (lib/guest-inference.ts). */
function inferenceInputFor(
  record: GuestRecord,
  hotelId: string,
  customerId: string
): InferenceInput {
  const weekendStay = Boolean(
    record.arrival &&
      [5, 6].includes(new Date(`${record.arrival}T00:00:00Z`).getUTCDay())
  );
  return {
    hotelId,
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
    names: [
      {
        first: record.name.split(" ")[0] ?? null,
        last: record.name.split(" ").slice(1).join(" ") || null,
      },
    ],
    existing: record.profile,
  };
}

/**
 * The tags and preferences once a due inference run has finished — merged
 * under the two write rules, or the stored profile if the run failed or was
 * paused. Streams into the `<Suspense>` the page wraps it in.
 */
async function InferredProfile({
  input,
  customerId,
  dict,
}: {
  input: InferenceInput;
  customerId: string;
  dict: Dictionary;
}) {
  const inferred = await timed("guest.inference", inferGuestProfile(input));
  return <ProfileTags customerId={customerId} profile={inferred} dict={dict} />;
}

/**
 * The two tags and the preference list.
 *
 * `updating` is the state while a run is in flight: the stored values, with a
 * quiet working line naming Fondas AI (§11's soft pulse, not a spinner) and
 * the two pickers held. Held, not just dimmed: a tag a GM picked during the run
 * could be overwritten by the run's write, which read the profile before the
 * pick — and a staff value is never overwritten (lib/guest-inference.ts rule 2).
 */
function ProfileTags({
  customerId,
  profile,
  dict,
  updating = false,
}: {
  customerId: string;
  profile: GuestProfile;
  dict: Dictionary;
  updating?: boolean;
}) {
  return (
    <>
      <div>
        <p className="pb-2 font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--fonda-text-3)]">
          {dict.guests.tagsTitle}
        </p>
        {updating ? (
          <p
            role="status"
            className="mb-2 inline-flex items-center gap-1.5 text-[11px] leading-none text-[var(--fonda-text-3)]"
          >
            <span
              aria-hidden="true"
              className="size-1.5 animate-pulse rounded-full bg-[var(--fonda-text-3)]"
            />
            {dict.guests.inferenceUpdating}
          </p>
        ) : null}
        <GuestTags
          customerId={customerId}
          tripPurpose={profile.tripPurpose}
          occasion={profile.occasion}
          tripPurposeSource={profile.tripPurposeSource}
          occasionSource={profile.occasionSource}
          inferredAt={profile.inferredAt}
          disabled={updating}
        />
      </div>

      {profile.preferences.length > 0 ? (
        <div>
          <p className="pb-2 font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--fonda-text-3)]">
            {dict.guests.preferencesTitle}
          </p>
          {/* Inferred vs staff must be tellable at a glance, not only on
              hover (AI_ACT_PROMPTS.md A3): an inferred preference carries a
              quiet mono "Fondas AI" after it, and its full source ("Inferred
              by Fondas AI from email") is in the title for hover and in
              sr-only text for screen readers. A staff entry carries
              nothing — it is the default, and a person's word. */}
          <ul className="flex flex-col gap-1.5">
            {profile.preferences.map((pref) => {
              const source =
                pref.source === "staff"
                  ? dict.guests.sourceStaff
                  : pref.source === "email"
                    ? dict.guests.sourceEmail
                    : dict.guests.sourceReservation;
              return (
                <li
                  key={pref.text}
                  title={source}
                  className="text-[13px] leading-snug text-[var(--fonda-text-2)]"
                >
                  {pref.text}
                  {pref.source === "staff" ? null : (
                    <>
                      <span
                        aria-hidden="true"
                        className="ml-1.5 font-mono text-[10.5px] tracking-[0.04em] text-[var(--fonda-text-3)]"
                      >
                        · {dict.ai.inferredMark}
                      </span>
                      <span className="sr-only"> ({source})</span>
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </>
  );
}
