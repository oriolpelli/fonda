"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  approveAllChasers,
  generateChasers,
  sendChaser,
  skipChaser,
} from "@/app/[lang]/dashboard/checkin/actions";
import { useDictionary } from "@/components/i18n/dictionary-provider";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { intlLocale } from "@/lib/i18n/config";
import { plural, t } from "@/lib/i18n/format";

export interface ChaserCard {
  id: string;
  guestName: string;
  guestEmail: string | null;
  arrivalDate: string | null;
  roomType: string | null;
  draftContent: string | null;
}

function ChaserItem({
  chaser,
  disabled,
  onSend,
  onSkip,
}: {
  chaser: ChaserCard;
  disabled: boolean;
  onSend: (id: string, content: string) => void;
  onSkip: (id: string) => void;
}) {
  const { dict, locale } = useDictionary();
  const draftRef = useRef<HTMLTextAreaElement>(null);

  const arrival = chaser.arrivalDate
    ? new Intl.DateTimeFormat(intlLocale[locale], {
        weekday: "short",
        day: "numeric",
        month: "short",
      }).format(new Date(chaser.arrivalDate))
    : "—";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center justify-between gap-2 text-base">
          <span>{chaser.guestName}</span>
          <span className="text-sm font-normal text-muted-foreground">
            {t(dict.checkin.arrives, { date: arrival })}
            {chaser.roomType ? ` · ${chaser.roomType}` : ""}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <textarea
          ref={draftRef}
          defaultValue={chaser.draftContent ?? ""}
          rows={5}
          className="w-full rounded-[10px] border border-input bg-popover p-3 text-sm transition-colors placeholder:text-[var(--fonda-text-3)] focus-visible:outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-accent"
          placeholder={dict.checkin.chasePlaceholder}
        />
      </CardContent>
      <CardFooter className="flex gap-2">
        <Button
          onClick={() => onSend(chaser.id, draftRef.current?.value ?? "")}
          disabled={disabled}
        >
          {dict.checkin.send}
        </Button>
        <Button
          onClick={() => onSkip(chaser.id)}
          disabled={disabled}
          variant="ghost"
        >
          {dict.checkin.skip}
        </Button>
      </CardFooter>
    </Card>
  );
}

export function CheckinChasers({ chasers }: { chasers: ChaserCard[] }) {
  const router = useRouter();
  const { dict } = useDictionary();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run(fn: () => Promise<{ error?: string } | void>) {
    setError(null);
    startTransition(async () => {
      const result = await fn();
      if (result && "error" in result && result.error) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  function handleBulk() {
    if (chasers.length === 0) return;
    if (
      !window.confirm(
        plural(
          chasers.length,
          dict.checkin.confirmBulkOne,
          dict.checkin.confirmBulkOther
        )
      )
    ) {
      return;
    }
    run(async () => {
      const result = await approveAllChasers();
      return result.error ? { error: result.error } : undefined;
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {plural(chasers.length, dict.checkin.pendingOne, dict.checkin.pendingOther)}
        </p>
        <div className="flex gap-2">
          <Button
            onClick={() =>
              run(async () => {
                const result = await generateChasers();
                return result.error ? { error: result.error } : undefined;
              })
            }
            disabled={pending}
            variant="outline"
            size="sm"
          >
            {dict.checkin.generateNow}
          </Button>
          <Button
            onClick={handleBulk}
            disabled={pending || chasers.length === 0}
            size="sm"
          >
            {t(dict.checkin.approveAll, { count: chasers.length })}
          </Button>
        </div>
      </div>

      {error ? (
        <p role="alert" className="text-sm font-medium text-destructive">
          {error}
        </p>
      ) : null}

      {chasers.length === 0 ? (
        <div className="rounded-lg border border-border bg-muted px-4 py-10 text-center text-sm text-muted-foreground">
          {dict.checkin.noChasers}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {chasers.map((chaser) => (
            <ChaserItem
              key={chaser.id}
              chaser={chaser}
              disabled={pending}
              onSend={(id, content) => run(() => sendChaser(id, content))}
              onSkip={(id) => run(() => skipChaser(id))}
            />
          ))}
        </div>
      )}
    </div>
  );
}
