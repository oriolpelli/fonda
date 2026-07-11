"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import {
  updateHotelProfile,
  type HotelProfileState,
} from "@/app/[lang]/dashboard/settings/actions";
import { RoomTypesEditor } from "@/components/dashboard/room-types-editor";
import { UpsellsEditor } from "@/components/dashboard/upsells-editor";
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
import { Textarea } from "@/components/ui/textarea";
import type { RoomType, Upsell } from "@/types";
import { cn } from "@/lib/utils";

const selectClassName = cn(
  "flex h-11 w-full rounded-[10px] border border-input bg-popover px-4 py-2.5 text-sm transition-colors",
  "focus-visible:outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-accent",
  "disabled:cursor-not-allowed disabled:opacity-50"
);

interface HotelProfileFormProps {
  starRating: number | null;
  propertyType: string;
  checkInTime: string;
  checkOutTime: string;
  policies: string;
  positioningVibe: string;
  targetGuest: string;
  localRecommendations: string;
  preferredGreeting: string;
  signoffName: string;
  languagesSpoken: string;
  parkingTransport: string;
  wifiInfo: string;
  breakfastInfo: string;
  roomTypes: RoomType[];
  upsells: Upsell[];
}

function SubmitButton() {
  const { pending } = useFormStatus();
  const { dict } = useDictionary();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? dict.common.saving : dict.common.save}
    </Button>
  );
}

export function HotelProfileForm({
  starRating,
  propertyType,
  checkInTime,
  checkOutTime,
  policies,
  positioningVibe,
  targetGuest,
  localRecommendations,
  preferredGreeting,
  signoffName,
  languagesSpoken,
  parkingTransport,
  wifiInfo,
  breakfastInfo,
  roomTypes,
  upsells,
}: HotelProfileFormProps) {
  const { dict } = useDictionary();
  const [state, formAction] = useActionState<HotelProfileState, FormData>(
    updateHotelProfile,
    undefined
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>{dict.settings.profileTitle}</CardTitle>
        <CardDescription>{dict.settings.profileDesc}</CardDescription>
      </CardHeader>
      <form action={formAction}>
        <CardContent className="flex flex-col gap-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="starRating">{dict.settings.starRating}</Label>
              <select
                id="starRating"
                name="starRating"
                className={selectClassName}
                defaultValue={starRating ? String(starRating) : ""}
              >
                <option value="">{dict.settings.starRatingUnrated}</option>
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="propertyType">{dict.settings.propertyType}</Label>
              <Input
                id="propertyType"
                name="propertyType"
                defaultValue={propertyType}
                placeholder={dict.settings.propertyTypePlaceholder}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="checkInTime">{dict.settings.checkInTime}</Label>
              <Input
                id="checkInTime"
                name="checkInTime"
                type="time"
                defaultValue={checkInTime}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="checkOutTime">{dict.settings.checkOutTime}</Label>
              <Input
                id="checkOutTime"
                name="checkOutTime"
                type="time"
                defaultValue={checkOutTime}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="positioningVibe">{dict.settings.positioningVibe}</Label>
            <Textarea
              id="positioningVibe"
              name="positioningVibe"
              defaultValue={positioningVibe}
              placeholder={dict.settings.positioningVibePlaceholder}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="targetGuest">{dict.settings.targetGuest}</Label>
            <Textarea
              id="targetGuest"
              name="targetGuest"
              defaultValue={targetGuest}
              placeholder={dict.settings.targetGuestPlaceholder}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="localRecommendations">
              {dict.settings.localRecommendations}
            </Label>
            <Textarea
              id="localRecommendations"
              name="localRecommendations"
              defaultValue={localRecommendations}
              placeholder={dict.settings.localRecommendationsPlaceholder}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="preferredGreeting">
                {dict.settings.preferredGreeting}
              </Label>
              <Input
                id="preferredGreeting"
                name="preferredGreeting"
                defaultValue={preferredGreeting}
                placeholder={dict.settings.preferredGreetingPlaceholder}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="signoffName">{dict.settings.signoffName}</Label>
              <Input
                id="signoffName"
                name="signoffName"
                defaultValue={signoffName}
                placeholder={dict.settings.signoffNamePlaceholder}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="languagesSpoken">{dict.settings.languagesSpoken}</Label>
            <Input
              id="languagesSpoken"
              name="languagesSpoken"
              defaultValue={languagesSpoken}
              placeholder={dict.settings.languagesSpokenPlaceholder}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="policies">{dict.settings.policies}</Label>
            <Textarea
              id="policies"
              name="policies"
              defaultValue={policies}
              placeholder={dict.settings.policiesPlaceholder}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="parkingTransport">
                {dict.settings.parkingTransport}
              </Label>
              <Textarea
                id="parkingTransport"
                name="parkingTransport"
                defaultValue={parkingTransport}
                placeholder={dict.settings.parkingTransportPlaceholder}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="wifiInfo">{dict.settings.wifiInfo}</Label>
              <Textarea
                id="wifiInfo"
                name="wifiInfo"
                defaultValue={wifiInfo}
                placeholder={dict.settings.wifiInfoPlaceholder}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="breakfastInfo">{dict.settings.breakfastInfo}</Label>
            <Textarea
              id="breakfastInfo"
              name="breakfastInfo"
              defaultValue={breakfastInfo}
              placeholder={dict.settings.breakfastInfoPlaceholder}
            />
          </div>

          <div className="flex flex-col gap-2 border-t border-border pt-4">
            <Label>{dict.settings.roomTypesTitle}</Label>
            <p className="text-sm text-muted-foreground">{dict.settings.roomTypesDesc}</p>
            <RoomTypesEditor initialRoomTypes={roomTypes} />
          </div>

          <div className="flex flex-col gap-2 border-t border-border pt-4">
            <Label>{dict.settings.upsellsTitle}</Label>
            <p className="text-sm text-muted-foreground">{dict.settings.upsellsDesc}</p>
            <UpsellsEditor initialUpsells={upsells} />
          </div>

          {state && "error" in state ? (
            <p role="alert" className="text-sm font-medium text-destructive">
              {state.error}
            </p>
          ) : null}
          {state && "ok" in state ? (
            <p className="text-sm font-medium text-[var(--fonda-accent)]">
              {dict.settings.settingsSaved}
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
