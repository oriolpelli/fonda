"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";

import { recordAiLiteracy } from "@/app/[lang]/dashboard/settings/ai/actions";
import { useDictionary } from "@/components/i18n/dictionary-provider";
import { Button } from "@/components/ui/button";
import { AI_LITERACY_COOKIE } from "@/lib/ai-literacy";
import { t } from "@/lib/i18n/format";

const FOCUSABLE = 'button:not([disabled]), [tabindex="0"]';

/**
 * "Working with Fondas AI" — five short cards, one per screen (AI_ACT_PROMPTS.md
 * A6, Art. 4). Shown once to each person after they sign in (the gate in the
 * dashboard layout), and from Settings → AI at Fondas whenever they like.
 *
 * Finishing records "completed"; "Skip for now", Esc or the scrim records
 * "skipped", so the cards aren't pushed on anyone twice — and a skip is not
 * counted as the Art. 4 record. Either way the browser remembers (a cookie the
 * layout reads instead of the database next time).
 *
 * Same overlay contract as the bulk-send dialog: scrim, role="dialog",
 * aria-modal, focus moved in and trapped, focus returned on close. An
 * overlay, so the one place a shadow belongs (FONDA_SANA_REDESIGN.md §0.1).
 */
export function AiLiteracyDialog({
  initiallyOpen = false,
  cookieValue,
  trigger,
}: {
  /** The first-login case: open on arrival. */
  initiallyOpen?: boolean;
  /** Set once the person has finished or skipped — see AI_LITERACY_COOKIE. */
  cookieValue: string;
  /** Settings' "Open the five cards" button label; omitted for the gate. */
  trigger?: string;
}) {
  const { dict } = useDictionary();
  const copy = dict.ai.literacy;
  const cards = copy.cards;
  const [open, setOpen] = useState(initiallyOpen);
  const [step, setStep] = useState(0);
  const [pending, startTransition] = useTransition();
  const titleId = useId();
  const bodyId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const primaryRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  function finish(status: "completed" | "skipped") {
    try {
      document.cookie = `${AI_LITERACY_COOKIE}=${cookieValue}; path=/; max-age=31536000; samesite=lax`;
    } catch {
      // A blocked cookie only means the layout asks the database next time.
    }
    setOpen(false);
    setStep(0);
    startTransition(async () => {
      await recordAiLiteracy(status);
    });
    triggerRef.current?.focus();
  }

  const finishRef = useRef(finish);
  useEffect(() => {
    finishRef.current = finish;
  });

  useEffect(() => {
    if (open) primaryRef.current?.focus();
  }, [open, step]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        finishRef.current("skipped");
        return;
      }
      if (event.key !== "Tab") return;
      const panel = panelRef.current;
      const focusables = Array.from(
        panel?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []
      );
      if (!panel || focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const current = document.activeElement;
      const inside = panel.contains(current) && current !== panel;
      if (event.shiftKey && (current === first || !inside)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (current === last || !inside)) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const card = cards[step];
  const last = step === cards.length - 1;

  return (
    <>
      {trigger ? (
        <Button
          ref={triggerRef}
          variant="outline"
          onClick={() => {
            setStep(0);
            setOpen(true);
          }}
          disabled={pending}
        >
          {pending ? copy.saving : trigger}
        </Button>
      ) : null}

      {open ? (
        <div className="print:hidden">
          <div
            aria-hidden="true"
            onClick={() => finish("skipped")}
            className="fixed inset-0 z-50 bg-[color-mix(in_srgb,var(--fonda-ink)_14%,transparent)]"
          />
          <div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={bodyId}
            tabIndex={-1}
            className="fixed left-1/2 top-[14vh] z-50 flex w-[min(520px,92vw)] -translate-x-1/2 flex-col gap-5 rounded-[20px] bg-[var(--fonda-white)] p-6 shadow-card outline-none ring-1 ring-[var(--fonda-border)]"
          >
            <div className="flex items-center justify-between gap-4">
              <span className="font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--fonda-text-3)]">
                {copy.title} · {t(copy.stepOf, { n: step + 1, total: cards.length })}
              </span>
              <button
                type="button"
                onClick={() => finish("skipped")}
                className="rounded-[8px] px-2 py-1 text-[13px] text-[var(--fonda-text-2)] transition-colors duration-[180ms] hover:bg-[var(--fonda-surface)] hover:text-[var(--fonda-text)]"
              >
                {copy.skip}
              </button>
            </div>

            <div className="flex min-h-[176px] flex-col gap-2.5">
              <h2
                id={titleId}
                className="text-[20px] font-semibold tracking-[-0.015em] text-[var(--fonda-text)]"
              >
                {card.title}
              </h2>
              <p
                id={bodyId}
                className="text-[15px] leading-[1.6] text-[var(--fonda-text-2)]"
              >
                {card.body}
              </p>
            </div>

            {/* Where you are, without colour: five short bars, the read ones
                darker. Decorative — the "n of 5" above says it in words. */}
            <div aria-hidden="true" className="flex gap-1.5">
              {cards.map((_, i) => (
                <span
                  key={i}
                  className={
                    "h-1 flex-1 rounded-full " +
                    (i <= step ? "bg-[var(--fonda-text-2)]" : "bg-[var(--fonda-inset)]")
                  }
                />
              ))}
            </div>

            <div className="flex justify-between gap-2">
              <Button
                variant="outline"
                onClick={() => setStep((s) => Math.max(0, s - 1))}
                disabled={step === 0}
              >
                {copy.back}
              </Button>
              <Button
                ref={primaryRef}
                onClick={() => (last ? finish("completed") : setStep((s) => s + 1))}
              >
                {last ? copy.done : copy.next}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
