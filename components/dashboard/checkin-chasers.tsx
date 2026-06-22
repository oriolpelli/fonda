"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  approveAllChasers,
  generateChasers,
  sendChaser,
  skipChaser,
} from "@/app/dashboard/checkin/actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export interface ChaserCard {
  id: string;
  guestName: string;
  guestEmail: string | null;
  arrivalDate: string | null;
  roomType: string | null;
  draftContent: string | null;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date(iso));
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
  const draftRef = useRef<HTMLTextAreaElement>(null);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center justify-between gap-2 text-base">
          <span>{chaser.guestName}</span>
          <span className="text-sm font-normal text-muted-foreground">
            Arrives {formatDate(chaser.arrivalDate)}
            {chaser.roomType ? ` · ${chaser.roomType}` : ""}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <textarea
          ref={draftRef}
          defaultValue={chaser.draftContent ?? ""}
          rows={5}
          className="w-full rounded-md border border-input bg-background p-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          placeholder="Chase message…"
        />
      </CardContent>
      <CardFooter className="flex gap-2">
        <Button
          onClick={() => onSend(chaser.id, draftRef.current?.value ?? "")}
          disabled={disabled}
        >
          Send
        </Button>
        <Button
          onClick={() => onSkip(chaser.id)}
          disabled={disabled}
          variant="ghost"
        >
          Skip
        </Button>
      </CardFooter>
    </Card>
  );
}

export function CheckinChasers({ chasers }: { chasers: ChaserCard[] }) {
  const router = useRouter();
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
        `Send all ${chasers.length} pending chaser${
          chasers.length === 1 ? "" : "s"
        }?`
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
          {chasers.length} pending chaser{chasers.length === 1 ? "" : "s"}
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
            Generate now
          </Button>
          <Button
            onClick={handleBulk}
            disabled={pending || chasers.length === 0}
            size="sm"
          >
            Approve all ({chasers.length})
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
          No pending chasers. Use “Generate now” to draft requests for guests
          arriving in the next 7 days.
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
