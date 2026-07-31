"use client";

import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";

import { useDictionary } from "@/components/i18n/dictionary-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { RoomType } from "@/types";

interface RoomTypesEditorProps {
  initialRoomTypes: RoomType[];
}

export function RoomTypesEditor({ initialRoomTypes }: RoomTypesEditorProps) {
  const { dict } = useDictionary();
  const [rows, setRows] = useState<RoomType[]>(initialRoomTypes);

  function updateRow(index: number, patch: Partial<RoomType>) {
    setRows((prev) =>
      prev.map((row, i) => (i === index ? { ...row, ...patch } : row))
    );
  }

  function addRow() {
    setRows((prev) => [...prev, { name: "", count: 1, category: "" }]);
  }

  function removeRow(index: number) {
    setRows((prev) => prev.filter((_, i) => i !== index));
  }

  return (
    <div className="flex flex-col gap-4">
      <input type="hidden" name="roomTypes" value={JSON.stringify(rows)} />

      <div className="flex flex-col gap-3">
        {rows.map((row, index) => (
          // Four columns don't fit a 375px phone — nor a 768px tablet, once the
          // 256px nav rail is out. Below `lg` the row becomes
          // name / count + category / remove, and every row carries its own
          // labels — stacked rows are too far from the header row to borrow it.
          <div
            key={index}
            className="grid grid-cols-2 items-end gap-3 border-b border-border pb-3 lg:grid-cols-[1fr_90px_1fr_auto]"
          >
            <div className="col-span-2 flex flex-col gap-1.5 lg:col-span-1">
              <Label className={index === 0 ? undefined : "lg:hidden"}>
                {dict.settings.roomTypeName}
              </Label>
              <Input
                value={row.name}
                onChange={(e) => updateRow(index, { name: e.target.value })}
                placeholder={dict.settings.roomTypeName}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className={index === 0 ? undefined : "lg:hidden"}>
                {dict.settings.roomTypeCount}
              </Label>
              <Input
                type="number"
                min={0}
                value={row.count}
                onChange={(e) =>
                  updateRow(index, { count: Number.parseInt(e.target.value, 10) || 0 })
                }
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className={index === 0 ? undefined : "lg:hidden"}>
                {dict.settings.roomTypeCategory}
              </Label>
              <Input
                value={row.category}
                onChange={(e) => updateRow(index, { category: e.target.value })}
                placeholder={dict.settings.roomTypeCategory}
              />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={dict.settings.removeRoomType}
              onClick={() => removeRow(index)}
              className="col-span-2 justify-self-end lg:col-span-1 lg:justify-self-auto"
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" variant="outline" size="sm" onClick={addRow}>
          <Plus className="size-4" />
          {dict.settings.addRoomType}
        </Button>
        {/* TODO(future phase): wire this to an auto-fill action that reads room
            types from the connected PMS (Mews/Apaleo) instead of manual entry.
            Intentionally not implemented in Phase B — no PMS fetching here. */}
        <Button type="button" variant="outline" size="sm" disabled title={dict.settings.pullFromPmsSoon}>
          {dict.settings.pullFromPms}
        </Button>
      </div>
    </div>
  );
}
