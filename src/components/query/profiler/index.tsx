"use client";

import * as React from "react";
import {
  calculateNodeTimings,
  findHotNode,
  formatTiming,
  type CalculatedPlanNode,
} from "./profiler-math";
import { FlameGraphView } from "./flame-graph-view";
import { GanttTimelineView } from "./gantt-timeline-view";
import { NodeDetailsSheet } from "./node-details-sheet";
import { Badge } from "@/components/ui/badge";
import { Flame, Clock, Layers, Zap, Activity, Maximize2 } from "lucide-react";
import { cn } from "@/lib/utils";

type ViewMode = "flame" | "timeline";

export function QueryPerformanceProfiler({ plan }: { plan: any }) {
  const [activeView, setActiveView] = React.useState<ViewMode>("flame");
  const [selectedNode, setSelectedNode] =
    React.useState<CalculatedPlanNode | null>(null);
  const [sheetOpen, setSheetOpen] = React.useState(false);

  // 1. Core timing calculations
  const parsedTree = React.useMemo(() => {
    if (!plan) return null;
    return calculateNodeTimings(plan);
  }, [plan]);

  // 2. Identify the hottest performance bottleneck node
  const hotNodeInfo = React.useMemo(() => {
    if (!parsedTree) return null;
    return findHotNode(parsedTree);
  }, [parsedTree]);

  // Flat operation counts
  const totalOperations = React.useMemo(() => {
    if (!parsedTree) return 0;
    let count = 0;
    function traverse(n: CalculatedPlanNode) {
      count++;
      for (const child of n.plans) {
        traverse(child);
      }
    }
    traverse(parsedTree);
    return count;
  }, [parsedTree]);

  const handleSelectNode = React.useCallback((node: CalculatedPlanNode) => {
    setSelectedNode(node);
    setSheetOpen(true);
  }, []);

  if (!parsedTree) {
    return (
      <div className="flex h-64 flex-col items-center justify-center text-center p-8 bg-muted/5 select-none text-muted-foreground">
        <Activity className="size-8 opacity-20 mb-2" />
        <p className="text-sm font-semibold">No query plan profile available</p>
        <p className="text-xs opacity-70">
          Execute explain queries to collect execution data.
        </p>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 overflow-y-auto p-5 space-y-5 bg-background scrollbar-thin">
      {/* Overview Diagnostics Dashboard Row */}
      <div className="grid grid-cols-3 gap-3.5 select-none">
        {/* Total Query Time Card */}
        <div className="p-4 border rounded-2xl bg-muted/10 flex items-center gap-4 shadow-sm">
          <div className="size-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500">
            <Clock className="size-5" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider leading-none">
              Total Execution Time
            </span>
            <span className="text-base font-black font-mono mt-1 text-foreground">
              {formatTiming(parsedTree.inclusiveTime)}
            </span>
          </div>
        </div>

        {/* Total Operations Count Card */}
        <div className="p-4 border rounded-2xl bg-muted/10 flex items-center gap-4 shadow-sm">
          <div className="size-10 rounded-xl bg-brand/10 border border-brand/20 flex items-center justify-center text-brand">
            <Layers className="size-5" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider leading-none">
              Total Tree Nodes
            </span>
            <span className="text-base font-black font-mono mt-1 text-foreground">
              {totalOperations} operations
            </span>
          </div>
        </div>

        {/* Hot Bottleneck Spot Card */}
        <div className="p-4 border rounded-2xl bg-muted/10 flex items-center gap-4 shadow-sm col-span-1">
          <div className="size-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 shrink-0">
            <Flame className="size-5 animate-pulse" />
          </div>
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider leading-none">
              Performance Bottleneck
            </span>
            {hotNodeInfo && hotNodeInfo.time > 0 ? (
              <button
                onClick={() => handleSelectNode(hotNodeInfo.node)}
                className="text-left font-bold text-sm mt-1 truncate hover:underline hover:text-red-500 transition leading-tight flex items-center gap-1 group font-mono"
              >
                {hotNodeInfo.node.nodeType} ({formatTiming(hotNodeInfo.time)})
                <Maximize2 className="size-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition shrink-0" />
              </button>
            ) : (
              <span className="text-sm font-bold text-brand mt-1 select-none flex items-center gap-0.5">
                <Zap className="size-3 fill-brand" />
                Optimally fast runs
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Profiler Controls & Tab Switchers */}
      <div className="flex items-center justify-between border-b pb-3 shrink-0 select-none">
        <div className="flex items-center gap-2">
          <span className="text-sm font-black select-none tracking-tight">
            Performance Visualizers
          </span>
          <Badge
            variant="outline"
            className="text-[9px] font-bold font-mono tracking-tight text-indigo-500 bg-indigo-500/5 uppercase"
          >
            {activeView === "flame"
              ? "Waterfall Heat-Map"
              : "lifespan timeline"}
          </Badge>
        </div>

        {/* Mode Switch triggers */}
        <div className="flex rounded-lg bg-muted/30 p-1 border gap-1">
          <button
            onClick={() => setActiveView("flame")}
            className={cn(
              "px-3 py-1 rounded-md text-xs font-bold tracking-tight uppercase transition flex items-center gap-1.5",
              activeView === "flame"
                ? "bg-background text-foreground shadow-sm border border-border/20"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Flame className="size-3 text-red-500" />
            Flame Graph
          </button>
          <button
            onClick={() => setActiveView("timeline")}
            className={cn(
              "px-3 py-1 rounded-md text-xs font-bold tracking-tight uppercase transition flex items-center gap-1.5",
              activeView === "timeline"
                ? "bg-background text-foreground shadow-sm border border-border/20"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Clock className="size-3 text-indigo-500" />
            Gantt Timeline
          </button>
        </div>
      </div>

      {/* Rendering Active View */}
      <div className="flex-1 min-h-0 relative">
        {activeView === "flame" ? (
          <FlameGraphView
            rootNode={parsedTree}
            onSelect={handleSelectNode}
            selectedId={selectedNode?.id || null}
          />
        ) : (
          <GanttTimelineView
            rootNode={parsedTree}
            onSelect={handleSelectNode}
            selectedId={selectedNode?.id || null}
          />
        )}
      </div>

      {/* Slide-out details sheet drawer */}
      <NodeDetailsSheet
        node={selectedNode}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />
    </div>
  );
}
