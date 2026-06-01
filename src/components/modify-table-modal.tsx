"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Wrench, Database, Copy, Save, X, AlertCircle } from "lucide-react";
import { useSidebarStore } from "@/stores/sidebar-store";
import {
  type ColumnState,
  generateAlterTableSql,
} from "@/lib/alter-table-compiler";
import { ColumnsList } from "./modify-table/columns-list";
import { ColumnForm } from "./modify-table/column-form";
import { SqlPreview } from "./modify-table/sql-preview";

interface ModifyTableModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  context: {
    connectionId: string;
    schema: string;
    table: string;
  } | null;
}

const COMMON_POSTGRES_TYPES = [
  "integer",
  "bigint",
  "smallint",
  "character varying(255)",
  "text",
  "boolean",
  "timestamp without time zone",
  "timestamp with time zone",
  "date",
  "numeric(10,2)",
  "uuid",
  "jsonb",
];

export function ModifyTableModal({
  open,
  onOpenChange,
  context,
}: ModifyTableModalProps) {
  const connections = useSidebarStore((state) => state.connections);

  const [columns, setColumns] = React.useState<ColumnState[]>([]);
  const [originalColumns, setOriginalColumns] = React.useState<ColumnState[]>(
    [],
  );
  const [droppedColumns, setDroppedColumns] = React.useState<string[]>([]);
  const [selectedColumnId, setSelectedColumnId] = React.useState<string | null>(
    null,
  );
  const [searchQuery, setSearchQuery] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | undefined>();
  const [isSqlCollapsed, setIsSqlCollapsed] = React.useState(true);

  const activeConnection = React.useMemo(() => {
    if (!context) return null;
    return connections.find((c) => c.id === context.connectionId) || null;
  }, [context, connections]);

  // Load column metadata when modal opens
  React.useEffect(() => {
    if (!open || !context || !activeConnection) return;

    const fetchColumns = async () => {
      setLoading(true);
      setError(undefined);
      setColumns([]);
      setOriginalColumns([]);
      setDroppedColumns([]);
      setSelectedColumnId(null);

      try {
        const query = `
          SELECT 
              a.attname AS name,
              pg_catalog.format_type(a.atttypid, a.atttypmod) AS type,
              a.attnotnull AS not_null,
              coalesce(pg_catalog.pg_get_expr(d.adbin, d.adrelid), '') AS default_value,
              coalesce(pg_catalog.col_description(c.oid, a.attnum), '') AS comment,
              coalesce(i.indisprimary, false) AS is_primary
          FROM pg_catalog.pg_attribute a
          INNER JOIN pg_catalog.pg_class c ON a.attrelid = c.oid
          INNER JOIN pg_catalog.pg_namespace n ON c.relnamespace = n.oid
          LEFT JOIN pg_catalog.pg_attrdef d ON d.adrelid = c.oid AND d.adnum = a.attnum
          LEFT JOIN pg_catalog.pg_index i ON i.indrelid = c.oid AND a.attnum = ANY(i.indkey) AND i.indisprimary
          WHERE n.nspname = '${context.schema.replace(/'/g, "''")}' 
            AND c.relname = '${context.table.replace(/'/g, "''")}' 
            AND a.attnum > 0 
            AND NOT a.attisdropped
          ORDER BY a.attnum;
        `;

        const result = await window.electron.executeQuery({
          ...activeConnection,
          sql: query,
        } as any);

        if (result.ok && result.rows) {
          const fetchedCols = result.rows.map((row: any, index: number) => ({
            id: `col-${index}-${row.name}`,
            name: row.name,
            originalName: row.name,
            type: row.type,
            not_null: !!row.not_null,
            default_value: row.default_value,
            comment: row.comment,
            is_primary: !!row.is_primary,
          }));

          setColumns(fetchedCols);
          setOriginalColumns(JSON.parse(JSON.stringify(fetchedCols)));
          if (fetchedCols.length > 0) {
            setSelectedColumnId(fetchedCols[0].id);
          }
        } else {
          setError(result.message || "Failed to load column metadata.");
        }
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "An unexpected error occurred while loading metadata.",
        );
      } finally {
        setLoading(false);
      }
    };

    void fetchColumns();
  }, [open, context, activeConnection]);

  const activeColumn = React.useMemo(() => {
    return columns.find((c) => c.id === selectedColumnId) || null;
  }, [columns, selectedColumnId]);

  // Handle local column property changes
  const updateColumnProperty = React.useCallback(
    (columnId: string, property: keyof ColumnState, value: any) => {
      setColumns((prev) =>
        prev.map((c) => {
          if (c.id !== columnId) return c;
          return { ...c, [property]: value };
        }),
      );
    },
    [],
  );

  // Add a new column to local state
  const handleAddColumn = React.useCallback(() => {
    const newColId = `new-${Date.now()}`;
    const newCol: ColumnState = {
      id: newColId,
      name: `new_column_${columns.length + 1}`,
      originalName: "",
      type: "character varying(255)",
      not_null: false,
      default_value: "",
      comment: "",
      is_primary: false,
      isNew: true,
    };
    setColumns((prev) => [...prev, newCol]);
    setSelectedColumnId(newColId);
  }, [columns.length]);

  // Remove a column from local state (add to dropped list if existing)
  const handleDeleteColumn = React.useCallback(
    (columnId: string) => {
      const targetCol = columns.find((c) => c.id === columnId);
      if (!targetCol) return;

      if (!targetCol.isNew) {
        setDroppedColumns((prev) => [...prev, targetCol.originalName]);
      }

      setColumns((prev) => {
        const next = prev.filter((c) => c.id !== columnId);
        if (selectedColumnId === columnId) {
          setSelectedColumnId(next.length > 0 ? next[0].id : null);
        }
        return next;
      });
    },
    [columns, selectedColumnId],
  );

  // Real-time generated ALTER TABLE query
  const generatedSql = React.useMemo(() => {
    if (!context || columns.length === 0) return "";
    return generateAlterTableSql(
      context.schema,
      context.table,
      columns,
      originalColumns,
      droppedColumns,
    );
  }, [context, columns, originalColumns, droppedColumns]);

  const handleCopySql = React.useCallback(() => {
    if (!generatedSql) {
      toast.error("No SQL modifications generated.");
      return;
    }
    void navigator.clipboard.writeText(generatedSql);
    toast.success("ALTER TABLE SQL copied to clipboard!");
  }, [generatedSql]);

  // Execute changes on database and refresh sidebar tree structure
  const handleSaveChanges = React.useCallback(async () => {
    if (!generatedSql) {
      toast.info("No modifications detected to save.");
      return;
    }
    if (!activeConnection) return;

    setSaving(true);
    setError(undefined);

    try {
      const result = await window.electron.executeQuery({
        ...activeConnection,
        sql: generatedSql,
      } as any);

      if (result.ok) {
        toast.success("Table schema altered successfully!");

        // Refresh sidebar tree metadata Reactively
        if (window.electron?.getFullMetadata) {
          const res = await window.electron.getFullMetadata(activeConnection);
          if (res.ok && res.metadata) {
            const schemaNodes = res.metadata.map((s: any) => ({
              id: `${activeConnection.id}:schema:${s.name}`,
              name: s.name,
              tableCount: s.tableCount,
              children: s.tables.map((t: any) => ({
                id: `${activeConnection.id}:schema:${s.name}:table:${t.name}`,
                name: t.name,
                size: t.size,
                children: [
                  {
                    id: `${activeConnection.id}:schema:${s.name}:table:${t.name}:columns`,
                    name: "Columns",
                    count: t.columnCount,
                    children: t.columns.map((col: any) => ({
                      id: `${activeConnection.id}:schema:${s.name}:table:${t.name}:column:${col.name}`,
                      name: col.name,
                      isPrimary: col.isPrimary,
                      isForeign: col.isForeign,
                      dataType: col.dataType,
                      references: col.references,
                    })),
                  },
                  {
                    id: `${activeConnection.id}:schema:${s.name}:table:${t.name}:indexes`,
                    name: "Indexes",
                    count: t.indexCount,
                    children: t.indexes.map((idxName: any) => ({
                      id: `${activeConnection.id}:schema:${s.name}:table:${t.name}:index:${idxName}`,
                      name: idxName,
                    })),
                  },
                ],
              })),
            }));

            useSidebarStore.getState().updateConnection({
              ...activeConnection,
              isLoading: false,
              children: schemaNodes,
            });
          }
        }

        onOpenChange(false);
      } else {
        setError(result.message || "Failed to alter table schema.");
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "An unexpected error occurred while saving alterations.",
      );
    } finally {
      setSaving(false);
    }
  }, [generatedSql, activeConnection, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-none w-[min(96vw,1200px)] h-[85vh] flex flex-col p-6 rounded-2xl bg-card border border-border shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <DialogHeader className="flex flex-row items-center justify-between border-b pb-4 mb-4 shrink-0">
          <div className="space-y-1">
            <DialogTitle className="flex items-center gap-2 text-xl font-bold text-foreground">
              <Wrench className="size-5.5 text-brand" />
              Modify Table
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground flex items-center gap-4">
              <span>Visually add, edit, or drop database table fields.</span>
              {context && activeConnection && (
                <span className="flex items-center gap-1 font-mono text-xs px-2 py-0.5 rounded bg-muted text-brand/80 font-semibold border border-brand/10">
                  <Database className="size-3" />
                  {activeConnection.name} &bull; {context.schema}.
                  {context.table}
                </span>
              )}
            </DialogDescription>
          </div>
        </DialogHeader>

        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-2 text-muted-foreground">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand border-t-transparent" />
            <span className="text-sm font-medium uppercase tracking-wider">
              Loading table schema...
            </span>
          </div>
        ) : error && columns.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-destructive/5 rounded-xl border border-destructive/15 max-w-lg mx-auto">
            <AlertCircle className="size-12 text-rose-500 mb-3 animate-bounce" />
            <h4 className="text-md font-semibold text-foreground">
              Failed to Load Schema
            </h4>
            <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap font-mono">
              {error}
            </p>
          </div>
        ) : (
          <div className="flex-1 flex flex-col min-h-0">
            {error && (
              <div className="mb-4 p-3 rounded-lg bg-rose-500/5 border border-rose-500/10 text-rose-500 text-sm flex items-start gap-2 animate-in slide-in-from-top-2 duration-200">
                <AlertCircle className="size-4 shrink-0 mt-0.5" />
                <div className="font-mono">{error}</div>
              </div>
            )}

            {/* Split View layout */}
            <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-6 min-h-0">
              {/* Left Column Navigation List (Col span 5) */}
              <div className="md:col-span-5 min-h-0 h-full">
                <ColumnsList
                  columns={columns}
                  selectedColumnId={selectedColumnId}
                  onSelectColumn={setSelectedColumnId}
                  onAddColumn={handleAddColumn}
                  onDeleteColumn={handleDeleteColumn}
                  searchQuery={searchQuery}
                  onSearchQueryChange={setSearchQuery}
                />
              </div>

              {/* Right Column details property form (Col span 7) */}
              <div className="md:col-span-7 min-h-0 h-full">
                <ColumnForm
                  activeColumn={activeColumn}
                  onUpdateProperty={updateColumnProperty}
                  commonTypes={COMMON_POSTGRES_TYPES}
                />
              </div>
            </div>

            {/* SQL Preview Pane (Dynamically compiled queries) */}
            <SqlPreview
              sql={generatedSql}
              isCollapsed={isSqlCollapsed}
              onToggleCollapse={() => setIsSqlCollapsed(!isSqlCollapsed)}
            />
          </div>
        )}

        {/* Modal Bottom actions */}
        <div className="flex items-center justify-end gap-2 border-t pt-4 mt-4 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={saving}
            className="h-9 px-4 text-sm font-semibold gap-1"
          >
            <X className="size-3.5" />
            Cancel
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleCopySql}
            disabled={loading || saving}
            className="h-9 px-4 text-sm font-semibold gap-1.5 border-brand/20 text-brand bg-brand/5 hover:bg-brand/10"
          >
            <Copy className="size-3.5" />
            Copy SQL
          </Button>

          <Button
            size="sm"
            onClick={handleSaveChanges}
            disabled={loading || saving || !generatedSql}
            className="h-9 px-4 text-sm font-semibold bg-brand hover:bg-brand/80 text-white gap-1.5"
          >
            {saving ? (
              <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-background border-t-transparent" />
            ) : (
              <Save className="size-3.5" />
            )}
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
