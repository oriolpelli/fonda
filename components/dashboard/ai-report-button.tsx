"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";

import { reportAiProblem } from "@/app/[lang]/dashboard/oversight/ai/actions";
import { useDictionary } from "@/components/i18n/dictionary-provider";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  AI_FEEDBACK_NOTE_MAX,
  AI_FEEDBACK_REASONS,
  type AiFeedbackItemType,
  type AiFeedbackReason,
} from "@/lib/ai-feedback";
import { cn } from "@/lib/utils";

const FOCUSABLE =
  'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), [tabindex="0"]';

/**
 * "Report a problem" — under every draft, every Ask answer and every item on
 * AI activity (AI_ACT_PROMPTS.md A8). The AI incident channel: what was wrong
 * (a fact, the tone, a draft that shouldn't exist, something else) and an
 * optional note. The report goes to ai_feedback and to us by email without
 * guest data — the note is asked not to quote the guest, and isn't emailed
 * anyway (lib/ai-feedback.ts).
 *
 * The trigger is as quiet as the "Fondas AI" line it sits beside: mono, small,
 * --fonda-text-3, no icon, no colour. The form is an overlay with the same
 * contract as the bulk-send dialog (scrim, role="dialog", focus trapped and
 * returned, Esc cancels).
 */
export function AiReportButton({
  itemType,
  itemId,
  className,
}: {
  itemType: AiFeedbackItemType;
  itemId: string;
  className?: string;
}) {
  const { dict } = useDictionary();
  const copy = dict.ai.report;
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<AiFeedbackReason | null>(null);
  const [note, setNote] = useState("");
  const [result, setResult] = useState<"sent" | "failed" | null>(null);
  const [pending, startTransition] = useTransition();
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const firstRef = useRef<HTMLInputElement>(null);

  function close() {
    setOpen(false);
    setReason(null);
    setNote("");
    triggerRef.current?.focus();
  }
  const closeRef = useRef(close);
  useEffect(() => {
    closeRef.current = close;
  });

  useEffect(() => {
    if (open) firstRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeRef.current();
        return;
      }
      if (event.key !== "Tab") return;
      const panel = panelRef.current;
      const focusables = Array.from(panel?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []);
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

  function submit() {
    if (!reason) return;
    startTransition(async () => {
      const { ok } = await reportAiProblem({ itemType, itemId, reason, note });
      setResult(ok ? "sent" : "failed");
      if (ok) close();
    });
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => {
          setResult(null);
          setOpen(true);
        }}
        className={cn(
          "font-mono text-[11px] tracking-[0.04em] text-[var(--fonda-text-3)] underline decoration-transparent underline-offset-4 transition-colors duration-[180ms] hover:text-[var(--fonda-text-2)] hover:decoration-[var(--fonda-border)] print:hidden",
          className
        )}
      >
        {result === "sent" ? copy.sent : copy.open}
      </button>

      {open ? (
        <>
          <div
            aria-hidden="true"
            onClick={close}
            className="fixed inset-0 z-50 bg-[color-mix(in_srgb,var(--fonda-ink)_14%,transparent)]"
          />
          <div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            className="fixed left-1/2 top-[12vh] z-50 flex w-[min(480px,92vw)] -translate-x-1/2 flex-col gap-4 rounded-[20px] bg-[var(--fonda-white)] p-5 shadow-card outline-none ring-1 ring-[var(--fonda-border)]"
          >
            <h2 id={titleId} className="text-[17px] font-semibold tracking-[-0.01em] text-[var(--fonda-text)]">
              {copy.title}
            </h2>

            <fieldset className="flex flex-col gap-1">
              <legend className="mb-1.5 text-[13px] font-medium text-[var(--fonda-text-2)]">
                {copy.reasonLabel}
              </legend>
              {AI_FEEDBACK_REASONS.map((key, i) => (
                <label
                  key={key}
                  className="flex cursor-pointer items-center gap-2.5 rounded-[8px] px-2 py-1.5 text-[14px] text-[var(--fonda-text)] hover:bg-[var(--fonda-surface)]"
                >
                  <input
                    ref={i === 0 ? firstRef : undefined}
                    type="radio"
                    name={`${titleId}-reason`}
                    value={key}
                    checked={reason === key}
                    onChange={() => setReason(key)}
                    className="size-4 accent-[var(--fonda-ink)]"
                  />
                  {copy.reasons[key]}
                </label>
              ))}
            </fieldset>

            <label className="flex flex-col gap-1.5">
              <span className="text-[13px] font-medium text-[var(--fonda-text-2)]">{copy.noteLabel}</span>
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value.slice(0, AI_FEEDBACK_NOTE_MAX))}
                className="min-h-[84px]"
              />
              <span className="text-[12px] text-[var(--fonda-text-3)]">{copy.noteHint}</span>
            </label>

            {result === "failed" ? (
              <p role="alert" className="text-[13px] text-[var(--fonda-text)]">
                {copy.failed}
              </p>
            ) : null}

            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="outline" onClick={close}>
                {copy.cancel}
              </Button>
              <Button onClick={submit} disabled={!reason || pending}>
                {pending ? copy.sending : copy.send}
              </Button>
            </div>
          </div>
        </>
      ) : null}
    </>
  );
}
