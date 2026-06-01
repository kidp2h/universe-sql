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

  // Helper for performance metrics percent
  const renderMetricDiff = (
    valA?: number,
    valB?: number,
    isLowerBetter = true,
  ) => {
    if (valA === undefined || valB === undefined || valA === 0) return null;
    const diff = valB - valA;
    const percent = (diff / valA) * 100;
    const improved = isLowerBetter ? percent < 0 : percent > 0;

    if (Math.abs(percent) < 0.05) {
      return (
        <span className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded  font-semibold">
          0%
        </span>
      );
    }

    return (
      <span
        className={cn(
          "text-xs px-1.5 py-0.5 rounded  font-semibold flex items-center gap-0.5",
          improved
            ? "bg-brand/10 text-brand/80 border border-brand/15"
            : "bg-rose-500/10 text-rose-400 border border-rose-500/15",
        )}
      >
        {improved ? (
          <TrendingUp className="size-3" />
        ) : (
          <TrendingDown className="size-3" />
        )}
        {Math.abs(percent).toFixed(1)}% {improved ? t("better") : t("worse")}
      </span>
    );
  };

  const isDataIdentical =
    summary.modified === 0 &&
    summary.added === 0 &&
    summary.deleted === 0 &&
    !hasSchemaMismatch;

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
            <p className="text-sm text-muted-foreground mt-0.5">
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
          <h5 className="text-sm font-bold text-rose-400 uppercase tracking-wider ">
            {t("columnSchemaDiff")}
          </h5>
          <div className="grid grid-cols-2 gap-4 text-sm ">
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

      {/* 3. Performance Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Cost Compare */}
        <div className="p-4 rounded-2xl border border-border bg-card/40 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-muted-foreground uppercase  flex items-center gap-1.5">
              <Coins className="size-3.5 text-indigo-400" />
              {t("plannerTotalCost")}
            </span>
            {renderMetricDiff(queryA.stats?.totalCost, queryB.stats?.totalCost)}
          </div>
          <div className="mt-2 space-y-1.5">
            <div className="flex justify-between items-baseline">
              <span className="text-sm text-muted-foreground">
                Original (A):
              </span>
              <span className="text-sm  font-semibold text-foreground">
                {queryA.stats?.totalCost
                  ? queryA.stats.totalCost.toLocaleString()
                  : "N/A"}
              </span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-sm text-muted-foreground">
                Optimized (B):
              </span>
              <span className="text-sm  font-bold text-indigo-400">
                {queryB.stats?.totalCost
                  ? queryB.stats.totalCost.toLocaleString()
                  : "N/A"}
              </span>
            </div>
          </div>
        </div>

        {/* Execution Time Compare */}
        <div className="p-4 rounded-2xl border border-border bg-card/40 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-muted-foreground uppercase  flex items-center gap-1.5">
              <Clock className="size-3.5 text-sky-400" />
              {t("trueExecutionTime")}
            </span>
            {renderMetricDiff(
              queryA.stats?.dbExecutionTime,
              queryB.stats?.dbExecutionTime,
            )}
          </div>
          <div className="mt-2 space-y-1.5">
            <div className="flex justify-between items-baseline">
              <span className="text-sm text-muted-foreground">
                Original (A):
              </span>
              <span className="text-sm  font-semibold text-foreground">
                {queryA.stats?.dbExecutionTime
                  ? `${queryA.stats.dbExecutionTime.toFixed(3)} ms`
                  : "N/A"}
              </span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-sm text-muted-foreground">
                Optimized (B):
              </span>
              <span className="text-sm  font-bold text-sky-400">
                {queryB.stats?.dbExecutionTime
                  ? `${queryB.stats.dbExecutionTime.toFixed(3)} ms`
                  : "N/A"}
              </span>
            </div>
          </div>
        </div>

        {/* IO Cache hits */}
        <div className="p-4 rounded-2xl border border-border bg-card/40 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-muted-foreground uppercase  flex items-center gap-1.5">
              <Database className="size-3.5 text-brand/80" />
              {t("sharedBufferHits")}
            </span>
            {renderMetricDiff(
              queryA.stats?.sharedHitBlocks,
              queryB.stats?.sharedHitBlocks,
              false,
            )}
          </div>
          <div className="mt-2 space-y-1.5">
            <div className="flex justify-between items-baseline">
              <span className="text-sm text-muted-foreground">
                Original (A):
              </span>
              <span className="text-sm  font-semibold text-foreground">
                {queryA.stats?.sharedHitBlocks ?? 0} {t("hits")}
              </span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-sm text-muted-foreground">
                Optimized (B):
              </span>
              <span className="text-sm  font-bold text-brand/80">
                {queryB.stats?.sharedHitBlocks ?? 0} {t("hits")}
              </span>
            </div>
          </div>
        </div>
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
                added: "text-green-400 border-green-500 font-bold",
                deleted: "text-rose-400 border-rose-500 font-bold",
              };

              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    "text-sm px-3 py-1.5 border-b-2 font-medium transition-all flex items-center gap-1.5 focus:outline-none",
                    activeTab === tab ? activeStyleMap[tab] : styleMap[tab],
                  )}
                >
                  {labelMap[tab]}
                  <span className="text-xs px-1.5 py-0.2 rounded-full bg-muted border ">
                    {countMap[tab]}
                  </span>
                </button>
              );
            })}
          </div>
          <span className="text-sm text-muted-foreground  flex items-center gap-1">
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
                      <th className="p-3 font-semibold text-indigo-400 ">
                        {t("keyHeader")} {keyCol}
                      </th>
                    )}
                    {commonColumns
                      .filter((col) => col !== keyCol)
                      .map((col) => (
                        <th
                          key={col}
                          className="p-3 font-semibold text-muted-foreground "
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
                        "bg-brand/5 hover:bg-brand/10 text-brand/70/90";
                      statusLabel = `+ ${t("statusAdded")}`;
                      statusBadgeClass =
                        "bg-brand/15 text-brand/80 border border-brand/20";
                    } else if (diffRow.type === "deleted") {
                      rowBgClass =
                        "bg-rose-500/5 hover:bg-rose-500/10 text-rose-300/90 line-through opacity-85";
                      statusLabel = `- ${t("statusMissing")}`;
                      statusBadgeClass =
                        "bg-rose-500/15 text-rose-400 border border-rose-500/20";
                    } else if (diffRow.type === "modified") {
                      rowBgClass =
                        "bg-amber-500/5 hover:bg-amber-500/10 text-foreground";
                      statusLabel = `~ ${t("statusModified")}`;
                      statusBadgeClass =
                        "bg-amber-500/15 text-amber-400 border border-amber-500/20";
                    }

                    const activeRow = diffRow.rowB ?? diffRow.rowA ?? {};

                    return (
                      <tr
                        key={idx}
                        className={cn("transition-colors", rowBgClass)}
                      >
                        <td className="p-3 text-center text-muted-foreground/60  select-none">
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
    </div>
  );
}
