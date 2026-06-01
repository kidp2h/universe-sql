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
} from "lucide-react";
import CodeMirror from "@uiw/react-codemirror";
import { sql, PostgreSQL } from "@codemirror/lang-sql";
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
import {
  editorThemeLight,
  editorThemeDark,
  fontTheme,
} from "@/components/query/query-codemirror-editor";
import { parseConnectionCmSchema } from "@/lib/suggestions";
import { useTranslation } from "react-i18next";

export function QueryDiffPage() {
  const { t } = useTranslation();
  const { activeConnection, connections } = useConnection();

  const [selectedConnId, setSelectedConnId] = React.useState<
    string | undefined
  >(activeConnection?.id || connections[0]?.id);

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

  const { theme } = useTheme();
  const history = useQueryHistoryStore((state) => state.history);
  const [popoverAOpen, setPopoverAOpen] = React.useState(false);
  const [popoverBOpen, setPopoverBOpen] = React.useState(false);
  const schema = React.useMemo(() => {
    return parseConnectionCmSchema(currentConn);
  }, [currentConn]);

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
  } = useQueryDiff(true, selectedConnId);

  return (
    <div className="flex flex-col h-full w-full bg-background overflow-y-auto p-6 space-y-6 animate-in fade-in duration-300">
      <div className="mb-2">
        <h2 className="flex items-center gap-2 text-2xl font-bold text-foreground animate-in slide-in-from-top-3 duration-300">
          <GitCompare className="size-6 text-indigo-500 animate-pulse" />
          {t("diffTitle")}
        </h2>
        <div className="text-sm text-muted-foreground flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-1 pb-3 border-b select-none">
          <span>{t("diffDesc")}</span>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-muted-foreground font-bold uppercase tracking-wider">
              {t("erdConnectionLabel")}
            </span>
            <Select
              value={selectedConnId || ""}
              onValueChange={(val) => setSelectedConnId(val || undefined)}
              disabled={isRunning}
            >
              <SelectTrigger className="h-8 min-w-[200px] text-sm font-semibold bg-background">
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
          {/* Input Editors Split View */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Query A Column */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-indigo-400 flex items-center gap-1.5">
                  <span className="flex items-center justify-center size-5 rounded bg-indigo-500/10 border border-indigo-500/20 text-sm font-bold">
                    A
                  </span>
                  {t("queryAOriginal")}
                </span>

                <div className="flex items-center gap-2">
                  {history.length > 0 && (
                    <Popover open={popoverAOpen} onOpenChange={setPopoverAOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="ghost"
                          size="xs"
                          className="h-7 px-2 text-sm text-muted-foreground hover:text-foreground cursor-pointer flex items-center gap-1"
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
                                  setQueryA(item.sql);
                                  setPopoverAOpen(false);
                                }}
                                className="w-full text-left p-2 rounded-md hover:bg-muted/80 text-[11px] transition-all font-mono border border-transparent hover:border-border cursor-pointer group"
                              >
                                <div className="flex items-center justify-between text-[9px] text-muted-foreground mb-1">
                                  <span className="font-semibold px-1 rounded bg-muted text-foreground/80">
                                    {item.connectionName}
                                  </span>
                                  <span>
                                    {new Date(
                                      item.executedAt,
                                    ).toLocaleTimeString()}
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
                  {errorA && (
                    <span className="text-sm text-rose-500 flex items-center gap-1">
                      <AlertCircle className="size-3" /> {t("queryError")}
                    </span>
                  )}
                </div>
              </div>

              <div
                className={`w-full h-56 rounded-xl border border-border overflow-hidden bg-card focus-within:ring-2 focus-within:ring-indigo-500/50 transition-all ${
                  errorA
                    ? "border-rose-500/50 focus-within:ring-rose-500/35"
                    : ""
                }`}
              >
                <CodeMirror
                  value={queryA}
                  onChange={(val) => setQueryA(val)}
                  theme={theme === "dark" ? editorThemeDark : editorThemeLight}
                  extensions={[sql({ dialect: PostgreSQL, schema }), fontTheme]}
                  className="h-full text-sm font-mono"
                  height="100%"
                  placeholder="e.g. SELECT * FROM users JOIN orders ON users.id = orders.user_id WHERE users.active = true ORDER BY users.id;"
                  readOnly={isRunning}
                />
              </div>
              {errorA && (
                <p className="text-sm text-rose-500/90 font-mono bg-rose-500/5 p-2.5 rounded-lg border border-rose-500/10 whitespace-pre-wrap">
                  {errorA}
                </p>
              )}
            </div>

            {/* Query B Column */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-sky-400 flex items-center gap-1.5">
                  <span className="flex items-center justify-center size-5 rounded bg-sky-500/10 border border-sky-500/20 text-sm font-bold">
                    B
                  </span>
                  {t("queryBOptimized")}
                </span>

                <div className="flex items-center gap-2">
                  {history.length > 0 && (
                    <Popover open={popoverBOpen} onOpenChange={setPopoverBOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="ghost"
                          size="xs"
                          className="h-7 px-2 text-sm text-muted-foreground hover:text-foreground cursor-pointer flex items-center gap-1"
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
                                  setQueryB(item.sql);
                                  setPopoverBOpen(false);
                                }}
                                className="w-full text-left p-2 rounded-md hover:bg-muted/80 text-[11px] transition-all font-mono border border-transparent hover:border-border cursor-pointer group"
                              >
                                <div className="flex items-center justify-between text-[9px] text-muted-foreground mb-1">
                                  <span className="font-semibold px-1 rounded bg-muted text-foreground/80">
                                    {item.connectionName}
                                  </span>
                                  <span>
                                    {new Date(
                                      item.executedAt,
                                    ).toLocaleTimeString()}
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
                  {errorB && (
                    <span className="text-sm text-rose-500 flex items-center gap-1">
                      <AlertCircle className="size-3" /> {t("queryError")}
                    </span>
                  )}
                </div>
              </div>

              <div
                className={`w-full h-56 rounded-xl border border-border overflow-hidden bg-card focus-within:ring-2 focus-within:ring-sky-500/50 transition-all ${
                  errorB
                    ? "border-rose-500/50 focus-within:ring-rose-500/35"
                    : ""
                }`}
              >
                <CodeMirror
                  value={queryB}
                  onChange={(val) => setQueryB(val)}
                  theme={theme === "dark" ? editorThemeDark : editorThemeLight}
                  extensions={[sql({ dialect: PostgreSQL, schema }), fontTheme]}
                  className="h-full text-sm font-mono"
                  height="100%"
                  placeholder="e.g. SELECT * FROM users WHERE active = true AND id IN (SELECT user_id FROM orders) ORDER BY id;"
                  readOnly={isRunning}
                />
              </div>
              {errorB && (
                <p className="text-sm text-rose-500/90 font-mono bg-rose-500/5 p-2.5 rounded-lg border border-rose-500/10 whitespace-pre-wrap">
                  {errorB}
                </p>
              )}
            </div>
          </div>

          {/* Config & Controls */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl border bg-muted/20">
            <div className="flex flex-wrap items-center gap-6">
              {/* Limit */}
              <div className="flex items-center gap-2">
                <label
                  htmlFor="diff-limit"
                  className="text-sm font-medium text-foreground"
                >
                  {t("rowLimitLabel")}
                </label>
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
                  className="w-24 bg-background border-border text-center rounded-lg no-spinner"
                />
                <span className="text-sm text-muted-foreground hidden sm:inline">
                  {t("rowLimitDesc")}
                </span>
              </div>

              {/* Key Column */}
              <div className="flex items-center gap-2">
                <label
                  htmlFor="key-col"
                  className="text-sm font-medium text-foreground"
                >
                  {t("keyColLabel")}
                </label>
                <Input
                  id="key-col"
                  type="text"
                  placeholder="e.g. id"
                  value={keyCol}
                  onChange={(e) => setKeyCol(e.target.value)}
                  disabled={isRunning}
                  className="w-36 bg-background border-border text-center rounded-lg"
                />
                <span className="text-sm text-muted-foreground hidden sm:inline">
                  {t("keyColDesc")}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Button
                variant="outline"
                onClick={handleReset}
                disabled={isRunning || (!queryA && !queryB && !result)}
                className="rounded-lg gap-2 text-muted-foreground w-full sm:w-auto"
              >
                <RotateCcw className="size-4" />
                {t("reset")}
              </Button>
              <Button
                onClick={executeDiffCompare}
                disabled={isRunning || !queryA.trim() || !queryB.trim()}
                className="rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-md shadow-indigo-600/10 gap-2 w-full sm:w-auto transition-all"
              >
                <Play className="size-4" />
                {t("compareBtn")}
              </Button>
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

          {/* Results Section */}
          {result && !isRunning && (
            <QueryDiffResults result={result} keyCol={keyCol} limit={limit} />
          )}
        </div>
      )}
    </div>
  );
}
