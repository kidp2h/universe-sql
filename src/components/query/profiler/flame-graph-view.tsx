"use client";

import type { CalculatedPlanNode } from "./profiler-math";
import { formatTiming } from "./profiler-math";
import { cn } from "@/lib/utils";
import { Info, Flame } from "lucide-react";

export function FlameGraphNode({
  node,
  onSelect,
  selectedId,
  parentInclusive = 100,
}: {
  node: CalculatedPlanNode;
  onSelect: (node: CalculatedPlanNode) => void;
  selectedId: string | null;
  parentInclusive?: number;
}) {
  const isSelected = selectedId === node.id;
  const pctExcl = node.percentageExclusive;
  const pctIncl = node.percentageInclusive;

  // Determine hot/cool color based on Exclusive Time Percentage
  let heatBg =
    "bg-muted/10 border-border/40 hover:bg-muted/20 text-muted-foreground/90";
  if (pctExcl > 30) {
    heatBg =
      "bg-red-500/15 border-red-500/50 hover:bg-red-500/25 text-red-600 dark:text-red-200 shadow-[0_0_15px_rgba(239,68,68,0.15)]";
  } else if (pctExcl > 10) {
    heatBg =
      "bg-amber-500/15 border-amber-500/50 hover:bg-amber-500/25 text-amber-600 dark:text-amber-200 shadow-[0_0_15px_rgba(245,158,11,0.1)]";
  } else if (pctExcl > 3) {
    heatBg =
      "bg-indigo-500/10 border-indigo-500/30 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-300";
  }

  // Calculate width relative to the parent's width (so that children align perfectly horizontal)
  // Standard Postgres child inclusive times might slightly exceed or be less than parent, we bound it
  const relativeWidth =
    parentInclusive > 0 ? (pctIncl / parentInclusive) * 100 : 100;
  const widthPct = Math.min(100, Math.max(0.5, relativeWidth));

  // Skip rendering extremely tiny blocks to prevent DOM bloat (e.g. < 0.2%)
  if (pctIncl < 0.1) return null;

  return (
    <div className="flex flex-col min-w-max" style={{ width: `${widthPct}%` }}>
      {/* Node Button */}
      <div
        onClick={() => onSelect(node)}
        className={cn(
          "h-10 px-2 py-1 rounded-lg border text-left cursor-pointer flex flex-col justify-center min-w-[120px] w-full transition-all duration-200 select-none",
          heatBg,
          isSelected
            ? "ring-2 ring-indigo-500 border-indigo-500 !bg-indigo-500/20 !text-indigo-600 dark:!text-indigo-100"
            : "",
        )}
      >
        <div className="font-extrabold text-xs truncate leading-tight select-none">
          {node.nodeType}
        </div>
        <div className="text-[8px] font-mono font-bold truncate leading-none opacity-80 flex items-center justify-between mt-0.5">
          <span>{formatTiming(node.inclusiveTime)}</span>
          <span>{pctExcl.toFixed(0)}% excl</span>
        </div>
      </div>

      {/* Children elements container */}
      {node.plans && node.plans.length > 0 && (
        <div className="flex w-full items-start justify-start gap-1 mt-1 shrink-0">
          {node.plans.map((child) => (
            <FlameGraphNode
              key={child.id}
              node={child}
              onSelect={onSelect}
              selectedId={selectedId}
              parentInclusive={pctIncl}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function FlameGraphView({
  rootNode,
  onSelect,
  selectedId,
}: {
  rootNode: CalculatedPlanNode | null;
  onSelect: (node: CalculatedPlanNode) => void;
  selectedId: string | null;
}) {
  if (!rootNode) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-muted-foreground select-none">
        No performance metrics tree available.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Visual Guide Header */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground select-none border-b pb-3 bg-muted/5 rounded-xl px-4 py-2.5">
        <span className="font-bold flex items-center gap-1">
          <Info className="size-3 text-indigo-500" />
          Flame Graph Guide:
        </span>
        <span className="flex items-center gap-1">
          <span className="size-2 rounded bg-muted/20 border border-border/40" />
          Cool (&lt;3% excl time)
        </span>
        <span className="flex items-center gap-1">
          <span className="size-2 rounded bg-indigo-500/20 border border-indigo-500/40" />
          Mild (3% - 10% excl time)
        </span>
        <span className="flex items-center gap-1">
          <span className="size-2 rounded bg-amber-500/20 border border-amber-500/40" />
          Warm (10% - 30% excl time)
        </span>
        <span className="flex items-center gap-1">
          <span className="size-2 rounded bg-red-500/20 border border-red-500/40 animate-pulse" />
          Hot (&gt;30% excl time)
        </span>
      </div>

      {/* Main Canvas Scrollable Wrapper */}
      <div className="w-full overflow-x-auto p-4 border rounded-2xl bg-muted/5 min-h-[320px] scrollbar-thin">
        <div className="w-max min-w-full flex flex-col gap-1">
          <FlameGraphNode
            node={rootNode}
            onSelect={onSelect}
            selectedId={selectedId}
            parentInclusive={rootNode.percentageInclusive}
          />
        </div>
      </div>

      <div className="text-xs text-muted-foreground flex items-center gap-1 select-none pl-1">
        <Flame className="size-3 text-red-500" />
        Horizontal width indicates total timing including child plans. Hot
        colors represent high execution time spent inside the operation itself.
      </div>
    </div>
  );
}
