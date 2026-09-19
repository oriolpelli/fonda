"use client";

import { useState, useTransition } from "react";

import { saveGuestNote } from "@/app/[lang]/dashboard/guests/actions";
import { useDictionary } from "@/components/i18n/dictionary-provider";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

/**
 * The staff note (§5.4).
 *
 * An EXPLICIT SAVE, not an autosave. A note here is the one thing on this
 * record a person wrote, it is the thing inference is forbidden from touching
 * (migration 0024, rule 2), and a field that saves as you pause makes it easy
 * to half-write a sentence and walk away having committed it. The button also
 * gives the "Saved" acknowledgement somewhere honest to appear.
 */
export function GuestNotes({
  customerId,
  initialNotes,
}: {
  customerId: string;
  initialNotes: string | null;
}) {
  const { dict } = useDictionary();
  const [value, setValue] = useState(initialNotes ?? "");
  const [saved, setSaved] = useState<string | null>(initialNotes ?? "");
  const [pending, startTransition] = useTransition();

  const dirty = value !== (saved ?? "");

  return (
    <div className="flex flex-col gap-2">
      <Textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={dict.guests.notesPlaceholder}
        aria-label={dict.guests.notesTitle}
        className="min-h-[120px] text-[13px]"
      />
      <div className="flex items-center gap-3">
        <Button
          type="button"
          size="sm"
          disabled={!dirty || pending}
          onClick={() =>
            startTransition(async () => {
              const result = await saveGuestNote(customerId, value);
              if (!result.error) setSaved(value);
            })
          }
        >
          {dict.guests.notesSave}
        </Button>
        {!dirty && saved !== null ? (
          <span
            aria-live="polite"
            className="text-[12px] text-[var(--fonda-text-3)]"
          >
            {dict.guests.notesSaved}
          </span>
        ) : null}
      </div>
    </div>
  );
}
