"use client";

import { Lock, Sparkles, X } from "lucide-react";
import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  useTransition,
} from "react";

import {
  recordLockedWidgetClick,
  updateHomeLayout,
} from "@/app/[lang]/dashboard/actions";
import {
  WidgetRow,
  type CustomizeRow,
} from "@/components/dashboard/home-customize-row";
import { useDictionary } from "@/components/i18n/dictionary-provider";
import { Button } from "@/components/ui/button";
import type { HomeWidgetKey } from "@/lib/home-widgets";
import { t } from "@/lib/i18n/format";
import { HOME_LOCKED_WIDGETS, roadmapFeature } from "@/lib/roadmap";
import { cn } from "@/lib/utils";

/**
 * Home's customize panel (APP_UX_PROPOSAL.md §3.4–§3.5).
 *
 * One sentence, a list of widgets to tick and drag, and — below them — the
 * roadmap. That last part is the point of the panel as much as the first: a GM
 * meets each unbuilt feature at the exact moment they are deciding what they
 * want to see every morning, and a click on one is logged, so what gets built
 * next is settled by demand rather than by a document.
 *
 * Three rules it inherits rather than invents:
 *
 * - **Modal discipline is the sidebar's.** Focus trapped with the same
 *   `FOCUSABLE` cycle, Escape and an outside pointer-down dismiss, the body
 *   scroll is held, and the panel stays mounted (`inert` when shut) so it can
 *   slide and so `aria-controls` never dangles. Nothing here is a new pattern;
 *   see components/dashboard/sidebar.tsx, which had to get all of it right once.
 * - **One write, on close.** Every tick and every drag is local state. The
 *   server sees the finished layout once, when the panel shuts — not nine
 *   round-trips while someone makes up their mind.
 * - **"Needs you today" is not in the list.** It renders as a fixed, locked
 *   first row: the registry pins it (lib/home-widgets.ts) and `saveHomeLayout`
 *   refuses to store it, so there is nothing here that could bury the one thing
 *   Home exists to answer.
 *
 * Drag-and-drop is `@dnd-kit` — the one dependency §8.2 approved, and only
 * here. It lives in home-customize-list.tsx and is fetched the first time the
 * panel opens (or when the pointer or focus reaches the button, a moment
 * earlier), not with Home: it was 18 KB gzipped on every Home load for a panel
 * most visits never open (docs/audits/2026-10-01-performance.md §4.10). Until
 * it arrives the rows render without it — ticking works, only the handle
 * waits.
 */

/** The drag-and-drop list, as its own chunk. */
const loadList = () => import("@/components/dashboard/home-customize-list");
const HomeCustomizeList = lazy(() =>
  loadList().then((module) => ({ default: module.HomeCustomizeList }))
);

/** Everything the focus trap cycles through — the sidebar's list, verbatim. */
const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export type { CustomizeRow };

