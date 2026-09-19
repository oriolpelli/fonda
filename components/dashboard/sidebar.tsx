"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Fragment,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Activity,
  BedDouble,
  Bell,
  BookUser,
  Bot,
  ChevronDown,
  ClipboardList,
  CreditCard,
  DoorOpen,
  Dot,
  FileText,
  House,
  Info,
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
  Tag,
  TrendingUp,
  UserCog,
  Users,
  Utensils,
  X,
  type LucideIcon,
} from "lucide-react";

import {
  CommandPalette,
  type PalettedPage,
} from "@/components/dashboard/command-palette";
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
   * The sub-pages this item owns (APP_UX_PROPOSAL.md §2.2). A section with
   * children does not navigate: its icon opens the submenu panel, and the
   * pillar itself has no page of its own. `badge`, `comingSoon` and
   * `comingSoonLabel` all work at either level — a section can be unbuilt, and
   * so can a child.
   */
  children?: NavItem[];
  /**
   * Which section a child belongs to, when its route can't say so. Under the
   * two pillars (APP_UX_PROPOSAL.md §2.2) that is every child: no route sits
   * below `/dashboard/operation` or `/dashboard/commercial`, because the
   * pillars are groupings rather than pages, so `startsWith` against the
   * section path never matches. Lets active-state grouping light the section
   * while you're inside it.
   */
  sectionKey?: string;
  /**
   * The one section that owns this row's active state when the row appears in
   * more than one panel (APP_UX_PROPOSAL.md §2.2).
   *
   * Reputation is genuinely both things — a GM reads reviews in the morning to
   * find out what broke, and monthly to understand what's moving the score — so
   * the same row, pointing at the same route, renders under both Operation and
   * Commercial. Only one rail icon may light for it: two lit icons read as a
   * bug, not a feature. The canonical owner is Operation, because the daily
   * read is the operational one.
   *
   * The rule: set this to the owner's key on *every* copy of a shared row, so
   * the ownership is stated rather than inferred from which panel happens to
   * come first in the tree. Absent — the normal case — active state falls back
   * to `sectionKey` and the URL prefix.
   */
  canonicalSectionKey?: string;
  /**
   * An optional labelled sub-group inside a panel (APP_UX_PROPOSAL.md §2.3) —
   * used once today, for Communications under Operation. The value is the stem
   * of the dictionary key holding the group's label: `group: "communications"`
   * reads `sidebar.communicationsGroup`.
   *
   * Rows sharing a value render together under one mono eyebrow, in tree order.
   * Data only for now — the panel and drawer learn to draw it in the rendering
   * pass.
   */
  group?: string;
}

// Icons live here in the Client Component and are looked up by key. They must
// NOT be passed as props from the Server layout — component functions can't
// cross the server/client boundary (doing so throws at render).
const ICONS: Record<string, LucideIcon> = {
  // The rail, in its own order (APP_UX_PROPOSAL.md §2.1). All five keys are
  // mapped on purpose: the `?? Settings` fallback at the call site is a guard
  // against a typo, not a default, and an unmapped key doesn't announce itself
  // — it just draws one more gear in a column of gears.
  home: House,
  // Ask. Sparkles rather than a speech bubble: it is already this surface's
  // glyph in `ChatThread` and `AskYourHotel`, and MessageSquare is spoken for
  // by Communications › In-house below.
  chat: Sparkles,
  operation: ClipboardList,
  commercial: TrendingUp,
  settings: Settings,

  // Sales & marketing is a Commercial row, not a section — the six per-section
  // dashboards that used to keep it company are redirects now
  // (APP_UX_PROPOSAL.md §2.4, deletion 1) and their icons went with them.
  "sales-marketing": Megaphone,

  // Children — what the submenu panel and the drawer's accordion draw
  // (NAV_REORG_SPEC.md §9.6). Those small row icons are most of the
  // Customer.io craft the panel is copying, so every sub-page has one.
  "front-desk-info": Info,
  brief: Sunrise,
  arrivals: DoorOpen,
  communications: Send,
  // The two Communications rows sit one above the other under their eyebrow,
  // so they must not share a glyph: Send is the mail going out to an upcoming
  // stay, MessageSquare the conversation with a guest already in the building.
  "communications-in-house": MessageSquare,
  guests: BookUser,
  concierge: Bell,
  reputation: Star,
  "revenue-management": LineChart,
  "demand-forecasting": Activity,
  "ota-parity": Scale,
  "upsell-ai": Tag,
  "room-upgrade-ai": BedDouble,
  staff: Users,
  housekeeping: SprayCan,
  fnb: Utensils,
  procurement: Package,
  "finance-reporting": FileText,
  chargeback: CreditCard,
  "ai-management": Bot,
  "team-activity": UserCog,
};





