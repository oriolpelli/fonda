"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import {
  BarChart3,
  ConciergeBell,
  DoorOpen,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Send,
  Settings,
  Sunrise,
  X,
  type LucideIcon,
} from "lucide-react";

import {
  ConnectionStatus,
  type ConnectionState,
} from "@/components/dashboard/connection-status";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { Wordmark } from "@/components/brand/wordmark";
import { stripLocale } from "@/lib/i18n/navigation";
import { cn } from "@/lib/utils";

/** Tailwind's `md` breakpoint — kept in sync with the `md:` classes below. */
const MD_QUERY = "(min-width: 48rem)";

/** Everything the trap has to cycle through while the drawer is open. */
const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * A count of messages still waiting on a human for one nav item. Quiet gray by
 * default; `alert` promotes it to the navy signal, reserved for a complaint
 * sitting unanswered — the design identity allows 2–3 signal uses per screen,
 * so this must stay rare.
 */
export interface NavBadge {
  count: number;
  alert: boolean;
  /** Screen-reader wording, localized by the caller. */
  srLabel: string;
}

export interface NavItem {
  key: string;
  label: string;
  href: string;
  badge?: NavBadge;
  /**
   * Not built yet (driven by `lib/roadmap.ts`). The item stays clickable — its
   * page explains what's coming — but reads as secondary: muted label, a quiet
   * gray "Coming soon" chip, and a neutral (never navy) active state, so the
   * signal colour stays with the surfaces that actually work.
   */
  comingSoon?: boolean;
  /** Localized "Coming soon", supplied by the server layout. */
  comingSoonLabel?: string;
}

// Icons live here in the Client Component and are looked up by key. They must
// NOT be passed as props from the Server layout — component functions can't
// cross the server/client boundary (doing so throws at render).
const ICONS: Record<string, LucideIcon> = {
  dashboard: LayoutDashboard,
  brief: Sunrise,
  checkins: DoorOpen,
  concierge: ConciergeBell,
  communications: Send,
  analytics: BarChart3,
  chat: MessageSquare,
  settings: Settings,
  admin: Settings,
};

function NavLink({
  item,
  active,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  /** Closes the mobile drawer. Also fires for a tap on the current page,
      where the pathname never changes and so can't close it for us. */
  onNavigate?: () => void;
}) {
  const Icon = ICONS[item.key] ?? Settings;
  const soon = item.comingSoon === true;
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-sm font-medium transition-colors",
        // Unbuilt items never take the navy signal, active or not — it belongs
        // to the surfaces that work. They get the neutral inset instead.
        active && soon
          ? "bg-[var(--fonda-inset)] font-semibold text-foreground shadow-[inset_2px_0_0_0_var(--fonda-border-2)]"
          : active
            ? "bg-[var(--fonda-accent-light)] text-[var(--fonda-accent)] font-semibold shadow-[inset_2px_0_0_0_var(--fonda-accent)]"
            : soon
              ? "text-[var(--fonda-text-3)] hover:bg-[var(--fonda-inset)] hover:text-[var(--fonda-text-2)]"
              : "text-[var(--fonda-text-2)] hover:bg-[var(--fonda-surface)] hover:text-foreground"
      )}
    >
      <Icon className="size-[18px] shrink-0" strokeWidth={1.5} />
      <span className="min-w-0 truncate">{item.label}</span>
      {soon && item.comingSoonLabel ? (
        // Badge per the design identity §5.4 — Geist Mono, hairline border,
        // pill radius, muted text. Gray on purpose: it must read quieter than
        // the live items above it.
        <span
          className={cn(
            "ml-auto shrink-0 rounded-full border border-[var(--fonda-border-2)] px-1.5 py-0.5 font-mono text-[10px] font-normal leading-[1.5] tracking-[0.04em] transition-colors",
            // Same trap as the count badge below: on the hover/active
            // --fonda-inset background, text-3 is only 4.31:1 — under AA — so
            // those two states step up to text-2.
            active
              ? "text-[var(--fonda-text-2)]"
              : "text-[var(--fonda-text-3)] group-hover:text-[var(--fonda-text-2)]"
          )}
        >
          {item.comingSoonLabel}
        </span>
      ) : null}
      {item.badge && item.badge.count > 0 ? (
        <span
          aria-label={item.badge.srLabel}
          className={cn(
            "ml-auto rounded-full px-2 py-0.5 font-mono text-[11px] font-medium tabular-nums",
            item.badge.alert
              ? "bg-[var(--fonda-accent-light)] text-[var(--fonda-accent)]"
              // text-2, not text-3: an 11px count on --fonda-inset is real
              // text, and text-3 is only 4.31:1 there — under AA's 4.5:1.
              : "bg-[var(--fonda-inset)] text-[var(--fonda-text-2)]"
          )}
        >
          {item.badge.count}
        </span>
      ) : null}
    </Link>
  );
}

