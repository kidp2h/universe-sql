"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Key } from "lucide-react";
import type { ColumnState } from "@/lib/alter-table-compiler";

interface ColumnsListProps {
  columns: ColumnState[];
  selectedColumnId: string | null;
  onSelectColumn: (id: string) => void;
  onAddColumn: () => void;
  onDeleteColumn: (id: string) => void;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
}

export function ColumnsList({
  columns,
  selectedColumnId,
  onSelectColumn,
  onAddColumn,
  onDeleteColumn,
  searchQuery,
  onSearchQueryChange,
}: ColumnsListProps) {
  const filteredColumns = React.useMemo(() => {
    return columns.filter((c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [columns, searchQuery]);

  return (
    <div className="flex flex-col border rounded-xl overflow-hidden bg-muted/5 h-full">
      <div className="p-3 border-b bg-muted/15 flex gap-2 shrink-0">
        <Input
          placeholder="Search columns..."
          value={searchQuery}
          onChange={(e) => onSearchQueryChange(e.target.value)}
          className="h-8 text-sm bg-background"
        />
        <Button
          onClick={onAddColumn}
          size="sm"
          className="h-8 text-sm font-medium bg-brand hover:bg-brand/80 text-white gap-1 shrink-0"
        >
          <Plus className="size-3.5" />
          Add
        </Button>
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <div className="p-2 space-y-1.5">
          {filteredColumns.map((col) => {
            const isSelected = col.id === selectedColumnId;
            return (
              <div
                key={col.id}
                onClick={() => onSelectColumn(col.id)}
                className={`group flex items-center justify-between p-2.5 rounded-lg border text-left cursor-pointer transition-all duration-150 ${
                  isSelected
                    ? "bg-brand/5 border-brand/20 shadow-sm"
                    : "bg-background border-border hover:bg-muted/30"
                }`}
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  {col.is_primary && (
                    <Key className="size-3.5 text-yellow-500 shrink-0" />
                  )}
                  <div className="truncate space-y-0.5">
                    <p
                      className={`text-[12.5px] font-mono font-medium truncate ${
                        isSelected ? "text-brand" : "text-foreground"
                      }`}
                    >
                      {col.name}
                    </p>
                    <p className="text-xs text-muted-foreground font-mono truncate">
                      {col.type}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 ml-2 shrink-0">
                  {col.isNew && (
                    <Badge
                      variant="outline"
                      className="h-4 text-[8.5px] px-1 font-bold text-brand border-brand/20 bg-brand/5 rounded uppercase"
                    >
                      New
                    </Badge>
                  )}
                  {col.not_null && (
                    <Badge
                      variant="outline"
                      className="h-4 text-[8.5px] px-1 font-mono text-rose-500 border-rose-500/20 bg-rose-500/5 rounded"
                    >
                      not null
                    </Badge>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteColumn(col.id);
                    }}
                    className="size-6 text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 rounded-md md:opacity-0 md:group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
          {filteredColumns.length === 0 && (
            <div className="p-6 text-center text-muted-foreground text-sm font-medium">
              No columns found.
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
