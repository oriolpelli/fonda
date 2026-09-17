"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import {
  Activity,
  BarChart3,
  BedDouble,
  Bell,
  Bot,
  ChevronDown,
  ConciergeBell,
  CreditCard,
  DoorOpen,
  Dot,
  Eye,
  FileText,
  Info,
  LayoutDashboard,
  LineChart,
  LogOut,
  Megaphone,
  Menu,
  MessageSquare,
  Package,
  Scale,
  Send,
  Settings,
  Sparkles,
  SprayCan,
  Star,
  Sunrise,
  TrendingUp,
  UserCog,
  Users,
  Utensils,
  Wallet,
  Wrench,
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
  /**
   * The sub-pages this item owns (NAV_REORG_SPEC.md §3). A section with
   * children does not navigate: its icon opens the submenu panel, and its own
   * page is reached through its "Dashboard" child. `badge`, `comingSoon` and
   * `comingSoonLabel` all work at either level — a section can be unbuilt, and
   * so can a child.
   */
  children?: NavItem[];
  /**
   * Which section a child belongs to, when its route can't say so — the four
   * live Front Desk pages still sit at their Phase 1 URLs (`/dashboard/brief`
   * and friends), so `startsWith` against the section path won't find them.
   * Lets active-state grouping light the section while you're inside it.
   */
  sectionKey?: string;
}

// Icons live here in the Client Component and are looked up by key. They must
// NOT be passed as props from the Server layout — component functions can't
// cross the server/client boundary (doing so throws at render).
const ICONS: Record<string, LucideIcon> = {
  // Top-level sections — what the rail draws.
  dashboard: LayoutDashboard,
  "front-desk": ConciergeBell,
  revenue: TrendingUp,
  "sales-marketing": Megaphone,
  operations: Wrench,
  finance: Wallet,
  oversight: Eye,
  settings: Settings,

  // Children — what the submenu panel and the drawer's accordion draw
  // (NAV_REORG_SPEC.md §9.6). Those small row icons are most of the
  // Customer.io craft the panel is copying, so every sub-page has one.
  //
  // A section's own "Dashboard" child shares the section's key, so it can't be
  // listed here — `panelIconKey()` below special-cases it to LayoutDashboard.
  "front-desk-info": Info,
  brief: Sunrise,
  checkins: DoorOpen,
  communications: Send,
  concierge: Bell,
  reputation: Star,
  "revenue-management": LineChart,
  "demand-forecasting": Activity,
  "ota-parity": Scale,
  "upsell-ai": Sparkles,
  "room-upgrade-ai": BedDouble,
  staff: Users,
  housekeeping: SprayCan,
  fnb: Utensils,
  procurement: Package,
  "finance-reporting": FileText,
  chargeback: CreditCard,
  "ai-management": Bot,
  "team-activity": UserCog,

  // Out of the tree, kept for their routes.
  analytics: BarChart3,
  chat: MessageSquare,
};

/**
 * The ICONS key a child row should draw.
 *
 * A section's "Dashboard" sub-page carries the *section's* key (that row is the
 * section's own page), so a plain lookup would hand it the section's glyph —
 * Front Desk › Dashboard would show a concierge bell. The tell is that such a
 * row names itself as its own section: `sectionKey === key`. Everything else
 * looks itself up.
 *
 * Returns a key, not a component, for two reasons: it keeps this file's rule
 * that icons are resolved by string (see the ICONS comment above), and a
 * function that *returns a component* trips `react-hooks/static-components` at
 * the call site, which can only see that a component came out of a call.
 */
function panelIconKey(item: NavItem): string {
  return item.sectionKey && item.sectionKey === item.key
    ? "dashboard"
    : item.key;
}

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

