"use client";

import * as React from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus, Database, Copy, Save, X, AlertCircle } from "lucide-react";
import { useSidebarStore } from "@/stores/sidebar-store";
import {
  type ColumnState,
  generateCreateTableSql,
} from "@/lib/alter-table-compiler";
import { ColumnsList } from "./modify-table/columns-list";
import { ColumnForm } from "./modify-table/column-form";
import { SqlPreview } from "./modify-table/sql-preview";

interface CreateTableModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  context: {
    connectionId: string;
    schema: string;
    dbPath: string;
    dbName: string;
  } | null;
  onRefresh: (item: any) => void;
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

export function CreateTableModal({
  open,
  onOpenChange,
  context,
  onRefresh,
}: CreateTableModalProps) {
  const { t } = useTranslation();
  const connections = useSidebarStore((state) => state.connections);

  const [tableName, setTableName] = React.useState("");
  const [columns, setColumns] = React.useState<ColumnState[]>([]);
  const [selectedColumnId, setSelectedColumnId] = React.useState<string | null>(
    null,
  );
  const [searchQuery, setSearchQuery] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | undefined>();
  const [isSqlCollapsed, setIsSqlCollapsed] = React.useState(true);

  const activeConnection = React.useMemo(() => {
    if (!context) return null;
    return connections.find((c) => c.id === context.connectionId) || null;
  }, [context, connections]);

  // Reset state when opening modal
  React.useEffect(() => {
    if (open) {
      setTableName("");
      setError(undefined);
      // Initialize with an id column as default primary key
      const _initialIdCol: ColumnState = {
        id: "col-id",
        name: "id",
        originalName: "",
        type: "integer",
        not_null: true,
        default_value: `nextval('${tableName || "new_table"}_id_seq'::regclass)`,
        comment: "",
        is_primary: true,
        isNew: true,
      };
      // For Postgres, SERIAL is easier. Let's make serial the default
      const initialSerialCol: ColumnState = {
        id: "col-id",
        name: "id",
        originalName: "",
        type: "serial",
        not_null: true,
        default_value: "",
        comment: "",
        is_primary: true,
        isNew: true,
      };
      setColumns([initialSerialCol]);
      setSelectedColumnId("col-id");
    }
  }, [open]);

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
      name: `column_${columns.length + 1}`,
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

  // Remove a column from local state
  const handleDeleteColumn = React.useCallback(
    (columnId: string) => {
      setColumns((prev) => {
        const next = prev.filter((c) => c.id !== columnId);
        if (selectedColumnId === columnId) {
          setSelectedColumnId(next.length > 0 ? next[0].id : null);
        }
        return next;
      });
    },
    [selectedColumnId],
  );

  // Real-time generated CREATE TABLE query
  const generatedSql = React.useMemo(() => {
    if (!context || !tableName.trim()) return "";
    return generateCreateTableSql(context.schema, tableName, columns);
  }, [context, tableName, columns]);

  const handleCopySql = React.useCallback(() => {
    if (!generatedSql) {
      toast.error(
        t("noSqlGenerated") ||
          "No SQL generated yet. Provide table name and columns.",
      );
      return;
    }
    void navigator.clipboard.writeText(generatedSql);
    toast.success(t("sqlCopied") || "CREATE TABLE SQL copied to clipboard!");
  }, [generatedSql, t]);

  // Execute changes on database and refresh sidebar tree structure
  const handleCreateDatabaseTable = React.useCallback(async () => {
    if (!tableName.trim()) {
      setError(t("tableNameRequired") || "Table name is required.");
      return;
    }
    if (columns.length === 0) {
      setError(t("columnsRequired") || "At least one column is required.");
      return;
    }
    if (!generatedSql) {
      toast.info(t("noSqlGenerated") || "No SQL generated.");
      return;
    }
    if (!activeConnection) return;

    setSaving(true);
    setError(undefined);

    try {
      const result = await window.electron.executeQuery({
        ...activeConnection,
        database: context?.dbName,
        sql: generatedSql,
      } as any);

      if (result.ok) {
        toast.success(
          t("createTableSuccess") ||
            `Table "${tableName}" created successfully!`,
        );

        // Refresh specifically the parent schema node inside tree
        if (context) {
          onRefresh({
            id: `${context.dbPath}:schema:${context.schema}`,
          });
        }

        onOpenChange(false);
      } else {
        setError(result.message || "Failed to create table.");
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "An unexpected error occurred while creating table.",
      );
    } finally {
      setSaving(false);
    }
  }, [
    generatedSql,
    tableName,
    columns,
    activeConnection,
    context,
    onOpenChange,
    onRefresh,
    t,
  ]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-none w-[min(96vw,1200px)] h-[85vh] flex flex-col p-6 rounded-2xl bg-card border border-border shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <DialogHeader className="flex flex-row items-center justify-between border-b pb-4 mb-4 shrink-0">
          <div className="space-y-1">
            <DialogTitle className="flex items-center gap-2 text-xl font-bold text-foreground">
              <Plus className="size-5.5 text-brand" />
              {t("menuNewTable")}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground flex items-center gap-4">
              <span>
                {t("createTableVisuallyDesc") ||
                  "Create database tables visually with fields, constraints and types."}
              </span>
              {context && activeConnection && (
                <span className="flex items-center gap-1 font-mono text-xs px-2 py-0.5 rounded bg-muted text-brand/80 font-semibold border border-brand/10">
                  <Database className="size-3" />
                  {activeConnection.name} &bull; {context.schema}
                </span>
              )}
            </DialogDescription>
          </div>
        </DialogHeader>

        <div className="flex-1 flex flex-col min-h-0">
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-rose-500/5 border border-rose-500/10 text-rose-500 text-sm flex items-start gap-2 animate-in slide-in-from-top-2 duration-200">
              <AlertCircle className="size-4 shrink-0 mt-0.5" />
              <div className="font-mono">{error}</div>
            </div>
          )}

          {/* Table Name Input Bar */}
          <div className="mb-4 space-y-1.5 max-w-md shrink-0">
            <Label htmlFor="table-name" className="text-sm font-semibold">
              {t("tableNameLabel") || "Table Name"}
            </Label>
            <Input
              id="table-name"
              placeholder="e.g. users, products, orders"
              value={tableName}
              onChange={(e) =>
                setTableName(e.target.value.trim().replace(/\s+/g, "_"))
              }
              className="h-9 text-sm font-mono focus:ring-brand/50 focus:border-brand"
              autoFocus
            />
          </div>

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
            {t("cancel") || "Cancel"}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleCopySql}
            disabled={saving}
            className="h-9 px-4 text-sm font-semibold gap-1.5 border-brand/20 text-brand bg-brand/5 hover:bg-brand/10"
          >
            <Copy className="size-3.5" />
            {t("copySql") || "Copy SQL"}
          </Button>

          <Button
            size="sm"
            onClick={handleCreateDatabaseTable}
            disabled={saving || !tableName.trim() || columns.length === 0}
            className="h-9 px-4 text-sm font-semibold bg-brand hover:bg-brand/80 text-white gap-1.5"
          >
            {saving ? (
              <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-background border-t-transparent" />
            ) : (
              <Save className="size-3.5" />
            )}
            {t("createTable") || "Create Table"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
