"use client";

import * as React from "react";
import type { CalculatedPlanNode } from "./profiler-math";
import { formatTiming } from "./profiler-math";
import { cn } from "@/lib/utils";
import { Clock, Info, ArrowRight } from "lucide-react";

interface FlattenedNode {
  node: CalculatedPlanNode;
  depth: number;
}

function flattenTree(node: CalculatedPlanNode, depth = 0): FlattenedNode[] {
  const result: FlattenedNode[] = [{ node, depth }];
  if (node.plans) {
    for (const child of node.plans) {
      result.push(...flattenTree(child, depth + 1));
    }
  }
  return result;
}

export function GanttTimelineView({
  rootNode,
  onSelect,
  selectedId,
}: {
  rootNode: CalculatedPlanNode | null;
  onSelect: (node: CalculatedPlanNode) => void;
  selectedId: string | null;
}) {
  const flatNodes = React.useMemo(() => {
    if (!rootNode) return [];
    return flattenTree(rootNode);
  }, [rootNode]);

  if (!rootNode || flatNodes.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-muted-foreground select-none">
        No query timeline metrics available.
      </div>
    );
  }

  // Maximum time scale is defined by the root total timing
  const maxTime = rootNode.totalTime || 1;

  return (
    <div className="flex flex-col gap-4">
      {/* Informative Header Guide */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground select-none border-b pb-3 bg-muted/5 rounded-xl px-4 py-2.5">
        <span className="font-bold flex items-center gap-1">
          <Info className="size-3 text-indigo-500" />
          Timeline Guide:
        </span>
        <span className="flex items-center gap-1">
          <span className="w-4 h-2 border border-dashed border-indigo-500/50 bg-indigo-500/5" />
          Startup Overhead (Waiting for first row / Blocking phase)
        </span>
        <span className="flex items-center gap-1">
          <span className="w-4 h-2 rounded bg-indigo-500/30" />
          Active Output Stream (Returning rows)
        </span>
      </div>

      {/* Gantt Timeline Table Container */}
      <div className="border rounded-2xl bg-muted/5 overflow-x-auto scrollbar-thin">
        <div className="min-w-[800px] flex flex-col p-4 gap-1.5 font-sans">
          {/* Timeline Time Axis Scale */}
          <div className="flex items-center text-[9px] font-mono text-muted-foreground select-none border-b pb-1 mb-1">
            {/* Label column placeholder */}
            <div className="w-[300px] shrink-0 font-bold uppercase tracking-wider pl-1">
              Operation Tree
            </div>
            {/* Timeline scale tick marks */}
            <div className="flex-1 flex justify-between relative h-4 font-bold">
              <span>0ms</span>
              <span>{(maxTime * 0.25).toFixed(1)}ms</span>
              <span>{(maxTime * 0.5).toFixed(1)}ms</span>
              <span>{(maxTime * 0.75).toFixed(1)}ms</span>
              <span>{maxTime.toFixed(1)}ms</span>
              {/* Vertical grids under ticks */}
              <div className="absolute inset-x-0 bottom-0 border-b border-border/20" />
            </div>
          </div>

          {/* Render Timeline Bars for flattened nodes */}
          <div className="space-y-1.5">
            {flatNodes.map(({ node, depth }) => {
              const isSelected = selectedId === node.id;

              // Timing calculations
              const startup = node.startupTime;
              const total = node.totalTime;

              // Percentages relative to maximum query timeline scale
              const offsetPct = Math.min(
                99,
                Math.max(0, (startup / maxTime) * 100),
              );
              const activeWidthPct = Math.min(
                100 - offsetPct,
                Math.max(0.5, ((total - startup) / maxTime) * 100),
              );

              // Check if node has large startup delay (indicating a blocking node like Sort, Hash)
              const isBlocking = startup > 0 && startup / total > 0.4;

              return (
                <div
                  key={node.id}
                  onClick={() => onSelect(node)}
                  className={cn(
                    "flex items-center h-8 rounded-lg cursor-pointer transition-all duration-200 border border-transparent pr-2 select-none",
                    isSelected
                      ? "bg-indigo-500/10 border-indigo-500/30 shadow-sm"
                      : "hover:bg-muted/40",
                  )}
                >
                  {/* Left Operation Name Label (indented by tree depth) */}
                  <div
                    className="w-[300px] shrink-0 flex items-center pr-2 truncate"
                    style={{ paddingLeft: `${depth * 14 + 6}px` }}
                  >
                    <ChevronIndicator depth={depth} />
                    <span className="font-mono text-sm font-semibold text-foreground truncate">
                      {node.nodeType}
                    </span>
                    {node.relationName && (
                      <span className="text-[9px] text-muted-foreground font-mono truncate ml-1 opacity-80">
                        on {node.relationName}
                      </span>
                    )}
                  </div>

                  {/* Right Timing Gantt Bar Canvas */}
                  <div className="flex-1 flex items-center h-full relative">
                    {/* Time bar track */}
                    <div
                      className="absolute inset-y-2 rounded-md flex overflow-hidden border border-transparent shadow-inner"
                      style={{
                        left: `${offsetPct}%`,
                        width: `${activeWidthPct}%`,
                      }}
                    >
                      {/* 1. Startup phase (dotted/hollow) */}
                      {startup > 0 && (
                        <div
                          className={cn(
                            "h-full shrink-0 border-r border-dashed border-indigo-500/40 select-none",
                            isBlocking
                              ? "bg-amber-500/5 dark:bg-amber-500/5 animate-pulse"
                              : "bg-indigo-500/5",
                          )}
                          style={{
                            width: `${(startup / total) * 100}%`,
                          }}
                          title={`Startup delay: ${formatTiming(startup)}`}
                        />
                      )}

                      {/* 2. Active output phase (solid) */}
                      <div
                        className={cn(
                          "h-full flex-1 transition-all",
                          isBlocking
                            ? "bg-amber-500/30 dark:bg-amber-500/40"
                            : "bg-indigo-500/30 dark:bg-indigo-500/40",
                        )}
                        title={`Active output phase: ${formatTiming(total - startup)}`}
                      />
                    </div>

                    {/* Active values popover on hover */}
                    <span
                      className="absolute font-mono text-[9px] font-bold text-muted-foreground/80 opacity-0 hover:opacity-100 transition-opacity bg-background border px-1.5 py-0.5 rounded shadow-sm z-10 select-none pointer-events-none"
                      style={{ left: `${Math.min(85, offsetPct)}%` }}
                    >
                      {formatTiming(startup)}{" "}
                      <ArrowRight className="inline size-2 mx-0.5" />{" "}
                      {formatTiming(total)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="text-xs text-muted-foreground flex items-center gap-1 select-none pl-1">
        <Clock className="size-3 text-indigo-500" />
        Timing timeline maps node startup and completion times. Hollow/dotted
        sections represent blocking calculations (hashing, sorting) waiting to
        return the first row.
      </div>
    </div>
  );
}

function ChevronIndicator({ depth }: { depth: number }) {
  if (depth === 0) return null;
  return (
    <span className="text-muted-foreground/40 font-mono text-xs select-none mr-1 font-bold">
      └─
    </span>
  );
}
