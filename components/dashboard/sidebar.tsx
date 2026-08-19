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
  Shield,
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
 * A count of messages still waiting on a human for one nav item. Quiet neutral
 * by default; `alert` promotes it to a solid ink chip, reserved for a complaint
 * sitting unanswered.
 *
 * v3 note: this used to promote to the navy accent. Chrome is colorless now
 * (FONDA_SANA_REDESIGN.md §3.2) — an alert stands out by *darkness*, the same
 * tell the active nav state uses, not by hue.
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
   * page explains what's coming — but reads as secondary: a small muted dot on
   * the icon, and the "Coming soon" wording folded into the hover label, since
   * an icon rail has nowhere to put a chip.
   */
  comingSoon?: boolean;
  /** Localized "Coming soon", supplied by the server layout. */
  comingSoonLabel?: string;
}

// Icons live here in the Client Component and are looked up by key. They must
// NOT be passed as props from the Server layout — component functions can't
// cross the server/client boundary (doing so throws at render).
//
// `admin` gets its own glyph rather than sharing the settings gear: labels used
// to tell the two apart, and the rail no longer shows any.
const ICONS: Record<string, LucideIcon> = {
  dashboard: LayoutDashboard,
  brief: Sunrise,
  checkins: DoorOpen,
  concierge: ConciergeBell,
  communications: Send,
  analytics: BarChart3,
  chat: MessageSquare,
  settings: Settings,
  admin: Shield,
};

/** Shared shell for every control in the rail — 40px hit target, soft corners. */
const RAIL_ITEM =
  "group relative inline-flex size-10 shrink-0 items-center justify-center rounded-[10px] transition-colors duration-[180ms]";

/**
 * Rail states are MONOCHROME (§5.2). The active tell is weight and darkness —
 * a solid warm near-black icon on a greige inset — never a hue. No accent tint,
 * no coloured left bar.
 *
 * Measured: --fonda-text on --fonda-inset is 13.06:1; --fonda-text-3 on the
 * --fonda-bg ground is 4.79:1. Both clear AA comfortably.
 */
function railStateClass(active: boolean) {
  return active
    ? "bg-[var(--fonda-inset)] text-foreground"
    : "text-[var(--fonda-text-3)] hover:bg-[var(--fonda-surface-2)] hover:text-foreground";
}

/**
 * The hover/focus label that stands in for the text the rail no longer shows —
 * a dark pill to the right of the icon (§5.3).
 *
 * `aria-hidden` on purpose: the control's accessible name already comes from
 * its `aria-label`, so exposing the pill too would announce it twice. There is
 * deliberately no `title` either — the native tooltip fires a second, competing
 * bubble on top of this one.
 *
 * The 150ms delay is set only inside the `group-hover:` state, so the pill waits
 * to appear but leaves instantly. `prefers-reduced-motion` collapses the
 * duration through the global rule in globals.css.
 */
function FlyoutLabel({ label }: { label: string }) {
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute left-full top-1/2 z-50 ml-2 -translate-y-1/2 translate-x-1 whitespace-nowrap rounded-[8px] bg-[var(--fonda-ink)] px-2.5 py-1.5 text-[13px] font-medium leading-none text-[var(--fonda-text-inv)] opacity-0 shadow-card transition duration-150 group-hover:translate-x-0 group-hover:opacity-100 group-hover:delay-150 group-focus-visible:translate-x-0 group-focus-visible:opacity-100"
    >
      {label}
    </span>
  );
}

/** The visible label: unbuilt items carry their "Coming soon" wording inline. */
function visibleLabel(item: NavItem) {
  return item.comingSoon && item.comingSoonLabel
    ? `${item.label} · ${item.comingSoonLabel}`
    : item.label;
}

/**
 * The count chip, tucked into the icon's top-right corner.
 *
 * The neutral fill (`--fonda-inset`) is all but identical to the rail ground, so
 * the chip's *shape* only reads because of the hairline ring; on an active item
 * — whose own fill is that same inset — it flips to white so it doesn't vanish.
 * An alert goes solid ink, which needs no help.
 */
