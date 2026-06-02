"use client";

import * as React from "react";
import { useTranslation } from "react-i18next";
import { ColumnDef, SortingState } from "@tanstack/react-table";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Clock,
  Loader2,
  AlertCircle,
  Zap,
  Terminal,
  X,
  ScanSearch,
  Copy,
  Check,
  AlertTriangle,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import type { QueryResult } from "@/components/query/types";
import { BsFiletypeJson } from "react-icons/bs";
import { QueryResultsContextMenu } from "./query-results-context-menu";
import { ResultsTable } from "@/components/query/results-table";
import { useCellSelection } from "@/hooks/use-cell-selection";
import { useExport } from "@/hooks/use-export";
import { DrawerViewJson } from "@/components/drawer-view-json";
import { VisualQueryPlan } from "@/components/query/visual-query-plan";
import { QueryPerformanceProfiler } from "@/components/query/profiler";
import { cn } from "@/lib/utils";
import { useTabStore } from "@/stores/tab-store";
import { useSidebarStore } from "@/stores/sidebar-store";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  useQueryResultsStore,
  type ResultTab,
} from "@/stores/query-results-store";

type QueryResultsPanelProps = {
  isExecuting: boolean;
  queryResult: QueryResult | null;
  isExplainMode: boolean;
  executionTime: number | null;
  copyText: (text: string) => void | Promise<void>;
  onRunWithoutLimit?: () => void | Promise<void>;
  onCancel?: () => void;
  onExplainResultTab?: (
    queryTabId: string,
    resultTabId: string,
    sql: string,
  ) => void;
};

const TruncatedCell = ({ value }: { value: string }) => {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const textRef = React.useRef<HTMLSpanElement>(null);
  const [remainingCount, setRemainingCount] = React.useState(0);

  const checkOverflow = React.useCallback(() => {
    if (textRef.current && containerRef.current) {
      const scrollWidth = textRef.current.scrollWidth;
      const clientWidth = containerRef.current.clientWidth;
      const isOverflowing = scrollWidth > clientWidth;

      if (isOverflowing) {
        const totalLen = value.length;
        const visibleRatio = clientWidth / scrollWidth;
        const estimatedVisible = Math.floor(totalLen * visibleRatio);
        setRemainingCount(Math.max(1, totalLen - estimatedVisible));
      } else {
        setRemainingCount(0);
      }
    }
  }, [value]);

  React.useLayoutEffect(() => {
    checkOverflow();
  }, [checkOverflow]);

  React.useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver(checkOverflow);
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [checkOverflow]);

  return (
    <div
      ref={containerRef}
      className="flex items-center gap-1.5 w-full min-w-0 overflow-hidden"
    >
      <span
        ref={textRef}
        className="text-green-700 dark:text-green-400 text-ellipsis overflow-hidden whitespace-nowrap flex-1"
      >
        {value}
      </span>
      {remainingCount > 0 && (
        <Badge
          variant="outline"
          className="h-4.5 px-1 text-[9px] font-mono shrink-0 bg-muted/30 text-muted-foreground/70 border-muted-foreground/20 leading-none"
        >
          +{remainingCount}
        </Badge>
      )}
    </div>
  );
};

