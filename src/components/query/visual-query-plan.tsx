"use client";

import * as React from "react";
import {
  KeyRound,
  Table,
  ArrowRightLeft,
  Clock,
  Coins,
  Info,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Download,
  Image,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { toPng, toSvg } from "html-to-image";

interface PlanNode {
  "Node Type": string;
  "Total Cost": number;
  "Startup Cost": number;
  "Plan Rows": number;
  "Plan Width": number;
  "Actual Startup Time"?: number;
  "Actual Total Time"?: number;
  "Actual Rows"?: number;
  "Actual Loops"?: number;
  "Relation Name"?: string;
  Schema?: string;
  Alias?: string;
  "Index Name"?: string;
  Filter?: string;
  "Join Filter"?: string;
  "Hash Cond"?: string;
  "Index Cond"?: string;
  "Recheck Cond"?: string;
  "Merge Cond"?: string;
  Output?: string[];
  Plans?: PlanNode[];
}

export function VisualQueryPlan({ plan }: { plan: PlanNode | null }) {
  const [selectedNode, setSelectedNode] = React.useState<PlanNode | null>(null);
  const [zoom, setZoom] = React.useState(1);

  if (!plan) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground p-8">
        No query plan data available.
      </div>
    );
  }

  const rootNode = plan && (plan as any).Plan ? (plan as any).Plan : plan;

  // Root total cost used for calculating percentages
  const rootCost = rootNode["Total Cost"] || 1;
  const rootTime = rootNode["Actual Total Time"] || 1;
  const isAnalyze = rootNode["Actual Total Time"] !== undefined;

  const treeRef = React.useRef<HTMLDivElement>(null);

  const handleExportPNG = async () => {
    if (!treeRef.current) return;

    const toastId = toast.loading("Generating PNG image...");
    try {
      const dataUrl = await toPng(treeRef.current, {
        backgroundColor: "#09090b", // Sleek dark zinc-950 color matching theme
        style: {
          transform: "scale(1)",
          transformOrigin: "top center",
        },
      });

      const saveResult = await window.electron.showSaveDialog({
        title: "Export Query Plan as PNG",
        defaultPath: "query_plan.png",
        filters: [{ name: "PNG Images", extensions: ["png"] }],
      });

      if (!saveResult.canceled && saveResult.filePath) {
        const res = await window.electron.writeFileContent({
          filePath: saveResult.filePath,
          content: dataUrl,
          encoding: "base64",
        });

        if (res.ok) {
          toast.success("Query plan exported as PNG successfully!", {
            id: toastId,
            action: {
              label: "Open",
              onClick: () => {
                if (saveResult.filePath) {
                  window.electron.openPath(saveResult.filePath);
                }
              },
            },
          });
        } else {
          toast.error(`Export failed: ${res.message}`, { id: toastId });
        }
      } else {
        toast.dismiss(toastId);
      }
    } catch (error: any) {
      console.error("Export PNG error:", error);
      toast.error(`Failed to export PNG: ${error.message}`, { id: toastId });
    }
  };

  const handleExportSVG = async () => {
    if (!treeRef.current) return;

    const toastId = toast.loading("Generating SVG diagram...");
    try {
      const dataUrl = await toSvg(treeRef.current, {
        backgroundColor: "#09090b",
        style: {
          transform: "scale(1)",
          transformOrigin: "top center",
        },
      });

      const saveResult = await window.electron.showSaveDialog({
        title: "Export Query Plan as SVG",
        defaultPath: "query_plan.svg",
        filters: [{ name: "SVG Diagrams", extensions: ["svg"] }],
      });

      if (!saveResult.canceled && saveResult.filePath) {
        let svgContent = "";
        if (dataUrl.includes("base64,")) {
          svgContent = atob(dataUrl.split("base64,")[1]);
        } else {
          svgContent = decodeURIComponent(
            dataUrl.replace(/^data:image\/svg\+xml;charset=utf-8,/, ""),
          );
        }

        const res = await window.electron.writeFileContent({
          filePath: saveResult.filePath,
          content: svgContent,
          encoding: "utf8",
        });

        if (res.ok) {
          toast.success("Query plan exported as SVG successfully!", {
            id: toastId,
            action: {
              label: "Open",
              onClick: () => {
                if (saveResult.filePath) {
                  window.electron.openPath(saveResult.filePath);
                }
              },
            },
          });
        } else {
          toast.error(`Export failed: ${res.message}`, { id: toastId });
        }
      } else {
        toast.dismiss(toastId);
      }
    } catch (error: any) {
      console.error("Export SVG error:", error);
      toast.error(`Failed to export SVG: ${error.message}`, { id: toastId });
    }
  };

  const handleZoomIn = () => setZoom((z) => Math.min(z + 0.1, 1.5));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 0.1, 0.6));
  const handleResetZoom = () => setZoom(1);

  // Helper to determine self cost of a node (Total Cost - Sum of Children's Total Cost)
  const calculateSelfCostAndType = (node: PlanNode) => {
    const _nodeType = node["Node Type"];
    const totalCost = node["Total Cost"] || 0;
    const totalTime = node["Actual Total Time"] || 0;

    const childrenCost = (node.Plans ?? []).reduce(
      (acc, p) => acc + (p["Total Cost"] || 0),
      0,
    );
    const childrenTime = (node.Plans ?? []).reduce(
      (acc, p) => acc + (p["Actual Total Time"] || 0),
      0,
    );

    const selfCost = Math.max(0, totalCost - childrenCost);
    const selfTime = Math.max(0, totalTime - childrenTime);

    // Calculate percentage relative to overall execution
    const costPercent = (selfCost / rootCost) * 100;
    const timePercent = isAnalyze ? (selfTime / rootTime) * 100 : 0;

    // A node is a Hot Spot if it represents >30% of total cost (or time, if ANALYZE is present)
    const isHotSpot = isAnalyze ? timePercent >= 30 : costPercent >= 30;

    return { selfCost, selfTime, costPercent, timePercent, isHotSpot };
  };

  const getNodeStyles = (nodeType: string, isHotSpot: boolean) => {
    const type = nodeType.toLowerCase();

    if (isHotSpot) {
      return {
        borderColor: "border-destructive/80 dark:border-destructive/60",
        badgeBg: "bg-destructive/10 text-destructive",
        badgeText: "HOT SPOT",
        glow: "shadow-[0_0_15px_rgba(239,68,68,0.2)] dark:shadow-[0_0_20px_rgba(239,68,68,0.15)] hover:shadow-[0_0_25px_rgba(239,68,68,0.45)] dark:hover:shadow-[0_0_30px_rgba(239,68,68,0.35)] transition-shadow duration-200",
      };
    }

    if (type.includes("index") || type.includes("bitmap")) {
      return {
        borderColor: "border-brand/40 dark:border-brand/20",
        badgeBg: "bg-brand/10 text-brand dark:text-brand/80",
        badgeText: "Index Scan",
        glow: "hover:shadow-[0_0_10px_rgba(16,185,129,0.15)]",
      };
    }

    if (type.includes("scan")) {
      return {
        borderColor: "border-amber-500/40 dark:border-amber-500/20",
        badgeBg: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
        badgeText: "Table Scan",
        glow: "hover:shadow-[0_0_10px_rgba(245,158,11,0.15)]",
      };
    }

    if (type.includes("join") || type.includes("loop")) {
      return {
        borderColor: "border-sky-500/40 dark:border-sky-500/20",
        badgeBg: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
        badgeText: "Join",
        glow: "hover:shadow-[0_0_10px_rgba(14,165,233,0.15)]",
      };
    }

    return {
      borderColor: "border-border",
      badgeBg: "bg-muted text-muted-foreground",
      badgeText: "Operation",
      glow: "hover:shadow-[0_0_10px_rgba(100,116,139,0.1)]",
    };
  };

  const renderNodeIcon = (nodeType: string) => {
    const type = nodeType.toLowerCase();
    if (type.includes("index")) return <KeyRound className="size-4 shrink-0" />;
    if (type.includes("scan")) return <Table className="size-4 shrink-0" />;
    if (type.includes("join") || type.includes("loop"))
      return <ArrowRightLeft className="size-4 shrink-0" />;
    return <Info className="size-4 shrink-0" />;
  };

  const renderPlanTree = (node: PlanNode): React.ReactNode => {
    const { costPercent, timePercent, isHotSpot } =
      calculateSelfCostAndType(node);
    const styles = getNodeStyles(node["Node Type"], isHotSpot);

    return (
      <div className="flex flex-col items-center select-none">
        {/* Node Card */}
        <div
          onClick={() => setSelectedNode(node)}
          className={cn(
            "flex flex-col w-[260px] p-3 border rounded-xl bg-card/60 backdrop-blur-md transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer",
            styles.borderColor,
            styles.glow,
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs uppercase font-bold tracking-wider opacity-60">
              {node["Node Type"].split(" ")[0]}
            </span>
            <Badge
              className={cn(
                "text-[9px] py-0 h-4 font-bold border-transparent",
                styles.badgeBg,
              )}
            >
              {styles.badgeText}
            </Badge>
          </div>

          {/* Operation Name */}
          <div className="flex items-center gap-2 font-mono text-[12.5px] font-bold text-foreground">
            {renderNodeIcon(node["Node Type"])}
            <span className="truncate" title={node["Node Type"]}>
              {node["Node Type"]}
            </span>
          </div>

          {/* Relation Details */}
          {node["Relation Name"] && (
            <div className="text-[11px] text-muted-foreground mt-1 truncate">
              on{" "}
              <span className="font-mono font-semibold text-foreground/80">
                {node["Relation Name"]}
              </span>
              {node.Alias && node.Alias !== node["Relation Name"] && (
                <span> (as {node.Alias})</span>
              )}
            </div>
          )}

          {/* Index details */}
          {node["Index Name"] && (
            <div
              className="text-xs text-brand dark:text-brand/80 font-mono mt-0.5 truncate"
              title={node["Index Name"]}
            >
              Idx: {node["Index Name"]}
            </div>
          )}

          <div className="border-t my-2 border-border/60" />

          {/* Cost and Time metrics */}
          <div className="grid grid-cols-2 gap-1.5 font-mono text-[11px]">
            <div className="flex flex-col">
              <span className="text-[9px] text-muted-foreground uppercase">
                Cost
              </span>
              <span className="font-semibold text-foreground/90 flex items-center gap-0.5">
                <Coins className="size-3 opacity-60" />
                {node["Total Cost"]}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] text-muted-foreground uppercase">
                {isAnalyze ? "Time" : "Est. Rows"}
              </span>
              <span className="font-semibold text-foreground/90 flex items-center gap-0.5">
                {isAnalyze ? (
                  <>
                    <Clock className="size-3 opacity-60" />
                    {node["Actual Total Time"]}ms
                  </>
                ) : (
                  node["Plan Rows"]
                )}
              </span>
            </div>
          </div>

          {/* Percentage Indicator */}
          <div className="mt-2.5 flex items-center justify-between text-[9.5px] font-mono">
            <span className="text-muted-foreground">Weight:</span>
            <span
              className={cn(
                "font-bold",
                isHotSpot ? "text-destructive" : "text-foreground",
              )}
            >
              {isAnalyze
                ? `${timePercent.toFixed(1)}% time`
                : `${costPercent.toFixed(1)}% cost`}
            </span>
          </div>
        </div>

        {/* Connector Line & Sub Plans */}
        {node.Plans && node.Plans.length > 0 && (
          <div className="flex flex-col items-center mt-6 w-full">
            {/* Vertical connector line directly below parent card */}
            <div className="w-[2px] h-6 bg-border/80" />

            {/* Horizontal bridge bar connecting all sub plans */}
            {node.Plans.length > 1 && (
              <div
                className="h-[2px] bg-border/80 w-full flex relative"
                style={{ width: `calc(100% - ${260 / node.Plans.length}px)` }}
              />
            )}

            {/* Render children sub plans side-by-side */}
            <div className="flex gap-8 justify-center w-full">
              {node.Plans.map((subPlan, idx) => {
                const subCost = subPlan["Total Cost"] || 0;
                const subTime = subPlan["Actual Total Time"] || 0;
                const _isSubHot = isAnalyze
                  ? subTime / rootTime >= 0.3
                  : subCost / rootCost >= 0.3;
                return (
                  <div
                    key={idx}
                    className="flex flex-col items-center relative"
                  >
                    {/* Vertical connector lines connecting horizontal bridge to child card */}
                    <div className="w-[2px] h-6 bg-border/80" />
                    {renderPlanTree(subPlan)}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="relative flex flex-col h-full overflow-hidden select-none bg-background/20 rounded-xl border">
      {/* Zoom and Pan Controls */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-1 bg-card/75 border border-border/80 p-1.5 rounded-full shadow-sm backdrop-blur-md">
        <button
          onClick={handleZoomOut}
          disabled={zoom <= 0.6}
          className="p-1 rounded-full hover:bg-accent hover:text-accent-foreground text-muted-foreground disabled:opacity-40 transition-colors"
          title="Zoom Out"
        >
          <ZoomOut className="size-4" />
        </button>
        <span className="text-xs font-mono font-bold px-1 select-none min-w-[36px] text-center">
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={handleZoomIn}
          disabled={zoom >= 1.5}
          className="p-1 rounded-full hover:bg-accent hover:text-accent-foreground text-muted-foreground disabled:opacity-40 transition-colors"
          title="Zoom In"
        >
          <ZoomIn className="size-4" />
        </button>
        <div className="w-[1px] h-4 bg-border mx-1" />
        <button
          onClick={handleResetZoom}
          className="p-1 rounded-full hover:bg-accent hover:text-accent-foreground text-muted-foreground transition-colors"
          title="Reset Zoom"
        >
          <RotateCcw className="size-4" />
        </button>
        <div className="w-[1px] h-4 bg-border mx-1" />
        <button
          onClick={handleExportPNG}
          className="p-1 rounded-full hover:bg-accent hover:text-accent-foreground text-muted-foreground transition-colors"
          title="Export as PNG Image"
        >
          <Image className="size-4" />
        </button>
        <button
          onClick={handleExportSVG}
          className="p-1 rounded-full hover:bg-accent hover:text-accent-foreground text-muted-foreground transition-colors"
          title="Export as SVG Diagram"
        >
          <Download className="size-4" />
        </button>
      </div>

      {/* Interactive Legend Badge */}
      <div className="absolute top-4 right-4 z-10 flex gap-2 text-[9px] bg-card/75 border border-border/80 py-1.5 px-3 rounded-full backdrop-blur-md text-muted-foreground font-mono">
        <span className="flex items-center gap-1 font-semibold">
          <span className="size-2 bg-brand rounded-full" /> Index Scan
        </span>
        <span className="flex items-center gap-1 font-semibold">
          <span className="size-2 bg-amber-500 rounded-full" /> Table Scan
        </span>
        <span className="flex items-center gap-1 font-semibold">
          <span className="size-2 bg-destructive rounded-full" /> Hot Spot
        </span>
      </div>

      {/* Main Graph Area */}
      <div className="flex-1 overflow-auto p-12 flex justify-center items-start min-w-0">
        <div
          ref={treeRef}
          className="transition-transform duration-200 ease-out origin-top flex flex-col items-center p-6 rounded-2xl"
          style={{ transform: `scale(${zoom})` }}
        >
          {renderPlanTree(rootNode)}
        </div>
      </div>

      {/* Node Details Inspector Drawer */}
      <Sheet
        open={!!selectedNode}
        onOpenChange={(open) => !open && setSelectedNode(null)}
      >
        <SheetContent
          side="right"
          className="app-region-no-drag w-[450px] sm:max-w-[450px] overflow-y-auto"
        >
          <SheetHeader className="px-6 py-5 border-b">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <span className="text-xs uppercase font-bold tracking-wider font-mono">
                Explain Details
              </span>
            </div>
            <SheetTitle className="font-mono text-lg font-bold flex items-center gap-2">
              {selectedNode && renderNodeIcon(selectedNode["Node Type"])}
              {selectedNode?.["Node Type"]}
            </SheetTitle>
            <SheetDescription>
              Granular optimization metrics returned by the database planner.
            </SheetDescription>
          </SheetHeader>

          {selectedNode && (
            <div className="px-6 py-6 space-y-6">
              {/* Bottleneck Warning */}
              {(() => {
                const { isHotSpot, timePercent, costPercent } =
                  calculateSelfCostAndType(selectedNode);
                if (isHotSpot) {
                  return (
                    <div className="p-4 rounded-xl border border-destructive/20 bg-destructive/5 text-destructive text-sm space-y-1.5 animate-in fade-in slide-in-from-top-2 duration-300">
                      <div className="font-bold flex items-center gap-1.5">
                        <AlertTriangle className="size-4 shrink-0" />
                        Execution Bottleneck Detected
                      </div>
                      <p className="opacity-90 leading-relaxed">
                        This operation took{" "}
                        <span className="font-bold">
                          {isAnalyze
                            ? `${timePercent.toFixed(1)}%`
                            : `${costPercent.toFixed(1)}%`}
                        </span>{" "}
                        of the total query runtime. Optimize indexes, check
                        filter conditions, or adjust join fields.
                      </p>
                    </div>
                  );
                }
                return null;
              })()}

              {/* Target Relation Info */}
              {selectedNode["Relation Name"] && (
                <div className="space-y-2">
                  <span className="text-xs text-muted-foreground font-mono uppercase tracking-wider font-bold">
                    Target Relation
                  </span>
                  <div className="grid grid-cols-2 gap-2 text-sm font-mono border p-3 rounded-lg bg-muted/20">
                    <div>
                      <span className="text-muted-foreground block text-[9.5px]">
                        SCHEMA
                      </span>
                      <span className="font-semibold text-foreground/80">
                        {selectedNode.Schema || "public"}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[9.5px]">
                        TABLE
                      </span>
                      <span className="font-semibold text-foreground/80">
                        {selectedNode["Relation Name"]}
                      </span>
                    </div>
                    {selectedNode.Alias && (
                      <div className="col-span-2 border-t pt-2 mt-1">
                        <span className="text-muted-foreground block text-[9.5px]">
                          ALIAS
                        </span>
                        <span className="font-semibold text-foreground/80">
                          {selectedNode.Alias}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Target Index Info */}
              {selectedNode["Index Name"] && (
                <div className="space-y-2">
                  <span className="text-xs text-muted-foreground font-mono uppercase tracking-wider font-bold">
                    Target Index
                  </span>
                  <div className="flex items-center gap-2 text-sm font-mono border border-brand/20 p-3 rounded-lg bg-brand/5 text-brand dark:text-brand/80">
                    <KeyRound className="size-4 shrink-0" />
                    <div>
                      <span className="text-[9.5px] text-brand/60 dark:text-brand/80/60 block">
                        INDEX IDENTIFIER
                      </span>
                      <span className="font-bold">
                        {selectedNode["Index Name"]}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Node Operations Filters & Conditions */}
              {(selectedNode.Filter ||
                selectedNode["Index Cond"] ||
                selectedNode["Hash Cond"] ||
                selectedNode["Join Filter"] ||
                selectedNode["Recheck Cond"] ||
                selectedNode["Merge Cond"]) && (
                <div className="space-y-3">
                  <span className="text-xs text-muted-foreground font-mono uppercase tracking-wider font-bold">
                    Filters & Conditions
                  </span>
                  <div className="space-y-2.5">
                    {selectedNode["Index Cond"] && (
                      <div className="text-sm border p-3 rounded-lg bg-muted/20">
                        <span className="text-[9.5px] font-mono text-muted-foreground uppercase font-bold block mb-1">
                          Index Condition
                        </span>
                        <code className="text-foreground/90 font-mono break-all">
                          {selectedNode["Index Cond"]}
                        </code>
                      </div>
                    )}
                    {selectedNode["Hash Cond"] && (
                      <div className="text-sm border p-3 rounded-lg bg-muted/20">
                        <span className="text-[9.5px] font-mono text-sky-500 uppercase font-bold block mb-1">
                          Hash Join Condition
                        </span>
                        <code className="text-foreground/90 font-mono break-all">
                          {selectedNode["Hash Cond"]}
                        </code>
                      </div>
                    )}
                    {selectedNode.Filter && (
                      <div className="text-sm border border-red-500/20 p-3 rounded-lg bg-red-500/5">
                        <span className="text-[9.5px] font-mono text-red-500 uppercase font-bold block mb-1">
                          Filter (Sequential Scan)
                        </span>
                        <code className="text-foreground/90 font-mono break-all">
                          {selectedNode.Filter}
                        </code>
                      </div>
                    )}
                    {selectedNode["Join Filter"] && (
                      <div className="text-sm border p-3 rounded-lg bg-muted/20">
                        <span className="text-[9.5px] font-mono text-muted-foreground uppercase font-bold block mb-1">
                          Join Filter
                        </span>
                        <code className="text-foreground/90 font-mono break-all">
                          {selectedNode["Join Filter"]}
                        </code>
                      </div>
                    )}
                    {selectedNode["Recheck Cond"] && (
                      <div className="text-sm border p-3 rounded-lg bg-muted/20">
                        <span className="text-[9.5px] font-mono text-muted-foreground uppercase font-bold block mb-1">
                          Recheck Condition
                        </span>
                        <code className="text-foreground/90 font-mono break-all">
                          {selectedNode["Recheck Cond"]}
                        </code>
                      </div>
                    )}
                    {selectedNode["Merge Cond"] && (
                      <div className="text-sm border p-3 rounded-lg bg-muted/20">
                        <span className="text-[9.5px] font-mono text-muted-foreground uppercase font-bold block mb-1">
                          Merge Condition
                        </span>
                        <code className="text-foreground/90 font-mono break-all">
                          {selectedNode["Merge Cond"]}
                        </code>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Execution Costs & Durations */}
              <div className="space-y-2">
                <span className="text-xs text-muted-foreground font-mono uppercase tracking-wider font-bold">
                  Cost & Performance
                </span>
                <div className="grid grid-cols-2 gap-3 text-sm font-mono border p-4 rounded-xl bg-card">
                  <div>
                    <span className="text-muted-foreground block text-[9.5px]">
                      STARTUP COST
                    </span>
                    <span className="font-semibold text-foreground">
                      {selectedNode["Startup Cost"]}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[9.5px]">
                      TOTAL COST
                    </span>
                    <span className="font-bold text-foreground">
                      {selectedNode["Total Cost"]}
                    </span>
                  </div>

                  <div className="col-span-2 border-t my-1" />

                  {isAnalyze ? (
                    <>
                      <div>
                        <span className="text-muted-foreground block text-[9.5px]">
                          ACTUAL STARTUP
                        </span>
                        <span className="font-semibold text-foreground">
                          {selectedNode["Actual Startup Time"]}ms
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[9.5px]">
                          ACTUAL RUNTIME
                        </span>
                        <span className="font-bold text-foreground">
                          {selectedNode["Actual Total Time"]}ms
                        </span>
                      </div>
                      <div className="col-span-2 border-t my-1" />
                      <div>
                        <span className="text-muted-foreground block text-[9.5px]">
                          ACTUAL ROWS
                        </span>
                        <span className="font-semibold text-foreground">
                          {selectedNode["Actual Rows"]}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[9.5px]">
                          ACTUAL LOOPS
                        </span>
                        <span className="font-bold text-foreground">
                          {selectedNode["Actual Loops"]}
                        </span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <span className="text-muted-foreground block text-[9.5px]">
                          ESTIMATED ROWS
                        </span>
                        <span className="font-semibold text-foreground">
                          {selectedNode["Plan Rows"]}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[9.5px]">
                          ESTIMATED WIDTH
                        </span>
                        <span className="font-bold text-foreground">
                          {selectedNode["Plan Width"]} bytes
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Output Columns */}
              {selectedNode.Output && selectedNode.Output.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs text-muted-foreground font-mono uppercase tracking-wider font-bold">
                    Output Columns
                  </span>
                  <div className="flex flex-col border p-3 rounded-lg bg-muted/20 font-mono text-[11px] text-foreground/80 max-h-[200px] overflow-y-auto space-y-1">
                    {selectedNode.Output.map((col, idx) => (
                      <div
                        key={idx}
                        className="truncate select-text hover:text-foreground"
                      >
                        {idx + 1}. {col}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

// Simple local Alert component fallback to avoid import bloat
function AlertTriangle({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <title>Warning</title>
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}