/** Index of the first section that owns children — where the pillars begin. */
function firstSectionIndexOf(items: NavItem[]) {
  return items.findIndex((item) => Boolean(item.children?.length));
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

/** The count chip on a labelled row. */
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
  const Icon = ICONS[item.key] ?? Dot;
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

/**
 * A pillar's heading in the sidebar — Operation, Commercial.
 *
 * The whole of decision P-6 is in the element type. Through v3 a pillar was a
 * *button*: a 64px rail cannot show a label, so the label lived in a docked
 * panel and the icon had to open it — which meant hover preview, click to pin,
 * click again to close, Escape, outside-pointer dismiss, and a rule that the
 * section itself must not navigate. A labelled sidebar shows the children
 * outright, so the pillar has nothing left to do but name them.
 *
 * So: a `<p>`. Not focusable, no hover state, no cursor change, nothing to
 * dismiss. The "pillars are deliberately unrouted" decision now holds by
 * construction rather than by enforcement — a heading cannot navigate.
 *
 * `aria-hidden` is deliberately NOT set: the text is a real heading for the
 * rows under it, and screen readers should read it as they pass.
 */
function SectionEyebrow({ label }: { label: string }) {
  return (
    <p className="px-2.5 pb-1 pt-4 font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--fonda-text-3)]">
      {label}
    </p>
  );
}

/**
 * The header for a labelled sub-group inside a panel (APP_UX_PROPOSAL.md §2.3):
 * the panel's own mono eyebrow treatment, one step quieter — 10px against the
 * header's 11px, and no `font-medium` — so the group reads as a level below the
 * section it sits in rather than a second section.
 *
 * A `<p>`, not a button: there is no chevron and no collapse. At two rows there
 * is nothing to collapse, and a control that only ever has one state is a thing
 * to tab past for no reason.
 */
function GroupEyebrow({ label }: { label: string }) {
  return (
    <p className="pb-1 pl-2.5 pt-3 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--fonda-text-3)]">
      {label}
    </p>
  );
}

/**
 * A section's rows in tree order, with each labelled sub-group's eyebrow drawn
 * once before its first member (APP_UX_PROPOSAL.md §2.3).
 *
 * General on purpose, though only Communications needs it today: the renderer
 * knows nothing about which group it is drawing, so Finance gets it for free
 * when it comes back — a `group` on the item and a `<stem>Group` key in the
 * dictionary, no code.
 *
 * The grouping is read off tree order — a row opens a group when the row above
 * it isn't in the same one — rather than kept in a second structure that could
 * disagree with the tree about where a row belongs.
 *
 * Shared by the desktop panel and the drawer's accordion: on mobile the same
 * block renders indented *inside* the section that is already expanded, never
 * as a second accordion nested in the first.
 */
function PanelRows({
  items,
  sectionKey,
  groupLabels,
  isActive,
  onNavigate,
  marker = "glyph",
  rowClassName,
}: {
  items: NavItem[];
  /**
   * The key of the section these rows belong to, used to settle which copy of
   * a shared row lights (APP_UX_PROPOSAL.md §2.2).
   *
   * Reputation renders under BOTH pillars, pointing at the same route. Under
   * the docked panels this never mattered: one panel was open at a time, so
   * the two copies were never on screen together and `isActive(href)` lighting
   * both was invisible. The labelled sidebar shows every pillar at once, so
   * the rule that used to govern which rail *icon* lit now has to govern which
   * *row* does — otherwise /dashboard/reputation lights two rows, and a lit row
   * stops meaning "you are here".
   */
  sectionKey: string;
  /** Group label by `NavItem.group` — see `SidebarProps.groupLabels`. */
  groupLabels: Record<string, string>;
  isActive: (href: string) => boolean;
  onNavigate?: () => void;
  marker?: "glyph" | "chip";
  /** Row overrides from the caller — the drawer's taller rows. */
  rowClassName?: string;
}) {
  return (
    <>
      {items.map((item, index) => {
        const group = item.group;
        const label = group ? groupLabels[group] : undefined;
        const opensGroup =
          group !== undefined && group !== items[index - 1]?.group;
        return (
          <Fragment key={item.key}>
            {opensGroup && label ? <GroupEyebrow label={label} /> : null}
            <PanelLink
              item={item}
              active={
                isActive(item.href) &&
                (!item.canonicalSectionKey ||
                  item.canonicalSectionKey === sectionKey)
              }
              onNavigate={onNavigate}
              marker={marker}
              className={cn(
                rowClassName,
                // Indented so a grouped row's icon column lines up under the
                // eyebrow instead of under the ungrouped rows above it. Last
                // in the class list, so it wins the `px-2.5` on the row shell.
                group && "pl-7"
              )}
            />
          </Fragment>
        );
      })}
    </>
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
 * The account row at the foot of the sidebar: who is signed in, the language
 * switcher, and sign-out.
 *
 * v4 — it is a full-width labelled row now, not a 40px avatar button, and the
 * popover opens UPWARDS from it rather than sideways out of a 64px rail. The
 * connection status moved out: the rail had nowhere to put it, so it hid in
 * here; a 240px sidebar can simply show it, and a sync that has gone stale is
 * not something to bury behind a click.
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
  userEmail,
  signOutAction,
  signOutLabel,
  locale,
}: Pick<
  SidebarProps,
  | "accountLabel"
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
        className="group flex w-full items-center gap-2.5 rounded-[8px] px-2.5 py-[7px] text-left text-[13px] font-medium text-[var(--fonda-text-2)] transition-colors hover:bg-[color-mix(in_srgb,var(--fonda-inset)_60%,transparent)] hover:text-foreground"
      >
        <span
          aria-hidden="true"
          className="inline-flex size-[22px] shrink-0 items-center justify-center rounded-full bg-[var(--fonda-inset)] font-mono text-[11px] font-medium leading-none text-[var(--fonda-text)]"
        >
          {initial}
        </span>
        <span className="min-w-0 flex-1 truncate">{userEmail}</span>
        <ChevronDown
          aria-hidden="true"
          strokeWidth={1.5}
          className={cn(
            "size-[14px] shrink-0 text-[var(--fonda-text-3)] transition-transform duration-150",
            open && "rotate-180"
          )}
        />
      </button>

      <div
        ref={panelRef}
        id={panelId}
        hidden={!open}
        className={cn(
          // Opens UPWARDS, spanning the sidebar's own width: there is no rail
          // edge to fly out of any more, and a popover that escaped a 240px
          // column sideways would hang over the canvas for no reason. Still an
          // overlay, so it keeps --fonda-white and a shadow (§0.1).
          "absolute bottom-full left-0 right-0 z-50 mb-2 rounded-[12px] bg-[var(--fonda-white)] p-3 shadow-card ring-1 ring-[var(--fonda-border)]",
          !open && "hidden"
        )}
      >
        {/* The full address. The trigger truncates it, and on a 240px column a
            work email usually is truncated, so this is not a repeat. */}
        <p className="break-all px-1 text-[13px] font-medium text-[var(--fonda-text-2)]">
          {userEmail}
        </p>

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
  groupLabels,
}: {
  item: NavItem;
  active: boolean;
  expanded: boolean;
  onToggle: () => void;
  isActive: (href: string) => boolean;
  onNavigate: () => void;
  /** Group label by `NavItem.group` — see `SidebarProps.groupLabels`. */
  groupLabels: Record<string, string>;
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
        <PanelRows
          items={item.children ?? []}
          sectionKey={item.key}
          groupLabels={groupLabels}
          isActive={isActive}
          onNavigate={onNavigate}
          // The drawer has the width for words, so it keeps the mono chip
          // where the 220px panel takes the glyph (§9.6).
          marker="chip"
          // Taller than the desktop panel's rows: a thumb needs the height,
          // and this matches the rhythm of `DrawerLink` above it. The text
          // stays a step smaller than the header, so the hierarchy holds.
          rowClassName="py-2.5"
        />
      </div>
    </div>
  );
}

