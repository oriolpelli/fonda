"use client";

import { useFormStatus } from "react-dom";

import {
  disconnectApaleo,
  disconnectMews,
  disconnectSheet,
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
import { t } from "@/lib/i18n/format";
import type { PmsType } from "@/lib/pms";

const DISCONNECT_ACTIONS: Record<
  PmsType,
  (formData: FormData) => Promise<void>
> = {
  mews: disconnectMews,
  apaleo: disconnectApaleo,
  sheet: disconnectSheet,
};

function SubmitButton() {
  const { pending } = useFormStatus();
  const { dict } = useDictionary();
  return (
    <Button type="submit" variant="outline" disabled={pending}>
      {pending ? dict.common.pleaseWait : dict.common.disconnect}
    </Button>
  );
}

/**
 * Disconnects whichever source is connected, whatever it is.
 *
 * Settings used to offer this only for MEWS and Apaleo, so a hotel that had
 * connected a Google Sheet was stuck on it — no way to drop it and no way to
 * reach a real PMS. This card is source-agnostic: it dispatches to the matching
 * action, and the page shows the full connector chooser once nothing is
 * connected.
 *
 * The clear-data checkbox is ticked by default because switching source is the
 * common reason to be here, and leaving the old rows behind is what mixes a
 * sheet's bookings into a new PMS's data — but it stays a checkbox, since
 * reconnecting the same source after rotating credentials shouldn't cost a
 * full re-sync.
 */
export function PmsDisconnectCard({ pmsType }: { pmsType: PmsType }) {
  const { dict } = useDictionary();
  const sourceName = dict.settings.pmsNames[pmsType];

  return (
    <Card>
      <CardHeader>
        <CardTitle>{dict.settings.disconnectTitle}</CardTitle>
        <CardDescription>
          {t(dict.settings.disconnectDesc, { pms: sourceName })}
        </CardDescription>
      </CardHeader>
      <form action={DISCONNECT_ACTIONS[pmsType]}>
        <CardContent>
          <label className="flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              name="clearSyncedData"
              defaultChecked
              className="mt-0.5 size-4 rounded border-border"
            />
            <span className="flex flex-col gap-1">
              <span className="font-medium text-foreground">
                {t(dict.settings.clearSyncedData, { pms: sourceName })}
              </span>
              <span className="leading-relaxed text-muted-foreground">
                {dict.settings.clearSyncedDataHint}
              </span>
            </span>
          </label>
        </CardContent>
        <CardFooter>
          <SubmitButton />
        </CardFooter>
      </form>
    </Card>
  );
}
