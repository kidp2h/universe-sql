"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useConnection } from "@/hooks/use-connection";
import { useQueryDiff } from "@/hooks/use-query-diff";
import { QueryDiffResults } from "@/components/query-diff-results";
import {
  Activity,
  AlertCircle,
  Database,
  GitCompare,
  Play,
  RotateCcw,
  History,
  Loader2,
  HelpCircle,
} from "lucide-react";
import { SqlEditor } from "@/components/query/query-codemirror-editor";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useTheme } from "@/hooks/use-theme";
import { useQueryHistoryStore } from "@/stores/query-history-store";
import { useTranslation } from "react-i18next";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export function QueryDiffPage() {
  const { t } = useTranslation();
  const { activeConnection, connections } = useConnection();

  const [selectedConnId, setSelectedConnId] = React.useState<
    string | undefined
  >(activeConnection?.id || connections[0]?.id);

  const [databases, setDatabases] = React.useState<string[]>([]);
  const [selectedDb, setSelectedDb] = React.useState<string | undefined>(
    undefined,
  );
  const [loadingDbs, setLoadingDbs] = React.useState(false);

  React.useEffect(() => {
    if (activeConnection?.id && !selectedConnId) {
      setSelectedConnId(activeConnection.id);
    } else if (connections.length > 0 && !selectedConnId) {
      setSelectedConnId(connections[0].id);
    }
  }, [activeConnection, selectedConnId, connections]);

  const currentConn = React.useMemo(() => {
    return connections.find((c) => c.id === selectedConnId) || activeConnection;
  }, [selectedConnId, connections, activeConnection]);

  // Reset/Fetch databases when connection changes
  React.useEffect(() => {
    if (!currentConn) {
      setDatabases([]);
      setSelectedDb(undefined);
      return;
    }

    setSelectedDb(currentConn.database);
    setDatabases([currentConn.database]);

    const fetchDbs = async () => {
      if (currentConn.dbType !== "postgres") {
        return;
      }

      setLoadingDbs(true);
      try {
        const res = await window.electron.executeQuery({
          dbType: currentConn.dbType,
          host: currentConn.host,
          port: String(currentConn.port),
          database: currentConn.database,
          username: currentConn.username,
          password: currentConn.password,
          ssl: currentConn.ssl,
          readOnly: currentConn.readOnly,
          name: currentConn.name,
          sql: "SELECT datname FROM pg_database WHERE datistemplate = false AND datallowconn = true ORDER BY datname;",
        });
        if (res.ok && res.rows) {
          const dbNames = res.rows.map((row: any) => row.datname);
          setDatabases(dbNames);
          if (dbNames.includes(currentConn.database)) {
            setSelectedDb(currentConn.database);
          } else if (dbNames.length > 0) {
            setSelectedDb(dbNames[0]);
          }
        }
      } catch (err) {
        console.error("Failed to query databases for Query Diff:", err);
      } finally {
        setLoadingDbs(false);
      }
    };

    fetchDbs();
  }, [selectedConnId, currentConn]);

  const { theme } = useTheme();
  const history = useQueryHistoryStore((state) => state.history);
  const [popoverAOpen, setPopoverAOpen] = React.useState(false);
  const [popoverBOpen, setPopoverBOpen] = React.useState(false);

  const {
    queryA,
    setQueryA,
    queryB,
    setQueryB,
    limit,
    setLimit,
    keyCol,
    setKeyCol,
    isRunning,
    progress,
    result,
    errorA,
    errorB,
    executeDiffCompare,
    handleReset,
  } = useQueryDiff(true, selectedConnId, selectedDb);

  const renderQueryEditor = (type: "A" | "B", heightClass: string) => {
    const isA = type === "A";
    const query = isA ? queryA : queryB;
    const setQuery = isA ? setQueryA : setQueryB;
    const error = isA ? errorA : errorB;
    const popoverOpen = isA ? popoverAOpen : popoverBOpen;
    const setPopoverOpen = isA ? setPopoverAOpen : setPopoverBOpen;
    const title = isA ? t("queryAOriginal") : t("queryBOptimized");
    const colorClass = isA ? "text-indigo-400" : "text-sky-400";
    const badgeBg = isA
      ? "bg-indigo-500/10 border-indigo-500/20"
      : "bg-sky-500/10 border-sky-500/20";
    const badgeText = isA ? "A" : "B";
    const focusRing = isA
      ? "focus-within:ring-indigo-500/50"
      : "focus-within:ring-sky-500/50";
    const placeholder = isA
      ? "e.g. SELECT * FROM users JOIN orders ON users.id = orders.user_id WHERE users.active = true ORDER BY users.id;"
      : "e.g. SELECT * FROM users WHERE active = true AND id IN (SELECT user_id FROM orders) ORDER BY id;";

    return (
      <div className="flex flex-col gap-2 flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span
            className={`text-sm font-semibold ${colorClass} flex items-center gap-1.5`}
          >
            <span
              className={`flex items-center justify-center size-5 rounded border ${badgeBg} text-xs font-bold`}
            >
              {badgeText}
            </span>
            {title}
          </span>

          <div className="flex items-center gap-2">
            {history.length > 0 && (
              <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="xs"
                    className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground cursor-pointer flex items-center gap-1"
                    title={t("loadHistory")}
                  >
                    <History className="size-3.5" />
                    <span>{t("loadHistory")}</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-0" align="end">
                  <div className="p-3 border-b bg-muted/20">
                    <h4 className="text-sm font-semibold text-foreground">
                      {t("selectHistoryTitle")}
                    </h4>
                  </div>
                  <ScrollArea className="h-60">
                    <div className="p-1 space-y-1">
                      {history.map((item) => (
                        <button
                          type="button"
                          key={item.id}
                          onClick={() => {
                            setQuery(item.sql);
                            setPopoverOpen(false);
                          }}
                          className="w-full text-left p-2 rounded-md hover:bg-muted/80 text-[11px] transition-all font-mono border border-transparent hover:border-border cursor-pointer group"
                        >
                          <div className="flex items-center justify-between text-[9px] text-muted-foreground mb-1">
                            <span className="font-semibold px-1 rounded bg-muted text-foreground/80">
                              {item.connectionName}
                            </span>
                            <span>
                              {new Date(item.executedAt).toLocaleTimeString()}
                            </span>
                          </div>
                          <div className="truncate text-foreground/90 max-w-[260px] whitespace-nowrap overflow-hidden">
                            {item.sql}
                          </div>
                        </button>
                      ))}
                    </div>
                  </ScrollArea>
                </PopoverContent>
              </Popover>
            )}
            {error && (
              <span className="text-xs text-rose-500 flex items-center gap-1 font-semibold">
                <AlertCircle className="size-3" /> {t("queryError")}
              </span>
            )}
          </div>
        </div>

        <div
          className={`w-full ${heightClass} rounded-xl border border-border overflow-hidden bg-card focus-within:ring-2 ${focusRing} transition-all ${
            error ? "border-rose-500/50 focus-within:ring-rose-500/35" : ""
          }`}
        >
          <SqlEditor
            value={query}
            onChange={setQuery}
            connection={currentConn}
            placeholder={placeholder}
            readOnly={isRunning}
          />
        </div>
        {error && (
          <p className="text-sm text-rose-500/90 font-mono bg-rose-500/5 p-2.5 rounded-lg border border-rose-500/10 whitespace-pre-wrap">
            {error}
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full w-full bg-background overflow-y-auto p-6 space-y-6 animate-in fade-in duration-300">
      <div className="mb-2">
        <h2 className="flex items-center gap-2 text-2xl font-bold text-foreground animate-in slide-in-from-top-3 duration-300">
          <GitCompare className="size-6 text-indigo-500 animate-pulse" />
          {t("diffTitle")}
        </h2>
        <p className="text-sm text-muted-foreground mt-1 select-none">
          {t("diffDesc")}
        </p>
      </div>

      {/* 1. Configure Connection Section */}
      <div className="p-5 rounded-xl border bg-card/50 shadow-sm space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground/80 flex items-center gap-1.5 select-none">
          <Database className="size-4 text-indigo-500" />
          {t("configureConnection")}
        </h3>

        <div className="flex flex-wrap items-center gap-6">
          {/* Connection Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-bold uppercase tracking-wider">
              {t("erdConnectionLabel")}
            </span>
            <Select
              value={selectedConnId || ""}
              onValueChange={(val) => setSelectedConnId(val || undefined)}
              disabled={isRunning}
            >
              <SelectTrigger className="h-8 min-w-[180px] text-sm font-semibold bg-background rounded-lg border-muted-foreground/20 hover:border-muted-foreground/30 transition-colors">
                <SelectValue
                  placeholder={t("erdSelectConnectionPlaceholder")}
                />
              </SelectTrigger>
              <SelectContent>
                {connections.map((conn) => (
                  <SelectItem key={conn.id} value={conn.id} className="text-sm">
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
                {connections.length === 0 && (
                  <SelectItem
                    value="_empty"
                    disabled
                    className="text-sm italic text-muted-foreground"
                  >
                    {t("erdNoConnections")}
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Database Selector */}
          {currentConn && (
            <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2 duration-200">
              <span className="text-xs text-muted-foreground font-bold uppercase tracking-wider">
                {t("selectDatabase")}
              </span>
              <Select
                value={selectedDb || ""}
                onValueChange={(val) => setSelectedDb(val)}
                disabled={isRunning || databases.length <= 1}
              >
                <SelectTrigger className="h-8 min-w-[150px] max-w-[200px] text-sm font-semibold bg-background rounded-lg border-muted-foreground/20 hover:border-muted-foreground/30 transition-colors">
                  {loadingDbs ? (
                    <div className="flex items-center gap-1.5">
                      <Loader2 className="size-3 animate-spin text-muted-foreground" />
                      <span className="text-xs text-muted-foreground font-normal italic">
                        Loading...
                      </span>
                    </div>
                  ) : (
                    <SelectValue placeholder={t("selectDatabase")} />
                  )}
                </SelectTrigger>
                <SelectContent>
                  {databases.map((db) => (
                    <SelectItem
                      key={db}
                      value={db}
                      className="text-sm font-mono"
                    >
                      {db}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </div>

      {!selectedConnId ? (
        <div className="flex flex-col items-center justify-center p-8 rounded-xl bg-muted/30 border border-dashed border-border text-center">
          <AlertCircle className="size-12 text-amber-500 mb-3" />
          <h4 className="text-lg font-semibold text-foreground">
            {t("noConnectionTitle")}
          </h4>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm">
            {t("diffNoConnectionDesc")}
          </p>
        </div>
      ) : (
        <div className="space-y-6 flex-1 min-h-0">
          {/* 2. Input Queries Tabs Card */}
          <div className="p-5 rounded-xl border bg-card/50 shadow-sm space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground/80 flex items-center gap-1.5 select-none">
              <GitCompare className="size-4 text-indigo-500" />
              {t("inputQueries")}
            </h3>

            <Tabs defaultValue="comparison" className="w-full space-y-4">
              <TabsList className="bg-muted/40 border p-1 rounded-lg">
                <TabsTrigger
                  value="comparison"
                  className="rounded-md px-4 py-1.5 text-xs font-semibold data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all"
                >
                  {t("tabComparisonView")}
                </TabsTrigger>
                <TabsTrigger
                  value="inputA"
                  className="rounded-md px-4 py-1.5 text-xs font-semibold data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all"
                >
                  {t("tabInputA")}
                </TabsTrigger>
                <TabsTrigger
                  value="inputB"
                  className="rounded-md px-4 py-1.5 text-xs font-semibold data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all"
                >
                  {t("tabInputB")}
                </TabsTrigger>
              </TabsList>
              <TabsContent value="comparison" className="mt-0 outline-none">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {renderQueryEditor("A", "h-56")}
                  {renderQueryEditor("B", "h-56")}
                </div>
              </TabsContent>
              <TabsContent value="inputA" className="mt-0 outline-none">
                {renderQueryEditor("A", "h-80")}
              </TabsContent>
              <TabsContent value="inputB" className="mt-0 outline-none">
                {renderQueryEditor("B", "h-80")}
              </TabsContent>
            </Tabs>
          </div>

          {/* 3. Execution Options Card */}
          <div className="p-5 rounded-xl border bg-card/50 shadow-sm space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground/80 flex items-center gap-1.5 select-none">
              <Activity className="size-4 text-emerald-500" />
              {t("executionOptions")}
            </h3>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-6">
                {/* Limit */}
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5">
                    <label
                      htmlFor="diff-limit"
                      className="text-sm font-semibold text-foreground"
                    >
                      {t("rowLimitLabel")}
                    </label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="size-3.5 text-muted-foreground/60 hover:text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs text-xs">
                          {t("rowLimitTooltip")}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <Input
                    id="diff-limit"
                    type="number"
                    min={1}
                    max={10000}
                    value={limit}
                    onChange={(e) =>
                      setLimit(parseInt(e.target.value, 10) || 1000)
                    }
                    disabled={isRunning}
                    className="w-24 bg-background border-border text-center rounded-lg no-spinner font-medium h-9"
                  />
                </div>

                {/* Key Column */}
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5">
                    <label
                      htmlFor="key-col"
                      className="text-sm font-semibold text-foreground"
                    >
                      {t("keyColLabelRefined")}
                    </label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="size-3.5 text-muted-foreground/60 hover:text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs text-xs">
                          {t("keyColTooltip")}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <Input
                    id="key-col"
                    type="text"
                    placeholder="e.g. id"
                    value={keyCol}
                    onChange={(e) => setKeyCol(e.target.value)}
                    disabled={isRunning}
                    className="w-36 bg-background border-border text-center rounded-lg font-medium h-9"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 w-full md:w-auto">
                <Button
                  variant="outline"
                  onClick={handleReset}
                  disabled={isRunning || (!queryA && !queryB && !result)}
                  className="rounded-lg gap-2 text-muted-foreground w-full md:w-auto h-9 cursor-pointer"
                >
                  <RotateCcw className="size-4" />
                  {t("reset")}
                </Button>
                <Button
                  onClick={executeDiffCompare}
                  disabled={isRunning || !queryA.trim() || !queryB.trim()}
                  className="rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-md shadow-emerald-600/10 gap-2 w-full md:w-auto h-9 cursor-pointer transition-all flex items-center justify-center"
                >
                  {isRunning ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Play className="size-4" />
                  )}
                  {t("compareBtn")}
                </Button>
              </div>
            </div>
          </div>

          {/* Running Overlay / Loader */}
          {isRunning && (
            <div className="p-8 rounded-2xl border border-indigo-500/10 bg-indigo-500/5 flex flex-col items-center justify-center gap-3 text-center animate-pulse">
              <Activity className="size-8 text-indigo-500 animate-spin" />
              <h5 className="font-semibold text-foreground text-sm">
                {t("analyzingQueries")}
              </h5>
              <p className="text-sm text-indigo-400 font-mono">
                {progress.stage}
              </p>
              <div className="w-full max-w-xs h-1.5 rounded-full bg-muted overflow-hidden mt-1">
                <div
                  className="h-full bg-indigo-500 transition-all duration-300"
                  style={{
                    width: `${(progress.current / progress.total) * 100}%`,
                  }}
                />
              </div>
            </div>
          )}

          {/* 4. Comparison Output Section */}
          {result && !isRunning && (
            <div className="p-5 rounded-xl border bg-card/50 shadow-sm space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground/80 flex items-center gap-1.5 select-none">
                <GitCompare className="size-4 text-sky-500" />
                {t("comparisonOutput")}
              </h3>
              <QueryDiffResults result={result} keyCol={keyCol} limit={limit} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
