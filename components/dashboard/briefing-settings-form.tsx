"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import {
  updateBriefingSettings,
  type BriefingSettingsState,
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
import { cn } from "@/lib/utils";

const selectClassName = cn(
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
  "disabled:cursor-not-allowed disabled:opacity-50"
);

interface BriefingSettingsFormProps {
  gmName: string;
  briefingTime: string; // "HH:MM"
  briefingLanguage: string;
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Saving…" : "Save changes"}
    </Button>
  );
}

export function BriefingSettingsForm({
  gmName,
  briefingTime,
  briefingLanguage,
}: BriefingSettingsFormProps) {
  const [state, formAction] = useActionState<BriefingSettingsState, FormData>(
    updateBriefingSettings,
    undefined
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Morning briefing</CardTitle>
        <CardDescription>
          When and how Fonda prepares your daily briefing.
        </CardDescription>
      </CardHeader>
      <form action={formAction}>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="gmName">GM name</Label>
            <Input
              id="gmName"
              name="gmName"
              defaultValue={gmName}
              placeholder="e.g. Maria"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="briefingTime">Briefing time</Label>
              <Input
                id="briefingTime"
                name="briefingTime"
                type="time"
                defaultValue={briefingTime}
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="briefingLanguage">Language</Label>
              <select
                id="briefingLanguage"
                name="briefingLanguage"
                className={selectClassName}
                defaultValue={briefingLanguage}
              >
                <option value="en">English</option>
                <option value="es">Spanish</option>
              </select>
            </div>
          </div>

          {state && "error" in state ? (
            <p role="alert" className="text-sm font-medium text-destructive">
              {state.error}
            </p>
          ) : null}
          {state && "ok" in state ? (
            <p className="text-sm font-medium text-primary">Settings saved.</p>
          ) : null}
        </CardContent>
        <CardFooter>
          <SubmitButton />
        </CardFooter>
      </form>
    </Card>
  );
}