function CountBadge({ badge, active }: { badge: NavBadge; active: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "absolute -right-0.5 -top-0.5 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 font-mono text-[10px] font-medium leading-none tabular-nums ring-1",
        badge.alert
          ? "bg-[var(--fonda-ink)] text-[var(--fonda-text-inv)] ring-[var(--fonda-ink)]"
          : active
            ? "bg-[var(--fonda-surface)] text-[var(--fonda-text)] ring-[var(--fonda-border-2)]"
            : "bg-[var(--fonda-inset)] text-[var(--fonda-text)] ring-[var(--fonda-border-2)]"
      )}
    >
      {badge.count}
    </span>
  );
}

/** One icon-only rail item. Desktop rail only — the drawer uses `DrawerLink`. */
function RailLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = ICONS[item.key] ?? Settings;
  const label = visibleLabel(item);
  const badge = item.badge && item.badge.count > 0 ? item.badge : null;

  // An aria-label on the link replaces its contents as the accessible name, so
  // the badge has to be folded in here — otherwise the count goes unannounced.
  const accessibleName = badge ? `${label}, ${badge.srLabel}` : label;

  return (
    <Link
      href={item.href}
      aria-label={accessibleName}
      aria-current={active ? "page" : undefined}
      className={cn(RAIL_ITEM, railStateClass(active))}
    >
      <Icon className="size-5" strokeWidth={1.5} />
      {item.comingSoon ? (
        // Unbuilt items are marked with a dot, not by dimming the icon:
        // --fonda-text-3 at reduced opacity falls under the 3:1 minimum for
        // non-text contrast. The wording lives in the hover label instead.
        <span
          aria-hidden="true"
          className="absolute right-1.5 top-1.5 size-[5px] rounded-full bg-[var(--fonda-text-3)]"
        />
      ) : null}
      {badge ? <CountBadge badge={badge} active={active} /> : null}
      <FlyoutLabel label={label} />
    </Link>
  );
}

/** The Fonda mark: a solid ink square, no wordmark text (§5.1). */
function FondaMark({ href }: { href: string }) {
  return (
    <Link
      href={href}
      aria-label="Fondas"
      className="inline-flex size-8 shrink-0 items-center justify-center rounded-[10px] bg-[var(--fonda-ink)] text-[var(--fonda-text-inv)] transition-colors duration-[180ms] hover:bg-[var(--fonda-ink-hover)]"
    >
      <span
        aria-hidden="true"
        className="font-sans text-[15px] font-semibold leading-none tracking-[-0.03em]"
      >
        F
      </span>
    </Link>
  );
}

/**
 * Everything the slim rail can't hold, gathered behind the bottom avatar (§5.4):
 * the connection status, the language switcher, the signed-in address, and
 * sign-out.
 *
 * A disclosure, not an ARIA `menu` — it holds a form and a button group, not a
 * list of menu items. Same contract as `components/marketing/mobile-nav.tsx`:
 * `aria-expanded` + `aria-controls` on the trigger, the panel always in the DOM
 * (just `hidden`) so `aria-controls` never dangles, Escape returns focus to the
 * trigger, and an outside pointer dismisses it.
 *
 * Desktop only. The mobile drawer keeps these controls inline: nesting a popover
 * inside the drawer's focus trap buys nothing at that width and breaks the trap.
 */
