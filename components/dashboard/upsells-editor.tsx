"use client";

import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";

import { useDictionary } from "@/components/i18n/dictionary-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Upsell, UpsellKey } from "@/types";

interface UpsellsEditorProps {
  initialUpsells: Upsell[];
}

const PRESET_KEYS: UpsellKey[] = [
  "late_checkout",
  "breakfast",
  "transfer",
  "parking",
  "custom",
];

export function UpsellsEditor({ initialUpsells }: UpsellsEditorProps) {
  const { dict } = useDictionary();
  const [rows, setRows] = useState<Upsell[]>(initialUpsells);

  function updateRow(index: number, patch: Partial<Upsell>) {
    setRows((prev) =>
      prev.map((row, i) => (i === index ? { ...row, ...patch } : row))
    );
  }

  function addRow() {
    setRows((prev) => [
      ...prev,
      { key: "late_checkout", label: "", price: "", notes: "", active: true },
    ]);
  }

  function removeRow(index: number) {
    setRows((prev) => prev.filter((_, i) => i !== index));
  }

  const keyLabel = (key: UpsellKey) =>
    dict.settings.upsellKeys[key as keyof typeof dict.settings.upsellKeys];

  return (
    <div className="flex flex-col gap-4">
      <input type="hidden" name="upsells" value={JSON.stringify(rows)} />

      <div className="flex flex-col gap-3">
        {rows.map((row, index) => (
          // Five columns don't fit a 375px phone — and they don't fit a 768px
          // tablet either, once the 256px nav rail is out. Below `lg` the row
          // becomes type /
          // label / price + active + remove, and every row carries its own
          // labels — stacked rows are too far from the header row to borrow it.
          <div
            key={index}
            className="grid grid-cols-2 items-end gap-3 border-b border-border pb-3 lg:grid-cols-[minmax(120px,1fr)_1.4fr_110px_auto_auto]"
          >
            <div className="col-span-2 flex flex-col gap-1.5 lg:col-span-1">
              <Label className={index === 0 ? undefined : "lg:hidden"}>
                {dict.settings.upsellType}
              </Label>
              <select
                value={row.key}
                onChange={(e) =>
                  updateRow(index, { key: e.target.value as UpsellKey })
                }
                className="h-9 rounded-[10px] border border-border bg-background px-3 text-sm"
              >
                {PRESET_KEYS.map((k) => (
                  <option key={k} value={k}>
                    {keyLabel(k)}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-span-2 flex flex-col gap-1.5 lg:col-span-1">
              <Label className={index === 0 ? undefined : "lg:hidden"}>
                {dict.settings.upsellLabel}
              </Label>
              <Input
                value={row.label}
                onChange={(e) => updateRow(index, { label: e.target.value })}
                placeholder={dict.settings.upsellLabelPlaceholder}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className={index === 0 ? undefined : "lg:hidden"}>
                {dict.settings.upsellPrice}
              </Label>
              <Input
                value={row.price}
                onChange={(e) => updateRow(index, { price: e.target.value })}
                placeholder={dict.settings.upsellPricePlaceholder}
              />
            </div>
            {/* `lg:contents` dissolves this wrapper back into the grid from
                `lg` up, so the desktop row is unchanged. */}
            <div className="flex items-end justify-between gap-3 lg:contents">
              <div className="flex flex-col gap-1.5">
                <Label className={index === 0 ? undefined : "lg:hidden"}>
                  {dict.settings.upsellActive}
                </Label>
                <label className="flex h-9 items-center gap-2 text-sm text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={row.active}
                    onChange={(e) => updateRow(index, { active: e.target.checked })}
                    className="size-4 rounded border-border"
                  />
                </label>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={dict.settings.removeUpsell}
                onClick={() => removeRow(index)}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <div>
        <Button type="button" variant="outline" size="sm" onClick={addRow}>
          <Plus className="size-4" />
          {dict.settings.addUpsell}
        </Button>
      </div>
    </div>
  );
}
