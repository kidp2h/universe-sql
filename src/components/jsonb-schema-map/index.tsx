"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useSidebarStore } from "@/stores/sidebar-store";
import { useTabStore } from "@/stores/tab-store";
import {
  buildSchemaTree,
  generateJSONBQueryPath,
  type JSONBSchemaNode,
  type GeneratedQuerySnippets,
} from "./schema-math";
import { VisualSchemaTree } from "./visual-schema-tree";
import {
  FileJson,
  Play,
  Copy,
  Check,
  AlertCircle,
  Database,
  Layers,
  Sparkles,
  Info,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

export function JSONBSchemaPage() {
  const { t } = useTranslation();
  const queryTabs = useTabStore((state) => state.queryTabs);
  const activeQueryTabId = useTabStore((state) => state.activeQueryTabId);
  const openSqlTab = useTabStore((state) => state.openSqlTab);

  const activeTab = React.useMemo(() => {
    return queryTabs.find((tab) => tab.id === activeQueryTabId);
  }, [queryTabs, activeQueryTabId]);

  const context = activeTab?.context;
  const connections = useSidebarStore((state) => state.connections);
  const selectedConnectionId = useSidebarStore(
    (state) => state.selectedConnectionId,
  );

  // Form selections state
  const [selectedConnId, setSelectedConnId] = React.useState<string>("");
  const [selectedSchema, setSelectedSchema] = React.useState<string>("");
  const [selectedTable, setSelectedTable] = React.useState<string>("");
  const [selectedColumn, setSelectedColumn] = React.useState<string>("");
  const [sampleSize, setSampleSize] = React.useState<number>(100);

  // Dynamic dropdown data
  const [schemas, setSchemas] = React.useState<string[]>([]);
  const [tables, setTables] = React.useState<string[]>([]);
  const [columns, setColumns] = React.useState<
    Array<{ name: string; dataType: string }>
  >([]);

  // Fetch / Parse status state
  const [loading, setLoading] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | undefined>(undefined);
  const [schemaTree, setSchemaTree] = React.useState<JSONBSchemaNode | null>(
    null,
  );

  // Active path and generated queries state
  const [activeNode, setActiveNode] = React.useState<JSONBSchemaNode | null>(
    null,
  );
  const [copiedKey, setCopiedKey] = React.useState<string | null>(null);

  // Load context if triggered from context menus
  React.useEffect(() => {
    if (context) {
      setSelectedConnId(context.connectionId);
      setSelectedSchema(context.schema || "");
      setSelectedTable(context.table || "");
      if (context.column) {
        setSelectedColumn(context.column);
      } else {
        setSelectedColumn("");
      }
      setSchemaTree(null);
      setActiveNode(null);
      setError(undefined);
    } else if (selectedConnectionId) {
      setSelectedConnId(selectedConnectionId);
      setSelectedSchema("");
      setSelectedTable("");
      setSelectedColumn("");
      setSchemaTree(null);
      setActiveNode(null);
      setError(undefined);
    }
  }, [context, selectedConnectionId]);

  // Resolve active connection object
  const activeConn = React.useMemo(() => {
    return connections.find((c) => c.id === selectedConnId) || null;
  }, [connections, selectedConnId]);

  // Extract schemas from active connection metadata store
  React.useEffect(() => {
    if (activeConn?.children) {
      const sNames = activeConn.children
        .filter((child) => child.id.includes(":schema:"))
        .map((child) => child.name);
      setSchemas(sNames);

      // Pre-fill schema if schema is in context or fallback to first
      if (context?.connectionId === selectedConnId && context.schema) {
        setSelectedSchema(context.schema || "");
      } else if (sNames.length > 0 && !selectedSchema) {
        setSelectedSchema(sNames[0]);
      }
    } else {
      setSchemas([]);
    }
  }, [activeConn, selectedConnId, context]);

  // Extract tables from selected schema
  React.useEffect(() => {
    if (activeConn?.children && selectedSchema) {
      const schemaId = `${selectedConnId}:schema:${selectedSchema}`;
      const schemaNode = activeConn.children.find(
        (child) => child.id === schemaId,
      );
      if (schemaNode?.children) {
        const tNames = schemaNode.children
          .filter((t) => t.id.includes(":table:"))
          .map((t) => t.name);
        setTables(tNames);

        if (
          context?.connectionId === selectedConnId &&
          context.schema === selectedSchema &&
          context.table
        ) {
          setSelectedTable(context.table || "");
        } else if (tNames.length > 0 && !selectedTable) {
          setSelectedTable(tNames[0]);
        }
      } else {
        setTables([]);
      }
    } else {
      setTables([]);
    }
  }, [activeConn, selectedConnId, selectedSchema, context]);

  // Extract JSON/JSONB columns from selected table or fetch via SQL query if not loaded
  const loadColumns = React.useCallback(async () => {
    if (!activeConn || !selectedSchema || !selectedTable) {
      setColumns([]);
      return;
    }

    // 1. Try to read from sidebar store
    const tableId = `${selectedConnId}:schema:${selectedSchema}:table:${selectedTable}`;
    const schemaNode = activeConn.children?.find(
      (c) => c.id === `${selectedConnId}:schema:${selectedSchema}`,
    );
    const tableNode = schemaNode?.children?.find((t) => t.id === tableId);
    const columnsFolder = tableNode?.children?.find(
      (f) => f.name === "Columns",
    );

    if (columnsFolder?.children && columnsFolder.children.length > 0) {
      const filtered = columnsFolder.children.map((col: any) => ({
        name: col.name,
        dataType: col.dataType || "unknown",
      }));
      setColumns(filtered);

      // Pre-fill first JSONB column
      const jsonCols = filtered.filter((c) =>
        c.dataType.toLowerCase().includes("json"),
      );
      if (
        context?.connectionId === selectedConnId &&
        context.table === selectedTable &&
        context.column
      ) {
        setSelectedColumn(context.column);
      } else if (jsonCols.length > 0 && !selectedColumn) {
        setSelectedColumn(jsonCols[0].name);
      }
      return;
    }

    // 2. Fallback to SQL Query if metadata is not pre-loaded
    try {
      const query = `SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = '${selectedSchema}' 
  AND table_name = '${selectedTable}'
ORDER BY ordinal_position;`;

      const result = await window.electron.executeQuery({
        ...activeConn,
        sql: query,
      } as any);

      if (result.ok && result.rows) {
        const list = result.rows.map((row: any) => ({
          name: row.column_name,
          dataType: row.data_type,
        }));
        setColumns(list);

        const jsonCols = list.filter((c: any) =>
          c.dataType.toLowerCase().includes("json"),
        );
        if (
          context?.connectionId === selectedConnId &&
          context.table === selectedTable &&
          context.column
        ) {
          setSelectedColumn(context.column);
        } else if (jsonCols.length > 0 && !selectedColumn) {
          setSelectedColumn(jsonCols[0].name);
        }
      }
    } catch (err) {
      console.error("Failed to load columns:", err);
    }
  }, [activeConn, selectedConnId, selectedSchema, selectedTable, context]);

  React.useEffect(() => {
    void loadColumns();
  }, [loadColumns]);

  // Execute sampling query and build tree
  const handleMapSchema = async () => {
    if (!activeConn || !selectedSchema || !selectedTable || !selectedColumn) {
      toast.error("Please complete all configurations before sampling!");
      return;
    }

    setLoading(true);
    setError(undefined);
    setSchemaTree(null);
    setActiveNode(null);

    const toastId = toast.loading(
      `Sampling ${sampleSize} documents from ${selectedTable}...`,
    );

    try {
      // Build safe double-quoted SQL identifiers to prevent crashes on spaces/casing
      const colIdent = selectedColumn.includes(" ")
        ? `"${selectedColumn}"`
        : selectedColumn;
      const schemaIdent = selectedSchema.includes(" ")
        ? `"${selectedSchema}"`
        : selectedSchema;
      const tableIdent = selectedTable.includes(" ")
        ? `"${selectedTable}"`
        : selectedTable;

      const query = `SELECT ${colIdent} 
FROM ${schemaIdent}.${tableIdent} 
WHERE ${colIdent} IS NOT NULL 
LIMIT ${sampleSize};`;

      const res = await window.electron.executeQuery({
        ...activeConn,
        sql: query,
      } as any);

      if (res.ok && res.rows) {
        if (res.rows.length === 0) {
          setError(
            `No documents found. The table might be empty or all values in column "${selectedColumn}" are NULL.`,
          );
          toast.error("Sampling failed: Empty column records", { id: toastId });
        } else {
          const tree = buildSchemaTree(res.rows, selectedColumn);
          setSchemaTree(tree);
          // Auto select root by default
          setActiveNode(tree);
        }
      } else {
        setError(res.message || "Failed to execute sampling query");
        toast.error("Query execution failed", { id: toastId });
      }
    } catch (err: any) {
      setError(
        err instanceof Error ? err.message : "An unknown error occurred",
      );
      toast.error(`Error: ${err.message}`, { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  // Generate Postgres query paths on active node changes
  const generatedQueries = React.useMemo<GeneratedQuerySnippets | null>(() => {
    if (!activeNode || !selectedColumn) return null;
    const primaryType = activeNode.types[0] || "string";
    return generateJSONBQueryPath(
      activeNode.fullPath,
      primaryType,
      selectedColumn,
    );
  }, [activeNode, selectedColumn]);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success("JSONB Query path copied to clipboard!");
    setTimeout(() => setCopiedKey(null), 1800);
  };

  const handleOpenInEditor = (sql: string) => {
    openSqlTab({ title: "JSONB Query", sql, connectionId: selectedConnId });
    toast.success("JSONB query loaded in a new SQL tab");
  };

  // Safe columns filtering
  const jsonColumnsList = React.useMemo(() => {
    return columns.filter((col) => col.dataType.toLowerCase().includes("json"));
  }, [columns]);

  return (
    <div className="flex flex-col h-full w-full bg-background overflow-hidden p-6 space-y-6 animate-in fade-in duration-300">
      <div className="mb-2 shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2 select-none tracking-tight text-foreground">
              <FileJson className="size-6 text-indigo-500 animate-pulse" />
              {t("jsonbTitle")}
            </h2>
            <p className="text-sm text-muted-foreground select-none mt-1">
              {t("jsonbDesc")}
            </p>
          </div>
          {activeConn && (
            <Badge
              variant="outline"
              className="text-xs bg-muted/20 font-mono py-1 px-2.5"
            >
              {activeConn.name} ({activeConn.database})
            </Badge>
          )}
        </div>
      </div>

      {/* Configurations selector ribbon */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3.5 p-3.5 border rounded-2xl bg-muted/10 shrink-0 select-none items-end">
        {/* Connection */}
        <div className="flex flex-col gap-1.5 min-w-0 w-full">
          <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider leading-none flex items-center gap-1">
            <Database className="size-3 text-indigo-500" />
            {t("erdConnectionLabel")}
          </span>
          <Select
            value={selectedConnId}
            onValueChange={setSelectedConnId}
            disabled={loading}
          >
            <SelectTrigger className="w-full h-8 font-mono text-[11px] bg-background">
              <SelectValue placeholder={t("erdSelectConnectionPlaceholder")} />
            </SelectTrigger>
            <SelectContent>
              {connections.map((c) => (
                <SelectItem
                  key={c.id}
                  value={c.id}
                  className="font-mono text-[11px]"
                >
                  <div className="flex items-center gap-2 leading-none">
                    <Database className="size-3.5 text-indigo-500 shrink-0" />
                    <span className="font-semibold text-foreground text-sm leading-none flex items-center">
                      {c.name}
                    </span>
                    <span className="text-[10px] text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-1.5 py-0.5 rounded shrink-0 font-mono leading-none flex items-center">
                      {c.database}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Schema */}
        <div className="flex flex-col gap-1.5 min-w-0 w-full">
          <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider leading-none flex items-center gap-1">
            <Layers className="size-3 text-indigo-500" />
            {t("schemaLabel")}
          </span>
          <Select
            value={selectedSchema}
            onValueChange={setSelectedSchema}
            disabled={loading}
          >
            <SelectTrigger className="w-full h-8 font-mono text-[11px] bg-background">
              <SelectValue placeholder={t("schemaLabel")} />
            </SelectTrigger>
            <SelectContent>
              {schemas.map((s) => (
                <SelectItem key={s} value={s} className="font-mono text-[11px]">
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Table Name */}
        <div className="flex flex-col gap-1.5 min-w-0 w-full">
          <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider leading-none">
            {t("tableNameLabel")}
          </span>
          <Select
            value={selectedTable}
            onValueChange={setSelectedTable}
            disabled={loading}
          >
            <SelectTrigger className="w-full h-8 font-mono text-[11px] bg-background">
              <SelectValue placeholder={t("tableNameLabel")} />
            </SelectTrigger>
            <SelectContent>
              {tables.map((t) => (
                <SelectItem key={t} value={t} className="font-mono text-[11px]">
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Target Column */}
        <div className="flex flex-col gap-1.5 min-w-0 w-full">
          <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider leading-none flex items-center gap-1">
            <FileJson className="size-3 text-indigo-500" />
            {t("jsonbColumnLabel")}
          </span>
          <Select
            value={selectedColumn}
            onValueChange={setSelectedColumn}
            disabled={loading}
          >
            <SelectTrigger className="w-full h-8 font-mono text-[11px] bg-background">
              <SelectValue placeholder={t("jsonbColumnLabel")} />
            </SelectTrigger>
            <SelectContent>
              {jsonColumnsList.length === 0 ? (
                <SelectItem
                  value="none"
                  disabled
                  className="text-destructive font-bold text-xs"
                >
                  {t("noJsonbColumnsFound")}
                </SelectItem>
              ) : (
                jsonColumnsList.map((col) => (
                  <SelectItem
                    key={col.name}
                    value={col.name}
                    className="font-mono text-[11px]"
                  >
                    {col.name} ({col.dataType})
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>

        {/* Action button & Samples Size */}
        <div className="flex items-end gap-2 w-full">
          <div className="flex flex-col gap-1.5 min-w-0 w-20 shrink-0">
            <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider leading-none">
              {t("samplesLabel")}
            </span>
            <Input
              type="number"
              min={10}
              max={1000}
              value={sampleSize}
              onChange={(e) => setSampleSize(Number(e.target.value))}
              className="h-8 font-mono text-[11px] px-2 text-center bg-background w-full"
              disabled={loading}
            />
          </div>
          <Button
            onClick={handleMapSchema}
            disabled={loading || !selectedColumn || selectedColumn === "none"}
            className="h-8 flex-1 font-bold text-[11px] bg-indigo-500 hover:bg-indigo-600 text-white shrink-0 gap-1 rounded-lg uppercase tracking-wider"
          >
            {loading ? (
              <>
                <RefreshCw className="size-3.5 animate-spin" />
                {t("profilingLabel")}
              </>
            ) : (
              <>
                <Play className="size-3.5 fill-white" />
                {t("analyzeLabel")}
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Main interactive display columns */}
      <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* LEFT PANE: Tree Explorer */}
        <div className="border rounded-2xl p-4 bg-muted/5 flex flex-col min-h-0 overflow-y-auto">
          {error ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-rose-500 font-semibold select-none bg-rose-500/5 rounded-xl border border-rose-500/10">
              <AlertCircle className="size-8 mb-2 animate-bounce" />
              <p className="text-sm">{error}</p>
            </div>
          ) : schemaTree ? (
            <VisualSchemaTree
              node={schemaTree}
              onSelect={setActiveNode}
              selectedPath={activeNode?.fullPath || null}
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-muted-foreground select-none">
              <FileJson className="size-12 opacity-15 mb-3" />
              <h3 className="font-bold text-sm">
                {t("profileDocSchemaTitle")}
              </h3>
              <p className="text-xs opacity-70 mt-1 max-w-[280px]">
                {t("profileDocSchemaDesc")}
              </p>
            </div>
          )}
        </div>

        {/* RIGHT PANE: Query Generator Preview */}
        <div className="border rounded-2xl p-4 bg-muted/5 flex flex-col min-h-0 overflow-y-auto">
          <div className="font-mono text-sm font-bold text-muted-foreground select-none pb-1.5 border-b border-dashed mb-3 flex items-center gap-1.5">
            <Sparkles className="size-3.5 text-indigo-500" />
            {t("jsonbPathGeneratorTitle")}
          </div>

          {activeNode && generatedQueries ? (
            <div className="flex-1 flex flex-col space-y-4">
              {/* Active node details card */}
              <div className="border rounded-xl p-3.5 bg-muted/10 space-y-2 select-none shadow-sm shrink-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs uppercase font-bold tracking-wider text-muted-foreground font-sans">
                    {t("targetedElementLabel")}
                  </span>
                  <Badge
                    variant="outline"
                    className="text-[10.5px] font-mono bg-background"
                  >
                    {activeNode.fullPath.length === 0
                      ? selectedColumn
                      : activeNode.fullPath.join(".")}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-1.5 border-t border-dashed">
                  <div className="flex flex-col">
                    <span className="text-[9px] text-muted-foreground">
                      {t("datatypesLabel")}
                    </span>
                    <span className="font-mono text-[11px] font-extrabold text-indigo-500 mt-0.5">
                      {activeNode.types.join(" | ")}
                    </span>
                  </div>
                  <div className="flex flex-col border-l pl-4">
                    <span className="text-[9px] text-muted-foreground">
                      {t("sampleFrequencyLabel")}
                    </span>
                    <span className="font-mono text-[11px] font-extrabold text-foreground mt-0.5">
                      {activeNode.frequency}% {t("presenceLabel")}
                    </span>
                  </div>
                </div>
              </div>

              {/* Snippets Generator Blocks list */}
              <div className="flex-1 space-y-3.5 overflow-y-auto pr-1">
                {/* Block 1: Standard Extractor (->>) */}
                {activeNode.fullPath.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-[9px] text-muted-foreground font-bold flex items-center gap-1 select-none pl-1">
                      <ChevronRight className="size-3 text-indigo-500" />
                      {t("extractValueLabel")}
                    </span>
                    <div className="flex items-center gap-2 border rounded-xl p-2.5 bg-zinc-950 text-[11px] font-mono text-zinc-100 shadow-sm relative overflow-hidden group">
                      <span className="flex-1 truncate select-all">
                        {generatedQueries.extractValue}
                      </span>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() =>
                          handleOpenInEditor(generatedQueries.extractValue)
                        }
                        className="size-6 shrink-0 text-zinc-400 hover:text-white hover:bg-white/10 rounded-md mr-1"
                        title="Open in SQL Editor"
                      >
                        <Play className="size-3 text-brand/80" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() =>
                          handleCopy(generatedQueries.extractValue, "v")
                        }
                        className="size-6 shrink-0 text-zinc-400 hover:text-white hover:bg-white/10 rounded-md"
                      >
                        {copiedKey === "v" ? (
                          <Check className="size-3.5 text-brand/80" />
                        ) : (
                          <Copy className="size-3.5" />
                        )}
                      </Button>
                    </div>
                  </div>
                )}

                {/* Block 2: JSONB Object Extractor (->) */}
                <div className="space-y-1.5">
                  <span className="text-[9px] text-muted-foreground font-bold flex items-center gap-1 select-none pl-1">
                    <ChevronRight className="size-3 text-indigo-500" />
                    {t("extractJsonObjectLabel")}
                  </span>
                  <div className="flex items-center gap-2 border rounded-xl p-2.5 bg-zinc-950 text-[11px] font-mono text-zinc-100 shadow-sm relative overflow-hidden group">
                    <span className="flex-1 truncate select-all">
                      {generatedQueries.extractJson}
                    </span>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() =>
                        handleOpenInEditor(generatedQueries.extractJson)
                      }
                      className="size-6 shrink-0 text-zinc-400 hover:text-white hover:bg-white/10 rounded-md mr-1"
                      title="Open in SQL Editor"
                    >
                      <Play className="size-3 text-brand/80" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() =>
                        handleCopy(generatedQueries.extractJson, "j")
                      }
                      className="size-6 shrink-0 text-zinc-400 hover:text-white hover:bg-white/10 rounded-md"
                    >
                      {copiedKey === "j" ? (
                        <Check className="size-3.5 text-brand/80" />
                      ) : (
                        <Copy className="size-3.5" />
                      )}
                    </Button>
                  </div>
                </div>

                {/* Block 3: Safe path extractor (#>>) */}
                {activeNode.fullPath.length > 1 && (
                  <div className="space-y-1.5">
                    <span className="text-[9px] text-muted-foreground font-bold flex items-center gap-1 select-none pl-1">
                      <ChevronRight className="size-3 text-indigo-500" />
                      {t("deepSafePathLabel")}
                    </span>
                    <div className="flex items-center gap-2 border rounded-xl p-2.5 bg-zinc-950 text-[11px] font-mono text-zinc-100 shadow-sm relative overflow-hidden group">
                      <span className="flex-1 truncate select-all">
                        {generatedQueries.pathExtractor}
                      </span>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() =>
                          handleOpenInEditor(generatedQueries.pathExtractor)
                        }
                        className="size-6 shrink-0 text-zinc-400 hover:text-white hover:bg-white/10 rounded-md mr-1"
                        title="Open in SQL Editor"
                      >
                        <Play className="size-3 text-brand/80" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() =>
                          handleCopy(generatedQueries.pathExtractor, "p")
                        }
                        className="size-6 shrink-0 text-zinc-400 hover:text-white hover:bg-white/10 rounded-md"
                      >
                        {copiedKey === "p" ? (
                          <Check className="size-3.5 text-brand/80" />
                        ) : (
                          <Copy className="size-3.5" />
                        )}
                      </Button>
                    </div>
                  </div>
                )}

                {/* Block 4: Index Containment Query (@>) */}
                {activeNode.fullPath.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-[9px] text-muted-foreground font-bold flex items-center gap-1 select-none pl-1">
                      <ChevronRight className="size-3 text-indigo-500" />
                      {t("containmentFilterLabel")}
                    </span>
                    <div className="flex items-center gap-2 border rounded-xl p-2.5 bg-zinc-950 text-[11px] font-mono text-zinc-100 shadow-sm relative overflow-hidden group">
                      <span className="flex-1 truncate select-all">
                        {generatedQueries.containment}
                      </span>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() =>
                          handleOpenInEditor(generatedQueries.containment)
                        }
                        className="size-6 shrink-0 text-zinc-400 hover:text-white hover:bg-white/10 rounded-md mr-1"
                        title="Open in SQL Editor"
                      >
                        <Play className="size-3 text-brand/80" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() =>
                          handleCopy(generatedQueries.containment, "c")
                        }
                        className="size-6 shrink-0 text-zinc-400 hover:text-white hover:bg-white/10 rounded-md"
                      >
                        {copiedKey === "c" ? (
                          <Check className="size-3.5 text-brand/80" />
                        ) : (
                          <Copy className="size-3.5" />
                        )}
                      </Button>
                    </div>
                  </div>
                )}

                {/* Block 5: Key Existence (?) */}
                {activeNode.fullPath.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-[9px] text-muted-foreground font-bold flex items-center gap-1 select-none pl-1">
                      <ChevronRight className="size-3 text-indigo-500" />
                      {t("keyExistenceLabel")}
                    </span>
                    <div className="flex items-center gap-2 border rounded-xl p-2.5 bg-zinc-950 text-[11px] font-mono text-zinc-100 shadow-sm relative overflow-hidden group">
                      <span className="flex-1 truncate select-all">
                        {generatedQueries.keyExists}
                      </span>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() =>
                          handleOpenInEditor(generatedQueries.keyExists)
                        }
                        className="size-6 shrink-0 text-zinc-400 hover:text-white hover:bg-white/10 rounded-md mr-1"
                        title="Open in SQL Editor"
                      >
                        <Play className="size-3 text-brand/80" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() =>
                          handleCopy(generatedQueries.keyExists, "e")
                        }
                        className="size-6 shrink-0 text-zinc-400 hover:text-white hover:bg-white/10 rounded-md"
                      >
                        {copiedKey === "e" ? (
                          <Check className="size-3.5 text-brand/80" />
                        ) : (
                          <Copy className="size-3.5" />
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-muted-foreground select-none">
              <Info className="size-8 opacity-15 mb-2" />
              <h4 className="font-bold text-sm">
                {t("queryGeneratorEmptyTitle")}
              </h4>
              <p className="text-xs opacity-70 mt-1 max-w-[260px]">
                {t("queryGeneratorEmptyDesc")}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