interface SidebarProps {
  navItems: NavItem[];
  settingsItem: NavItem;
  adminItem: NavItem | null;
  dashboardHref: string;
  connectionState: ConnectionState;
  connectionLabels: Record<ConnectionState, string>;
  userEmail: string;
  signOutAction: (formData: FormData) => void | Promise<void>;
  signOutLabel: string;
  locale: string;
  /** Accessible name for the drawer itself. */
  menuLabel: string;
  /** Accessible name for the trigger while collapsed / expanded. */
  openLabel: string;
  closeLabel: string;
}

/**
 * The nav itself, rendered once for the desktop rail and once for the mobile
 * drawer. Only one of the two is ever displayed — the other is `display: none`
 * and so out of the accessibility tree — so the duplicate links never reach a
 * screen reader at the same time.
 */
function SidebarContent({
  navItems,
  settingsItem,
  adminItem,
  dashboardHref,
  connectionState,
  connectionLabels,
  userEmail,
  signOutAction,
  signOutLabel,
  locale,
  isActive,
  onNavigate,
}: Pick<
  SidebarProps,
  | "navItems"
  | "settingsItem"
  | "adminItem"
  | "dashboardHref"
  | "connectionState"
  | "connectionLabels"
  | "userEmail"
  | "signOutAction"
  | "signOutLabel"
  | "locale"
> & {
  isActive: (href: string) => boolean;
  onNavigate?: () => void;
}) {
  return (
    <>
      <div className="flex flex-col gap-3 px-5 py-6">
        <Wordmark href={dashboardHref} onClick={onNavigate} />
        <ConnectionStatus state={connectionState} labels={connectionLabels} />
      </div>

      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3">
        {navItems.map((item) => (
          <NavLink
            key={item.key}
            item={item}
            active={isActive(item.href)}
            onNavigate={onNavigate}
          />
        ))}
      </nav>

      <div className="flex flex-col gap-1 border-t border-border px-3 py-3">
        <NavLink
          item={settingsItem}
          active={isActive(settingsItem.href)}
          onNavigate={onNavigate}
        />
        {adminItem ? (
          <NavLink
            item={adminItem}
            active={isActive(adminItem.href)}
            onNavigate={onNavigate}
          />
        ) : null}
      </div>

      <div className="flex flex-col gap-3 border-t border-border px-5 py-4">
        <LanguageSwitcher />
        <span className="truncate text-xs text-[var(--fonda-text-3)]">
          {userEmail}
        </span>
        <form action={signOutAction}>
          <input type="hidden" name="locale" value={locale} />
          <button
            type="submit"
            className="flex items-center gap-2 text-xs font-medium text-[var(--fonda-text-2)] transition-colors hover:text-foreground"
          >
            <LogOut className="size-[14px]" strokeWidth={1.5} />
            {signOutLabel}
          </button>
        </form>
      </div>
    </>
  );
}

/**
 * Dashboard navigation. A fixed 256px rail from `md` up; below that a slide-over
 * drawer behind a hamburger in a slim top bar, because the rail would otherwise
 * eat two-thirds of a 375px phone.
 *
 * The drawer is a modal, and behaves like one:
 * - `role="dialog"` + `aria-modal`, with Tab cycling inside the panel;
 * - Escape and the scrim both dismiss it and hand focus back to the trigger;
 * - following any nav link closes it, including a tap on the current page,
 *   where the pathname never changes;
 * - it stays mounted while closed — so it can slide rather than blink — but
 *   carries `inert`, which drops it out of the tab order and the a11y tree.
 *   That also keeps `aria-controls` on the trigger pointing at real markup.
 *
 * The slide honours `prefers-reduced-motion` through the global rule in
 * globals.css, which collapses transition durations to near zero.
 */
