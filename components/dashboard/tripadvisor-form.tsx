"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import {
  summarizeReviews,
  type TripAdvisorState,
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
import { Textarea } from "@/components/ui/textarea";

interface TripAdvisorFormProps {
  tripadvisorUrl: string;
  reviewHighlights: string;
  reviewSummary: string | null;
}

function SubmitButton() {
  const { pending } = useFormStatus();
  const { dict } = useDictionary();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? dict.settings.summarizing : dict.settings.summarize}
    </Button>
  );
}

export function TripAdvisorForm({
  tripadvisorUrl,
  reviewHighlights,
  reviewSummary,
}: TripAdvisorFormProps) {
  const { dict } = useDictionary();
  const [state, formAction] = useActionState<TripAdvisorState, FormData>(
    summarizeReviews,
    undefined
  );
  const currentSummary = state && "summary" in state ? state.summary : reviewSummary;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{dict.settings.reviewsTitle}</CardTitle>
        <CardDescription>{dict.settings.reviewsDesc}</CardDescription>
      </CardHeader>
      <form action={formAction}>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="tripadvisorUrl">{dict.settings.tripadvisorUrl}</Label>
            <Input
              id="tripadvisorUrl"
              name="tripadvisorUrl"
              type="url"
              defaultValue={tripadvisorUrl}
              placeholder={dict.settings.tripadvisorUrlPlaceholder}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="reviewHighlights">{dict.settings.reviewHighlights}</Label>
            <Textarea
              id="reviewHighlights"
              name="reviewHighlights"
              defaultValue={reviewHighlights}
              placeholder={dict.settings.reviewHighlightsPlaceholder}
              className="min-h-[160px]"
            />
          </div>

          <div className="flex flex-col gap-2 rounded-[10px] bg-[var(--fonda-surface)] p-4">
            <Label>{dict.settings.reviewSummaryLabel}</Label>
            <p className="text-sm text-muted-foreground">
              {currentSummary || dict.settings.reviewSummaryEmpty}
            </p>
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