/**
 * The corner marker for an unbuilt section on the rail (NAV_REORG_SPEC.md
 * §9.6): a small muted sparkle, the same glyph the panel's coming-soon rows
 * carry, so the marker reads the same rail-and-panel.
 *
 * Not a dimmed icon: `--fonda-text-3` at reduced opacity falls under the 3:1
 * minimum for non-text contrast. Decorative here — the "Coming soon" wording is
 * already folded into the item's accessible name by `visibleLabel`.
 *
 * Nudged in a notch from the 5px dot this replaces (`right-1.5 top-1.5`), since
 * the glyph is wider and would otherwise sit on the section icon's shoulder.
 */
function SoonMarker() {
  return (
    <Sparkles
      aria-hidden="true"
      strokeWidth={1.5}
      className="absolute right-1 top-1 size-3 text-[var(--fonda-text-3)]"
    />
  );
}

/**
 * The quiet mono "Coming soon" chip carried by labelled rows — the drawer, the
 * submenu panel, and a drawer group's header.
 */
function SoonChip({
  label,
  active,
  className,
}: {
  label: string;
  active: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "shrink-0 rounded-full border border-[var(--fonda-border-2)] px-1.5 py-0.5 font-mono text-[10px] font-normal leading-[1.5] tracking-[0.04em] transition-colors",
        // On the --fonda-inset fill, text-3 is only 4.22:1 — under AA — so the
        // hover and active states step up to text-2 (5.83:1 there).
        active
          ? "text-[var(--fonda-text-2)]"
          : "text-[var(--fonda-text-3)] group-hover:text-[var(--fonda-text-2)]",
        className
      )}
    >
      {label}
    </span>
  );
}

/** The count chip on a labelled row (the icon rail uses `CountBadge`). */
function RowBadge({
  badge,
  className,
}: {
  badge: NavBadge;
  className?: string;
}) {
  return (
    <span
      aria-label={badge.srLabel}
      className={cn(
        "shrink-0 rounded-full px-2 py-0.5 font-mono text-[11px] font-medium tabular-nums",
        badge.alert
          ? "bg-[var(--fonda-ink)] text-[var(--fonda-text-inv)]"
          : "bg-[var(--fonda-inset)] text-[var(--fonda-text)]",
        className
      )}
    >
      {badge.count}
    </span>
  );
}

/**
 * Monochrome states for a labelled row, shared by the drawer and the submenu
 * panel. Same tell as the rail: the active row is darker and heavier, never a
 * different hue.
 */
function rowStateClass(active: boolean, soon: boolean) {
  return active
    // font-medium, not semibold: the inset fill carries the active state on its
    // own (§9.3 — Customer.io's active row isn't bold).
    ? "bg-[var(--fonda-inset)] font-medium text-foreground"
    : soon
      ? "text-[var(--fonda-text-3)] hover:bg-[var(--fonda-surface-2)] hover:text-[var(--fonda-text-2)]"
      : "text-[var(--fonda-text-2)] hover:bg-[var(--fonda-surface-2)] hover:text-foreground";
}

/**
 * One child row inside a section — the submenu panel on desktop, the expanded
 * accordion group on mobile: a small thin icon, the label, and a trailing
 * marker (NAV_REORG_SPEC.md §9.6).
 *
 * `marker` picks how "not built yet" reads. The panel is 220px, so it gets the
 * small sparkle glyph; the drawer has the width for words and keeps the mono
 * chip. Never both.
 */