export function Sidebar({
  navItems,
  settingsItem,
  adminItem,
  dashboardHref,
  connectionState,
  connectionLabels,
  userEmail,
  signOutAction,
  signOutLabel,
  locale,
  menuLabel,
  openLabel,
  closeLabel,
}: SidebarProps) {
  const pathname = usePathname();
  const current = stripLocale(pathname);

  // The drawer is open *for one route*. Deriving it this way means any
  // navigation closes it for free — a nav link, the wordmark, the language
  // switcher, signing out — with no effect watching the pathname.
  const [openFor, setOpenFor] = useState<string | null>(null);
  const open = openFor === pathname;
  const panelId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLElement>(null);

  const isActive = useCallback(
    (href: string) => current === stripLocale(href),
    [current]
  );

  /** Collapse and hand focus back to the trigger. */
  const dismiss = useCallback(() => {
    setOpenFor(null);
    triggerRef.current?.focus();
  }, []);

  // Focus trap + Escape, for as long as the drawer is open.
  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    if (!panel) return;

    // Arrow consts, not function declarations: TypeScript only carries the
    // null check above into closures that can't be hoisted past it.
    const focusables = (): HTMLElement[] =>
      Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE));

    // Move focus into the drawer so the trap has somewhere to start.
    focusables()[0]?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        dismiss();
        return;
      }
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
  }, [open, dismiss]);

  // Growing past `md` shows the rail and hides the drawer via CSS; close it so
  // the scroll lock is released and aria-expanded stops claiming otherwise.
  useEffect(() => {
    if (!open) return;

    const query = window.matchMedia(MD_QUERY);
    function onChange(event: MediaQueryListEvent) {
      if (event.matches) setOpenFor(null);
    }

    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, [open]);

  // Hold the page still behind the drawer.
  useEffect(() => {
    if (!open) return;

    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  const content = (onNavigate?: () => void) => (
    <SidebarContent
      navItems={navItems}
      settingsItem={settingsItem}
      adminItem={adminItem}
      dashboardHref={dashboardHref}
      connectionState={connectionState}
      connectionLabels={connectionLabels}
      userEmail={userEmail}
      signOutAction={signOutAction}
      signOutLabel={signOutLabel}
      locale={locale}
      isActive={isActive}
      onNavigate={onNavigate}
    />
  );

  return (
    <>
      {/* Desktop: the permanent rail. */}
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 flex-col border-r border-border bg-[var(--fonda-surface)] md:flex">
        {content()}
      </aside>

      {/* Mobile: slim bar + slide-over drawer. */}
      <header className="fixed inset-x-0 top-0 z-20 flex h-14 items-center justify-between gap-3 border-b border-border bg-[var(--fonda-bg)]/82 px-4 backdrop-blur md:hidden">
        <Wordmark href={dashboardHref} className="text-lg" />
        <button
          ref={triggerRef}
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          aria-label={open ? closeLabel : openLabel}
          onClick={() => (open ? dismiss() : setOpenFor(pathname))}
          // Focus ring comes from the shared :focus-visible rule in globals.css.
          className="inline-flex size-9 items-center justify-center rounded-[10px] border border-[var(--fonda-border-2)] text-foreground transition-colors duration-[180ms] hover:border-[var(--fonda-text-3)]"
        >
          {open ? (
            <X className="size-[18px]" strokeWidth={1.5} />
          ) : (
            <Menu className="size-[18px]" strokeWidth={1.5} />
          )}
        </button>
      </header>

      {/* Scrim: dismisses on tap. Light, per Signal — not a dark overlay. */}
      {open ? (
        <div
          aria-hidden="true"
          onClick={dismiss}
          className="fixed inset-0 z-40 bg-[color-mix(in_srgb,var(--fonda-ink)_14%,transparent)] md:hidden"
        />
      ) : null}

      <aside
        ref={panelRef}
        id={panelId}
        inert={!open}
        role="dialog"
        aria-modal="true"
        aria-label={menuLabel}
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 max-w-[85vw] flex-col border-r border-border bg-[var(--fonda-surface)] transition-transform duration-200 ease-out md:hidden",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Tapping the current page can't change the pathname, so close here
            too — otherwise that one link would leave the drawer open. */}
        {content(() => setOpenFor(null))}
      </aside>
    </>
  );
}
