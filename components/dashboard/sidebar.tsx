"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  ConciergeBell,
  DoorOpen,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  Send,
  Settings,
  Sunrise,
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

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = ICONS[item.key] ?? Settings;
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-sm font-medium transition-colors",
        active
          ? "bg-[var(--fonda-accent-light)] text-[var(--fonda-accent)] font-semibold shadow-[inset_2px_0_0_0_var(--fonda-accent)]"
          : "text-[var(--fonda-text-2)] hover:bg-[var(--fonda-surface)] hover:text-foreground"
      )}
    >
      <Icon className="size-[18px]" strokeWidth={1.5} />
      {item.label}
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
}: {
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
}) {
  const pathname = usePathname();
  const current = stripLocale(pathname);

  function isActive(href: string) {
    return current === stripLocale(href);
  }

  return (
    <aside className="fixed inset-y-0 left-0 z-20 flex w-64 flex-col border-r border-border bg-[var(--fonda-surface)]">
      <div className="flex flex-col gap-3 px-5 py-6">
        <Wordmark href={dashboardHref} />
        <ConnectionStatus state={connectionState} labels={connectionLabels} />
      </div>

      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3">
        {navItems.map((item) => (
          <NavLink key={item.key} item={item} active={isActive(item.href)} />
        ))}
      </nav>

      <div className="flex flex-col gap-1 border-t border-border px-3 py-3">
        <NavLink item={settingsItem} active={isActive(settingsItem.href)} />
        {adminItem ? (
          <NavLink item={adminItem} active={isActive(adminItem.href)} />
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
    </aside>
  );
}
