"use client";

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type ScreenReaderInstructions,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { RefObject } from "react";

import { WidgetRow, type CustomizeRow } from "@/components/dashboard/home-customize-row";
import { useDictionary } from "@/components/i18n/dictionary-provider";
import type { HomeWidgetKey } from "@/lib/home-widgets";
import { t } from "@/lib/i18n/format";

/**
 * The draggable part of Home's customize panel — everything that needs
 * `@dnd-kit`, in its own module so the library loads when the panel is first
 * opened rather than with Home (docs/audits/2026-10-01-performance.md §4.10:
 * 18 KB gzipped on every Home load, for a panel most visits never open).
 * home-customize-panel.tsx owns the state, the modal discipline and the save;
 * this owns the drag.
 *
 * Its keyboard sensor is why dnd-kit is here at all: space lifts, arrows move,
 * space drops, escape cancels, and every one of those is announced in the
 * user's own language through `announcements` below.
 */
export function HomeCustomizeList({
  rows,
  onReorder,
  onToggle,
  draggingRef,
  widgetTitle,
}: {
  rows: CustomizeRow[];
  onReorder: (update: (prev: CustomizeRow[]) => CustomizeRow[]) => void;
  onToggle: (key: HomeWidgetKey, enabled: boolean) => void;
  /** Shared with the panel: Escape means "cancel the drag" while one is live. */
  draggingRef: RefObject<boolean>;
  widgetTitle: (key: HomeWidgetKey) => string;
}) {
  const { dict } = useDictionary();
  const copy = dict.home.customize;

  const sensors = useSensors(
    // A few pixels of slop so a click on the handle stays a click — a drag that
    // starts on mousedown swallows focus from anyone using the keyboard next.
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  /** Position of a row in the *current* order, 1-based, for the announcements. */
  const positionOf = (id: UniqueIdentifier | undefined) =>
    id === undefined ? 0 : rows.findIndex((row) => row.key === String(id)) + 1;

  const announce = (template: string, active: UniqueIdentifier, at: number) =>
    t(template, {
      title: widgetTitle(String(active) as HomeWidgetKey),
      position: at,
      total: rows.length,
    });

  // Translated, because a screen-reader user hears these and nothing else: the
  // visual reorder is the announcement's whole content for them.
  const announcements: Announcements = {
    onDragStart: ({ active }) =>
      announce(copy.announce.lifted, active.id, positionOf(active.id)),
    onDragOver: ({ active, over }) =>
      over ? announce(copy.announce.moved, active.id, positionOf(over.id)) : undefined,
    onDragEnd: ({ active, over }) =>
      over
        ? announce(copy.announce.dropped, active.id, positionOf(over.id))
        : undefined,
    onDragCancel: ({ active }) =>
      announce(copy.announce.cancelled, active.id, positionOf(active.id)),
  };

  const screenReaderInstructions: ScreenReaderInstructions = {
    draggable: copy.announce.instructions,
  };

  function onDragEnd({ active, over }: DragEndEvent) {
    draggingRef.current = false;
    if (!over || active.id === over.id) return;
    onReorder((prev) => {
      const from = prev.findIndex((row) => row.key === String(active.id));
      const to = prev.findIndex((row) => row.key === String(over.id));
      if (from < 0 || to < 0) return prev;
      return arrayMove(prev, from, to);
    });
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      accessibility={{ announcements, screenReaderInstructions }}
      onDragStart={() => {
        draggingRef.current = true;
      }}
      onDragCancel={() => {
        draggingRef.current = false;
      }}
      onDragEnd={onDragEnd}
    >
      <SortableContext
        items={rows.map((row) => row.key)}
        strategy={verticalListSortingStrategy}
      >
        <ul className="flex flex-col gap-0.5">
          {rows.map((row) => (
            <SortableWidgetRow
              key={row.key}
              row={row}
              title={widgetTitle(row.key)}
              handleLabel={t(copy.reorder, { title: widgetTitle(row.key) })}
              onToggle={onToggle}
            />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}

/** WidgetRow, wired to dnd-kit through its handle (`setActivatorNodeRef`). */
function SortableWidgetRow({
  row,
  title,
  handleLabel,
  onToggle,
}: {
  row: CustomizeRow;
  title: string;
  handleLabel: string;
  onToggle: (key: HomeWidgetKey, enabled: boolean) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: row.key });

  return (
    <WidgetRow
      row={row}
      title={title}
      handleLabel={handleLabel}
      onToggle={onToggle}
      rowRef={setNodeRef}
      style={{
        // x is zeroed rather than pulled in with a modifier package: this is a
        // vertical list, and a row that can also slide sideways only ever looks
        // like a bug. (`@dnd-kit/modifiers` is a dependency we didn't take.)
        transform: CSS.Translate.toString(transform ? { ...transform, x: 0 } : null),
        transition,
      }}
      isDragging={isDragging}
      handleRef={setActivatorNodeRef}
      handleProps={{ ...attributes, ...listeners }}
    />
  );
}