function PanelLink({
  item,
  active,
  onNavigate,
  marker = "glyph",
  className,
}: {
  item: NavItem;
  active: boolean;
  /** Closes the panel/drawer, including for a tap on the current page. */
  onNavigate?: () => void;
  marker?: "glyph" | "chip";
  className?: string;
}) {
  const soon = item.comingSoon === true;
  // Neutral bullet if a sub-page has no icon of its own.
  const Icon = ICONS[panelIconKey(item)] ?? Dot;
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group flex items-center gap-2.5 rounded-[10px] px-2.5 py-[9px] text-[13px] font-medium transition-colors",
        rowStateClass(active, soon),
        className
      )}
    >
      {/* A step quieter than the label at rest, then it comes up with the row —
          `text-inherit` hands it back to whatever state class is in force. */}
      <Icon
        aria-hidden="true"
        strokeWidth={1.5}
        className={cn(
          "size-[18px] shrink-0 transition-colors",
          !active && "text-[var(--fonda-text-3)] group-hover:text-inherit"
        )}
      />
      <span className="min-w-0 truncate">{item.label}</span>
      {soon && item.comingSoonLabel ? (
        marker === "chip" ? (
          <SoonChip
            label={item.comingSoonLabel}
            active={active}
            className="ml-auto"
          />
        ) : (
          // `role="img"` on the wrapper, not the svg: it keeps the accessible
          // name on one element and gives the native tooltip somewhere to hang.
          <span
            role="img"
            title={item.comingSoonLabel}
            aria-label={item.comingSoonLabel}
            className="ml-auto inline-flex shrink-0 items-center text-[var(--fonda-text-3)]"
          >
            <Sparkles
              aria-hidden="true"
              strokeWidth={1.5}
              className="size-[14px]"
            />
          </span>
        )
      ) : null}
      {item.badge && item.badge.count > 0 ? (
        <RowBadge badge={item.badge} className="ml-auto" />
      ) : null}
    </Link>
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
      {item.comingSoon ? <SoonMarker /> : null}
      {badge ? <CountBadge badge={badge} active={active} /> : null}
      <FlyoutLabel label={label} />
    </Link>
  );
}

/**
 * The count a section shows while its panel is shut.
 *
 * Nesting Communications under Front Desk would otherwise hide the "messages
 * waiting" count behind a click, which is the one number the rail exists to
 * put in front of you. Surfaced only when exactly one child is carrying a
 * count: two would have to be summed, and there is no honest screen-reader
 * wording for a sum that the server didn't pluralize.
 */
function sectionBadge(item: NavItem): NavBadge | null {
  const counted = (item.children ?? []).filter(
    (child) => child.badge && child.badge.count > 0
  );
  return counted.length === 1 ? (counted[0].badge ?? null) : null;
}

/**
 * A rail icon that owns a submenu panel (NAV_REORG_SPEC.md §2): a ~220px
 * labelled column docked immediately right of the rail, listing this section's
 * sub-pages.
 *
 * The trigger is a button, not a link — the section itself has no page of its
 * own to go to; `/dashboard/revenue` and friends are reached through the
 * "Dashboard" child inside the panel.
 *
 * A disclosure, not an ARIA `menu` — same reasoning as `AccountMenu` below:
 * `aria-expanded` + `aria-controls`, the panel always in the DOM (just
 * `hidden`) so `aria-controls` never dangles, Escape returns focus to the
 * trigger, an outside pointer dismisses it.
 *
 * Hover previews, click pins (§2). The wrapper spans the rail's full width so
 * the pointer can cross the gap between icon and panel without leaving it —
 * and the panel is a DOM descendant, so moving onto it never fires
 * `mouseleave` even though it sits outside the wrapper geometrically.
 */
