"use client";

import {
  useEffect,
  useId,
  useRef,
  type KeyboardEvent,
  type RefObject,
} from "react";

import { useDictionary } from "@/components/i18n/dictionary-provider";
import { Button } from "@/components/ui/button";

export interface BulkSendItem {
  id: string;
  /** Guest first name, or the sender's address when no guest matched. */
  name: string;
  /** The opening of the draft on one line — enough to recognise it. */
  firstLine: string;
}

/** The first word of a guest name; an address (no name matched) stays whole. */
export function firstNameOf(name: string): string {
  const trimmed = name.trim();
  if (trimmed.includes("@")) return trimmed;
  return trimmed.split(/\s+/)[0] ?? trimmed;
}

/**
 * The opening of a draft on one line, for the confirmation list: whitespace
 * and line breaks collapse, and the row truncates with an ellipsis in CSS. Not
 * the literal first line — that is almost always the greeting ("Hola Núria,"),
 * which tells a GM nothing about which reply they are approving.
 */
export function firstLineOf(text: string | null | undefined): string {
  return (text ?? "").replace(/\s+/g, " ").trim().slice(0, 240);
}

/** Everything the focus trap cycles through inside the panel. */
const FOCUSABLE = 'button:not([disabled]), [tabindex="0"]';

/**
 * "Send N replies exactly as drafted?" — the bulk-send confirmation
 * (AI_ACT_PROMPTS.md A4).
 *
 * Our claim is "a person on your team sends every message". Bulk approval is
 * where that claim is weakest, so the person's decision is made explicit here
 * and recorded on every row it sends (sent_via = 'bulk', migration 0025). The
 * list is exactly what will go: the caller passes these ids to the server
 * action, which re-checks them against its own filter and sends nothing else.
 *
 * DEFAULT FOCUS IS "Review one by one". The safe choice is the one Enter
 * presses; sending a batch has to be a deliberate move to the other button.
 *
 * No dependency. Same overlay contract as the ⌘K palette and the Home
 * customize panel: scrim + role="dialog" + aria-modal, focus moved in on open
 * and trapped, Esc or a scrim click cancels, and focus returns to the button
 * that opened it. An overlay, so it is the one place here a shadow belongs
 * (FONDA_SANA_REDESIGN.md §0.1).
 */
export function BulkSendDialog({
  open,
  title,
  items,
  sendLabel,
  onSend,
  onCancel,
  returnFocusTo,
}: {
  open: boolean;
  title: string;
  items: BulkSendItem[];
  sendLabel: string;
  onSend: () => void;
  onCancel: () => void;
  /** The button that opened the dialog; focus goes back to it on close. */
  returnFocusTo: RefObject<HTMLElement | null>;
}) {
  const { dict } = useDictionary();
  const titleId = useId();
  const listId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const reviewRef = useRef<HTMLButtonElement>(null);

  // Move focus in on open, onto the safe button. Return it on close.
  useEffect(() => {
    if (!open) return;
    reviewRef.current?.focus();
    const opener = returnFocusTo.current;
    return () => {
      opener?.focus();
    };
  }, [open, returnFocusTo]);

  if (!open) return null;

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      onCancel();
      return;
    }
    if (event.key !== "Tab") return;
    const focusables = Array.from(
      panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []
    );
    if (focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    const current = document.activeElement;
    if (event.shiftKey && (current === first || !panelRef.current?.contains(current))) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && (current === last || !panelRef.current?.contains(current))) {
      event.preventDefault();
      first.focus();
    }
  }

  return (
    <>
      <div
        aria-hidden="true"
        onClick={onCancel}
        className="fixed inset-0 z-50 bg-[color-mix(in_srgb,var(--fonda-ink)_14%,transparent)]"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onKeyDown={onKeyDown}
        className="fixed left-1/2 top-[14vh] z-50 flex w-[min(520px,92vw)] -translate-x-1/2 flex-col gap-4 rounded-[20px] bg-[var(--fonda-white)] p-5 shadow-card ring-1 ring-[var(--fonda-border)]"
      >
        <div className="flex flex-col gap-1.5">
          <h2
            id={titleId}
            className="text-[17px] font-semibold tracking-[-0.01em] text-[var(--fonda-text)]"
          >
            {title}
          </h2>
          <p className="text-[13px] leading-relaxed text-[var(--fonda-text-2)]">
            {dict.bulkSend.body}
          </p>
        </div>

        {/* Scrollable, so it is focusable: a keyboard user has to be able to
            scroll the list they are being asked to approve. */}
        <ul
          id={listId}
          tabIndex={0}
          aria-label={dict.bulkSend.listLabel}
          className="flex max-h-[40vh] flex-col gap-0.5 overflow-y-auto rounded-[10px] bg-[var(--fonda-surface)] p-1.5"
        >
          {items.map((item) => (
            <li key={item.id} className="flex min-w-0 flex-col rounded-[8px] px-2.5 py-1.5">
              <span className="truncate text-[13px] font-medium text-[var(--fonda-text)]">
                {item.name}
              </span>
              <span className="truncate text-[13px] text-[var(--fonda-text-2)]">
                {item.firstLine || dict.bulkSend.emptyLine}
              </span>
            </li>
          ))}
        </ul>

        <div className="flex flex-wrap justify-end gap-2">
          <Button ref={reviewRef} variant="outline" onClick={onCancel}>
            {dict.bulkSend.review}
          </Button>
          <Button onClick={onSend}>{sendLabel}</Button>
        </div>
      </div>
    </>
  );
}