function AccountMenu({
  accountLabel,
  connectionState,
  connectionLabels,
  userEmail,
  signOutAction,
  signOutLabel,
  locale,
}: Pick<
  SidebarProps,
  | "accountLabel"
  | "connectionState"
  | "connectionLabels"
  | "userEmail"
  | "signOutAction"
  | "signOutLabel"
  | "locale"
>) {
  const pathname = usePathname();

  // Open *for one route*, the same trick the drawer uses below: any navigation
  // closes it for free — including the language switcher, which pushes a route.
  const [openFor, setOpenFor] = useState<string | null>(null);
  const open = openFor === pathname;
  const panelId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  /** Collapse and hand focus back to the trigger. */
  const dismiss = useCallback(() => {
    setOpenFor(null);
    triggerRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        dismiss();
      }
    }

    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node | null;
      if (!target) return;
      // The trigger is excluded deliberately: it runs its own toggle on click,
      // and closing here first would let that click reopen the menu — the
      // avatar would look like it never closes.
      if (triggerRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      // Not `dismiss()`: focus belongs wherever the user just clicked.
      setOpenFor(null);
    }

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open, dismiss]);

  const initial = userEmail.trim().charAt(0).toUpperCase() || "?";

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-label={accountLabel}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => (open ? dismiss() : setOpenFor(pathname))}
        // Focus ring comes from the shared :focus-visible rule in globals.css.
        className={cn(RAIL_ITEM, "text-[var(--fonda-text)]")}
      >
        <span
          aria-hidden="true"
          className="inline-flex size-8 items-center justify-center rounded-full bg-[var(--fonda-inset)] font-mono text-[12px] font-medium leading-none"
        >
          {initial}
        </span>
        {/* Suppressed while open — the panel already says who you are. */}
        {open ? null : <FlyoutLabel label={accountLabel} />}
      </button>

      <div
        ref={panelRef}
        id={panelId}
        hidden={!open}
        className={cn(
          "absolute bottom-0 left-full z-50 ml-2 w-64 rounded-[12px] bg-[var(--fonda-white)] p-3 shadow-card ring-1 ring-[var(--fonda-border)]",
          !open && "hidden"
        )}
      >
        <p className="truncate px-1 text-[13px] font-medium text-[var(--fonda-text-2)]">
          {userEmail}
        </p>
        <div className="mt-2 px-1">
          <ConnectionStatus state={connectionState} labels={connectionLabels} />
        </div>

        <div className="my-3 h-px bg-[var(--fonda-border)]" />

        <div className="px-1">
          <LanguageSwitcher />
        </div>
        <form action={signOutAction} className="mt-3 px-1">
          <input type="hidden" name="locale" value={locale} />
          <button
            type="submit"
            className="flex items-center gap-2 text-[13px] font-medium text-[var(--fonda-text-2)] transition-colors hover:text-foreground"
          >
            <LogOut className="size-[14px]" strokeWidth={1.5} />
            {signOutLabel}
          </button>
        </form>
      </div>
    </div>
  );
}

/**
 * The mobile drawer's nav row — icon *and* label, because the drawer has the
 * width for it. Same monochrome states as the rail: no accent tint, no coloured
 * inset bar.
 */
