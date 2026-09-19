"use client";

import { useState, useTransition } from "react";

import {
  setGuestTag,
} from "@/app/[lang]/dashboard/guests/actions";
import { useDictionary } from "@/components/i18n/dictionary-provider";
import type { Occasion, TripPurpose } from "@/lib/guests";
import { cn } from "@/lib/utils";

const PURPOSES: TripPurpose[] = [
  "leisure",
  "business",
  "family",
  "romantic",
  "group",
  "unknown",
];
const OCCASIONS: Occasion[] = ["birthday", "anniversary", "honeymoon"];

/**
 * The two inferred tags, editable inline (§5.4).
 *
 * Each says WHERE IT CAME FROM on hover and focus — "Added by staff" or
 * "Inferred from email, 12 Sep". That line is the whole reason a GM can trust
 * the tag: an unattributed guess about a guest is worse than no guess, because
 * it looks like a fact the PMS supplied.
 *
 * Setting a tag makes it a staff value, and lib/guest-inference.ts leaves an
 * existing value alone — so once a person has said "business", the model stops
 * arguing. Clearing hands it back: the next run may fill the blank again, which
 * is the right behaviour for "I don't know" rather than "you were wrong".
 */
export function GuestTags({
  customerId,
  tripPurpose,
  occasion,
  inferredAt,
}: {
  customerId: string;
  tripPurpose: TripPurpose | null;
  occasion: Occasion | null;
  /** When inference last ran — the provenance line's date. */
  inferredAt: string | null;
}) {
  const { dict, locale } = useDictionary();
  const [pending, startTransition] = useTransition();
  const [purpose, setPurpose] = useState(tripPurpose);
  const [occ, setOcc] = useState(occasion);

  const purposeLabels = dict.guests.purpose as Record<string, string>;
  const occasionLabels = dict.guests.occasion as Record<string, string>;

  const provenance = inferredAt
    ? `${dict.guests.sourceEmail}, ${new Intl.DateTimeFormat(locale, {
        day: "numeric",
        month: "short",
      }).format(new Date(inferredAt))}`
    : dict.guests.sourceStaff;

  const field = (
    label: string,
    value: string | null,
    options: string[],
    labels: Record<string, string>,
    onChange: (next: string | null) => void
  ) => (
    <div className="flex flex-col gap-1.5">
      <label className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--fonda-text-3)]">
        {label}
      </label>
      <select
        value={value ?? ""}
        disabled={pending}
        title={value ? provenance : undefined}
        onChange={(e) => onChange(e.target.value || null)}
        className={cn(
          "h-9 rounded-[10px] border border-input bg-surface px-3 text-[13px] text-[var(--fonda-text)] transition-colors focus-visible:border-ring focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--fonda-accent-tint)]",
          pending && "opacity-60"
        )}
      >
        <option value="">{dict.guests.none}</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {labels[o] ?? o}
          </option>
        ))}
      </select>
      {value ? (
        <span className="text-[11px] text-[var(--fonda-text-3)]">
          {provenance}
        </span>
      ) : null}
    </div>
  );

  return (
    <div className="flex flex-col gap-3">
      {field(
        dict.guests.purposeLabel,
        purpose,
        PURPOSES,
        purposeLabels,
        (next) => {
          setPurpose(next as TripPurpose | null);
          startTransition(() => {
            void setGuestTag(
              customerId,
              "trip_purpose",
              next as TripPurpose | null
            );
          });
        }
      )}
      {field(
        dict.guests.occasionLabel,
        occ,
        OCCASIONS,
        occasionLabels,
        (next) => {
          setOcc(next as Occasion | null);
          startTransition(() => {
            void setGuestTag(customerId, "occasion", next as Occasion | null);
          });
        }
      )}
    </div>
  );
}
