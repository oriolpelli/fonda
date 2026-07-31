"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState } from "react";

import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Tailwind's `md` breakpoint — kept in sync with the `md:hidden` below. */
const MD_QUERY = "(min-width: 48rem)";

interface MobileNavProps {
  /** The same links the desktop nav shows, in the same order. */
  links: { href: string; label: string }[];
  ctaHref: string;
  ctaLabel: string;
  /** Accessible name for the trigger while collapsed. */
  openLabel: string;
  /** Accessible name for the trigger while expanded. */
  closeLabel: string;
}

/**
 * Below `md`, the desktop nav has nowhere to put its links — this is their
 * home. A disclosure (not a modal): the panel follows the trigger in DOM
 * order, so Tab walks straight into it and no focus trap is needed.
 *
 * Accessibility contract:
 * - the trigger carries `aria-expanded` + `aria-controls`, and the panel is
 *   always in the DOM (hidden when collapsed) so `aria-controls` never
 *   dangles;
 * - Escape closes it and returns focus to the trigger;
 * - dismissing via the scrim or the trigger also returns focus, so focus is
 *   never dropped on the body when the panel hides;
 * - following a link just closes it — the destination takes focus instead.
 */
export function MobileNav({
  links,
  ctaHref,
  ctaLabel,
  openLabel,
  closeLabel,
}: MobileNavProps) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);

  /** Collapse and hand focus back to the trigger. */
  const dismiss = useCallback(() => {
    setOpen(false);
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

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, dismiss]);

  // Growing past `md` hides the panel via CSS; close it so the scroll lock is
  // released and the trigger's aria-expanded doesn't lie about hidden content.
  useEffect(() => {
    if (!open) return;

    const query = window.matchMedia(MD_QUERY);
    function onChange(event: MediaQueryListEvent) {
      if (event.matches) setOpen(false);
    }

    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
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

  return (
    <div className="md:hidden">
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={open ? closeLabel : openLabel}
        onClick={() => (open ? dismiss() : setOpen(true))}
        // Focus ring comes from the shared :focus-visible rule in globals.css.
        className="inline-flex size-9 items-center justify-center rounded-[10px] border border-[var(--fonda-border-2)] text-foreground transition-colors duration-[180ms] hover:border-[var(--fonda-text-3)]"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 18 18"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          aria-hidden="true"
        >
          {open ? (
            <>
              <path d="M4.5 4.5 L13.5 13.5" />
              <path d="M13.5 4.5 L4.5 13.5" />
            </>
          ) : (
            <>
              <path d="M2.5 5 h13" />
              <path d="M2.5 9 h13" />
              <path d="M2.5 13 h13" />
            </>
          )}
        </svg>
      </button>

      {/* Scrim: dismisses on tap. Light, per Signal — not a dark overlay. */}
      {open ? (
        <div
          aria-hidden="true"
          onClick={dismiss}
          className="fixed inset-x-0 bottom-0 top-16 bg-[color-mix(in_srgb,var(--fonda-ink)_14%,transparent)]"
        />
      ) : null}

      <div
        id={panelId}
        hidden={!open}
        className={cn(
          "fixed inset-x-0 top-16 border-b border-border bg-[var(--fonda-bg)] px-6 pb-7 pt-2",
          !open && "hidden"
        )}
      >
        <div className="flex flex-col">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="border-b border-border py-3.5 text-[17px] text-foreground transition-colors duration-[180ms] hover:text-[var(--fonda-text-2)]"
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="mt-6 flex items-center justify-between gap-4">
          <LanguageSwitcher />
          <Button asChild variant="ink" size="sm">
            <Link href={ctaHref} onClick={() => setOpen(false)}>
              {ctaLabel}
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
