import Link from "next/link";

import type { Dictionary } from "@/app/[lang]/dictionaries";
import { intlLocale, type Locale } from "@/lib/i18n/config";
import { t } from "@/lib/i18n/format";
import { localizedHref } from "@/lib/i18n/navigation";
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
 */

function href(locale: Locale, target: TodoTarget): string {
  switch (target.page) {
    case "communications":
      return (
        localizedHref(locale, "/dashboard/communications") +
        (target.emailId ? `?email=${target.emailId}` : "")
      );
    case "checkins":
      return localizedHref(locale, "/dashboard/checkins");
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
}: {
  dict: Dictionary;
  locale: Locale;
  items: TodoItem[];
}) {
  return (
    <section className="flex flex-col rounded-[16px] border border-border bg-card">
      <h2 className="px-6 pt-6 font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--fonda-text-3)]">
        {dict.home.todoTitle}
      </h2>

      {items.length === 0 ? (
        <p className="px-6 pb-6 pt-4 text-sm text-muted-foreground">
          {dict.home.todoEmpty}
        </p>
      ) : (
        <ul className="mt-4 flex flex-col divide-y divide-border border-t border-border">
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
                    item.primary
                      ? "bg-[var(--fonda-accent)]"
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
      )}
    </section>
  );
}