export function HomeCustomizePanel({ layout }: { layout: readonly CustomizeRow[] }) {
  const { dict } = useDictionary();
  const copy = dict.home.customize;

  const [open, setOpen] = useState(false);
  /** Set on first open: from then on the drag-and-drop list is mounted. */
  const [everOpened, setEverOpened] = useState(false);
  const [rows, setRows] = useState<CustomizeRow[]>(() =>
    layout.map((entry) => ({ ...entry }))
  );
  const [error, setError] = useState<string | null>(null);
  const [isSaving, startSaving] = useTransition();

  const panelId = useId();
  const titleId = useId();
  const lockedId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLElement>(null);

  /**
   * True while a keyboard or pointer drag is in flight. Escape has to mean
   * "cancel the drag" then, not "close the panel": dnd-kit listens for it too,
   * and without this guard one keypress would do both.
   */
  const draggingRef = useRef(false);

  const widgetTitle = useCallback(
    (key: HomeWidgetKey) => dict.home.widgets[key].title,
    [dict]
  );

  const saved = JSON.stringify(layout.map((entry) => ({ ...entry })));
  const dirty = JSON.stringify(rows) !== saved;

  /** Opens on server truth: whatever the last render brought, never a stale draft. */
  const openPanel = useCallback(() => {
    setRows(layout.map((entry) => ({ ...entry })));
    setError(null);
    setEverOpened(true);
    setOpen(true);
  }, [layout]);

  /**
   * Shuts the panel, saving first when anything changed.
   *
   * A failed save keeps the panel open with its error line showing — closing on
   * failure would throw away the arrangement the user just made and tell them
   * about it in a toast they can no longer act on.
   */
  const requestClose = useCallback(() => {
    // A save already in flight owns the close. Escape, the scrim and the X all
    // route here, and a second press must not post the layout twice.
    if (isSaving) return;

    const finish = () => {
      setOpen(false);
      triggerRef.current?.focus();
    };

    if (!dirty) {
      setError(null);
      finish();
      return;
    }

    const formData = new FormData();
    formData.set("layout", JSON.stringify(rows));

    startSaving(async () => {
      try {
        const result = await updateHomeLayout(undefined, formData);
        if (result && "error" in result) {
          // The action's message is English and sometimes a raw Postgres one
          // (lib/home-layout.ts interpolates `error.message`). Neither belongs
          // on screen: none of its cases is something the user can act on
          // differently, and an es/ca session would get an English sentence.
          // The reason is still worth having, so it goes to the console for a
          // support session rather than into the panel.
          console.error("[home] layout save rejected:", result.error);
          setError(copy.saveFailed);
          return;
        }
        // Re-seed from what was persisted, not from what was posted: the
        // registry may have appended a widget shipped since this page loaded.
        if (result && "ok" in result) {
          setRows(result.saved.map((entry) => ({ ...entry })));
        }
        setError(null);
        finish();
        // No router.refresh() here. The action revalidates this route
        // (`revalidatePath("/[lang]/dashboard", "page")`), and a Server Action
        // that revalidates the page being viewed returns its new render in the
        // same response — the page behind the panel re-renders with the new
        // order from that. A refresh on top rendered all of Home a second time
        // (performance audit §4.6).
      } catch {
        setError(copy.saveFailed);
      }
    });
  }, [copy.saveFailed, dirty, isSaving, rows]);

  // Escape + outside pointer-down, the sidebar's discipline.
  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      // A drag in flight owns Escape — dnd-kit cancels it and puts the row back.
      if (draggingRef.current) return;
      event.preventDefault();
      requestClose();
    }

    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node | null;
      if (!target) return;
      // The trigger runs its own toggle on click; closing here first would let
      // that click reopen the panel.
      if (triggerRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      requestClose();
    }

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open, requestClose]);

  // Focus trap: move focus in on open, then cycle inside the panel.
  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    if (!panel) return;

    const focusables = (): HTMLElement[] =>
      Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE));

    focusables()[0]?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const items = focusables();
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;

      // Wrap at both ends, and pull focus back in if it ever escaped.
      if (event.shiftKey) {
        if (active === first || !panel.contains(active)) {
          event.preventDefault();
          last.focus();
        }
      } else if (active === last || !panel.contains(active)) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  // Hold the page still behind the panel.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  function toggle(key: HomeWidgetKey, enabled: boolean) {
    setRows((prev) =>
      prev.map((row) => (row.key === key ? { ...row, enabled } : row))
    );
  }

  /**
   * The same rows without drag-and-drop: what the panel shows before its
   * first open (it stays mounted, `inert`) and while the list's chunk loads.
   */
  const staticRows = (
    <ul className="flex flex-col gap-0.5">
      {rows.map((row) => (
        <WidgetRow
          key={row.key}
          row={row}
          title={widgetTitle(row.key)}
          handleLabel={t(copy.reorder, { title: widgetTitle(row.key) })}
          onToggle={toggle}
        />
      ))}
    </ul>
  );

  return (
    <>
      <Button
        ref={triggerRef}
        type="button"
        variant="ghost"
        size="sm"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => (open ? requestClose() : openPanel())}
        // Start fetching the drag-and-drop chunk as intent shows, so it is
        // usually there by the time the panel has slid in.
        onPointerEnter={() => void loadList()}
        onFocus={() => void loadList()}
      >
        {copy.open}
      </Button>

      {/* Scrim: dismisses on tap. Light, per Signal — not a dark overlay. */}
      {open ? (
        <div
          aria-hidden="true"
          className="fixed inset-0 z-40 bg-[color-mix(in_srgb,var(--fonda-ink)_14%,transparent)]"
        />
      ) : null}

      {/*
        A right-docked panel at md+, a bottom sheet below it. One element, two
        transforms: the closed state pushes it off the bottom on a phone and off
        the right edge on a desktop, so the slide always comes from the edge it
        is docked to. `prefers-reduced-motion` collapses both through the global
        rule in globals.css.

        Mounted while shut, and `inert` — out of the tab order and the a11y tree
        — so it can animate and `aria-controls` still points at real markup.
      */}
      <aside
        ref={panelRef}
        id={panelId}
        inert={!open}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cn(
          "fixed inset-x-0 bottom-0 z-50 flex max-h-[85vh] flex-col rounded-t-[20px] bg-[var(--fonda-surface)] shadow-card transition-transform duration-200 ease-out",
          "md:inset-y-0 md:left-auto md:right-0 md:max-h-none md:w-[340px] md:max-w-[90vw] md:rounded-none md:border-l md:border-[var(--fonda-border)]",
          open
            ? "translate-y-0 md:translate-x-0"
            : "translate-y-full md:translate-y-0 md:translate-x-full"
        )}
      >
        <div className="flex items-start justify-between gap-4 px-5 pb-3 pt-5">
          <h2
            id={titleId}
            className="text-sm font-medium text-foreground"
          >
            {copy.title}
          </h2>
          <button
            type="button"
            aria-label={copy.close}
            onClick={requestClose}
            // Focus ring comes from the shared :focus-visible rule in globals.css.
            className="-mr-1 -mt-1 inline-flex size-8 shrink-0 items-center justify-center rounded-[10px] text-[var(--fonda-text-3)] transition-colors hover:bg-[var(--fonda-surface-2)] hover:text-foreground"
          >
            <X className="size-4" strokeWidth={1.5} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-5">
          {/* The dictionary sentence, and the only prose in the panel. */}
          <p className="pb-4 text-[13px] leading-relaxed text-[var(--fonda-text-2)]">
            {copy.intro}
          </p>

          <ul className="flex flex-col gap-0.5">
            {/* The pinned row. No checkbox and no handle, because neither would
                do anything: the registry pins it and the server refuses to
                store it either way. */}
            <li className="flex items-center gap-3 rounded-[10px] px-3 py-2.5">
              <Lock
                aria-hidden="true"
                strokeWidth={1.5}
                className="size-4 shrink-0 text-[var(--fonda-text-3)]"
              />
              <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-foreground">
                {widgetTitle("needs-you")}
              </span>
              <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--fonda-text-3)]">
                {copy.pinned}
              </span>
            </li>
          </ul>

          {everOpened ? (
            <Suspense fallback={staticRows}>
              <HomeCustomizeList
                rows={rows}
                onReorder={setRows}
                onToggle={toggle}
                draggingRef={draggingRef}
                widgetTitle={widgetTitle}
              />
            </Suspense>
          ) : (
            staticRows
          )}

          <p
            id={lockedId}
            className="pb-1 pl-3 pt-6 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--fonda-text-3)]"
          >
            {copy.comingSoon}
          </p>
          <ul aria-labelledby={lockedId} className="flex flex-col gap-1.5">
            {HOME_LOCKED_WIDGETS.map((key) => (
              <li key={key}>
                <LockedTile featureKey={key} soonLabel={copy.comingSoon} />
              </li>
            ))}
          </ul>
        </div>

        {(error || isSaving) ? (
          <div className="border-t border-[var(--fonda-border)] px-5 py-3">
            {error ? (
              <p role="alert" className="text-[13px] font-medium text-destructive">
                {error}
              </p>
            ) : (
              <p role="status" className="text-[13px] text-[var(--fonda-text-3)]">
                {copy.saving}
              </p>
            )}
          </div>
        ) : null}
      </aside>
    </>
  );
}