function DrawerLink({
  item,
  active,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  /** Closes the drawer. Also fires for a tap on the current page,
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
        active
          ? "bg-[var(--fonda-inset)] font-semibold text-foreground"
          : soon
            ? "text-[var(--fonda-text-3)] hover:bg-[var(--fonda-surface-2)] hover:text-[var(--fonda-text-2)]"
            : "text-[var(--fonda-text-2)] hover:bg-[var(--fonda-surface-2)] hover:text-foreground"
      )}
    >
      <Icon className="size-[18px] shrink-0" strokeWidth={1.5} />
      <span className="min-w-0 truncate">{item.label}</span>
      {soon && item.comingSoonLabel ? (
        <span
          className={cn(
            "ml-auto shrink-0 rounded-full border border-[var(--fonda-border-2)] px-1.5 py-0.5 font-mono text-[10px] font-normal leading-[1.5] tracking-[0.04em] transition-colors",
            // On the --fonda-inset fill, text-3 is only 4.22:1 — under AA — so
            // the hover and active states step up to text-2 (5.83:1 there).
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
              ? "bg-[var(--fonda-ink)] text-[var(--fonda-text-inv)]"
              : "bg-[var(--fonda-inset)] text-[var(--fonda-text)]"
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
  /** Accessible name for the drawer itself, and for the nav landmark. */
  menuLabel: string;
  /** Accessible name for the rail's account button / popover trigger. */
  accountLabel: string;
  /** Accessible name for the trigger while collapsed / expanded. */
  openLabel: string;
  closeLabel: string;
}

/**
 * The mobile drawer's body. Only ever displayed below `md` — above it the panel
 * is `display: none` and carries `inert`, so its links never reach a screen
 * reader alongside the rail's.
 */
function DrawerContent({
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
  | "menuLabel"
> & {
  isActive: (href: string) => boolean;
  onNavigate: () => void;
}) {
  return (
    <>
      <div className="flex flex-col gap-3 px-5 py-6">
        <Wordmark href={dashboardHref} onClick={onNavigate} />
        <ConnectionStatus state={connectionState} labels={connectionLabels} />
      </div>

      <nav
        aria-label={menuLabel}
        className="flex flex-1 flex-col gap-1 overflow-y-auto px-3"
      >
        {navItems.map((item) => (
          <DrawerLink
            key={item.key}
            item={item}
            active={isActive(item.href)}
            onNavigate={onNavigate}
          />
        ))}
      </nav>

      <div className="flex flex-col gap-1 border-t border-border px-3 py-3">
        <DrawerLink
          item={settingsItem}
          active={isActive(settingsItem.href)}
          onNavigate={onNavigate}
        />
        {adminItem ? (
          <DrawerLink
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
 * Dashboard navigation. From `md` up, a fixed 64px icon-only rail
 * (FONDA_SANA_REDESIGN.md §5); below that a slide-over drawer behind a hamburger
 * in a slim top bar, because even the rail plus a phone's content is tight.
 *
 * The rail is part of the ground, not a panel on it: `--fonda-bg`, no right
 * border, monochrome icons. Labels appear on hover as a dark flyout pill, and
 * everything the old 256px rail stacked below the nav — connection status,
 * language, email, sign-out — now lives in the account popover at the bottom.
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
  accountLabel,
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

  return (
    <>
      {/* Desktop: the permanent icon rail. */}
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-16 flex-col items-center gap-1 bg-[var(--fonda-bg)] py-4 md:flex">
        <FondaMark href={dashboardHref} />

        {/* Deliberately NOT scrollable. `overflow-y: auto` forces `overflow-x`
            to compute to `auto` as well, which would clip the flyout labels at
            the rail's 64px edge. The budget that makes this safe is roughly a
            dozen 40px items in a viewport at least 768px wide; the nav list is
            fed from lib/roadmap.ts, so if you are adding rows there and this
            stack starts running long, the fix is a scroll container with the
            flyout portalled out of it — not silently re-adding overflow here. */}
        <nav
          aria-label={menuLabel}
          className="mt-4 flex flex-col items-center gap-1"
        >
          {navItems.map((item) => (
            <RailLink
              key={item.key}
              item={item}
              active={isActive(item.href)}
            />
          ))}
        </nav>

        <div className="mt-auto flex flex-col items-center gap-1 pt-4">
          <RailLink item={settingsItem} active={isActive(settingsItem.href)} />
          {adminItem ? (
            <RailLink item={adminItem} active={isActive(adminItem.href)} />
          ) : null}
          <AccountMenu
            accountLabel={accountLabel}
            connectionState={connectionState}
            connectionLabels={connectionLabels}
            userEmail={userEmail}
            signOutAction={signOutAction}
            signOutLabel={signOutLabel}
            locale={locale}
          />
        </div>
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
          "fixed inset-y-0 left-0 z-50 flex w-64 max-w-[85vw] flex-col bg-[var(--fonda-surface)] shadow-card transition-transform duration-200 ease-out md:hidden",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Tapping the current page can't change the pathname, so close here
            too — otherwise that one link would leave the drawer open. */}
        <DrawerContent
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
          menuLabel={menuLabel}
          isActive={isActive}
          onNavigate={() => setOpenFor(null)}
        />
      </aside>
    </>
  );
}