interface SidebarProps {
  navItems: NavItem[];
  settingsItem: NavItem;
  /**
   * The label for each labelled sub-group inside a panel, keyed by
   * `NavItem.group` (APP_UX_PROPOSAL.md §2.3) — `{ communications:
   * "Communications" }` from `sidebar.communicationsGroup`.
   *
   * A prop rather than a lookup in here for the same reason the icons are the
   * other way round: the dictionary can't cross into a Client Component, and
   * the icons can't cross out of one.
   */
  groupLabels: Record<string, string>;
  /**
   * The property's own name, shown in the sidebar's top row (P-6).
   *
   * Falls back to the product name upstream rather than here, so the row is
   * never blank for a hotel that has not filled its settings in.
   */
  hotelName: string;
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
  groupLabels,
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
  | "groupLabels"
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

  const firstSectionIndex = firstSectionIndexOf(navItems);

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
        {navItems.map((item, index) => (
          <Fragment key={item.key}>
            {/* The rail's one structural divider, kept in the drawer so both
                widths say the same thing — see the rail's copy below. */}
            {index === firstSectionIndex && index > 0 ? (
              <div className="mx-3 my-2 h-px bg-[var(--fonda-border)]" />
            ) : null}
            {item.children?.length ? (
              <DrawerGroup
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
                groupLabels={groupLabels}
              />
            ) : (
              <DrawerLink
                item={item}
                active={isActive(item.href)}
                onNavigate={onNavigate}
              />
            )}
          </Fragment>
        ))}
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
  groupLabels,
  hotelName,
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

