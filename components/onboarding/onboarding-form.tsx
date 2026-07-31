"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import {
  provisionHotel,
  type OnboardingState,
} from "@/app/[lang]/onboarding/actions";
import { useDictionary } from "@/components/i18n/dictionary-provider";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n/format";

const TOTAL_STEPS = 3;

const selectClassName = cn(
  "flex h-11 w-full rounded-[10px] border border-input bg-popover px-4 py-2.5 text-sm transition-colors",
  "focus-visible:outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-accent",
  "disabled:cursor-not-allowed disabled:opacity-50"
);

function SquareMarker() {
  return (
    <span
      className="mt-[7px] block size-[7px] shrink-0 rounded-[2px] bg-[var(--fonda-accent)]"
      aria-hidden
    />
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  const { dict } = useDictionary();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? dict.onboarding.settingUp : dict.onboarding.createHotel}
    </Button>
  );
}

export function OnboardingForm({ timezones }: { timezones: string[] }) {
  const { dict, locale } = useDictionary();
  const [state, formAction] = useActionState<OnboardingState, FormData>(
    provisionHotel,
    undefined
  );

  const [step, setStep] = useState(1);
  const [hotelName, setHotelName] = useState("");
  const [rooms, setRooms] = useState("");

  // Step 1 gate: a named property and a room count in range. When invalid we
  // simply keep "Continue" disabled — no awkward inline error copy needed.
  const roomsNum = Number.parseInt(rooms, 10);
  const step1Valid =
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

  const readyItems = useMemo(
    () => [
      dict.onboarding.ready1,
      dict.onboarding.ready2,
      dict.onboarding.ready3,
      dict.onboarding.ready4,
    ],
    [dict]
  );

  const stepMeta = [
    { title: dict.onboarding.step1Title, desc: dict.onboarding.step1Desc },
    { title: dict.onboarding.step2Title, desc: dict.onboarding.step2Desc },
    { title: dict.onboarding.step3Title, desc: dict.onboarding.step3Desc },
  ][step - 1];

  function goNext() {
    if (step === 1 && !step1Valid) return;
    setStep((s) => Math.min(s + 1, TOTAL_STEPS));
  }

  function goBack() {
    setStep((s) => Math.max(s - 1, 1));
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--fonda-text-3)]">
          {t(dict.onboarding.stepLabel, { current: step, total: TOTAL_STEPS })}
        </p>
        <div className="mt-2 flex gap-1.5" aria-hidden>
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <span
              key={i}
              className={cn(
                "h-1 flex-1 rounded-full transition-colors",
                i < step ? "bg-[var(--fonda-accent)]" : "bg-[var(--fonda-inset)]"
              )}
            />
          ))}
        </div>
        <CardTitle className="mt-4 text-xl">{stepMeta.title}</CardTitle>
        <CardDescription>{stepMeta.desc}</CardDescription>
      </CardHeader>

      <form action={formAction}>
        <CardContent className="flex flex-col gap-4">
          <input type="hidden" name="locale" value={locale} />

          {/* Step 1 — property basics */}
          <div className={cn("flex flex-col gap-4", step !== 1 && "hidden")}>
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
          </div>

          {/* Step 2 — systems */}
          <div className={cn("flex flex-col gap-4", step !== 2 && "hidden")}>
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
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="pmsType">{dict.onboarding.pms}</Label>
              <select
                id="pmsType"
                name="pmsType"
                className={selectClassName}
                defaultValue="mews"
              >
                <option value="mews">MEWS</option>
                <option value="apaleo">Apaleo</option>
              </select>
            </div>
          </div>

          {/* Step 3 — what happens next */}
          <div className={cn(step !== 3 && "hidden")}>
            <ul className="flex flex-col gap-3.5">
              {readyItems.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <SquareMarker />
                  <span className="text-sm leading-[1.5] text-foreground">
                    {item}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {state && "error" in state ? (
            <p role="alert" className="text-sm font-medium text-destructive">
              {state.error}
            </p>
          ) : null}
        </CardContent>

        <CardFooter className="flex gap-3">
          {step > 1 ? (
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={goBack}
            >
              {dict.onboarding.back}
            </Button>
          ) : null}
          {step < TOTAL_STEPS ? (
            <Button
              type="button"
              className={step > 1 ? "flex-1" : "w-full"}
              onClick={goNext}
              disabled={step === 1 && !step1Valid}
            >
              {dict.onboarding.continue}
            </Button>
          ) : (
            <div className="flex-1">
              <SubmitButton />
            </div>
          )}
        </CardFooter>
      </form>
    </Card>
  );
}
