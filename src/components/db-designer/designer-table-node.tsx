import * as React from "react";
import { useTranslation } from "react-i18next";
import { Handle, Position } from "@xyflow/react";
import { Key, Link, Hash, Trash2, Edit2, Plus, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface ColumnData {
  id: string;
  name: string;
  type: string;
  isPrimary: boolean;
  isNullable: boolean;
  isForeign?: boolean;
}

export interface TableNodeData {
  id: string;
  tableName: string;
  columns: ColumnData[];
  isEditing?: boolean;
  onUpdateTable: (id: string, tableName: string, columns: ColumnData[]) => void;
  onDeleteTable: (id: string) => void;
  onStartEdit: (id: string) => void;
  onEndEdit: (id: string) => void;
}

const DATA_TYPES = [
  "SERIAL",
  "BIGSERIAL",
  "INTEGER",
  "BIGINT",
  "SMALLINT",
  "VARCHAR(255)",
  "TEXT",
  "UUID",
  "BOOLEAN",
  "DATE",
  "TIMESTAMP",
  "TIMESTAMPTZ",
  "NUMERIC",
  "DOUBLE PRECISION",
  "JSONB",
  "BYTEA",
];

export function DesignerTableNode({
  data,
  selected,
}: {
  data: TableNodeData;
  selected?: boolean;
}) {
  const { t } = useTranslation();
  const [tableName, setTableName] = React.useState(data.tableName);
  const [columns, setColumns] = React.useState<ColumnData[]>(data.columns);

  // Sync state with props if they change externally, but guard if user is editing
  React.useEffect(() => {
    if (!data.isEditing) {
      setTableName(data.tableName);
      setColumns(data.columns);
    }
  }, [data.isEditing, data.tableName, data.columns]);

  const handleSave = () => {
    data.onUpdateTable(data.id, tableName, columns);
    data.onEndEdit(data.id);
  };

  const handleAddColumn = () => {
    const newCol: ColumnData = {
      id: `col-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      name: `column_${columns.length + 1}`,
      type: "INTEGER",
      isPrimary: false,
      isNullable: true,
    };
    const nextCols = [...columns, newCol];
    setColumns(nextCols);
    data.onUpdateTable(data.id, tableName, nextCols);
  };

  const handleUpdateColumn = (colId: string, updates: Partial<ColumnData>) => {
    const nextCols = columns.map((c) =>
      c.id === colId ? { ...c, ...updates } : c,
    );
    setColumns(nextCols);
    data.onUpdateTable(data.id, tableName, nextCols);
  };

  const handleDeleteColumn = (colId: string) => {
    const nextCols = columns.filter((c) => c.id !== colId);
    setColumns(nextCols);
    data.onUpdateTable(data.id, tableName, nextCols);
  };

  return (
    <div
      className={cn(
        "min-w-[320px] bg-card rounded-xl border-2 shadow-md flex flex-col transition-all duration-200",
        selected
          ? "border-brand shadow-lg ring-2 ring-brand/20 scale-102"
          : "border-border/60 hover:border-border",
      )}
    >
      {/* Header */}
      <div
        className={cn(
          "px-4 py-2.5 border-b flex items-center justify-between rounded-t-[10px]",
          selected
            ? "bg-brand/10 border-brand/20"
            : "bg-muted/30 border-border/60",
        )}
      >
        {data.isEditing ? (
          <Input
            value={tableName}
            onChange={(e) => {
              const val = e.target.value
                .toLowerCase()
                .replace(/[^a-z0-9_]/g, "");
              setTableName(val);
              data.onUpdateTable(data.id, val, columns);
            }}
            placeholder={t("placeholderTableName") || "table_name"}
            className="h-7 text-sm font-bold bg-background py-0.5 px-2 font-mono w-[180px]"
            autoFocus
          />
        ) : (
          <span className="font-extrabold text-sm text-foreground truncate font-mono">
            {data.tableName}
          </span>
        )}

        <div className="flex items-center gap-1">
          {data.isEditing ? (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 rounded-md text-emerald-500 hover:text-emerald-600 hover:bg-emerald-500/10"
              onClick={handleSave}
            >
              <Check className="size-3.5" />
            </Button>
          ) : (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 rounded-md text-muted-foreground hover:text-foreground"
                onClick={() => data.onStartEdit(data.id)}
              >
                <Edit2 className="size-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 rounded-md text-muted-foreground hover:text-destructive"
                onClick={() => data.onDeleteTable(data.id)}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Columns */}
      <div className="flex flex-col py-2 space-y-1 bg-card rounded-b-[10px]">
        {columns.map((col) => {
          const isFk = col.isForeign;
          return (
            <div
              key={col.id}
              className="group relative flex items-center justify-between px-4 py-1.5 hover:bg-muted/30 transition-colors gap-2 min-h-[36px]"
            >
              {/* Left connection Handle (Target) */}
              <Handle
                type="target"
                position={Position.Left}
                id={`${data.id}-${col.id}-target`}
                className="!w-[7px] !h-[7px] !bg-blue-500 !border-[1.5px] !border-background hover:scale-125 transition-transform"
                style={{ top: "50%", left: "-8px" }}
              />

              <div className="flex items-center gap-2 overflow-hidden w-full">
                {/* Column Type Icon */}
                <div className="w-4 shrink-0 flex justify-center">
                  {col.isPrimary ? (
                    <Key className="size-3.5 text-yellow-500" />
                  ) : isFk ? (
                    <Link className="size-3.5 text-blue-500" />
                  ) : (
                    <Hash className="size-3.5 text-muted-foreground/40" />
                  )}
                </div>

                {/* Name / Form Input */}
                {data.isEditing ? (
                  <div className="flex items-center gap-2 w-full">
                    <Input
                      value={col.name}
                      onChange={(e) =>
                        handleUpdateColumn(col.id, {
                          name: e.target.value
                            .toLowerCase()
                            .replace(/[^a-z0-9_]/g, ""),
                        })
                      }
                      placeholder={t("placeholderColumnName") || "column_name"}
                      className="h-7 text-xs bg-background py-0.5 px-2 font-mono flex-1 min-w-[70px]"
                    />
                    <Select
                      value={col.type}
                      onValueChange={(val) =>
                        handleUpdateColumn(col.id, { type: val })
                      }
                    >
                      <SelectTrigger className="!h-7 text-[10px] font-bold font-mono px-2 !py-0 w-[100px] bg-slate-500/10 dark:bg-slate-500/15 text-slate-600 dark:text-slate-300 border border-slate-500/20 dark:border-slate-500/35 rounded-md hover:bg-slate-500/20 dark:hover:bg-slate-500/25 transition-all shadow-none shrink-0 inline-flex items-center justify-between gap-1 [&>svg]:!size-3 [&>svg]:!opacity-65">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DATA_TYPES.map((t) => (
                          <SelectItem
                            key={t}
                            value={t}
                            className="text-xs font-mono"
                          >
                            {t}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {/* Metadata Toggles */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() =>
                          handleUpdateColumn(col.id, {
                            isPrimary: !col.isPrimary,
                            isNullable: !col.isPrimary ? false : col.isNullable,
                          })
                        }
                        className={cn(
                          "inline-flex items-center justify-center h-6 px-1.5 text-[9px] font-extrabold rounded-md border transition-all cursor-pointer select-none font-sans tracking-wider leading-none",
                          col.isPrimary
                            ? "bg-amber-500/10 text-amber-500 border-amber-500/30 dark:bg-amber-500/20"
                            : "bg-muted/20 text-muted-foreground/60 border-border/40 hover:bg-muted/50 hover:text-foreground",
                        )}
                      >
                        PK
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          handleUpdateColumn(col.id, {
                            isNullable: !col.isNullable,
                          })
                        }
                        disabled={col.isPrimary}
                        className={cn(
                          "inline-flex items-center justify-center h-6 px-1.5 text-[9px] font-extrabold rounded-md border transition-all select-none font-sans tracking-wider leading-none",
                          col.isPrimary || !col.isNullable
                            ? "bg-blue-500/10 text-blue-500 border-blue-500/30 dark:bg-blue-500/20"
                            : "bg-muted/20 text-muted-foreground/60 border-border/40 hover:bg-muted/50 hover:text-foreground",
                          col.isPrimary
                            ? "opacity-60 cursor-not-allowed"
                            : "cursor-pointer",
                        )}
                      >
                        NN
                      </button>
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDeleteColumn(col.id)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <span
                      className={cn(
                        "text-sm truncate font-medium font-mono",
                        col.isPrimary
                          ? "text-foreground font-bold"
                          : "text-muted-foreground",
                      )}
                    >
                      {col.name}
                    </span>
                    <span className="text-[10px] text-muted-foreground/50 uppercase tracking-wide font-mono ml-auto shrink-0">
                      {col.type}
                      {!col.isNullable && (
                        <span className="text-red-500/80 ml-0.5">*</span>
                      )}
                    </span>
                  </>
                )}
              </div>

              {/* Right connection Handle (Source) */}
              <Handle
                type="source"
                position={Position.Right}
                id={`${data.id}-${col.id}-source`}
                className="!w-[7px] !h-[7px] !bg-muted-foreground/60 !border-[1.5px] !border-background hover:scale-125 transition-transform"
                style={{ top: "50%", right: "-8px" }}
              />
            </div>
          );
        })}

        {/* Add column button in edit mode */}
        {data.isEditing && (
          <div className="px-4 py-1.5">
            <Button
              variant="outline"
              size="sm"
              className="h-7 w-full text-xs font-bold border-dashed border-border/80 text-muted-foreground hover:text-foreground cursor-pointer flex items-center justify-center gap-1 rounded-lg"
              onClick={handleAddColumn}
            >
              <Plus className="size-3.5" />
              {t("addColumn") || "Add Column"}
            </Button>
          </div>
        )}

        {columns.length === 0 && !data.isEditing && (
          <div className="px-4 py-4 text-xs text-muted-foreground italic text-center font-medium select-none">
            {t("noColumnsDefined") ||
              "No columns defined. Click Edit to add some."}
          </div>
        )}
      </div>
    </div>
  );
}
