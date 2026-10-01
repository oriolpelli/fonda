"use client";

import { GripVertical } from "lucide-react";
import {
  useId,
  type CSSProperties,
  type HTMLAttributes,
  type Ref,
  type RefObject,
} from "react";

import { useDictionary } from "@/components/i18n/dictionary-provider";
import type { HomeWidgetKey } from "@/lib/home-widgets";
import { t } from "@/lib/i18n/format";
import { cn } from "@/lib/utils";

/** One storable widget as the panel holds it: the key, and whether it's ticked. */
export interface CustomizeRow {
  key: HomeWidgetKey;
  enabled: boolean;
}

/**
 * One widget row in Home's customize panel: a native checkbox, the title, a
 * drag handle. Presentational only.
 *
 * It lives apart from the drag-and-drop list (home-customize-list.tsx) so the
 * panel can render the same rows before `@dnd-kit` has loaded. That library is
 * fetched when the panel is first opened, not with Home (performance audit
 * §4.10); in the moment it takes to arrive the rows are already there and
 * their checkboxes work — only the handle waits.
 *
 * The drag listeners go on the handle alone, never the row — a row-wide drag
 * surface would eat the click meant for the checkbox, and the handle is also
 * what the keyboard sensor needs to be focusable.
 */
export function WidgetRow({
  row,
  title,
  handleLabel,
  onToggle,
  rowRef,
  style,
  isDragging = false,
  handleRef,
  handleProps,
}: {
  row: CustomizeRow;
  title: string;
  handleLabel: string;
  onToggle: (key: HomeWidgetKey, enabled: boolean) => void;
  rowRef?: Ref<HTMLLIElement>;
  style?: CSSProperties;
  isDragging?: boolean;
  handleRef?: Ref<HTMLButtonElement>;
  /** dnd-kit's attributes + listeners. Absent until the library has loaded. */
  handleProps?: HTMLAttributes<HTMLButtonElement>;
}) {
  const inputId = useId();

  return (
    <li
      ref={rowRef}
      style={style}
      className={cn(
        "flex items-center gap-3 rounded-[10px] px-3 py-2.5 transition-colors",
        isDragging
          ? "relative z-10 bg-[var(--fonda-surface-2)]"
          : "hover:bg-[var(--fonda-surface-2)]"
      )}
    >
      <input
        id={inputId}
        type="checkbox"
        checked={row.enabled}
        onChange={(event) => onToggle(row.key, event.target.checked)}
        className="size-4 shrink-0 rounded-[4px] border-[var(--fonda-border-2)] accent-[var(--fonda-ink)]"
      />
      <label
        htmlFor={inputId}
        className="min-w-0 flex-1 cursor-pointer truncate text-[13px] font-medium text-foreground"
      >
        {title}
      </label>
      <button
        ref={handleRef}
        type="button"
        aria-label={handleLabel}
        // Until dnd-kit arrives the handle has nothing to do; disabled keeps it
        // out of the focus trap's cycle rather than offering a dead control.
        disabled={!handleProps}
        className="-mr-1 inline-flex size-7 shrink-0 cursor-grab touch-none items-center justify-center rounded-[10px] text-[var(--fonda-text-3)] transition-colors hover:bg-[var(--fonda-inset)] hover:text-foreground active:cursor-grabbing disabled:cursor-default"
        {...handleProps}
      >
        <GripVertical aria-hidden="true" strokeWidth={1.5} className="size-4" />
      </button>
    </li>
  );
}

/** What the panel hands its widget list — the drag-and-drop one or this one. */
export interface CustomizeListProps {
  rows: CustomizeRow[];
  onReorder: (update: (prev: CustomizeRow[]) => CustomizeRow[]) => void;
  onToggle: (key: HomeWidgetKey, enabled: boolean) => void;
  /** Shared with the panel: Escape means "cancel the drag" while one is live. */
  draggingRef: RefObject<boolean>;
  widgetTitle: (key: HomeWidgetKey) => string;
}

/**
 * The widget rows without drag-and-drop. What the panel shows before its first
 * open (it stays mounted, `inert`), while the drag-and-drop chunk loads, and
 * for good if that chunk fails to load — an old tab after a deploy, a dropped
 * connection — so the panel still ticks and saves instead of taking Home down
 * through the error boundary. Accepts the drag list's props and ignores the
 * ones it has no use for.
 */
export function StaticCustomizeList({
  rows,
  onToggle,
  widgetTitle,
}: CustomizeListProps) {
  const { dict } = useDictionary();
  return (
    <ul className="flex flex-col gap-0.5">
      {rows.map((row) => (
        <WidgetRow
          key={row.key}
          row={row}
          title={widgetTitle(row.key)}
          handleLabel={t(dict.home.customize.reorder, {
            title: widgetTitle(row.key),
          })}
          onToggle={onToggle}
        />
      ))}
    </ul>
  );
}
