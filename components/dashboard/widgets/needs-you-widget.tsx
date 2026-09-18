import type { Dictionary } from "@/app/[lang]/dictionaries";
import { TodoList } from "@/components/dashboard/todo-list";
import {
  WidgetEmpty,
  WidgetSection,
} from "@/components/dashboard/widgets/widget-section";
import type { Locale } from "@/lib/i18n/config";
import { t } from "@/lib/i18n/format";
import type { TodoItem } from "@/lib/todo-rules";

/**
 * "Needs you today" — the pinned first widget (APP_UX_PROPOSAL.md §3.2).
 *
 * The only widget with a count in its heading, because it is the only one whose
 * count is the answer to a question: *how many things need me?* Everything else
 * on Home is a reading, and a reading with a number beside its title reads as a
 * badge demanding action.
 *
 * Freshness is the PMS sync: half these rules (VIPs arriving, tomorrow's ETAs,
 * the soft night) are only as current as the last sync.
 */
export function NeedsYouWidget({
  dict,
  locale,
  items,
  syncedAt,
}: {
  dict: Dictionary;
  locale: Locale;
  items: TodoItem[];
  syncedAt: string | null;
}) {
  return (
    <WidgetSection
      title={dict.home.widgets["needs-you"].title}
      count={items.length}
      countLabel={t(dict.home.needsYouCount, { count: items.length })}
      freshness={syncedAt ? t(dict.home.syncedAt, { time: syncedAt }) : null}
    >
      {items.length === 0 ? (
        <WidgetEmpty icon="concierge" message={dict.home.todoEmpty} />
      ) : (
        <TodoList dict={dict} locale={locale} items={items} />
      )}
    </WidgetSection>
  );
}
