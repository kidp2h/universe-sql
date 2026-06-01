"use client";

import * as React from "react";
import type { CalculatedPlanNode } from "./profiler-math";
import { formatTiming } from "./profiler-math";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import {
  Clock,
  Database,
  Sparkles,
  AlertTriangle,
  Info,
  TrendingDown,
  Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";

export function NodeDetailsSheet({
  node,
  open,
  onOpenChange,
}: {
  node: CalculatedPlanNode | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!node) return null;

  // Percentage calculations
  const pctIncl = node.percentageInclusive;
  const pctExcl = node.percentageExclusive;

  // Smart DBA Tuning Recommendations
  const dbaAdvice = React.useMemo(() => {
    const advice: string[] = [];
    const actualRows = node.rows;
    const planRows = node.planRows;
    const elapsed = node.inclusiveTime;

    // 1. Inaccurate Query Optimizer Statistics check
    if (actualRows > 0 && planRows > 0) {
      const ratio = Math.max(actualRows / planRows, planRows / actualRows);
      if (ratio > 10 && elapsed > 5) {
        advice.push(
          `The Postgres optimizer made highly inaccurate row estimation (ratio: ${ratio.toFixed(0)}x). Actual rows: ${actualRows.toLocaleString()} vs Plan rows: ${planRows.toLocaleString()}. Run "ANALYZE ${node.relationName || "table"}" to refresh catalog statistics.`,
        );
      }
    }

    // 2. Sequential Scans check on heavy tables
    if (node.nodeType.includes("Seq Scan") && elapsed > 15) {
      advice.push(
        `Sequential scans on table "${node.relationName}" read every single block from disk. Consider adding a dedicated INDEX on columns filtered in: "${node.filter || "WHERE clauses"}" to avoid scanning the entire relation.`,
      );
    }

    // 3. Memory Sort block check
    if (node.nodeType.includes("Sort") && node.startupTime > 15) {
      advice.push(
        `Memory sort operation caused a substantial startup delay (${formatTiming(node.startupTime)}). Consider setting up an INDEX on the sort columns so Postgres can read rows already sorted without CPU sorting overhead.`,
      );
    }

    // 4. Heavy CPU Filter Overhead check
    if (node.filter && pctExcl > 15) {
      advice.push(
        `CPU spent considerable time filtering rows after fetching them (Exclusive overhead: ${pctExcl.toFixed(0)}%). Creating an index specifically targeting this filter condition: "${node.filter}" will prune scanned tuples early in the execution engine.`,
      );
    }

    // 5. Nested Loop Join checking
    if (node.nodeType.includes("Nested Loop") && elapsed > 50) {
      advice.push(
        `Nested Loop join is executing child loops repeatedly (${node.loops} loops). If the inner scan is a Sequential Scan, this degrades exponentially. Ensure the inner join key has an index.`,
      );
    }

    return advice;
  }, [node, pctExcl]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="app-region-no-drag w-[480px] sm:max-w-[480px] overflow-y-auto flex flex-col p-6 border-l border-border bg-background/95 backdrop-blur-md">
        <SheetHeader className="pb-4 border-b select-none">
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={cn(
                "px-2 py-0.5 text-[9px] font-bold font-mono tracking-tight uppercase",
                pctExcl > 30
                  ? "bg-red-500/10 text-red-500 border-red-500/20"
                  : pctExcl > 10
                    ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
                    : "bg-indigo-500/10 text-indigo-500 border-indigo-500/20",
              )}
            >
              {node.nodeType}
            </Badge>
            {node.relationName && (
              <span className="text-xs text-muted-foreground font-mono truncate">
                on {node.relationName}
              </span>
            )}
          </div>
          <SheetTitle className="text-lg font-bold tracking-tight mt-1 select-none">
            {node.nodeType} Profile
          </SheetTitle>
          <SheetDescription className="text-sm text-muted-foreground select-none">
            Detailed performance breakdown, timing metrics, and optimization
            advice.
          </SheetDescription>
        </SheetHeader>

        {/* Details & Metrics scroll block */}
        <div className="flex-1 py-4 space-y-5">
          {/* Section 1: Connection Metadata (if scanner node) */}
          {(node.relationName || node.indexName || node.alias) && (
            <div className="space-y-2 select-none">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1 select-none">
                <Database className="size-3 text-indigo-500" />
                Relation Context
              </h4>
              <div className="grid grid-cols-2 gap-2 border rounded-xl p-3 bg-muted/10 text-sm">
                {node.relationName && (
                  <div className="flex flex-col">
                    <span className="text-[9px] text-muted-foreground">
                      Relation Name
                    </span>
                    <span className="font-bold truncate">
                      {node.relationName}
                    </span>
                  </div>
                )}
                {node.alias && node.alias !== node.relationName && (
                  <div className="flex flex-col">
                    <span className="text-[9px] text-muted-foreground">
                      Table Alias
                    </span>
                    <span className="font-bold truncate">{node.alias}</span>
                  </div>
                )}
                {node.indexName && (
                  <div className="flex flex-col col-span-2 mt-2 pt-2 border-t">
                    <span className="text-[9px] text-muted-foreground">
                      Index Utilized
                    </span>
                    <span className="font-mono text-xs font-bold text-indigo-500 dark:text-indigo-400 truncate">
                      {node.indexName}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Section 2: Timing Stats Card */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1 select-none">
              <Clock className="size-3 text-indigo-500" />
              Timing Analysis
            </h4>
            <div className="border rounded-xl p-4 bg-muted/10 space-y-3.5 shadow-sm text-sm">
              <div className="grid grid-cols-2 gap-3.5">
                <div className="flex flex-col">
                  <span className="text-[9px] text-muted-foreground select-none">
                    Inclusive Time (Total)
                  </span>
                  <span className="text-sm font-bold font-mono text-foreground mt-0.5">
                    {formatTiming(node.inclusiveTime)}
                  </span>
                  <span className="text-[9px] text-muted-foreground select-none opacity-80 mt-0.5">
                    {pctIncl.toFixed(1)}% of total query
                  </span>
                </div>
                <div className="flex flex-col border-l pl-3">
                  <span className="text-[9px] text-muted-foreground select-none">
                    Exclusive Time (Self)
                  </span>
                  <span
                    className={cn(
                      "text-sm font-bold font-mono mt-0.5",
                      pctExcl > 30
                        ? "text-red-500"
                        : pctExcl > 10
                          ? "text-amber-500"
                          : "text-foreground",
                    )}
                  >
                    {formatTiming(node.exclusiveTime)}
                  </span>
                  <span className="text-[9px] text-muted-foreground select-none opacity-80 mt-0.5">
                    {pctExcl.toFixed(1)}% spent in node
                  </span>
                </div>
              </div>

              {/* Startup vs total timeline preview */}
              <div className="pt-2.5 border-t space-y-2 select-none">
                <div className="flex items-center justify-between text-xs text-muted-foreground font-mono">
                  <span>Startup: {formatTiming(node.startupTime)}</span>
                  <span>Total: {formatTiming(node.totalTime)}</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden flex">
                  {node.totalTime > 0 && (
                    <>
                      <div
                        className="h-full bg-indigo-500/10 border-r border-dashed border-indigo-500/30"
                        style={{
                          width: `${(node.startupTime / node.totalTime) * 100}%`,
                        }}
                      />
                      <div
                        className="h-full bg-indigo-500/40"
                        style={{
                          width: `${((node.totalTime - node.startupTime) / node.totalTime) * 100}%`,
                        }}
                      />
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Row Counts & Loops */}
          <div className="space-y-2 select-none">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1 select-none">
              <Layers className="size-3 text-indigo-500" />
              Row Counts & Loops
            </h4>
            <div className="border rounded-xl p-3 bg-muted/10 grid grid-cols-3 gap-2 text-center text-sm">
              <div className="flex flex-col">
                <span className="text-[9px] text-muted-foreground">
                  Actual Rows
                </span>
                <span className="font-bold text-foreground font-mono mt-0.5">
                  {node.rows.toLocaleString()}
                </span>
              </div>
              <div className="flex flex-col border-x px-2">
                <span className="text-[9px] text-muted-foreground">
                  Plan Rows
                </span>
                <span className="font-bold text-foreground font-mono mt-0.5">
                  {node.planRows.toLocaleString()}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-[9px] text-muted-foreground">
                  Loops Run
                </span>
                <span className="font-bold text-foreground font-mono mt-0.5">
                  {node.loops.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Section 4: Node execution Criteria (Conditions, Conds, Filters) */}
          {(node.filter ||
            node.indexCond ||
            node.hashCond ||
            node.joinFilter) && (
            <div className="space-y-2 select-none">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1 select-none">
                <TrendingDown className="size-3 text-indigo-500" />
                Execution Criteria
              </h4>
              <div className="border rounded-xl p-3 bg-muted/10 space-y-3 font-mono text-xs leading-relaxed overflow-x-auto whitespace-pre-wrap max-h-48 scrollbar-thin">
                {node.indexCond && (
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[9px] text-indigo-500 font-bold select-none uppercase tracking-wide font-sans">
                      Index Condition
                    </span>
                    <span className="bg-background/60 p-2 rounded-lg border text-foreground/90 font-semibold">
                      {node.indexCond}
                    </span>
                  </div>
                )}
                {node.hashCond && (
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[9px] text-indigo-500 font-bold select-none uppercase tracking-wide font-sans">
                      Hash Condition
                    </span>
                    <span className="bg-background/60 p-2 rounded-lg border text-foreground/90 font-semibold">
                      {node.hashCond}
                    </span>
                  </div>
                )}
                {node.joinFilter && (
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[9px] text-indigo-500 font-bold select-none uppercase tracking-wide font-sans">
                      Join Filter
                    </span>
                    <span className="bg-background/60 p-2 rounded-lg border text-foreground/90 font-semibold">
                      {node.joinFilter}
                    </span>
                  </div>
                )}
                {node.filter && (
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[9px] text-red-500 font-bold select-none uppercase tracking-wide font-sans">
                      Scan Filter
                    </span>
                    <span className="bg-background/60 p-2 rounded-lg border text-foreground/90 font-semibold">
                      {node.filter}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Section 5: DBA Tuning Suggestions */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1 select-none">
              <Sparkles className="size-3 text-indigo-500" />
              DBA Advisor Gợi Ý Tối Ưu
            </h4>
            {dbaAdvice.length === 0 ? (
              <div className="p-3.5 rounded-xl border border-brand/10 bg-brand/5 text-brand dark:text-brand/80 flex items-center gap-2.5 text-sm font-semibold select-none">
                <Info className="size-4 shrink-0" />
                This node is executing optimally. No tuning adjustments
                recommended.
              </div>
            ) : (
              <div className="space-y-2">
                {dbaAdvice.map((advice, i) => (
                  <div
                    key={i}
                    className="p-3.5 rounded-xl border border-amber-500/10 bg-amber-500/5 text-amber-700 dark:text-amber-300 flex items-start gap-2.5 text-sm font-semibold leading-relaxed"
                  >
                    <AlertTriangle className="size-4 text-amber-500 shrink-0 mt-0.5" />
                    <p className="flex-1">{advice}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
