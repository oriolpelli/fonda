"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import {
  updateHotelDetails,
  type HotelDetailsState,
} from "@/app/[lang]/dashboard/settings/actions";
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

function SubmitButton() {
  const { pending } = useFormStatus();
  const { dict } = useDictionary();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? dict.common.saving : dict.common.save}
    </Button>
  );
}

export function HotelDetailsForm({
  name,
  roomsCount,
}: {
  name: string;
  roomsCount: number;
}) {
  const { dict } = useDictionary();
  const [state, formAction] = useActionState<HotelDetailsState, FormData>(
    updateHotelDetails,
    undefined
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>{dict.settings.hotelDetailsTitle}</CardTitle>
        <CardDescription>{dict.settings.hotelDetailsDesc}</CardDescription>
      </CardHeader>
      <form action={formAction}>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="name">{dict.onboarding.hotelName}</Label>
            <Input id="name" name="name" defaultValue={name} required />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="roomsCount">{dict.onboarding.rooms}</Label>
            <Input
              id="roomsCount"
              name="roomsCount"
              type="number"
              min={1}
              max={1000}
              defaultValue={roomsCount}
              required
            />
          </div>

          {state && "error" in state ? (
            <p role="alert" className="text-sm font-medium text-destructive">
              {state.error}
            </p>
          ) : null}
          {state && "ok" in state ? (
            <p className="text-sm font-medium text-[var(--fonda-accent)]">
              {dict.common.saved}
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
