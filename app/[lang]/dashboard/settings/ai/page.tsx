import type { Metadata } from "next";
import Link from "next/link";

import { loadDictionary } from "@/app/[lang]/dictionaries";
import { AiLiteracyDialog } from "@/components/dashboard/ai-literacy-dialog";
import { literacyCookieValue } from "@/components/dashboard/ai-literacy-gate";
import { SettingsGroupHeader } from "@/components/dashboard/settings-nav";
import { getSessionProfile } from "@/lib/auth";
import {
  AI_LITERACY_VERSION,
  standings,
  type LiteracyAck,
} from "@/lib/ai-literacy";
import { intlLocale } from "@/lib/i18n/config";
import { localizedHref } from "@/lib/i18n/navigation";
import { settingsGroups } from "@/lib/settings-groups";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { dict } = await loadDictionary((await params).lang);
  return { title: dict.settings.groups.ai.label };
}

/**
 * Settings → AI at Fondas (AI_ACT_PROMPTS.md A6).
 *
 *   Working with Fondas AI   the five cards again, and a printable page
 *   Who has read them        owner/manager only: completion and date per
 *                            person, and the CSV — the hotel's Art. 4
 *                            evidence. Completion only: no scores, no time
 *                            spent, no ranking (ROADMAP §5 #10)
 *
 * Reads run together, through RLS: the team (users: read own hotel) and the
 * record (ai_literacy_acks: own rows, or every row for an owner/manager).
 */
export default async function AiSettingsPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { locale, dict } = await loadDictionary((await params).lang);
  const copy = dict.settings.aiPage;

  const [profile, supabase] = await Promise.all([
    getSessionProfile(),
    createClient(),
  ]);
  const canSeeRecord = profile?.role === "owner" || profile?.role === "manager";

  const [people, acks] = canSeeRecord
    ? await Promise.all([
        supabase.from("users").select("id, email").order("email"),
        supabase
          .from("ai_literacy_acks")
          .select("user_id, version, status, completed_at, created_at")
          .order("created_at", { ascending: false })
          .limit(1000),
      ])
    : [null, null];
  const recordAvailable = Boolean(people && acks && !people.error && !acks.error);
  const rows = recordAvailable
    ? standings(people!.data ?? [], (acks!.data ?? []) as LiteracyAck[])
    : [];

  const date = new Intl.DateTimeFormat(intlLocale[locale], {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const statusLabel = {
    completed: copy.statusCompleted,
    skipped: copy.statusSkipped,
    "not-yet": copy.statusNotYet,
  } as const;

  return (
    <div className="flex max-w-2xl flex-col gap-8">
      <SettingsGroupHeader
        title={dict.settings.groups.ai.label}
        desc={dict.settings.groups.ai.desc}
        groups={settingsGroups(locale, dict)}
        active="ai"
        navLabel={dict.settings.groups.navLabel}
        backHref={localizedHref(locale, "/dashboard/settings")}
        backLabel={dict.settings.groups.back}
      />

      <section className="flex flex-col gap-4 rounded-[16px] bg-card p-6">
        <div className="flex flex-col gap-1.5">
          <h2 className="text-[17px] font-semibold tracking-[-0.01em] text-foreground">
            {copy.literacyTitle}
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {copy.literacyBody}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {profile ? (
            <AiLiteracyDialog
              cookieValue={literacyCookieValue(profile.id)}
              trigger={copy.open}
            />
          ) : null}
          <Link
            href={localizedHref(locale, "/dashboard/settings/ai/guide")}
            className="text-sm font-medium text-foreground underline decoration-border underline-offset-4 transition-colors duration-[180ms] hover:decoration-foreground"
          >
            {copy.print}
          </Link>
        </div>
      </section>

      {canSeeRecord ? (
        <section className="flex flex-col gap-4 rounded-[16px] bg-card p-6">
          <div className="flex flex-col gap-1.5">
            <h2 className="text-[17px] font-semibold tracking-[-0.01em] text-foreground">
              {copy.recordTitle}
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {copy.recordBody}
            </p>
          </div>
          {recordAvailable ? (
            <>
              <div className="overflow-x-auto rounded-[10px] bg-[var(--fonda-surface-2)]">
                <table className="w-full min-w-[420px] text-left text-sm">
                  <thead>
                    <tr className="font-mono text-[11px] uppercase tracking-[0.1em] text-[var(--fonda-text-3)]">
                      <th className="px-4 py-2.5 font-medium">{copy.recordPerson}</th>
                      <th className="px-4 py-2.5 font-medium">{copy.recordStatus}</th>
                      <th className="px-4 py-2.5 font-medium">{copy.recordDate}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={row.userId} className="border-t border-[var(--fonda-border)]">
                        <td className="px-4 py-2.5 text-foreground">{row.email}</td>
                        <td className="px-4 py-2.5 text-[var(--fonda-text-2)]">
                          {statusLabel[row.status]}
                        </td>
                        <td className="px-4 py-2.5 tabular-nums text-[var(--fonda-text-2)]">
                          {row.at ? date.format(new Date(row.at)) : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="flex flex-wrap items-center justify-between gap-3 text-[13px] text-[var(--fonda-text-3)]">
                <span className="font-mono">
                  {copy.recordVersion} {AI_LITERACY_VERSION}
                </span>
                <a
                  href={localizedHref(locale, "/dashboard/settings/ai/record")}
                  download
                  className="text-sm font-medium text-foreground underline decoration-border underline-offset-4 transition-colors duration-[180ms] hover:decoration-foreground"
                >
                  {copy.download}
                </a>
              </p>
            </>
          ) : (
            <p className="text-sm text-[var(--fonda-text-3)]">{copy.recordUnavailable}</p>
          )}
        </section>
      ) : null}
    </div>
  );
}
