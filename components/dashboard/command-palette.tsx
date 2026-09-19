"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MessageSquare, Search, User } from "lucide-react";

import { searchGuests } from "@/app/[lang]/dashboard/guests/actions";
import { useDictionary } from "@/components/i18n/dictionary-provider";
import { guestHref, localizedHref } from "@/lib/i18n/navigation";
import { cn } from "@/lib/utils";

/**
 * ⌘K — pages, guests, ask (APP_UX_PROPOSAL.md §7.1).
 *
 * Scope is deliberately small and stays that way: three kinds of result and no
 * actions. A palette that can *do* things needs an undo story, and this one is
 * navigation.
 *
 * No dependency. The dialog reuses the same disclosure contract the sidebar's
 * account menu uses — focus trapped while open, Esc closes and returns focus to
 * where it was, a pointer outside dismisses — because a second, subtly
 * different modal behaviour in the same product is how keyboard users lose
 * their place.
 */

export interface PalettedPage {
  key: string;
  label: string;
  href: string;
}

interface GuestHit {
  id: string;
  name: string;
  arrival: string | null;
}

/** Long enough that a pause reads as "done typing", short enough to feel live. */
const DEBOUNCE_MS = 220;

export function CommandPalette({
  pages,
  locale,
}: {
  pages: PalettedPage[];
  locale: string;
}) {
  const router = useRouter();
  const { dict } = useDictionary();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [guests, setGuests] = useState<GuestHit[]>([]);
  const [active, setActive] = useState(0);
  const dialogId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const returnTo = useRef<HTMLElement | null>(null);

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setGuests([]);
    setActive(0);
    // Focus goes back where it came from, which is the half of a modal people
    // only notice when it is missing.
    returnTo.current?.focus();
  }, []);

  const openPalette = useCallback(() => {
    returnTo.current = document.activeElement as HTMLElement | null;
    setOpen(true);
  }, []);

  // ⌘K / Ctrl+K anywhere in the dashboard.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        if (open) close();
        else openPalette();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, close, openPalette]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // Debounced guest lookup. One request per pause, not one per keystroke —
  // every one of these is a database query against the guest list.
  //
  // Note it does NOT clear `guests` when the query gets too short: clearing
  // state inside an effect is a cascading render, and the stale hits are
  // filtered out at render time instead (`guestHits` below). Same result, one
  // render fewer, and the rule the linter is enforcing is a good one — an
  // effect whose only job is to reset state is a derivation wearing a costume.
  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      void searchGuests(trimmed).then((hits) => {
        if (!cancelled) setGuests(hits);
      });
    }, DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  /** Hits belong to the query that fetched them; a shorter query has none. */
  const guestHits = useMemo(
    () => (query.trim().length < 2 ? [] : guests),
    [query, guests]
  );

  const pageHits = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return pages.slice(0, 6);
    return pages
      .filter((p) => p.label.toLowerCase().includes(needle))
      .slice(0, 6);
  }, [pages, query]);

  // One flat list of destinations, because that is what the arrow keys move
  // through; the eyebrows below are grouping, not structure.
  const rows = useMemo(
    () => [
      ...pageHits.map((p) => ({ kind: "page" as const, href: p.href, label: p.label })),
      ...guestHits.map((g) => ({
        kind: "guest" as const,
        href: guestHref(locale as never, g.id),
        label: g.name,
      })),
      {
        kind: "ask" as const,
        href: localizedHref(
          locale as never,
          `/dashboard/chat?q=${encodeURIComponent(query.trim())}`
        ),
        label: query.trim(),
      },
    ],
    [pageHits, guestHits, locale, query]
  );

  /**
   * The highlighted row resets when the query changes.
   *
   * Adjusted DURING RENDER rather than in an effect — React's own documented
   * pattern for state derived from a prop or from other state. An effect here
   * renders once with the old highlight before correcting itself, which on a
   * fast typist looks like the selection lagging a keystroke behind.
   */
  const [activeFor, setActiveFor] = useState(query);
  if (activeFor !== query) {
    setActiveFor(query);
    setActive(0);
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={openPalette}
        aria-label={dict.palette.open}
        // Quieter than a nav row on purpose: this is a control, not a
        // destination, and the nav is still five sections.
        className="mb-1 flex w-full items-center gap-2.5 rounded-[8px] px-2.5 py-[6px] text-[13px] text-[var(--fonda-text-3)] transition-colors hover:bg-[color-mix(in_srgb,var(--fonda-inset)_50%,transparent)] hover:text-[var(--fonda-text-2)]"
      >
        <Search aria-hidden="true" strokeWidth={1.5} className="size-4 shrink-0" />
        <span className="flex-1 text-left">{dict.palette.open}</span>
        <kbd className="shrink-0 font-mono text-[10px] text-[var(--fonda-text-3)]">
          ⌘K
        </kbd>
      </button>
    );
  }

  const go = (href: string) => {
    close();
    router.push(href);
  };

  return (
    <>
      <div
        aria-hidden="true"
        onClick={close}
        className="fixed inset-0 z-50 bg-[color-mix(in_srgb,var(--fonda-ink)_14%,transparent)]"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={dict.palette.open}
        id={dialogId}
        ref={panelRef}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            close();
          } else if (event.key === "ArrowDown") {
            event.preventDefault();
            setActive((i) => (i + 1) % rows.length);
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            setActive((i) => (i - 1 + rows.length) % rows.length);
          } else if (event.key === "Enter") {
            event.preventDefault();
            const row = rows[active];
            if (row) go(row.href);
          } else if (event.key === "Tab") {
            // The only focusable thing in here is the input, so the trap is
            // simply: focus does not leave.
            event.preventDefault();
          }
        }}
        className="fixed left-1/2 top-[18vh] z-50 w-[min(560px,92vw)] -translate-x-1/2 overflow-hidden rounded-[16px] bg-[var(--fonda-white)] shadow-card ring-1 ring-[var(--fonda-border)]"
      >
        <div className="flex items-center gap-2.5 border-b border-[var(--fonda-border)] px-4 py-3">
          <Search
            aria-hidden="true"
            strokeWidth={1.5}
            className="size-4 shrink-0 text-[var(--fonda-text-3)]"
          />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={dict.palette.placeholder}
            aria-label={dict.palette.placeholder}
            className="flex-1 bg-transparent text-[15px] text-[var(--fonda-text)] placeholder:text-[var(--fonda-text-3)] focus-visible:outline-none"
          />
        </div>

        <div className="max-h-[52vh] overflow-y-auto p-2">
          {pageHits.length > 0 ? (
            <Group label={dict.palette.pages} />
          ) : null}
          {rows.map((row, i) => (
            <div key={`${row.kind}-${row.href}-${i}`}>
              {row.kind === "guest" && rows[i - 1]?.kind !== "guest" ? (
                <Group label={dict.palette.guests} />
              ) : null}
              {row.kind === "ask" ? <Group label={dict.palette.ask} /> : null}
              <button
                type="button"
                onMouseEnter={() => setActive(i)}
                onClick={() => go(row.href)}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-[8px] px-2.5 py-2 text-left text-[13px] transition-colors",
                  i === active
                    ? "bg-[var(--fonda-inset)] text-[var(--fonda-text)]"
                    : "text-[var(--fonda-text-2)]"
                )}
              >
                {row.kind === "guest" ? (
                  <User aria-hidden="true" strokeWidth={1.5} className="size-4 shrink-0 text-[var(--fonda-text-3)]" />
                ) : row.kind === "ask" ? (
                  <MessageSquare aria-hidden="true" strokeWidth={1.5} className="size-4 shrink-0 text-[var(--fonda-text-3)]" />
                ) : (
                  <Search aria-hidden="true" strokeWidth={1.5} className="size-4 shrink-0 text-[var(--fonda-text-3)]" />
                )}
                <span className="min-w-0 flex-1 truncate">
                  {row.kind === "ask"
                    ? `${dict.palette.askPrefix} ${row.label}`.trim()
                    : row.label}
                </span>
              </button>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function Group({ label }: { label: string }) {
  return (
    <p className="px-2.5 pb-1 pt-2 font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--fonda-text-3)]">
      {label}
    </p>
  );
}