const QueryErrorDisplay = ({
  error,
  copyText,
}: {
  error: string;
  copyText: (text: string) => void | Promise<void>;
}) => {
  const [copied, setCopied] = React.useState(false);
  const { t } = useTranslation();

  // Try to parse JSON errors
  let parsedError: any = null;
  let isJson = false;
  try {
    if (error.trim().startsWith("{") || error.trim().startsWith("[")) {
      parsedError = JSON.parse(error);
      isJson = true;
    }
  } catch (_e) {
    // Not JSON
  }

  const handleCopyRaw = async () => {
    try {
      await copyText(error);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t("failedToCopyRawError"));
    }
  };

  // Analyze error code/message for helpful guidance
  let friendlyTitle = t("queryExecutionFailed");
  let friendlyDesc = t("unexpectedErrorOccurred");
  let tips: string[] = [];

  const rawMsg = (parsedError?.message || parsedError?.code || error || "")
    .toString()
    .toLowerCase();
  const code = (parsedError?.code || "").toString().toUpperCase();

  if (code === "ECONNREFUSED" || rawMsg.includes("econnrefused")) {
    friendlyTitle = t("queryErrorConnRefusedTitle");
    friendlyDesc = t("queryErrorConnRefusedDesc");
    tips = [
      t("queryErrorConnRefusedTip1"),
      t("queryErrorConnRefusedTip2"),
      t("queryErrorConnRefusedTip3"),
    ];
  } else if (
    rawMsg.includes("password authentication failed") ||
    rawMsg.includes("access denied") ||
    rawMsg.includes("authentication failed")
  ) {
    friendlyTitle = t("queryErrorAuthFailedTitle");
    friendlyDesc = t("queryErrorAuthFailedDesc");
    tips = [
      t("queryErrorAuthFailedTip1"),
      t("queryErrorAuthFailedTip2"),
      t("queryErrorAuthFailedTip3"),
    ];
  } else if (rawMsg.includes("syntax error") || code === "42601") {
    friendlyTitle = t("queryErrorSyntaxTitle");
    friendlyDesc = t("queryErrorSyntaxDesc");
    tips = [
      t("queryErrorSyntaxTip1"),
      t("queryErrorSyntaxTip2"),
      t("queryErrorSyntaxTip3"),
    ];
  } else if (
    rawMsg.includes("does not exist") ||
    rawMsg.includes("not found") ||
    rawMsg.includes("invalid relation")
  ) {
    friendlyTitle = t("queryErrorNotFoundTitle");
    friendlyDesc = t("queryErrorNotFoundDesc");
    tips = [
      t("queryErrorNotFoundTip1"),
      t("queryErrorNotFoundTip2"),
      t("queryErrorNotFoundTip3"),
    ];
  }

  return (
    <div className="flex h-full w-full flex-col items-center p-6 select-text overflow-y-auto animate-in fade-in zoom-in-95 duration-250">
      <div className="relative w-full max-w-lg border border-destructive/20 rounded-2xl bg-destructive/5 dark:bg-red-950/10 p-6 md:p-8 shadow-xl shadow-red-500/5 backdrop-blur-md overflow-hidden my-auto shrink-0">
        {/* Glow backdrop decorative layer */}
        <div className="absolute -top-24 -right-24 size-48 bg-red-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 size-48 bg-red-500/5 rounded-full blur-3xl pointer-events-none" />

        {/* Icon & Title Row */}
        <div className="flex items-start gap-4 mb-6 relative z-10">
          <div className="relative flex items-center justify-center size-12 bg-red-500/10 dark:bg-red-500/20 text-red-600 dark:text-red-400 rounded-xl border border-red-500/20 shrink-0 shadow-inner">
            <div className="absolute inset-0 bg-red-500/5 rounded-xl blur-md animate-pulse" />
            <AlertTriangle className="size-6 relative z-10" />
          </div>
          <div className="min-w-0">
            <h3 className="text-base font-bold text-red-600 dark:text-red-400 tracking-tight leading-tight mb-1">
              {friendlyTitle}
            </h3>
            <p className="text-sm text-muted-foreground font-medium leading-relaxed">
              {friendlyDesc}
            </p>
          </div>
        </div>

        {/* Helpful Tips (if any) */}
        {tips.length > 0 && (
          <div className="mb-6 rounded-xl border border-border/40 bg-muted/40 p-4 relative z-10">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80 mb-2 select-none">
              {t("suggestedSolutions")}
            </h4>
            <ul className="text-sm text-muted-foreground/90 space-y-1.5 list-disc pl-4 leading-normal font-sans font-medium">
              {tips.map((tip, idx) => (
                <li key={idx}>{tip}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Raw Error Details block */}
        <div className="relative flex flex-col rounded-xl border border-border/50 bg-black/40 dark:bg-black/60 shadow-inner overflow-hidden relative z-10">
          <div className="flex items-center justify-between px-4 py-1.5 border-b border-border/30 bg-muted/30 select-none">
            <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/60">
              {t("rawErrorDetails")}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopyRaw}
              className="h-5 px-1.5 gap-1 text-xs hover:bg-muted/80 text-muted-foreground cursor-pointer transition-colors"
            >
              {copied ? (
                <>
                  <Check className="size-3 text-brand animate-in zoom-in duration-200" />
                  <span className="text-brand font-bold">{t("copied")}</span>
                </>
              ) : (
                <>
                  <Copy className="size-3" />
                  <span>{t("copyLabel")}</span>
                </>
              )}
            </Button>
          </div>
          <div className="p-4 max-h-[160px] overflow-y-auto font-mono text-[11px] leading-relaxed text-red-500/90 dark:text-red-400/90 whitespace-pre-wrap break-all text-left">
            {isJson ? JSON.stringify(parsedError, null, 2) : error}
          </div>
        </div>
      </div>
    </div>
  );
};

interface QueryResultTabContentProps {
  tab: ResultTab;
  copyText: (text: string) => void | Promise<void>;
  onRunWithoutLimit?: () => void | Promise<void>;
  onExplain?: () => void;
}

const QueryResultTabContent = React.memo(function QueryResultTabContent({
  tab,
  copyText,
  onRunWithoutLimit,
  onExplain,
}: QueryResultTabContentProps) {
  const { t } = useTranslation();
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [selectionCount, setSelectionCount] = React.useState(0);
  const [isJsonDrawerOpen, setIsJsonDrawerOpen] = React.useState(false);
  const [jsonContent, setJsonContent] = React.useState("");
  const [explainTab, setExplainTab] = React.useState<
    "visual" | "raw" | "performance"
  >("visual");

  const queryResult = tab.queryResult;
  const isExplainMode = tab.isExplainMode;
  const executionTime = tab.executionTime;

  React.useEffect(() => {
    if (queryResult) {
      setExplainTab("visual");
    }
  }, [queryResult]);

  const getSelectedRowsRef = React.useRef<() => Record<string, unknown>[]>(
    () => [],
  );

  const {
    tableContainerRef,
    footerSummaryRef,
    footerSummaryContentRef,
    finalizedSelectionRef,
    handleCellMouseDown,
    handleCellMouseEnter,
    handleCopy: _handleCopy,
    handleCopyInStatement: _handleCopyInStatement,
    getSingleSelectedCellText,
  } = useCellSelection(copyText);

  const handleCopy = React.useCallback(() => {
    _handleCopy();
    toast.success(t("copiedSelectionToClipboard"));
  }, [_handleCopy, t]);

  const handleCopyInStatement = React.useCallback(() => {
    _handleCopyInStatement();
    toast.success(t("copiedInStatementToClipboard"));
  }, [_handleCopyInStatement, t]);

  const handleViewAsJson = React.useCallback(() => {
    const text = getSingleSelectedCellText();
    if (!text) return;
    try {
      const formatted = JSON.stringify(JSON.parse(text), null, 2);
      setJsonContent(formatted);
      setIsJsonDrawerOpen(true);
    } catch {
      setJsonContent(text);
      setIsJsonDrawerOpen(true);
    }
  }, [getSingleSelectedCellText]);

  const columns = React.useMemo<ColumnDef<Record<string, unknown>>[]>(() => {
    if (!queryResult) return [];

    const selectColumn: ColumnDef<Record<string, unknown>> = {
      id: "select",
      size: 40,
      header: ({ table }) => (
        <div className="flex w-full items-center justify-center">
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected() ||
              (table.getIsSomePageRowsSelected() && "indeterminate")
            }
            onCheckedChange={(v) => table.toggleAllPageRowsSelected(!!v)}
            aria-label="Select all"
            className="translate-y-[2px]"
          />
        </div>
      ),
      cell: ({ row }) => (
        <div className="flex w-full items-center justify-center">
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(v) => row.toggleSelected(!!v)}
            aria-label="Select row"
            className="translate-y-[2px]"
          />
        </div>
      ),
      enableSorting: false,
      enableHiding: false,
    };

    const dataColumns = queryResult.columns.map((col) => ({
      accessorKey: col,
      header: col,
      cell: (info: any) => {
        const value = info.getValue();
        if (value === null || value === undefined)
          return <span className="text-muted-foreground italic">null</span>;
        if (typeof value === "object")
          return (
            <span className="text-cyan-600 dark:text-cyan-400 font-mono text-sm">
              {JSON.stringify(value)}
            </span>
          );
        if (typeof value === "number")
          return (
            <span className="text-blue-600 dark:text-blue-400">
              {String(value)}
            </span>
          );
        return <TruncatedCell value={String(value)} />;
      },
    }));

    const hasDataColumns = dataColumns.length > 0;
    const hasRows = (queryResult.rowCount ?? 0) > 0;

    if (!hasDataColumns) return [];
    return hasRows ? [selectColumn, ...dataColumns] : dataColumns;
  }, [queryResult]);

  const data = React.useMemo(() => queryResult?.rows ?? [], [queryResult]);

  useExport(queryResult, () => getSelectedRowsRef.current(), data);

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex-1 min-h-0 relative">
        {queryResult?.error ? (
          <QueryErrorDisplay error={queryResult.error} copyText={copyText} />
        ) : isExplainMode && queryResult?.explainPlan ? (
          <div className="h-full w-full flex flex-col min-h-0">
            <div className="flex items-center gap-1 shrink-0 px-4 py-1.5 border-b bg-muted/20 font-medium">
              <span className="text-xs font-bold uppercase tracking-tight text-muted-foreground mr-auto select-none">
                {t("explainPlanViews")}
              </span>
              <Button
                variant={explainTab === "visual" ? "secondary" : "ghost"}
                size="sm"
                className={cn(
                  "h-6 text-[9.5px] font-bold tracking-tight uppercase px-2",
                  explainTab === "visual"
                    ? "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                    : "text-muted-foreground",
                )}
                onClick={() => setExplainTab("visual")}
              >
                {t("visualPlan")}
              </Button>
              <Button
                variant={explainTab === "raw" ? "secondary" : "ghost"}
                size="sm"
                className={cn(
                  "h-6 text-[9.5px] font-bold tracking-tight uppercase px-2",
                  explainTab === "raw"
                    ? "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                    : "text-muted-foreground",
                )}
                onClick={() => setExplainTab("raw")}
              >
                {t("rawOutput")}
              </Button>
              <Button
                variant={explainTab === "performance" ? "secondary" : "ghost"}
                size="sm"
                className={cn(
                  "h-6 text-[9.5px] font-bold tracking-tight uppercase px-2",
                  explainTab === "performance"
                    ? "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                    : "text-muted-foreground",
                )}
                onClick={() => setExplainTab("performance")}
              >
                {t("performanceProfiler")}
              </Button>
            </div>
            <div className="flex-1 min-h-0 relative">
              {explainTab === "visual" ? (
                <VisualQueryPlan plan={queryResult.explainPlan} />
              ) : explainTab === "performance" ? (
                <QueryPerformanceProfiler plan={queryResult.explainPlan} />
              ) : (
                <QueryResultsContextMenu
                  onCopy={handleCopy}
                  onCopyInStatement={handleCopyInStatement}
                >
                  <ResultsTable
                    data={data}
                    columns={columns}
                    sorting={sorting}
                    onSortingChange={setSorting}
                    onSelectionChange={setSelectionCount}
                    getSelectedRowsRef={getSelectedRowsRef}
                    tableContainerRef={tableContainerRef}
                    finalizedSelectionRef={finalizedSelectionRef}
                    onCellMouseDown={handleCellMouseDown}
                    onCellMouseEnter={handleCellMouseEnter}
                    onCopy={handleCopy}
                    onCopyInStatement={handleCopyInStatement}
                    isPopulating={false}
                  />
                </QueryResultsContextMenu>
              )}
            </div>
          </div>
        ) : (
          <QueryResultsContextMenu
            onCopy={handleCopy}
            onCopyInStatement={handleCopyInStatement}
          >
            {queryResult?.message && queryResult.rows.length === 0 ? (
              <div className="flex h-full w-full flex-col items-center justify-center p-8 text-center animate-in fade-in zoom-in duration-300">
                <div className="relative mb-6">
                  <div className="absolute -inset-4 bg-blue-500/10 rounded-full blur-xl animate-pulse" />
                  <div className="relative flex items-center justify-center size-20 bg-gradient-to-br from-blue-500/10 to-indigo-500/10 rounded-3xl border border-blue-500/20 text-blue-600 dark:text-blue-400 shadow-sm">
                    <div className="absolute inset-0 bg-white/5 rounded-3xl" />
                    <Clock className="size-10 relative z-10" />
                  </div>
                </div>
                <h3 className="text-2xl font-bold tracking-tight mb-2 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                  {queryResult.message}
                </h3>
                <p className="text-muted-foreground font-medium text-md">
                  {t("queryExecutedSuccessIn")}{" "}
                  <span className="text-foreground">{executionTime}ms</span>
                </p>
              </div>
            ) : data.length === 0 && !queryResult?.message ? (
              <div className="flex h-full w-full flex-col items-center justify-center p-8 text-center animate-in fade-in zoom-in duration-200 select-none">
                <div className="relative mb-5">
                  <div className="absolute -inset-4 bg-muted/40 rounded-full blur-xl" />
                  <div className="relative flex items-center justify-center size-16 bg-gradient-to-br from-muted/60 to-muted/30 rounded-2xl border border-border/50 text-muted-foreground/50 shadow-sm">
                    <svg
                      className="size-8"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.5}
                      aria-hidden="true"
                      role="img"
                      aria-label="Empty table"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                      />
                    </svg>
                  </div>
                </div>
                <h3 className="text-sm font-semibold text-foreground/70 mb-1">
                  {t("zeroRowsReturned")}
                </h3>
                <p className="text-sm text-muted-foreground max-w-[220px] leading-relaxed">
                  {t("zeroRowsReturnedDesc")}
                </p>
              </div>
            ) : (
              <ResultsTable
                data={data}
                columns={columns}
                sorting={sorting}
                onSortingChange={setSorting}
                onSelectionChange={setSelectionCount}
                getSelectedRowsRef={getSelectedRowsRef}
                tableContainerRef={tableContainerRef}
                finalizedSelectionRef={finalizedSelectionRef}
                onCellMouseDown={handleCellMouseDown}
                onCellMouseEnter={handleCellMouseEnter}
                onCopy={handleCopy}
                onCopyInStatement={handleCopyInStatement}
                isPopulating={
                  data.length === 0 && (queryResult?.rowCount ?? 0) > 0
                }
              />
            )}
          </QueryResultsContextMenu>
        )}
      </div>

      {/* Footer Details */}
      <div className="border-t bg-muted/40 px-4 py-1 flex items-center shrink-0 min-h-[34px] justify-between">
        <div className="flex items-center gap-2 flex-1">
          <Badge
            variant="outline"
            className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 py-0.5 px-2 font-semibold"
          >
            {t("rowsCount", { count: queryResult?.rowCount ?? 0 })}
          </Badge>
          {queryResult?.isLimited && (
            <Badge
              variant="outline"
              className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 py-0.5 px-2 font-semibold select-none cursor-help"
              title={t("resultLimitedTooltip")}
            >
              {t("limited")}
            </Badge>
          )}
          {queryResult?.isLimited && onRunWithoutLimit && (
            <Badge
              variant="outline"
              className="bg-blue-600 hover:bg-blue-700 text-white border-transparent py-0.5 px-2 font-bold cursor-pointer transition-all flex items-center gap-1 uppercase text-[9px] tracking-wider shrink-0 select-none shadow-sm hover:scale-105 active:scale-95 duration-150"
              onClick={onRunWithoutLimit}
            >
              <Zap className="size-2.5 fill-current" />
              {t("fetchAll")}
            </Badge>
          )}
          {executionTime !== null && (
            <Badge
              variant="outline"
              className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 py-0.5 px-2 font-semibold"
            >
              <Clock className="size-3 mr-1" />
              {executionTime}ms
            </Badge>
          )}
          {selectionCount > 0 && (
            <Badge
              variant="outline"
              className="bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20 py-0.5 px-2 font-semibold"
            >
              {t("selectedRowsCount", { count: selectionCount })}
            </Badge>
          )}
          {/* Explain Query button — only for SELECT and not already in explain mode */}
          {onExplain &&
            !tab.isExplainMode &&
            !tab.queryResult.error &&
            tab.sql.trim().toUpperCase().startsWith("SELECT") && (
              <Badge
                variant="outline"
                className="bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20 py-0.5 px-2 font-semibold cursor-pointer hover:bg-violet-500/20 transition-all shrink-0 select-none hover:scale-105 active:scale-95 duration-150 flex items-center"
                onClick={onExplain}
                title={t("explainAnalyzeTooltip")}
              >
                <ScanSearch className="size-3 mr-1" />
                {t("explain")}
              </Badge>
            )}
        </div>
        <div
          ref={footerSummaryRef}
          className="flex items-center invisible select-none gap-2"
        >
          <Badge
            data-slot="view-as-json-button"
            variant="outline"
            className="hidden bg-amber-500/10 flex flex-row items-center text-amber-600 dark:text-amber-400 border-amber-500/30 py-0.5 px-2 font-bold cursor-pointer hover:bg-amber-500/20 transition-colors uppercase text-xs tracking-tight"
            onClick={handleViewAsJson}
          >
            <BsFiletypeJson className="size-5 mr-0.5" />
            {t("viewAsJson")}
          </Badge>
          <Badge
            variant="outline"
            className="bg-brand/10 text-brand dark:text-brand/80 border-brand/20 py-0.5 px-2 font-semibold"
          >
            <span ref={footerSummaryContentRef} />
          </Badge>
        </div>
      </div>

      <DrawerViewJson
        open={isJsonDrawerOpen}
        onOpenChange={setIsJsonDrawerOpen}
        json={jsonContent}
      />
    </div>
  );
});