/**
 * A locked roadmap tile: the feature's name, its blurb, and the `Sparkles`
 * marker the nav uses for anything unbuilt.
 *
 * Clicking does nothing visible, on purpose — the feature does not exist, and a
 * tile that opened a "we'll tell you when it lands" form would be collecting an
 * address to do nothing with. What it does is record the interest (§3.4), which
 * is the honest version of the same promise.
 */
function LockedTile({
  featureKey,
  soonLabel,
}: {
  featureKey: (typeof HOME_LOCKED_WIDGETS)[number];
  soonLabel: string;
}) {
  const { dict } = useDictionary();
  const feature = roadmapFeature(featureKey);

  return (
    <button
      type="button"
      onClick={() => {
        // Fire-and-forget: the click is inert either way, so a failed metric
        // must never surface as an error the user can't act on.
        void recordLockedWidgetClick(featureKey);
      }}
      className="flex w-full items-start gap-2 rounded-[10px] bg-[var(--fonda-surface-2)] px-3 py-2.5 text-left transition-colors hover:bg-[var(--fonda-inset)]"
    >
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-[13px] font-medium text-[var(--fonda-text-2)]">
          {feature.label(dict)}
        </span>
        <span className="text-[12px] leading-relaxed text-[var(--fonda-text-3)]">
          {feature.blurb(dict)}
        </span>
      </span>
      {/* `role="img"` on the wrapper, not the svg: it keeps the accessible name
          on one element and gives the native tooltip somewhere to hang — the
          same treatment the nav's coming-soon rows use. */}
      <span
        role="img"
        title={soonLabel}
        aria-label={soonLabel}
        className="mt-0.5 inline-flex shrink-0 items-center text-[var(--fonda-text-3)]"
      >
        <Sparkles aria-hidden="true" strokeWidth={1.5} className="size-[14px]" />
      </span>
    </button>
  );
}
