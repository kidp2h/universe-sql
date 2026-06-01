"use client";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Database, Key, HelpCircle } from "lucide-react";
import type { ColumnState } from "@/lib/alter-table-compiler";

interface ColumnFormProps {
  activeColumn: ColumnState | null;
  onUpdateProperty: (
    columnId: string,
    property: keyof ColumnState,
    value: any,
  ) => void;
  commonTypes: string[];
}

export function ColumnForm({
  activeColumn,
  onUpdateProperty,
  commonTypes,
}: ColumnFormProps) {
  if (!activeColumn) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-muted-foreground h-full bg-background border rounded-xl">
        <Database className="size-12 stroke-[1] text-brand/40 mb-3" />
        <h5 className="text-sm font-semibold text-foreground">
          No Column Selected
        </h5>
        <p className="text-sm max-w-[240px] mx-auto mt-1">
          Choose an existing field on the left or add a new one to begin
          editing.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col border rounded-xl overflow-hidden bg-background h-full">
      <ScrollArea className="flex-1 p-5 min-h-0">
        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-1">
              Column Details
              <span className="font-mono text-sm px-2 py-0.5 rounded bg-muted text-muted-foreground font-medium truncate max-w-[150px]">
                {activeColumn.name}
              </span>
            </h4>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Modify specific field types, constraints, and defaults.
            </p>
          </div>

          <Separator />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Name Input */}
            <div className="space-y-1.5">
              <Label htmlFor="col-name" className="text-sm font-semibold">
                Column Name
              </Label>
              <Input
                id="col-name"
                value={activeColumn.name}
                onChange={(e) =>
                  onUpdateProperty(activeColumn.id, "name", e.target.value)
                }
                className="h-8 text-sm font-mono"
              />
            </div>

            {/* Type Input */}
            <div className="space-y-1.5">
              <Label htmlFor="col-type" className="text-sm font-semibold">
                Data Type
              </Label>
              <div className="flex gap-1.5">
                <Input
                  id="col-type"
                  value={activeColumn.type}
                  onChange={(e) =>
                    onUpdateProperty(activeColumn.id, "type", e.target.value)
                  }
                  className="h-8 text-sm font-mono flex-1 min-w-0"
                />
                <Select
                  onValueChange={(val) => {
                    if (val) {
                      onUpdateProperty(activeColumn.id, "type", val);
                    }
                  }}
                  value={
                    commonTypes.includes(activeColumn.type)
                      ? activeColumn.type
                      : ""
                  }
                >
                  <SelectTrigger
                    size="sm"
                    className="w-[125px] h-8 text-sm font-mono shrink-0 border bg-transparent"
                  >
                    <SelectValue placeholder="Suggest..." />
                  </SelectTrigger>
                  <SelectContent position="popper" align="end">
                    {commonTypes.map((t) => (
                      <SelectItem
                        key={t}
                        value={t}
                        className="text-sm font-mono"
                      >
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Default Value Input */}
          <div className="space-y-1.5">
            <Label
              htmlFor="col-default"
              className="text-sm font-semibold flex items-center gap-1"
            >
              Default Value Expression
              <HelpCircle className="size-3 text-muted-foreground/60" />
            </Label>
            <Input
              id="col-default"
              placeholder="e.g. nextval('seq') or 'active'::character varying"
              value={activeColumn.default_value}
              onChange={(e) =>
                onUpdateProperty(
                  activeColumn.id,
                  "default_value",
                  e.target.value,
                )
              }
              className="h-8 text-sm font-mono"
            />
          </div>

          {/* Not Null & PK Checkboxes */}
          <div className="grid grid-cols-2 gap-4 pt-1">
            <div className="flex items-center space-x-2 p-2 rounded-lg border bg-muted/10">
              <Checkbox
                id="col-not-null"
                checked={activeColumn.not_null}
                onCheckedChange={(checked) =>
                  onUpdateProperty(activeColumn.id, "not_null", !!checked)
                }
              />
              <div className="grid gap-0.5 leading-none">
                <label
                  htmlFor="col-not-null"
                  className="text-sm font-bold text-foreground cursor-pointer select-none"
                >
                  Not Null
                </label>
                <p className="text-[9.5px] text-muted-foreground select-none">
                  Disallow empty/NULL cells.
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2 p-2 rounded-lg border bg-muted/10">
              <Checkbox
                id="col-is-primary"
                checked={activeColumn.is_primary}
                onCheckedChange={(checked) =>
                  onUpdateProperty(activeColumn.id, "is_primary", !!checked)
                }
              />
              <div className="grid gap-0.5 leading-none">
                <label
                  htmlFor="col-is-primary"
                  className="text-sm font-bold text-foreground cursor-pointer select-none flex items-center gap-1"
                >
                  Primary Key
                  <Key className="size-3 text-yellow-500" />
                </label>
                <p className="text-[9.5px] text-muted-foreground select-none">
                  Part of table primary key constraint.
                </p>
              </div>
            </div>
          </div>

          {/* Comment Input */}
          <div className="space-y-1.5">
            <Label htmlFor="col-comment" className="text-sm font-semibold">
              Description / Comments
            </Label>
            <Textarea
              id="col-comment"
              placeholder="Provide table column comment description for developers..."
              rows={3}
              value={activeColumn.comment}
              onChange={(e) =>
                onUpdateProperty(activeColumn.id, "comment", e.target.value)
              }
              className="text-sm font-sans leading-relaxed focus:ring-brand/50"
            />
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