export const QueryResultsPanel = React.memo(function QueryResultsPanel({
  isExecuting,
  queryResult: _ignoredQueryResult,
  isExplainMode: _ignoredIsExplainMode,
  executionTime: _ignoredExecutionTime,
  copyText,
  onRunWithoutLimit,
  onCancel,
  onExplainResultTab,
}: QueryResultsPanelProps) {
  const { t } = useTranslation();
  const activeQueryTabIdRaw = useTabStore((state) => state.activeQueryTabId);
  const activeQueryTabId = React.useDeferredValue(activeQueryTabIdRaw);

  const queryTabs = useTabStore((state) => state.queryTabs);
  const selectedConnectionId = useSidebarStore(
    (state) => state.selectedConnectionId,
  );

  const [isPending, setIsPending] = React.useState(false);

  const prevActiveTabIdRef = React.useRef(activeQueryTabIdRaw);
  const prevConnectionIdRef = React.useRef<string | null>(null);

  const activeTab = queryTabs.find((t) => t.id === activeQueryTabIdRaw);
  const activeConnectionId =
    activeTab?.connectionId || selectedConnectionId || null;

  React.useEffect(() => {
    const prevTabId = prevActiveTabIdRef.current;
    const prevConnectionId = prevConnectionIdRef.current;

    prevActiveTabIdRef.current = activeQueryTabIdRaw;
    prevConnectionIdRef.current = activeConnectionId;

    if (activeQueryTabIdRaw !== prevTabId) {
      if (prevConnectionId && activeConnectionId !== prevConnectionId) {
        setIsPending(true);
        const timer = setTimeout(() => {
          setIsPending(false);
        }, 120);
        return () => clearTimeout(timer);
      }
      setIsPending(false);
    }
  }, [activeQueryTabIdRaw, activeConnectionId]);

  const activeTabResultsSelector = React.useCallback(
    (state: { resultsByTab: Record<string, ResultTab[]> }) =>
      activeQueryTabId ? state.resultsByTab[activeQueryTabId] : undefined,
    [activeQueryTabId],
  );
  const activeTabResults = useQueryResultsStore(activeTabResultsSelector) || [];

  const activeResultTabIdSelector = React.useCallback(
    (state: { activeResultTabIdByTab: Record<string, string | undefined> }) =>
      activeQueryTabId
        ? state.activeResultTabIdByTab[activeQueryTabId]
        : undefined,
    [activeQueryTabId],
  );
  const activeResultTabId = useQueryResultsStore(activeResultTabIdSelector);
  const effectiveActiveResultTabId =
    activeResultTabId || activeTabResults[0]?.id;

  const setActiveResultTabId = useQueryResultsStore(
    (state) => state.setActiveResultTabId,
  );
  const onRemoveResultTab = useQueryResultsStore((state) => state.removeResult);
  const clearResults = useQueryResultsStore((state) => state.clearResults);
  const updateResult = useQueryResultsStore((state) => state.updateResult);

  const [editingTabId, setEditingTabId] = React.useState<string | null>(null);
  const [editingName, setEditingName] = React.useState<string>("");
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    if (editingTabId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingTabId]);

  const handleStartRename = React.useCallback(
    (e: React.MouseEvent, tabId: string, currentName: string) => {
      e.stopPropagation();
      setEditingTabId(tabId);
      setEditingName(currentName);
    },
    [],
  );

  const handleSaveRename = React.useCallback(
    (resultTabId: string) => {
      const trimmed = editingName.trim();
      if (trimmed && activeQueryTabId) {
        updateResult(activeQueryTabId, resultTabId, { name: trimmed } as any);
      }
      setEditingTabId(null);
    },
    [editingName, activeQueryTabId, updateResult],
  );

  React.useEffect(() => {
    if (!activeResultTabId && activeTabResults.length > 0 && activeQueryTabId) {
      setActiveResultTabId(activeQueryTabId, activeTabResults[0].id);
    }
  }, [
    activeResultTabId,
    activeTabResults,
    activeQueryTabId,
    setActiveResultTabId,
  ]);

  const getSqlPreview = React.useCallback(
    (sql: string) => {
      const cleaned = sql.trim().replace(/\s+/g, " ");
      if (cleaned.length > 22) {
        return `${cleaned.substring(0, 20)}...`;
      }
      return cleaned || t("queryTabDefault");
    },
    [t],
  );

  if ((isExecuting || isPending) && activeTabResults.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center p-4 select-none">
        <div className="flex flex-col items-center gap-4 animate-in fade-in duration-200">
          <Loader2
            className="size-8 animate-spin text-muted-foreground/50"
            style={{ willChange: "transform" }}
          />
          <div className="flex flex-col items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground/70 animate-pulse">
              {isExecuting ? t("executingQuery") : t("switchingConnection")}
            </span>
            {isExecuting && onCancel && (
              <Button
                variant="outline"
                size="sm"
                className="mt-2 h-8 px-4 rounded-full border-destructive/30 text-destructive hover:text-destructive hover:bg-destructive/10 dark:hover:bg-destructive/20 cursor-pointer transition-all duration-150 active:scale-95 text-sm font-mono font-bold bg-transparent"
                onClick={onCancel}
              >
                {t("cancel")}
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (activeTabResults.length === 0) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center p-8 text-center select-none">
        <div className="relative mb-6">
          <div className="absolute -inset-6 bg-muted/50 rounded-full blur-2xl" />
          <div className="relative flex items-center justify-center size-20 bg-gradient-to-br from-muted/80 to-muted/40 rounded-3xl border border-border/60 text-muted-foreground/60 shadow-sm">
            <Terminal className="size-9" />
          </div>
        </div>
        <h3 className="text-base font-semibold text-foreground/80 mb-1">
          {t("noQueryResultsYet")}
        </h3>
        <p className="text-sm text-muted-foreground max-w-[240px] leading-relaxed">
          {t("runQueryToSeeResults")}
        </p>
      </div>
    );
  }

  return (
    <Tabs
      value={effectiveActiveResultTabId}
      onValueChange={(val) => setActiveResultTabId(activeQueryTabId || "", val)}
      className="flex h-full flex-col overflow-hidden animate-in fade-in duration-200"
    >
      <div className="flex w-full items-center justify-between border-b px-2 py-1.5 bg-muted/30 shrink-0 select-none overflow-hidden min-h-[38px] gap-2">
        <TabsList className="bg-transparent h-auto p-0 flex flex-row items-center gap-1.5 overflow-x-auto overscroll-x-contain scrollbar-none scroll-smooth flex-1 justify-start rounded-none">
          {activeTabResults.map((tab) => {
            const isError = !!tab.queryResult.error;
            const isExplain = tab.isExplainMode;

            return (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className={cn(
                  "group flex items-center gap-2 rounded-md border px-2.5 py-1 text-sm transition duration-150 cursor-pointer select-none",
                  "data-[state=active]:border-brand/15 data-[state=active]:bg-brand/5 data-[state=active]:text-brand dark:data-[state=active]:text-brand/80 data-[state=active]:font-medium data-[state=active]:shadow-xs",
                  "data-[state=inactive]:border-transparent data-[state=inactive]:text-muted-foreground hover:data-[state=inactive]:bg-muted/65 hover:data-[state=inactive]:text-foreground bg-transparent shadow-none",
                )}
                title={tab.sql}
              >
                {isError ? (
                  <AlertCircle className="size-3.5 text-rose-500 shrink-0" />
                ) : isExplain ? (
                  <Zap className="size-3.5 text-amber-500 shrink-0" />
                ) : (
                  <Terminal className="size-3.5 text-brand shrink-0" />
                )}

                {editingTabId === tab.id ? (
                  <input
                    type="text"
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleSaveRename(tab.id);
                      } else if (e.key === "Escape") {
                        setEditingTabId(null);
                      }
                    }}
                    onBlur={() => handleSaveRename(tab.id)}
                    onClick={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                    className="h-5 px-1 font-mono text-[11px] bg-background border border-indigo-500/50 rounded outline-none w-[110px] text-foreground text-center"
                    ref={inputRef}
                  />
                ) : (
                  <span
                    className="font-mono text-[11px] truncate max-w-[150px]"
                    onDoubleClick={(e) =>
                      handleStartRename(
                        e,
                        tab.id,
                        (tab as any).name || getSqlPreview(tab.sql),
                      )
                    }
                  >
                    {(tab as any).name || getSqlPreview(tab.sql)}
                  </span>
                )}

                {tab.executionTime !== null && (
                  <span className="text-[9px] opacity-60 font-sans">
                    ({tab.executionTime}ms)
                  </span>
                )}

                <span
                  role="button"
                  tabIndex={0}
                  aria-label={t("closeTab")}
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveResultTab(activeQueryTabId || "", tab.id);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      e.stopPropagation();
                      onRemoveResultTab(activeQueryTabId || "", tab.id);
                    }
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                  className="size-4 shrink-0 flex items-center justify-center rounded-md hover:bg-rose-500/15 hover:text-rose-500 text-muted-foreground/60 transition-colors cursor-pointer"
                >
                  <X className="size-2.5" />
                </span>
              </TabsTrigger>
            );
          })}
        </TabsList>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => {
            if (activeQueryTabId) {
              clearResults(activeQueryTabId);
              toast.success(t("clearedAllResults"));
            }
          }}
          className="h-7 w-7 text-muted-foreground hover:text-rose-500 rounded-md shrink-0 transition-colors cursor-pointer select-none"
          title={t("closeAllResultTabs")}
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>

      <div className="flex-1 min-h-0 relative">
        {(isExecuting || isPending) && (
          <div className="absolute inset-0 z-50 flex items-center justify-center p-4 select-none bg-background/60 backdrop-blur-[1px] animate-in fade-in duration-200">
            <div className="flex flex-col items-center gap-4">
              <Loader2
                className="size-8 animate-spin text-muted-foreground/50"
                style={{ willChange: "transform" }}
              />
              <div className="flex flex-col items-center gap-2">
                <span className="text-sm font-medium text-muted-foreground/70 animate-pulse">
                  {isExecuting ? t("executingQuery") : t("switchingConnection")}
                </span>
                {isExecuting && onCancel && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2 h-8 px-4 rounded-full border-destructive/30 text-destructive hover:text-destructive hover:bg-destructive/10 dark:hover:bg-destructive/20 cursor-pointer transition-all duration-150 active:scale-95 text-sm font-mono font-bold bg-transparent"
                    onClick={onCancel}
                  >
                    {t("cancel")}
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTabResults.map((tab) => {
          return (
            <TabsContent
              key={tab.id}
              value={tab.id}
              forceMount
              className="absolute inset-0 m-0 flex flex-col min-h-0 data-[state=inactive]:hidden focus-visible:ring-0 focus-visible:ring-offset-0 outline-none"
            >
              <QueryResultTabItem
                tab={tab}
                copyText={copyText}
                onRunWithoutLimit={onRunWithoutLimit}
                onExplainResultTab={onExplainResultTab}
                activeQueryTabId={activeQueryTabId || ""}
              />
            </TabsContent>
          );
        })}
      </div>
    </Tabs>
  );
});

const QueryResultTabItem = React.memo(function QueryResultTabItem({
  tab,
  copyText,
  onRunWithoutLimit,
  onExplainResultTab,
  activeQueryTabId,
}: {
  tab: ResultTab;
  copyText: any;
  onRunWithoutLimit: any;
  onExplainResultTab: any;
  activeQueryTabId: string;
}) {
  const onExplain = React.useMemo(() => {
    if (!onExplainResultTab || !activeQueryTabId) return undefined;
    return () => onExplainResultTab(activeQueryTabId, tab.id, tab.sql);
  }, [onExplainResultTab, activeQueryTabId, tab.id, tab.sql]);

  return (
    <QueryResultTabContent
      tab={tab}
      copyText={copyText}
      onRunWithoutLimit={onRunWithoutLimit}
      onExplain={onExplain}
    />
  );
});