function RailSection({
  item,
  active,
  open,
  onHover,
  onLeave,
  onToggle,
  onClose,
  isActive,
}: {
  item: NavItem;
  /** Lit for the whole time the route is anywhere inside this section. */
  active: boolean;
  open: boolean;
  onHover: (key: string) => void;
  onLeave: (key: string) => void;
  onToggle: (key: string) => void;
  onClose: () => void;
  isActive: (href: string) => boolean;
}) {
  const Icon = ICONS[item.key] ?? Settings;
  const label = visibleLabel(item);
  const badge = sectionBadge(item);
  const panelId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLElement>(null);

  // An aria-label replaces the control's contents as its accessible name, so
  // the count has to be folded in — otherwise it goes unannounced.
  const accessibleName = badge ? `${label}, ${badge.srLabel}` : label;

  /** Collapse and hand focus back to the trigger. */
  const dismiss = useCallback(() => {
    onClose();
    triggerRef.current?.focus();
  }, [onClose]);

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
      // and closing here first would let that click reopen the panel.
      if (triggerRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      // Not `dismiss()`: focus belongs wherever the user just clicked.
      onClose();
    }

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open, dismiss, onClose]);

  return (
    <div
      className="relative flex w-full justify-center"
      onMouseEnter={() => onHover(item.key)}
      onMouseLeave={() => onLeave(item.key)}
    >
      <button
        ref={triggerRef}
        type="button"
        aria-label={accessibleName}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => onToggle(item.key)}
        // Focus ring comes from the shared :focus-visible rule in globals.css.
        className={cn(RAIL_ITEM, railStateClass(active || open))}
      >
        <Icon className="size-5" strokeWidth={1.5} />
        {item.comingSoon ? <SoonMarker /> : null}
        {badge ? <CountBadge badge={badge} active={active || open} /> : null}
        {/* Suppressed while open — the panel already names the section, and
            the pill would sit on top of it. */}
        {open ? null : <FlyoutLabel label={label} />}
      </button>

      {/* Part of the ground, not a card on it (§9.1): the same `--fonda-bg` as
          the rail, no shadow, one hairline on the right edge — rail and panel
          read as one continuous nav zone rather than a popover that floated in.

          Always mounted so it can animate (§9.4). `inert` when closed is what
          keeps it honest: out of the tab order and out of the a11y tree, the
          same discipline the mobile drawer uses, so `aria-controls` still
          points at real markup. `pointer-events-none` stops the invisible
          column swallowing clicks meant for the page underneath.

          `prefers-reduced-motion` collapses the transition through the global
          rule in globals.css. */}
      <nav
        ref={panelRef}
        id={panelId}
        inert={!open}
        aria-hidden={!open}
        aria-label={item.label}
        className={cn(
          "fixed inset-y-0 left-16 z-30 flex w-[220px] flex-col gap-1 overflow-y-auto border-r border-[var(--fonda-border)] bg-[var(--fonda-bg)] px-3 py-4 transition-[opacity,transform] duration-150 ease-out",
          open
            ? "translate-x-0 opacity-100"
            : "pointer-events-none -translate-x-1 opacity-0"
        )}
      >
        <p className="px-3 pb-2 pt-1 font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--fonda-text-3)]">
          {item.label}
        </p>
        {(item.children ?? []).map((child) => (
          <PanelLink
            key={child.key}
            item={child}
            active={isActive(child.href)}
            // Following a link to the page you are already on can't change the
            // pathname, so close here too.
            onNavigate={onClose}
          />
        ))}
      </nav>
    </div>
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
        rowStateClass(active, soon)
      )}
    >
      <Icon className="size-[18px] shrink-0" strokeWidth={1.5} />
      <span className="min-w-0 truncate">{item.label}</span>
      {soon && item.comingSoonLabel ? (
        <SoonChip
          label={item.comingSoonLabel}
          active={active}
          className="ml-auto"
        />
      ) : null}
      {item.badge && item.badge.count > 0 ? (
        <RowBadge badge={item.badge} className="ml-auto" />
      ) : null}
    </Link>
  );
}

/**
 * A section in the mobile drawer: a header row that expands to reveal its
 * children, indented under a hairline (NAV_REORG_SPEC.md §2).
 *
 * The header doesn't navigate, matching the rail — the section's own page is
 * the "Dashboard" child. An active section's header goes dark and semibold but
 * takes no inset fill: the fill is reserved for the one row you're actually
 * on, so the group and the page don't both claim to be current.
 */