  // v4 (P-6): the section hover/pin/dismiss state machine that lived here is
  // gone. It existed to show labels a 64px rail could not, and the sidebar
  // shows them outright — so there is nothing to open, nothing to pin, and
  // nothing to dismiss. `firstSectionIndex` survives for the mobile drawer,
  // which still draws a divider where the pillars begin.

  /**
   * Every destination in the tree, flattened for the palette.
   *
   * Built from the same `navItems` the sidebar draws, so a page that exists in
   * the nav is findable by name and one that does not is not — there is no
   * second list of routes to fall out of step with this one. Pillars are
   * excluded: they are headings and have nowhere to go.
   */
  const palettePages: PalettedPage[] = useMemo(() => {
    const out: PalettedPage[] = [];
    for (const item of navItems) {
      if (item.children?.length) {
        for (const child of item.children) {
          out.push({ key: child.key, label: child.label, href: child.href });
        }
      } else {
        out.push({ key: item.key, label: item.label, href: item.href });
      }
    }
    out.push({
      key: settingsItem.key,
      label: settingsItem.label,
      href: settingsItem.href,
    });
    // Reputation appears under both pillars; the palette shows one of it.
    return out.filter(
      (page, i) => out.findIndex((p) => p.href === page.href) === i
    );
  }, [navItems, settingsItem]);

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
   * The `sectionKey` clause is what keeps Operation lit on the Morning Brief:
   * its children sit at their own top-level URLs (/dashboard/brief,
   * /dashboard/arrivals, /dashboard/communications), none of which a prefix
   * test against /dashboard/operation will ever match.
   */
  const isSectionActive = (item: NavItem) => {
    if (isActive(item.href)) return true;
    // A row that sits in more than one panel names its owner, and only that
    // section lights (APP_UX_PROPOSAL.md §2.2). Reputation is the case: it is
    // genuinely both a morning read and a monthly one, so the same row renders
    // under Operation and under Commercial — and without this clause the two
    // clauses below would light *both* rail icons on /dashboard/reputation.
    //
    // That would be a bug, not a feature. The rail's active state answers one
    // question — where am I? — and it has exactly one answer; two lit icons
    // makes the tell meaningless everywhere else, since a lit icon would no
    // longer mean "you are in here". Operation wins because the daily read is
    // the operational one. Both panels still show Reputation as their active
    // row when opened: that is `isActive` on the row, not this.
    if (activeChild?.canonicalSectionKey) {
      return activeChild.canonicalSectionKey === item.key;
    }
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
      {/* Desktop: the permanent labelled sidebar (P-6). */}
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-60 flex-col bg-[var(--fonda-chrome)] md:flex">
        {/* The hotel row. Static by design: this is where a property switcher
            goes when Fondas is multi-property, and shipping a control that
            cannot switch anything would be a promise the product does not keep.
            TODO(multi-property): make this a combobox over the user's hotels. */}
        <div className="flex h-[52px] shrink-0 items-center gap-2.5 px-3.5">
          <FondaMark href={dashboardHref} />
          <span className="min-w-0 flex-1 truncate text-[14px] font-medium text-[var(--fonda-text)]">
            {hotelName}
          </span>
        </div>

        {/* ⌘K. A CONTROL, not a destination — which is why it sits above the
            nav rather than in it, and reads a step quieter than a nav row. The
            nav is still five sections. */}
        <div className="px-2.5 pt-1">
          <CommandPalette pages={palettePages} locale={locale} />
        </div>

        {/* Scrollable, unlike the rail — which could not scroll without
            `overflow-x` clipping its flyout labels. There are no flyouts now,
            and the column has to survive a pillar growing a sixth row on a
            768px-tall laptop. The hotel row above and the foot block below are
            `shrink-0`, so only the nav moves. */}
        <nav
          aria-label={menuLabel}
          className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto px-2.5 pb-3"
        >
          {navItems.map((item) =>
            item.children?.length ? (
              // A pillar: a heading, then its rows inline. No divider — the
              // eyebrow's own space is the change of register the rail needed
              // a hairline for.
              <Fragment key={item.key}>
                <SectionEyebrow label={item.label} />
                <PanelRows
                  items={item.children}
                  sectionKey={item.key}
                  groupLabels={groupLabels}
                  isActive={isActive}
                  marker="chip"
                />
              </Fragment>
            ) : (
              // A direct link — Home and Ask, the two places you are always in.
              // Rendered in tree order rather than promoted: the order is the
              // server's data, and re-sorting it here would put the sidebar and
              // the drawer one refactor away from disagreeing.
              <PanelLink
                key={item.key}
                item={item}
                active={isActive(item.href)}
                marker="chip"
              />
            )
          )}
        </nav>

        <div className="shrink-0 px-2.5 pb-3 pt-2">
          {/* Out of the account popover and onto the page (§5.4 reversed): the
              rail hid this because it had nowhere to put it, and a sync that
              has gone stale is not something to bury behind a click. */}
          <div className="px-2.5 pb-2">
            <ConnectionStatus
              state={connectionState}
              labels={connectionLabels}
            />
          </div>
          <PanelLink
            item={settingsItem}
            active={isActive(settingsItem.href)}
            marker="chip"
          />
          <AccountMenu
            accountLabel={accountLabel}
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
          groupLabels={groupLabels}
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
