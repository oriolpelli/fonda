"use client";

import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";

import { useDictionary } from "@/components/i18n/dictionary-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const MAX_RECIPIENTS = 3;

interface BriefRecipientsEditorProps {
  initialRecipients: string[];
}

export function BriefRecipientsEditor({
  initialRecipients,
}: BriefRecipientsEditorProps) {
  const { dict } = useDictionary();
  const [rows, setRows] = useState<string[]>(
    initialRecipients.length > 0 ? initialRecipients : [""]
  );

  function updateRow(index: number, value: string) {
    setRows((prev) => prev.map((row, i) => (i === index ? value : row)));
  }

  function addRow() {
    setRows((prev) => [...prev, ""]);
  }

  function removeRow(index: number) {
    setRows((prev) => prev.filter((_, i) => i !== index));
  }

  const serialized = rows.map((r) => r.trim()).filter((r) => r.length > 0);

  return (
    <div className="flex flex-col gap-3">
      <input type="hidden" name="recipients" value={JSON.stringify(serialized)} />
      <Label>{dict.briefing.recipients}</Label>

      <div className="flex flex-col gap-2">
        {rows.map((row, index) => (
          <div key={index} className="flex items-center gap-2">
            <Input
              type="email"
              value={row}
              onChange={(e) => updateRow(index, e.target.value)}
              placeholder={dict.briefing.recipientPlaceholder}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={dict.briefing.removeRecipient}
              onClick={() => removeRow(index)}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        ))}
      </div>

      {rows.length < MAX_RECIPIENTS ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="self-start"
          onClick={addRow}
        >
          <Plus className="size-4" />
          {dict.briefing.addRecipient}
        </Button>
      ) : null}

      <p className="text-sm text-muted-foreground">
        {dict.briefing.recipientsHint}
      </p>
    </div>
  );
}