function DrawerGroup({
  item,
  active,
  expanded,
  onToggle,
  isActive,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  expanded: boolean;
  onToggle: () => void;
  isActive: (href: string) => boolean;
  onNavigate: () => void;
}) {
  const Icon = ICONS[item.key] ?? Settings;
  const soon = item.comingSoon === true;
  const listId = useId();

  return (
    <div>
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={listId}
        onClick={onToggle}
        className={cn(
          "group flex w-full items-center gap-3 rounded-[10px] px-3 py-2.5 text-sm font-medium transition-colors",
          active
            ? "font-semibold text-foreground hover:bg-[var(--fonda-surface-2)]"
            : soon
              ? "text-[var(--fonda-text-3)] hover:bg-[var(--fonda-surface-2)] hover:text-[var(--fonda-text-2)]"
              : "text-[var(--fonda-text-2)] hover:bg-[var(--fonda-surface-2)] hover:text-foreground"
        )}
      >
        <Icon className="size-[18px] shrink-0" strokeWidth={1.5} />
        <span className="min-w-0 truncate">{item.label}</span>
        <span className="ml-auto flex shrink-0 items-center gap-1.5">
          {soon && item.comingSoonLabel ? (
            <SoonChip label={item.comingSoonLabel} active={active} />
          ) : null}
          <ChevronDown
            aria-hidden="true"
            className={cn(
              "size-4 transition-transform duration-[180ms]",
              expanded && "rotate-180"
            )}
            strokeWidth={1.5}
          />
        </span>
      </button>

      <div
        id={listId}
        hidden={!expanded}
        className={cn(
          "ml-[26px] mt-1 flex-col gap-1 border-l border-[var(--fonda-border)] pl-2",
          expanded ? "flex" : "hidden"
        )}
      >
        {(item.children ?? []).map((child) => (
          <PanelLink
            key={child.key}
            item={child}
            active={isActive(child.href)}
            onNavigate={onNavigate}
            // The drawer has the width for words, so it keeps the mono chip
            // where the 220px panel takes the glyph (§9.6).
            marker="chip"
            // Taller than the desktop panel's rows: a thumb needs the height,
            // and this matches the rhythm of `DrawerLink` above it. The text
            // stays a step smaller than the header, so the hierarchy holds.
            className="py-2.5"
          />
        ))}
      </div>
    </div>
  );
}

