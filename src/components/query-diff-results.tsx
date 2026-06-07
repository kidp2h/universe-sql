"use client";

import * as React from "react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Coins,
  Database,
  Info,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import type { QueryDiffResult } from "@/hooks/use-query-diff";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { VisualQueryPlan } from "@/components/query/visual-query-plan";
import { QueryPerformanceProfiler } from "@/components/query/profiler/index";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Activity, Flame } from "lucide-react";

type QueryDiffResultsProps = {
  result: QueryDiffResult;
  keyCol: string;
  limit: number;
};

export function QueryDiffResults({
  result,
  keyCol,
  limit,
}: QueryDiffResultsProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = React.useState<
    "all" | "identical" | "modified" | "added" | "deleted"
  >("all");
  const [page, setPage] = React.useState(1);
  const rowsPerPage = 50;

  const {
    queryA,
    queryB,
    diffRows,
    summary,
    hasSchemaMismatch,
    commonColumns,
  } = result;

  // Filter rows based on tab
  const filteredRows = React.useMemo(() => {
    if (activeTab === "all") return diffRows;
    return diffRows.filter((r) => r.type === activeTab);
  }, [diffRows, activeTab]);

  // Reset page when tab changes
  React.useEffect(() => {
    setPage(1);
  }, [activeTab]);

  const totalPages = Math.ceil(filteredRows.length / rowsPerPage) || 1;
  const paginatedRows = React.useMemo(() => {
    const start = (page - 1) * rowsPerPage;
    return filteredRows.slice(start, start + rowsPerPage);
  }, [filteredRows, page]);

  // Formatter for values
  const formatCellValue = (val: any): string => {
    if (val === null || val === undefined) return "NULL";
    if (typeof val === "object") {
      try {
        return JSON.stringify(val);
      } catch {
        return "[Object]";
      }
    }
    return String(val);
  };

  // Helper for performance metrics difference badge
  const getDiffBadge = (valA?: number, valB?: number, isLowerBetter = true) => {
    if (valA === undefined || valB === undefined || valA === 0) {
      return <span className="text-muted-foreground italic text-xs">N/A</span>;
    }
    const diff = valB - valA;
    const percent = (diff / valA) * 100;
    const improved = isLowerBetter ? percent < 0 : percent > 0;

    if (Math.abs(percent) < 0.05) {
      return (
        <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full font-semibold border">
          0%
        </span>
      );
    }

    return (
      <span
        className={cn(
          "text-xs px-2 py-0.5 rounded-full font-semibold flex items-center gap-1 w-fit border",
          improved
            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
            : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
        )}
      >
        {improved ? (
          <TrendingUp className="size-3 text-emerald-500" />
        ) : (
          <TrendingDown className="size-3 text-rose-500" />
        )}
        {improved ? "-" : "+"}
        {Math.abs(percent).toFixed(1)}%
      </span>
    );
  };

  const isDataIdentical =
    summary.modified === 0 &&
    summary.added === 0 &&
    summary.deleted === 0 &&
    !hasSchemaMismatch;

  const totalMismatches = summary.modified + summary.deleted + summary.added;

  return (
    <div className="space-y-6">
      {/* 1. Status Banner */}
      {isDataIdentical ? (
        <div className="p-5 rounded-2xl border border-brand/20 bg-brand/5 text-brand flex items-center gap-4 animate-in fade-in duration-300">
          <div className="p-3 rounded-full bg-brand/10 border border-brand/15 flex items-center justify-center shrink-0">
            <CheckCircle2 className="size-6 text-brand/80 animate-pulse" />
          </div>
          <div>
            <h4 className="font-bold text-lg text-foreground">
              {t("optimizationValidated")}
            </h4>
            <p className="text-sm text-muted-foreground mt-0.5">
              {t("validatedSuccessDesc")}
            </p>
          </div>
        </div>
      ) : (
        <div className="p-5 rounded-2xl border border-amber-500/20 bg-amber-500/5 text-amber-500 flex flex-col sm:flex-row sm:items-center gap-4 animate-in fade-in duration-300">
          <div className="p-3 rounded-full bg-amber-500/10 border border-amber-500/15 flex items-center justify-center shrink-0 w-12 h-12">
            <AlertTriangle className="size-6 text-amber-400" />
          </div>
          <div>
            <h4 className="font-bold text-lg text-foreground">
              {t("mismatchDetected")}
            </h4>
            <p className="text-sm text-muted-foreground mt-0.5 font-medium">
              {t("mismatchCount", { count: totalMismatches })}.{" "}
              {hasSchemaMismatch && `${t("columnSchemaDiff")}! `}
              {summary.modified > 0 &&
                `${summary.modified} ${t("tabModified").toLowerCase()} `}
              {summary.deleted > 0 &&
                `${summary.deleted} ${t("tabDeleted").toLowerCase()} `}
              {summary.added > 0 &&
                `${summary.added} ${t("tabAdded").toLowerCase()} `}
            </p>
          </div>
        </div>
      )}

      {/* 2. Schema Mismatch Detailed Display */}
      {hasSchemaMismatch && (
        <div className="p-4 rounded-xl border border-dashed border-rose-500/20 bg-rose-500/5 space-y-2">
          <h5 className="text-sm font-bold text-rose-400 uppercase tracking-wider">
            {t("columnSchemaDiff")}
          </h5>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="space-y-1">
              <span className="text-muted-foreground block text-xs">
                {t("columnsQueryA")} ({queryA.columns.length})
              </span>
              <div className="flex flex-wrap gap-1">
                {queryA.columns.map((c) => (
                  <span
                    key={c}
                    className={cn(
                      "px-2 py-0.5 rounded border text-[11px]",
                      queryB.columns.includes(c)
                        ? "bg-muted/30 border-border text-muted-foreground"
                        : "bg-rose-500/10 border-rose-500/20 text-rose-400",
                    )}
                  >
                    {c}
                  </span>
                ))}
              </div>
            </div>
            <div className="space-y-1">
              <span className="text-muted-foreground block text-xs">
                {t("columnsQueryB")} ({queryB.columns.length})
              </span>
              <div className="flex flex-wrap gap-1">
                {queryB.columns.map((c) => (
                  <span
                    key={c}
                    className={cn(
                      "px-2 py-0.5 rounded border text-[11px]",
                      queryA.columns.includes(c)
                        ? "bg-muted/30 border-border text-muted-foreground"
                        : "bg-brand/10 border-brand/20 text-brand/80",
                    )}
                  >
                    {c}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Performance Metrics Unified Comparison Table */}
      <div className="border rounded-xl overflow-hidden bg-card/30">
        <table className="w-full text-sm text-left border-collapse">
          <thead>
            <tr className="bg-muted/40 border-b border-border">
              <th className="p-3 font-semibold text-muted-foreground w-1/4">
                {t("metric")}
              </th>
              <th className="p-3 font-semibold text-indigo-400 w-1/4">
                {t("tabInputA")}
              </th>
              <th className="p-3 font-semibold text-sky-400 w-1/4">
                {t("tabInputB")}
              </th>
              <th className="p-3 font-semibold text-muted-foreground w-1/4">
                {t("difference")}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {/* Cost Row */}
            <tr className="hover:bg-muted/10 transition-colors">
              <td className="p-3 font-medium text-foreground flex items-center gap-2">
                <Coins className="size-4 text-indigo-400" />
                {t("plannerTotalCost")}
              </td>
              <td className="p-3 font-mono">
                {queryA.stats?.totalCost !== undefined
                  ? queryA.stats.totalCost.toLocaleString()
                  : "N/A"}
              </td>
              <td className="p-3 font-mono font-semibold text-sky-400">
                {queryB.stats?.totalCost !== undefined
                  ? queryB.stats.totalCost.toLocaleString()
                  : "N/A"}
              </td>
              <td className="p-3">
                {getDiffBadge(
                  queryA.stats?.totalCost,
                  queryB.stats?.totalCost,
                  true,
                )}
              </td>
            </tr>
            {/* Execution Time Row */}
            <tr className="hover:bg-muted/10 transition-colors">
              <td className="p-3 font-medium text-foreground flex items-center gap-2">
                <Clock className="size-4 text-sky-400" />
                {t("trueExecutionTime")}
              </td>
              <td className="p-3 font-mono">
                {queryA.stats?.dbExecutionTime !== undefined
                  ? `${queryA.stats.dbExecutionTime.toFixed(3)} ms`
                  : "N/A"}
              </td>
              <td className="p-3 font-mono font-semibold text-sky-400">
                {queryB.stats?.dbExecutionTime !== undefined
                  ? `${queryB.stats.dbExecutionTime.toFixed(3)} ms`
                  : "N/A"}
              </td>
              <td className="p-3">
                {getDiffBadge(
                  queryA.stats?.dbExecutionTime,
                  queryB.stats?.dbExecutionTime,
                  true,
                )}
              </td>
            </tr>
            {/* Row Count Row */}
            <tr className="hover:bg-muted/10 transition-colors">
              <td className="p-3 font-medium text-foreground flex items-center gap-2">
                <Info className="size-4 text-amber-500" />
                {t("rowCount")}
              </td>
              <td className="p-3 font-mono">
                {queryA.rowCount !== undefined
                  ? queryA.rowCount.toLocaleString()
                  : "0"}
              </td>
              <td className="p-3 font-mono font-semibold text-sky-400">
                {queryB.rowCount !== undefined
                  ? queryB.rowCount.toLocaleString()
                  : "0"}
              </td>
              <td className="p-3">
                {(() => {
                  const rA = queryA.rowCount ?? 0;
                  const rB = queryB.rowCount ?? 0;
                  if (rA === rB) {
                    return (
                      <span className="text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-semibold">
                        Identical
                      </span>
                    );
                  }
                  const diff = rB - rA;
                  const percent = (diff / (rA || 1)) * 100;
                  return (
                    <span className="text-xs bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 px-2 py-0.5 rounded-full font-semibold">
                      {diff > 0 ? "+" : ""}
                      {diff} ({percent.toFixed(1)}%)
                    </span>
                  );
                })()}
              </td>
            </tr>
            {/* Shared Buffer Hits Row */}
            <tr className="hover:bg-muted/10 transition-colors">
              <td className="p-3 font-medium text-foreground flex items-center gap-2">
                <Database className="size-4 text-emerald-500" />
                {t("sharedBufferHits")}
              </td>
              <td className="p-3 font-mono">
                {queryA.stats?.sharedHitBlocks ?? 0}
              </td>
              <td className="p-3 font-mono font-semibold text-sky-400">
                {queryB.stats?.sharedHitBlocks ?? 0}
              </td>
              <td className="p-3">
                {getDiffBadge(
                  queryA.stats?.sharedHitBlocks,
                  queryB.stats?.sharedHitBlocks,
                  false,
                )}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* 4. Tab Selector Filters */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between border-b pb-1.5">
          <div className="flex gap-2">
            {(
              ["all", "identical", "modified", "added", "deleted"] as const
            ).map((tab) => {
              const labelMap: Record<string, string> = {
                all: t("tabAllRows"),
                identical: t("tabIdentical"),
                modified: t("tabModified"),
                added: t("tabAdded"),
                deleted: t("tabDeleted"),
              };

              const countMap: Record<string, number> = {
                all: diffRows.length,
                identical: summary.identical,
                modified: summary.modified,
                added: summary.added,
                deleted: summary.deleted,
              };

              const styleMap: Record<string, string> = {
                all: "hover:text-foreground border-transparent text-muted-foreground",
                identical:
                  "hover:text-brand/80 border-transparent text-muted-foreground",
                modified:
                  "hover:text-amber-400 border-transparent text-muted-foreground",
                added:
                  "hover:text-green-400 border-transparent text-muted-foreground",
                deleted:
                  "hover:text-rose-400 border-transparent text-muted-foreground",
              };

              const activeStyleMap: Record<string, string> = {
                all: "text-foreground border-indigo-500 font-bold",
                identical: "text-brand/80 border-brand font-bold",
                modified: "text-amber-400 border-amber-500 font-bold",
                added: "text-emerald-500 border-emerald-500 font-bold",
                deleted: "text-rose-400 border-rose-500 font-bold",
              };

              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    "text-sm px-3 py-1.5 border-b-2 font-medium transition-all flex items-center gap-1.5 focus:outline-none cursor-pointer",
                    activeTab === tab ? activeStyleMap[tab] : styleMap[tab],
                  )}
                >
                  {labelMap[tab]}
                  <span className="text-xs px-1.5 py-0.2 rounded-full bg-muted border">
                    {countMap[tab]}
                  </span>
                </button>
              );
            })}
          </div>
          <span className="text-sm text-muted-foreground flex items-center gap-1">
            <Info className="size-3.5" />
            {t("showingUpTo", { limit })}
          </span>
        </div>

        {/* 5. Diff Table */}
        {filteredRows.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 border border-dashed rounded-2xl text-center bg-muted/5">
            <CheckCircle2 className="size-10 text-muted-foreground opacity-30 mb-2" />
            <p className="text-sm font-medium text-muted-foreground">
              {t("noRowsFilter")}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="border rounded-2xl overflow-x-auto max-h-[500px] overflow-y-auto bg-card/25 backdrop-blur-md">
              <table className="w-full text-sm text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="bg-muted/40 border-b border-border sticky top-0 backdrop-blur-md z-10">
                    <th className="p-3 font-semibold text-muted-foreground w-14 text-center">
                      {t("rowHeader")}
                    </th>
                    <th className="p-3 font-semibold text-muted-foreground w-28 text-center">
                      {t("statusHeader")}
                    </th>
                    {keyCol && commonColumns.includes(keyCol) && (
                      <th className="p-3 font-semibold text-indigo-400">
                        {t("keyHeader")} {keyCol}
                      </th>
                    )}
                    {commonColumns
                      .filter((col) => col !== keyCol)
                      .map((col) => (
                        <th
                          key={col}
                          className="p-3 font-semibold text-muted-foreground"
                        >
                          {col}
                        </th>
                      ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {paginatedRows.map((diffRow, idx) => {
                    const rowNum = (page - 1) * rowsPerPage + idx + 1;

                    // Row colors
                    let rowBgClass = "";
                    let statusLabel = "";
                    let statusBadgeClass = "";

                    if (diffRow.type === "identical") {
                      rowBgClass = "hover:bg-muted/20 text-muted-foreground";
                      statusLabel = `✓ ${t("statusIdentical")}`;
                      statusBadgeClass = "bg-muted text-muted-foreground";
                    } else if (diffRow.type === "added") {
                      rowBgClass =
                        "bg-emerald-500/5 dark:bg-emerald-500/10 hover:bg-emerald-500/10 dark:hover:bg-emerald-500/15 text-emerald-800 dark:text-emerald-300";
                      statusLabel = `+ ${t("statusAdded")}`;
                      statusBadgeClass =
                        "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20";
                    } else if (diffRow.type === "deleted") {
                      rowBgClass =
                        "bg-rose-500/5 dark:bg-rose-500/10 hover:bg-rose-500/10 dark:hover:bg-rose-500/15 text-rose-800 dark:text-rose-300/80 line-through opacity-85";
                      statusLabel = `- ${t("statusMissing")}`;
                      statusBadgeClass =
                        "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/20";
                    } else if (diffRow.type === "modified") {
                      rowBgClass =
                        "bg-amber-500/5 dark:bg-amber-500/10 hover:bg-amber-500/10 dark:hover:bg-amber-500/15 text-amber-800 dark:text-amber-200";
                      statusLabel = `~ ${t("statusModified")}`;
                      statusBadgeClass =
                        "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20";
                    }

                    const activeRow = diffRow.rowB ?? diffRow.rowA ?? {};

                    return (
                      <tr
                        key={idx}
                        className={cn("transition-colors", rowBgClass)}
                      >
                        <td
                          className={cn(
                            "p-3 text-center text-muted-foreground/60 select-none border-l-2",
                            diffRow.type === "added"
                              ? "border-l-emerald-500"
                              : diffRow.type === "deleted"
                                ? "border-l-rose-500"
                                : diffRow.type === "modified"
                                  ? "border-l-amber-500"
                                  : "border-l-transparent",
                          )}
                        >
                          {rowNum}
                        </td>
                        <td className="p-3 text-center select-none">
                          <span
                            className={cn(
                              "px-2 py-0.5 rounded-full text-xs font-bold tracking-wide whitespace-nowrap inline-flex items-center justify-center gap-1.5",
                              statusBadgeClass,
                            )}
                          >
                            {statusLabel}
                          </span>
                        </td>
                        {keyCol && commonColumns.includes(keyCol) && (
                          <td className="p-3  font-bold text-indigo-400">
                            {formatCellValue(diffRow.keyVal)}
                          </td>
                        )}
                        {commonColumns
                          .filter((col) => col !== keyCol)
                          .map((col) => {
                            const isModifiedCell =
                              diffRow.type === "modified" &&
                              diffRow.diffFields?.includes(col);

                            if (isModifiedCell) {
                              const valA = diffRow.rowA?.[col];
                              const valB = diffRow.rowB?.[col];

                              return (
                                <td
                                  key={col}
                                  className="p-3 bg-amber-500/10 transition-colors"
                                >
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="text-rose-400  bg-rose-500/10 px-1 rounded line-through">
                                      {formatCellValue(valA)}
                                    </span>
                                    <ArrowRight className="size-3 text-amber-400 shrink-0" />
                                    <span className="text-brand/80  bg-brand/10 px-1 rounded font-bold">
                                      {formatCellValue(valB)}
                                    </span>
                                  </div>
                                </td>
                              );
                            }

                            // Added row displays Query B data, deleted row displays Query A data
                            const displayVal = activeRow[col];
                            return (
                              <td key={col} className="p-3 ">
                                {formatCellValue(displayVal)}
                              </td>
                            );
                          })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between p-1">
                <span className="text-sm text-muted-foreground">
                  {t("showingRows", {
                    start: (page - 1) * rowsPerPage + 1,
                    end: Math.min(page * rowsPerPage, filteredRows.length),
                    total: filteredRows.length,
                  })}
                </span>
                <div className="flex gap-2">
                  <button
                    disabled={page === 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="px-2.5 py-1 rounded bg-muted hover:bg-muted/80 text-sm font-medium border disabled:opacity-40"
                  >
                    {t("previous")}
                  </button>
                  <span className="text-sm  self-center px-2">
                    {t("pageOf", { page, total: totalPages })}
                  </span>
                  <button
                    disabled={page === totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="px-2.5 py-1 rounded bg-muted hover:bg-muted/80 text-sm font-medium border disabled:opacity-40"
                  >
                    {t("next")}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 6. Query Execution Plans & Profiler Graphs */}
      {(queryA.plan || queryB.plan) && (
        <div className="p-5 rounded-xl border bg-card/50 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-1 border-b">
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground/80 flex items-center gap-1.5 select-none">
              <Activity className="size-4 text-indigo-500" />
              {t("queryPlansAndPerformanceProfiles", {
                defaultValue: "Query Execution Plans & Performance Profiler",
              })}
            </h3>
          </div>

          <Tabs defaultValue="queryA" className="w-full space-y-4">
            <TabsList className="bg-muted/40 border p-1 rounded-lg">
              <TabsTrigger
                value="queryA"
                className="rounded-md px-4 py-1.5 text-xs font-semibold data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all"
              >
                {t("tabInputA")}
              </TabsTrigger>
              <TabsTrigger
                value="queryB"
                className="rounded-md px-4 py-1.5 text-xs font-semibold data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all"
              >
                {t("tabInputB")}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="queryA" className="mt-0 outline-none">
              {queryA.plan ? (
                <PlanVisualizer plan={queryA.plan} />
              ) : (
                <div className="py-12 text-center text-sm text-muted-foreground italic border border-dashed rounded-2xl bg-muted/5">
                  No explain plan available for Query A.
                </div>
              )}
            </TabsContent>

            <TabsContent value="queryB" className="mt-0 outline-none">
              {queryB.plan ? (
                <PlanVisualizer plan={queryB.plan} />
              ) : (
                <div className="py-12 text-center text-sm text-muted-foreground italic border border-dashed rounded-2xl bg-muted/5">
                  No explain plan available for Query B.
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
}

function PlanVisualizer({ plan }: { plan: any }) {
  const [activeView, setActiveView] = React.useState<"visual" | "flame">(
    "visual",
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <div className="flex rounded-lg bg-muted/30 p-1 border gap-1 select-none">
          <button
            onClick={() => setActiveView("visual")}
            className={cn(
              "px-3 py-1.5 rounded-md text-xs font-bold tracking-tight uppercase transition flex items-center gap-1.5 cursor-pointer",
              activeView === "visual"
                ? "bg-background text-foreground shadow-sm border border-border/20"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Activity className="size-3 text-indigo-500" />
            Visual Plan Graph
          </button>
          <button
            onClick={() => setActiveView("flame")}
            className={cn(
              "px-3 py-1.5 rounded-md text-xs font-bold tracking-tight uppercase transition flex items-center gap-1.5 cursor-pointer",
              activeView === "flame"
                ? "bg-background text-foreground shadow-sm border border-border/20"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Flame className="size-3 text-red-500" />
            Flame Graph / Timeline
          </button>
        </div>
      </div>

      <div className="h-[450px] w-full border rounded-2xl overflow-hidden bg-background relative">
        {activeView === "visual" ? (
          <VisualQueryPlan plan={plan} />
        ) : (
          <QueryPerformanceProfiler plan={plan} />
        )}
      </div>
    </div>
  );
}
