"use client";

import { useEffect, useRef } from "react";
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

const selectClassName = cn(
  "flex h-11 w-full rounded-[10px] border border-input bg-popover px-4 py-2.5 text-sm transition-colors",
  "focus-visible:outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-accent",
  "disabled:cursor-not-allowed disabled:opacity-50"
);

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

  // Uncontrolled select with a deterministic default for SSR; on the client we
  // preselect the browser timezone by setting the DOM value directly (no state,
  // so no hydration mismatch and no cascading renders).
  const timezoneRef = useRef<HTMLSelectElement>(null);
  const defaultTimezone = timezones.includes("UTC") ? "UTC" : timezones[0];
  useEffect(() => {
    const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (browserTz && timezones.includes(browserTz) && timezoneRef.current) {
      timezoneRef.current.value = browserTz;
    }
  }, [timezones]);

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-xl">{dict.onboarding.title}</CardTitle>
        <CardDescription>{dict.onboarding.desc}</CardDescription>
      </CardHeader>
      <form action={formAction}>
        <CardContent className="flex flex-col gap-4">
          <input type="hidden" name="locale" value={locale} />
          <div className="flex flex-col gap-2">
            <Label htmlFor="hotelName">{dict.onboarding.hotelName}</Label>
            <Input
              id="hotelName"
              name="hotelName"
              placeholder={dict.onboarding.hotelNamePlaceholder}
              required
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
              placeholder={dict.onboarding.roomsPlaceholder}
              required
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

          {state && "error" in state ? (
            <p role="alert" className="text-sm font-medium text-destructive">
              {state.error}
            </p>
          ) : null}
        </CardContent>
        <CardFooter>
          <SubmitButton />
        </CardFooter>
      </form>
    </Card>
  );
}
