"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import {
  updateHotelDetails,
  type HotelDetailsState,
} from "@/app/dashboard/settings/actions";
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
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Saving…" : "Save changes"}
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
  const [state, formAction] = useActionState<HotelDetailsState, FormData>(
    updateHotelDetails,
    undefined
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Hotel details</CardTitle>
        <CardDescription>
          Your hotel&apos;s name and room count. Room count drives occupancy
          across briefings and the dashboard.
        </CardDescription>
      </CardHeader>
      <form action={formAction}>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="name">Hotel name</Label>
            <Input id="name" name="name" defaultValue={name} required />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="roomsCount">Number of rooms</Label>
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
            <p className="text-sm font-medium text-[var(--fonda-accent)]">Saved.</p>
          ) : null}
        </CardContent>
        <CardFooter>
          <SubmitButton />
        </CardFooter>
      </form>
    </Card>
  );
}
