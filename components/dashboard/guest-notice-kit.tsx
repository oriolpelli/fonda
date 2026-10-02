import type { Dictionary } from "@/app/[lang]/dictionaries";
import { getDictionary } from "@/app/[lang]/dictionaries";
import { CopyButton } from "@/components/dashboard/copy-button";
import { locales } from "@/lib/i18n/config";
import { t } from "@/lib/i18n/format";

/**
 * "Wording for your privacy notice" (AI_ACT_PROMPTS.md A7).
 *
 * The hotel is the GDPR controller and has to tell guests how their data is
 * used (Art. 13–14); hotels won't write the AI part themselves, so we hand
 * them the paragraph — in all three languages, whatever language the viewer
 * reads the dashboard in, because a hotel's notice usually exists in several.
 *
 * Each language's paragraph lives in that language's dictionary
 * (`settings.guestNotice.text`), and the copy button copies that same string:
 * what is copied is exactly what is shown.
 *
 * EVERY CLAIM IS THE CODE'S. "A member of our team approves every reply"
 * — sendReply and the recorded bulk confirmation (A4). "24 months after your
 * last stay" — the retention cron (app/api/cron/retention). "Not used to train
 * AI models" — Anthropic's commercial terms, as /trust says. Change any of
 * those and this text changes with it, in all three files.
 */
export async function GuestNoticeKit({ dict }: { dict: Dictionary }) {
  const copy = dict.settings.guestNotice;
  const all = await Promise.all(
    locales.map(async (locale) => ({
      locale,
      notice: (await getDictionary(locale)).settings.guestNotice,
    }))
  );

  return (
    <section className="flex flex-col gap-4 rounded-[16px] bg-card p-6">
      <div className="flex flex-col gap-1.5">
        <h2 className="text-[17px] font-semibold tracking-[-0.01em] text-foreground">
          {copy.title}
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground">{copy.body}</p>
        <p className="text-sm font-medium text-[var(--fonda-text-2)]">{copy.template}</p>
      </div>
      <div className="flex flex-col gap-3">
        {all.map(({ locale, notice }) => (
          <div
            key={locale}
            lang={locale}
            className="flex flex-col gap-2 rounded-[10px] bg-[var(--fonda-surface-2)] p-4"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--fonda-text-3)]">
                {notice.language}
              </span>
              <CopyButton
                text={notice.text}
                label={copy.copy}
                copiedLabel={copy.copied}
                ariaLabel={t(copy.copyLabel, { language: notice.language })}
              />
            </div>
            <p className="text-[14px] leading-[1.6] text-[var(--fonda-text)]">
              {notice.text}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
