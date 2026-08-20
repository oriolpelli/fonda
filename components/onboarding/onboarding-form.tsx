"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";

import {
  provisionHotel,
  type OnboardingState,
} from "@/app/[lang]/onboarding/actions";
import { useDictionary } from "@/components/i18n/dictionary-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

// Kept deliberately in step with components/ui/input.tsx — a <select> can't go
// through the Input primitive, so the recipe is restated here and must move
// with it. Note the focus ring is --fonda-accent-tint, NOT the generic
// --accent: that role is a warm neutral in v3 (§3.1) and would ring the field
// in a muddy halo instead of signalling focus.
const selectClassName = cn(
  "flex h-11 w-full rounded-[10px] border border-input bg-surface px-4 py-2.5 text-sm transition-colors duration-[180ms]",
  "focus-visible:outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-[var(--fonda-accent-tint)]",
  "disabled:cursor-not-allowed disabled:opacity-50"
);

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  const { dict } = useDictionary();
  return (
    <Button type="submit" className="w-full" disabled={pending || disabled}>
      {pending ? dict.onboarding.settingUp : dict.onboarding.continue}
    </Button>
  );
}

/**
 * Step 1 of setup: the three things Fondas can't work without — what the hotel
 * is called, how many rooms it has, and what "today" means there.
 *
 * Which PMS they run is deliberately *not* asked here. It's answered by
 * actually connecting one on the next step, where picking a name and proving
 * it works are the same action rather than two.
 */
export function OnboardingForm({ timezones }: { timezones: string[] }) {
  const { dict, locale } = useDictionary();
  const [state, formAction] = useActionState<OnboardingState, FormData>(
    provisionHotel,
    undefined
  );

  const [hotelName, setHotelName] = useState("");
  const [rooms, setRooms] = useState("");

  // Gate the submit on a named property and a room count in range, rather than
  // letting the server bounce it back with an error they could have avoided.
  const roomsNum = Number.parseInt(rooms, 10);
  const valid =
    hotelName.trim() !== "" &&
    Number.isInteger(roomsNum) &&
    roomsNum >= 1 &&
    roomsNum <= 1000;

  // Uncontrolled timezone select with a deterministic SSR default; on the
  // client we preselect the browser timezone by setting the DOM value directly.
  const timezoneRef = useRef<HTMLSelectElement>(null);
  const defaultTimezone = timezones.includes("UTC") ? "UTC" : timezones[0];
  useEffect(() => {
    const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (browserTz && timezones.includes(browserTz) && timezoneRef.current) {
      timezoneRef.current.value = browserTz;
    }
  }, [timezones]);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="locale" value={locale} />

      <div className="flex flex-col gap-2">
        <Label htmlFor="hotelName">{dict.onboarding.hotelName}</Label>
        <Input
          id="hotelName"
          name="hotelName"
          value={hotelName}
          onChange={(e) => setHotelName(e.target.value)}
          placeholder={dict.onboarding.hotelNamePlaceholder}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="roomsCount">{dict.onboarding.rooms}</Label>
        <Input
          id="roomsCount"
          name="roomsCount"
          type="number"
          min={1}
          max={1000}
          value={rooms}
          onChange={(e) => setRooms(e.target.value)}
          placeholder={dict.onboarding.roomsPlaceholder}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="timezone">{dict.onboarding.timezone}</Label>
        <select
          id="timezone"
          name="timezone"
          ref={timezoneRef}
          className={selectClassName}
          defaultValue={defaultTimezone}
        >
          {timezones.map((tz) => (
            <option key={tz} value={tz}>
              {tz}
            </option>
          ))}
        </select>
        <p className="text-xs text-[var(--fonda-text-3)]">
          {dict.onboarding.timezoneHint}
        </p>
      </div>

      {state && "error" in state ? (
        <p role="alert" className="text-sm font-medium text-destructive">
          {state.error}
        </p>
      ) : null}

      <SubmitButton disabled={!valid} />
    </form>
  );
}