interface SidebarProps {
  navItems: NavItem[];
  settingsItem: NavItem;
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
  dashboardHref,
  connectionState,
  connectionLabels,
  userEmail,
  signOutAction,
  signOutLabel,
  locale,
  menuLabel,
  isActive,
  isSectionActive,
  onNavigate,
}: Pick<
  SidebarProps,
  | "navItems"
  | "settingsItem"
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
  isSectionActive: (item: NavItem) => boolean;
  onNavigate: () => void;
}) {
  // Only the groups the user has *touched* are tracked; everything else
  // follows the route, so reopening the drawer somewhere else lands with the
  // right group already open. An explicit toggle then sticks across routes,
  // which is what someone who collapsed a group meant.
  const [toggled, setToggled] = useState<Record<string, boolean>>({});
  const isExpanded = (item: NavItem) =>
    toggled[item.key] ?? isSectionActive(item);

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
        {navItems.map((item) =>
          item.children?.length ? (
            <DrawerGroup
              key={item.key}
              item={item}
              active={isSectionActive(item)}
              expanded={isExpanded(item)}
              onToggle={() =>
                setToggled((prev) => ({
                  ...prev,
                  [item.key]: !isExpanded(item),
                }))
              }
              isActive={isActive}
              onNavigate={onNavigate}
            />
          ) : (
            <DrawerLink
              key={item.key}
              item={item}
              active={isActive(item.href)}
              onNavigate={onNavigate}
            />
          )
        )}
      </nav>

      <div className="flex flex-col gap-1 border-t border-border px-3 py-3">
        <DrawerLink
          item={settingsItem}
          active={isActive(settingsItem.href)}
          onNavigate={onNavigate}
        />
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
 * The nav is two levels (NAV_REORG_SPEC.md §2, which supersedes the redesign
 * doc's single-level rail): a section that owns children opens a docked 220px
 * submenu panel instead of navigating, and the drawer renders those sections
 * as accordion groups. Everything else about the rail is unchanged — same
 * tokens, same 10px radius, same active-by-darkness tell, same flyout labels.
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

  // Which section's submenu panel is showing, and whether a click pinned it or
  // a hover is only previewing it. `route` applies the same open-for-one-route
  // trick the drawer uses: any navigation closes the panel for free.
  const [section, setSection] = useState<{
    key: string;
    pinned: boolean;
    route: string;
  } | null>(null);
  const openSection = section?.route === pathname ? section.key : null;

  /** Hover preview. A pinned panel wins — hovering elsewhere won't steal it. */
  const hoverSection = useCallback(
    (key: string) => {
      setSection((prev) =>
        prev?.pinned && prev.route === pathname
          ? prev
          : { key, pinned: false, route: pathname }
      );
    },
    [pathname]
  );

  /** Leaving the icon (and its panel) drops a preview, never a pinned panel. */
  const unhoverSection = useCallback((key: string) => {
    setSection((prev) =>
      prev && !prev.pinned && prev.key === key ? null : prev
    );
  }, []);

  /** Click pins; clicking the pinned section again closes it. */
  const toggleSection = useCallback(
    (key: string) => {
      setSection((prev) =>
        prev?.key === key && prev.pinned && prev.route === pathname
          ? null
          : { key, pinned: true, route: pathname }
      );
    },
    [pathname]
  );

  const closeSection = useCallback(() => setSection(null), []);

  const isActive = useCallback(
    (href: string) => {
      const target = stripLocale(href);
      if (current === target) return true;
      // A section stays lit inside its own sub-pages — Settings is a menu of
      // groups now, so an exact match would go dark the moment you clicked
      // into one. "/dashboard" is the exception: every route sits below it, so
      // it only ever matches itself.
      return target !== "/dashboard" && current.startsWith(`${target}/`);
    },
    [current]
  );

  // The child row whose page we're on, searched across every section so a child
  // can *declare* its owner rather than have it inferred from the URL.
  const activeChild = navItems
    .flatMap((item) => item.children ?? [])
    .find((child) => isActive(child.href));

  /**
   * A section is lit for its own page, for any child's page, or for a deeper
   * route under either.
   *
   * The `sectionKey` clause is what keeps Front Desk lit on the Morning Brief:
   * the four live children still sit at their Phase 1 URLs (/dashboard/brief,
   * /dashboard/checkins, /dashboard/communications, /dashboard/concierge),
   * none of which a prefix test against /dashboard/front-desk will ever match.
   */
  const isSectionActive = (item: NavItem) => {
    if (isActive(item.href)) return true;
    if (activeChild?.sectionKey === item.key) return true;
    return (item.children ?? []).some((child) => isActive(child.href));
  };

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
        {/* `w-full` so a section's hover wrapper spans the rail's whole 64px:
            the pointer then crosses from the icon to the docked panel without
            ever leaving the element that opened it, and the preview doesn't
            flicker shut in the gap. Items stay centred via `items-center`. */}
        <nav
          aria-label={menuLabel}
          className="mt-4 flex w-full flex-col items-center gap-1"
        >
          {navItems.map((item) =>
            item.children?.length ? (
              <RailSection
                key={item.key}
                item={item}
                active={isSectionActive(item)}
                open={openSection === item.key}
                onHover={hoverSection}
                onLeave={unhoverSection}
                onToggle={toggleSection}
                onClose={closeSection}
                isActive={isActive}
              />
            ) : (
              // A direct link (Dashboard) or a childless coming-soon section
              // (Sales & Marketing): clicking just navigates, no panel.
              <RailLink
                key={item.key}
                item={item}
                active={isActive(item.href)}
              />
            )
          )}
        </nav>

        <div className="mt-auto flex flex-col items-center gap-1 pt-4">
          <RailLink item={settingsItem} active={isActive(settingsItem.href)} />
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
          dashboardHref={dashboardHref}
          connectionState={connectionState}
          connectionLabels={connectionLabels}
          userEmail={userEmail}
          signOutAction={signOutAction}
          signOutLabel={signOutLabel}
          locale={locale}
          menuLabel={menuLabel}
          isActive={isActive}
          isSectionActive={isSectionActive}
          onNavigate={() => setOpenFor(null)}
        />
      </aside>
    </>
  );
}
