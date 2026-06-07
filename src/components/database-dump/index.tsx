"use client";

import * as React from "react";
import { useTranslation } from "react-i18next";
import { useSidebarStore } from "@/stores/sidebar-store";
import { useTabStore } from "@/stores/tab-store";
import { useDumpStore } from "@/stores/dump-store";
import { formatBytes } from "@/lib/utils";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import {
  Database,
  Table as TableIcon,
  Settings2,
  FileCode,
  Search,
  AlertCircle,
  RefreshCw,
  Download,
  Layers,
} from "lucide-react";

export function DatabaseDumpPage() {
  const { t } = useTranslation();
  const connections = useSidebarStore((state) => state.connections);
  const activeTabId = useTabStore((state) => state.activeQueryTabId);
  const queryTabs = useTabStore((state) => state.queryTabs);

  // Find active context if opened from sidebar/context menus
  const activeTab = React.useMemo(() => {
    return queryTabs.find((tab) => tab.id === activeTabId);
  }, [queryTabs, activeTabId]);

  const context = activeTab?.context;

  const {
    selectedConnId,
    databases,
    selectedDb,
    schemas,
    selectedSchema,
    tables,
    selectedTables,
    searchTerm,
    loadingTables,
    fetchError,
    isDumping,
    exportMode,
    exportType,
    setSelectedConnId,
    setDatabases,
    setSelectedDb,
    setSchemas,
    setSelectedSchema,
    setTables,
    setSelectedTables,
    setSearchTerm,
    setLoadingTables,
    setFetchError,
    setIsDumping,
    setExportMode,
    setExportType,
  } = useDumpStore();

  // Pre-populate connection from active context on mount/change
  React.useEffect(() => {
    if (context?.connectionId) {
      setSelectedConnId(context.connectionId);
    } else if (connections.length > 0 && !selectedConnId) {
      setSelectedConnId(connections[0].id);
    }
  }, [context, connections, selectedConnId]);

  const selectedConnection = React.useMemo(() => {
    return connections.find((c) => c.id === selectedConnId) || null;
  }, [connections, selectedConnId]);

  // Load databases when connection changes
  React.useEffect(() => {
    if (!selectedConnection) {
      setDatabases([]);
      setSelectedDb("");
      return;
    }

    const fetchDbs = async () => {
      // Currently, pg_dump binary only supports PostgreSQL
      if (selectedConnection.dbType !== "postgres") {
        setDatabases([selectedConnection.database]);
        setSelectedDb(selectedConnection.database);
        return;
      }

      try {
        const res = await window.electron.executeQuery({
          ...selectedConnection,
          sql: "SELECT datname FROM pg_database WHERE datistemplate = false AND datallowconn = true ORDER BY datname;",
        });
        if (res.ok && res.rows) {
          const dbNames = res.rows.map((row: any) => row.datname);
          setDatabases(dbNames);
          if (dbNames.includes(selectedConnection.database)) {
            setSelectedDb(selectedConnection.database);
          } else if (dbNames.length > 0) {
            setSelectedDb(dbNames[0]);
          }
        } else {
          setDatabases([selectedConnection.database]);
          setSelectedDb(selectedConnection.database);
        }
      } catch (err) {
        console.error("Failed to query databases:", err);
        setDatabases([selectedConnection.database]);
        setSelectedDb(selectedConnection.database);
      }
    };

    fetchDbs();
  }, [selectedConnection]);

  // Load schemas when database changes
  React.useEffect(() => {
    if (!selectedConnection || !selectedDb) {
      setSchemas([]);
      setSelectedSchema("");
      return;
    }

    const fetchSchs = async () => {
      try {
        const connWithDb = { ...selectedConnection, database: selectedDb };
        const res = await window.electron.getSchemas(connWithDb);
        if (res.ok && res.schemas) {
          const schemaNames = res.schemas.map((s: any) =>
            typeof s === "string" ? s : s.name,
          );
          setSchemas(schemaNames);
          if (schemaNames.includes("public")) {
            setSelectedSchema("public");
          } else if (schemaNames.length > 0) {
            setSelectedSchema(schemaNames[0]);
          }
        } else {
          setSchemas(["public"]);
          setSelectedSchema("public");
        }
      } catch (err) {
        console.error("Failed to query schemas:", err);
        setSchemas(["public"]);
        setSelectedSchema("public");
      }
    };

    fetchSchs();
  }, [selectedConnection, selectedDb]);

  // Load tables when schema changes
  const loadTables = React.useCallback(async () => {
    if (!selectedConnection || !selectedDb || !selectedSchema) {
      setTables([]);
      return;
    }

    setLoadingTables(true);
    setFetchError(null);

    try {
      const connWithDb = { ...selectedConnection, database: selectedDb };
      const res = await window.electron.getTables(connWithDb, selectedSchema);
      if (res.ok && Array.isArray(res.tables)) {
        setTables(
          res.tables.map((t: any) => ({
            name: t.name,
            size: t.size || 0,
            columnCount: t.columnCount || 0,
            indexCount: t.indexCount || 0,
          })),
        );
        setSelectedTables([]); // reset selection
      } else {
        setFetchError(
          res.message || t("failedToFetchTables") || "Failed to fetch tables.",
        );
        setTables([]);
      }
    } catch (err: any) {
      console.error("Failed to fetch tables:", err);
      setFetchError(
        err.message ||
          t("failedToFetchTables") ||
          "An unexpected error occurred while connecting.",
      );
      setTables([]);
    } finally {
      setLoadingTables(false);
    }
  }, [selectedConnection, selectedDb, selectedSchema, t]);

  React.useEffect(() => {
    loadTables();
  }, [loadTables]);

  const filteredTables = React.useMemo(() => {
    return tables.filter((t) =>
      t.name.toLowerCase().includes(searchTerm.toLowerCase()),
    );
  }, [tables, searchTerm]);

  const toggleTable = (tableName: string) => {
    setSelectedTables((prev) =>
      prev.includes(tableName)
        ? prev.filter((t) => t !== tableName)
        : [...prev, tableName],
    );
  };

  const handleStartDump = async () => {
    if (!selectedConnection || !selectedDb) {
      toast.error(
        t("connectionDetailsNotFound") || "Connection details not found",
      );
      return;
    }

    try {
      // 1. Open save file dialog
      const saveResult = await window.electron.showSaveDialog({
        title: t("saveDumpFile") || "Save Dump File",
        defaultPath: `${selectedDb}_backup.sql`,
        filters: [{ name: "SQL Files", extensions: ["sql"] }],
      });

      if (saveResult.canceled || !saveResult.filePath) {
        return;
      }

      setIsDumping(true);
      const toastId = toast.loading(
        t("dumpInProgress") || "Dumping database in progress...",
      );

      // 2. Prepare pg_dump options
      const dumpOptions = {
        host: selectedConnection.host,
        port: parseInt(selectedConnection.port || "5432", 10),
        user: selectedConnection.username,
        password: selectedConnection.password,
        database: selectedDb,
        outputPath: saveResult.filePath,
        tables: selectedTables,
        schema: selectedSchema,
        schemaOnly: exportType === "schema",
        dataOnly: false,
        inserts: exportMode === "insert",
        clean: true,
        ifExists: true,
        noOwner: true,
        noPrivileges: false,
      };

      // 3. Execute dump in background
      window.electron
        .dumpPostgres(dumpOptions)
        .then((res) => {
          if (res?.success) {
            toast.success(
              `${t("dumpSuccess") || "Database dumped successfully!"} ${saveResult.filePath}`,
              {
                id: toastId,
                duration: 5000,
              },
            );
          } else {
            const fullError = res?.error || "Unknown error";
            toast.error(t("dumpFailed") || "Database dump failed!", {
              id: toastId,
              description:
                fullError.length > 80
                  ? `${fullError.substring(0, 80)}...`
                  : fullError,
              duration: 10000,
              action: {
                label: "Copy Error",
                onClick: () => {
                  navigator.clipboard.writeText(fullError);
                  toast.success("Copied to clipboard!");
                },
              },
            });
          }
        })
        .catch((err: any) => {
          console.error("Dump error:", err);
          toast.error(`Error: ${err.message || "Unknown error"}`, {
            id: toastId,
          });
        })
        .finally(() => {
          setIsDumping(false);
        });
    } catch (err: any) {
      console.error("Dump dialog error:", err);
      toast.error(`Error: ${err.message || "Unknown error"}`);
    }
  };

  const isPostgres = selectedConnection?.dbType === "postgres";

  return (
    <div className="flex-1 flex flex-col h-full bg-background select-none overflow-hidden">
      {/* Control Header Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-4 border-b shrink-0 bg-muted/10">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center size-8 rounded-xl bg-amber-500/10 border border-amber-500/20 shadow-2xs shrink-0">
            <Download className="size-4.5 text-amber-500 shrink-0" />
          </div>
          <div className="flex flex-col select-none">
            <h3 className="text-sm font-bold text-foreground leading-none mb-1">
              {t("toolDumpName") || "Backup & Dump Database"}
            </h3>
            <p className="text-[11px] text-muted-foreground font-medium leading-none">
              {t("toolDumpDesc") ||
                "Export logical schemas, structures and table data to SQL files"}
            </p>
          </div>
        </div>

        {/* Global Connection Trigger Info */}
        {selectedConnection && (
          <Badge
            variant="outline"
            className="text-xs bg-muted/20 font-mono py-1 px-2.5 shrink-0"
          >
            {selectedConnection.name} (
            {selectedDb || selectedConnection.database})
          </Badge>
        )}
      </div>

      {/* Main Flow Resizable Workspace */}
      <div className="flex-1 min-h-0 overflow-hidden bg-muted/5 dark:bg-muted/2">
        <ResizablePanelGroup
          key={selectedConnId || "dump"}
          orientation="horizontal"
          className="h-full w-full"
        >
          {/* Left Side: Export configurations and settings panel */}
          <ResizablePanel
            defaultSize={30}
            className="flex flex-col bg-background min-w-[240px]"
          >
            {/* Panel Title */}
            <div className="p-4 border-b flex items-center justify-between shrink-0 select-none bg-muted/20">
              <span className="text-xs font-extrabold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                <Settings2 className="size-3.5 text-brand" />
                {t("dumpSettings") || "Backup Configuration"}
              </span>
            </div>

            {/* Configs Scroll Area */}
            <ScrollArea className="flex-1 p-5">
              <div className="space-y-6 pb-6">
                {/* 1. Connection Selector */}
                <div className="flex flex-col gap-2 min-w-0">
                  <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1 leading-none">
                    <Database className="size-3 text-indigo-500" />
                    {t("erdConnectionLabel") || "Connection"}
                  </Label>
                  <Select
                    value={selectedConnId}
                    onValueChange={setSelectedConnId}
                    disabled={isDumping}
                  >
                    <SelectTrigger className="w-full h-9 rounded-xl border bg-background text-sm font-semibold cursor-pointer">
                      <SelectValue
                        placeholder={t("erdSelectConnectionPlaceholder")}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {connections.map((conn) => (
                        <SelectItem
                          key={conn.id}
                          value={conn.id}
                          className="text-sm"
                        >
                          <div className="flex items-center gap-2 leading-none">
                            <Database className="size-3.5 text-indigo-500 shrink-0" />
                            <span className="font-semibold text-foreground text-sm leading-none flex items-center">
                              {conn.name}
                            </span>
                            <span className="text-[10px] text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-1.5 py-0.5 rounded shrink-0 font-mono leading-none flex items-center">
                              {conn.database}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* 2. Connection Warning for Non-Postgres */}
                {selectedConnection && !isPostgres && (
                  <div className="p-3.5 rounded-xl border border-destructive/20 bg-destructive/5 text-destructive text-xs font-medium flex items-start gap-2 leading-relaxed animate-in fade-in duration-300">
                    <AlertCircle className="size-4 shrink-0 mt-0.5" />
                    <div className="flex-col">
                      <h4 className="font-bold text-destructive mb-0.5">
                        PostgreSQL Only
                      </h4>
                      <p className="text-destructive/80 font-medium">
                        {t("postgresOnlyWarning") ||
                          "The logical database backup feature currently only supports PostgreSQL connections utilizing pg_dump."}
                      </p>
                    </div>
                  </div>
                )}

                {/* PostgreSQL Database and Schema Selectors */}
                {selectedConnection && isPostgres && (
                  <>
                    {/* 3. Database List Selector */}
                    <div className="flex flex-col gap-2 min-w-0 animate-in fade-in duration-300">
                      <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1 leading-none">
                        <Database className="size-3 text-indigo-500" />
                        {t("selectDatabase") || "Target Database"}
                      </Label>
                      <Select
                        value={selectedDb}
                        onValueChange={setSelectedDb}
                        disabled={isDumping || databases.length === 0}
                      >
                        <SelectTrigger className="w-full h-9 rounded-xl border bg-background text-sm font-semibold cursor-pointer">
                          <SelectValue
                            placeholder={
                              t("selectDatabase") || "Select Database"
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {databases.map((db) => (
                            <SelectItem
                              key={db}
                              value={db}
                              className="font-mono text-xs"
                            >
                              {db}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* 4. Schema Selector */}
                    <div className="flex flex-col gap-2 min-w-0 animate-in fade-in duration-300">
                      <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1 leading-none">
                        <Layers className="size-3 text-indigo-500" />
                        {t("selectSchema") || "Schema"}
                      </Label>
                      <Select
                        value={selectedSchema}
                        onValueChange={setSelectedSchema}
                        disabled={isDumping || schemas.length === 0}
                      >
                        <SelectTrigger className="w-full h-9 rounded-xl border bg-background text-sm font-semibold cursor-pointer">
                          <SelectValue
                            placeholder={t("selectSchema") || "Select Schema"}
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {schemas.map((s) => (
                            <SelectItem
                              key={s}
                              value={s}
                              className="font-mono text-xs"
                            >
                              {s}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}

                {/* 5. Export Type (Schema only vs Schema + Data) */}
                <div className="flex flex-col gap-2">
                  <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1 leading-none">
                    <Settings2 className="size-3 text-indigo-500" />
                    {t("exportType") || "Export Content Type"}
                  </Label>
                  <RadioGroup
                    value={exportType}
                    onValueChange={(v: any) => setExportType(v)}
                    disabled={isDumping || !isPostgres}
                    className="flex flex-col space-y-2 mt-1"
                  >
                    <div className="flex items-center space-x-2.5">
                      <RadioGroupItem value="schema" id="tool-type-schema" />
                      <Label
                        htmlFor="tool-type-schema"
                        className="font-semibold text-sm cursor-pointer select-none"
                      >
                        {t("schemaOnly") || "Schema Structure Only"}
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2.5">
                      <RadioGroupItem value="both" id="tool-type-both" />
                      <Label
                        htmlFor="tool-type-both"
                        className="font-semibold text-sm cursor-pointer select-none"
                      >
                        {t("schemaAndData") || "Schema Structure & Table Data"}
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                {/* 6. Export Mode (COPY vs INSERT) */}
                {exportType !== "schema" && (
                  <div
                    className={`flex flex-col gap-2 transition-all duration-200 animate-in fade-in slide-in-from-top-1.5 duration-200 ${isDumping || !isPostgres ? "opacity-40" : ""}`}
                  >
                    <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1 leading-none">
                      <FileCode className="size-3 text-indigo-500" />
                      {t("exportMode") || "Export Mode"}
                    </Label>
                    <RadioGroup
                      value={exportMode}
                      onValueChange={(v: any) => setExportMode(v)}
                      disabled={isDumping || !isPostgres}
                      className="flex flex-col space-y-2 mt-1"
                    >
                      <div className="flex items-center space-x-2.5">
                        <RadioGroupItem value="copy" id="tool-mode-copy" />
                        <Label
                          htmlFor="tool-mode-copy"
                          className="font-semibold text-sm cursor-pointer select-none"
                        >
                          {t("copyDefault") || "COPY statements (Default)"}
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2.5">
                        <RadioGroupItem value="insert" id="tool-mode-insert" />
                        <Label
                          htmlFor="tool-mode-insert"
                          className="font-semibold text-sm cursor-pointer select-none"
                        >
                          {t("insertStatements") || "INSERT statements"}
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>
                )}

                {/* 7. Action Button */}
                <div className="pt-2">
                  <Button
                    onClick={handleStartDump}
                    disabled={
                      isDumping || !isPostgres || selectedTables.length === 0
                    }
                    className="w-full h-10 rounded-xl bg-brand text-brand-foreground font-bold hover:bg-brand/90 transition select-none flex items-center justify-center gap-2 cursor-pointer shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isDumping ? (
                      <>
                        <span className="size-4 border-2 border-brand-foreground border-t-transparent rounded-full animate-spin shrink-0" />
                        <span>{t("dumpInProgress") || "Backing up..."}</span>
                      </>
                    ) : (
                      <>
                        <Download className="size-4 shrink-0" />
                        <span>{t("startDump") || "Execute Backup"}</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </ScrollArea>
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Right Side: Select Tables pane */}
          <ResizablePanel
            defaultSize={70}
            className="flex flex-col min-w-0 h-full relative bg-muted/5"
          >
            {!selectedConnection ? (
              /* No Connection selected State */
              <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center select-none animate-in fade-in duration-300">
                <div className="relative mb-6">
                  <div className="absolute -inset-6 bg-brand/5 rounded-full blur-2xl" />
                  <div className="relative flex items-center justify-center size-20 bg-gradient-to-br from-muted/60 to-muted/30 rounded-3xl border border-border/80 text-muted-foreground/60 shadow-sm">
                    <Database className="size-9" />
                  </div>
                </div>
                <h3 className="text-base font-bold text-foreground/80 mb-1.5">
                  {t("selectConnectionFirst") ||
                    "Select a connection to continue"}
                </h3>
              </div>
            ) : !isPostgres ? (
              /* Unsupported Connection State */
              <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center select-none animate-in fade-in duration-300">
                <div className="relative mb-6">
                  <div className="absolute -inset-6 bg-destructive/5 rounded-full blur-2xl" />
                  <div className="relative flex items-center justify-center size-20 bg-gradient-to-br from-muted/60 to-muted/30 rounded-3xl border border-border/80 text-destructive/60 shadow-sm">
                    <AlertCircle className="size-9" />
                  </div>
                </div>
                <h3 className="text-base font-bold text-foreground/80 mb-1.5">
                  PostgreSQL Backup Only
                </h3>
                <p className="text-sm text-muted-foreground max-w-[340px] leading-relaxed font-medium">
                  {t("postgresOnlyWarning") ||
                    "Logical database dump exports utilizing pg_dump are currently only supported for PostgreSQL connections."}
                </p>
              </div>
            ) : (
              /* Table Selection List */
              <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden p-6 animate-in fade-in duration-300">
                {/* Search and Selection counter ribbon */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-4 select-none">
                  {/* Search input */}
                  <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3.5 top-2.5 size-4 text-muted-foreground" />
                    <Input
                      placeholder={t("searchTables") || "Search tables..."}
                      className="pl-10 h-9 rounded-xl border bg-background"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      disabled={loadingTables}
                    />
                  </div>

                  {/* Counter badge */}
                  <div className="flex items-center gap-2 select-none shrink-0 self-end">
                    <Badge
                      variant="secondary"
                      className="px-2.5 py-1 text-xs font-semibold rounded-lg"
                    >
                      {selectedTables.length}{" "}
                      {t("tablesSelected") || "selected"}
                    </Badge>
                  </div>
                </div>

                {/* List Container */}
                <div className="flex-1 min-h-0 border rounded-2xl bg-background flex flex-col overflow-hidden shadow-2xs">
                  {/* List Header */}
                  {filteredTables.length > 0 && (
                    <div className="flex items-center space-x-3 p-3.5 px-5 border-b bg-muted/30 select-none transition-colors shrink-0">
                      <Checkbox
                        id="dump-select-all-tables"
                        checked={
                          filteredTables.length > 0 &&
                          filteredTables.every((t) =>
                            selectedTables.includes(t.name),
                          )
                        }
                        onCheckedChange={() => {
                          const allFilteredNames = filteredTables.map(
                            (t) => t.name,
                          );
                          const isAllSelected = allFilteredNames.every((name) =>
                            selectedTables.includes(name),
                          );
                          if (isAllSelected) {
                            setSelectedTables((prev) =>
                              prev.filter(
                                (name) => !allFilteredNames.includes(name),
                              ),
                            );
                          } else {
                            setSelectedTables((prev) => [
                              ...new Set([...prev, ...allFilteredNames]),
                            ]);
                          }
                        }}
                      />
                      <label
                        htmlFor="dump-select-all-tables"
                        className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground cursor-pointer flex-1 select-none"
                      >
                        {t("selectAll") || "Select All"} (
                        {filteredTables.length}{" "}
                        {t("tablesFound") || "tables found"})
                      </label>
                    </div>
                  )}

                  {/* Scrollable list items */}
                  <ScrollArea className="flex-1 w-full min-h-0">
                    {fetchError ? (
                      <div className="flex flex-col items-center justify-center py-20 px-8 text-center select-none">
                        <AlertCircle className="size-10 text-destructive mb-3" />
                        <h4 className="text-sm font-bold text-foreground mb-1.5">
                          {t("failedToFetchTables") || "Failed to Load Tables"}
                        </h4>
                        <p className="text-xs text-muted-foreground max-w-[340px] leading-relaxed mb-4">
                          {fetchError}
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={loadTables}
                          className="rounded-xl px-4 font-semibold"
                        >
                          <RefreshCw className="mr-2 size-3.5" />
                          {t("retryLabel") || "Retry Connection"}
                        </Button>
                      </div>
                    ) : loadingTables ? (
                      <div className="flex flex-col items-center justify-center py-24 select-none">
                        <span className="size-8 border-2 border-brand border-t-transparent rounded-full animate-spin mb-3" />
                        <span className="text-xs text-muted-foreground font-semibold">
                          {t("loadingTables") || "Loading tables list..."}
                        </span>
                      </div>
                    ) : filteredTables.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-24 px-8 text-center select-none">
                        <TableIcon className="size-9 text-muted-foreground/40 mb-3" />
                        <p className="text-xs text-muted-foreground font-semibold leading-relaxed max-w-[280px]">
                          {searchTerm
                            ? t("noTablesMatch") ||
                              "No tables match your search term."
                            : t("noTablesFound") ||
                              "No tables found in this schema."}
                        </p>
                      </div>
                    ) : (
                      <div className="divide-y divide-border/40 px-3">
                        {filteredTables.map((table) => {
                          const isChecked = selectedTables.includes(table.name);
                          return (
                            <div
                              key={table.name}
                              className={`flex items-center space-x-3.5 py-3 px-3 hover:bg-muted/30 rounded-xl transition-all my-1 select-none ${
                                isChecked ? "bg-muted/15" : ""
                              }`}
                            >
                              <Checkbox
                                id={`dump-table-${table.name}`}
                                checked={isChecked}
                                onCheckedChange={() => toggleTable(table.name)}
                              />
                              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                <TableIcon className="size-4 text-muted-foreground/60 shrink-0" />
                                <label
                                  htmlFor={`dump-table-${table.name}`}
                                  className="text-sm font-bold text-foreground truncate cursor-pointer select-none leading-none"
                                >
                                  {table.name}
                                </label>
                              </div>
                              <div className="flex items-center gap-4 shrink-0 select-none">
                                <span className="text-xs text-muted-foreground/80 font-mono font-bold leading-none bg-muted/20 px-2 py-1 rounded-md border border-border/10">
                                  {formatBytes(table.size)}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </ScrollArea>
                </div>
              </div>
            )}
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
}
