import Link from "next/link";

import type { Dictionary } from "@/app/[lang]/dictionaries";
import { intlLocale, type Locale } from "@/lib/i18n/config";
import { t } from "@/lib/i18n/format";
import { checkinsHref, communicationsHref } from "@/lib/i18n/navigation";
import type { TodoItem, TodoTarget } from "@/lib/todo-rules";
import { cn } from "@/lib/utils";

/**
 * "Do this first" — the ranked list of what actually needs the GM today.
 *
 * The ranking lives in lib/todo-rules.ts, which is pure and knows no language;
 * this file only turns each item into a sentence and a destination. Where an
 * item has a variant (one overdue email vs. several), the choice of template
 * happens here rather than in the rules, so translators see whole sentences.
 *
 * One navy marker only — the top item. Every other marker is muted. The design
 * identity allows 2–3 uses of the signal colour per screen and tonight's column
 * in the occupancy strip already claims one.
 *
 * No heading and no empty branch of its own: on Home both belong to
 * `needs-you-widget.tsx`, which owns the widget slot this list sits in
 * (APP_UX_PROPOSAL.md §3.2). Hand it a non-empty `items` — an empty array
 * renders an empty card.
 */

function href(locale: Locale, target: TodoTarget): string {
  switch (target.page) {
    case "communications":
      return communicationsHref(locale, target.emailId);
    case "checkins":
      return checkinsHref(locale);
    case "occupancy":
      // The 14-day strip is on this page — scroll to it rather than navigate.
      return "#occupancy";
  }
}

/** One item as a finished sentence in the reader's language. */
function sentence(
  dict: Dictionary,
  locale: Locale,
  item: TodoItem
): string {
  const todo = dict.home.todo;
  const others = Number(item.vars.others ?? 0);

  switch (item.kind) {
    case "complaint":
      return t(todo.complaint, item.vars);
    case "vip_no_note":
      return t(todo.vipNoNote, item.vars);
    case "unconfirmed_etas":
      return t(todo.unconfirmedEtas, item.vars);
    case "waiting_email":
      return t(
        others > 0 ? todo.waitingEmailOthers : todo.waitingEmail,
        item.vars
      );
    case "low_occupancy": {
      // The rules hand over a plain YYYY-MM-DD; a GM wants "Thu 6 Aug".
      const date = new Intl.DateTimeFormat(intlLocale[locale], {
        timeZone: "UTC",
        weekday: "short",
        day: "numeric",
        month: "short",
      }).format(new Date(`${item.vars.date}T00:00:00Z`));
      return t(others > 0 ? todo.lowOccupancyOthers : todo.lowOccupancy, {
        ...item.vars,
        date,
      });
    }
  }
}

export function TodoList({
  dict,
  locale,
  items,
  showPrimary = true,
}: {
  dict: Dictionary;
  locale: Locale;
  items: TodoItem[];
  /**
   * Whether the list's first item may lead by darkness. False on the Morning
   * Brief's "Since the brief" block (APP_UX_PROPOSAL.md §5.1): the gradient
   * hero already owns that page's one accent, and `buildTodoList` marks a
   * primary item regardless of where its output is rendered.
   */
  showPrimary?: boolean;
}) {
  return (
    // overflow-hidden so a row's hover fill is clipped by the card's 18px
    // corners — the rows used to start below a heading, never at the radius.
    <div className="flex flex-col overflow-hidden rounded-[18px] bg-card shadow-card">
      <ul className="flex flex-col divide-y divide-border">
        {items.map((item) => (
          <li key={item.id}>
            <Link
              href={href(locale, item.target)}
              className="flex items-start gap-3 px-6 py-4 transition-colors hover:bg-muted"
            >
              <span
                aria-hidden
                className={cn(
                  "mt-[7px] size-[7px] shrink-0 rounded-[2px]",
                  // Ink, not navy (§10): chrome is colourless in v3, and the
                  // page's one accent belongs to the occupancy strip. The
                  // primary item still leads by darkness.
                  item.primary && showPrimary
                    ? "bg-[var(--fonda-text)]"
                    : "bg-[var(--fonda-text-3)]"
                )}
              />
              <span className="text-sm leading-relaxed text-foreground">
                {sentence(dict, locale, item)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
