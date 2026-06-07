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
  Maximize,
  Maximize2,
  Minimize2,
  Download,
  Image,
  TriangleAlert,
} from "lucide-react";
import {
  ReactFlow,
  Background,
  Panel,
  useNodesState,
  useEdgesState,
  useReactFlow,
  ReactFlowProvider,
  Handle,
  Position,
  MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import dagre from "@dagrejs/dagre";
import { useTheme } from "@/hooks/use-theme";
import { resolveIsDark } from "@/lib/theme-init";

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

function QueryPlanNode({ data }: { data: any }) {
  const {
    node,
    isHotSpot,
    costPercent,
    timePercent,
    isAnalyze,
    styles,
    isFullscreen,
  } = data;

  return (
    <div
      onClick={data.onClick}
      className={cn(
        "flex flex-col border rounded-xl bg-card transition-shadow hover:shadow-md cursor-pointer text-left",
        isFullscreen ? "w-[320px] p-4.5 gap-2.5" : "w-[260px] p-3",
        styles.borderColor,
        styles.glow,
      )}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="w-1.5 h-1.5 !bg-border !border-0 opacity-0 pointer-events-none"
      />

      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <span
          className={cn(
            "uppercase font-bold tracking-wider opacity-60",
            isFullscreen ? "text-xs" : "text-sm",
          )}
        >
          {node["Node Type"].split(" ")[0]}
        </span>
        <Badge
          className={cn(
            "py-0 h-4.5 font-bold border-transparent",
            isFullscreen ? "text-xs px-2.5" : "text-sm",
            styles.badgeBg,
          )}
        >
          {styles.badgeText}
        </Badge>
      </div>

      {/* Operation Name */}
      <div
        className={cn(
          "flex items-center gap-2 font-mono font-bold text-foreground",
          isFullscreen ? "text-sm" : "text-xs",
        )}
      >
        {renderNodeIcon(node["Node Type"])}
        <span className="truncate" title={node["Node Type"]}>
          {node["Node Type"]}
        </span>
      </div>

      {/* Relation Details */}
      {node["Relation Name"] && (
        <div
          className={cn(
            "text-muted-foreground mt-1 truncate",
            isFullscreen ? "text-sm" : "text-xs",
          )}
        >
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
          className={cn(
            "font-mono mt-0.5 truncate",
            isFullscreen
              ? "text-sm text-brand/90 dark:text-brand/90"
              : "text-xs text-brand dark:text-brand/80",
          )}
          title={node["Index Name"]}
        >
          Idx: {node["Index Name"]}
        </div>
      )}

      <div className="border-t my-2 border-border/60" />

      {/* Cost and Time metrics */}
      <div
        className={cn(
          "grid grid-cols-2 gap-1.5 font-mono",
          isFullscreen ? "text-xs" : "text-xs",
        )}
      >
        <div className="flex flex-col">
          <span
            className={cn(
              "text-muted-foreground uppercase",
              isFullscreen ? "text-xs" : "text-sm",
            )}
          >
            Cost
          </span>
          <span className="font-semibold text-foreground/90 flex items-center gap-0.5">
            <Coins className="size-3.5 opacity-60" />
            {node["Total Cost"]}
          </span>
        </div>
        <div className="flex flex-col">
          <span
            className={cn(
              "text-muted-foreground uppercase",
              isFullscreen ? "text-xs" : "text-sm",
            )}
          >
            {isAnalyze ? "Time" : "Est. Rows"}
          </span>
          <span className="font-semibold text-foreground/90 flex items-center gap-0.5">
            {isAnalyze ? (
              <>
                <Clock className="size-3.5 opacity-60" />
                {node["Actual Total Time"]}ms
              </>
            ) : (
              node["Plan Rows"]
            )}
          </span>
        </div>
      </div>

      {/* Percentage Indicator */}
      <div
        className={cn(
          "mt-2.5 flex items-center justify-between font-mono",
          isFullscreen ? "text-xs" : "text-sm",
        )}
      >
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

      <Handle
        type="source"
        position={Position.Bottom}
        className="w-1.5 h-1.5 !bg-border !border-0 opacity-0 pointer-events-none"
      />
    </div>
  );
}

const nodeTypes = {
  planNode: QueryPlanNode,
};

function buildPlanGraphElements(
  rootNode: PlanNode,
  rootCost: number,
  rootTime: number,
  isAnalyze: boolean,
  isFullscreen: boolean,
  onSelectNode: (node: PlanNode) => void,
) {
  const nodes: any[] = [];
  const edges: any[] = [];
  let nodeIdCounter = 0;

  function traverse(node: PlanNode, parentId?: string) {
    const currentId = `node-${nodeIdCounter++}`;

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

    const costPercent = (selfCost / rootCost) * 100;
    const timePercent = isAnalyze ? (selfTime / rootTime) * 100 : 0;
    const isHotSpot = isAnalyze ? timePercent >= 30 : costPercent >= 30;

    const styles = getNodeStyles(node["Node Type"], isHotSpot);

    nodes.push({
      id: currentId,
      type: "planNode",
      position: { x: 0, y: 0 },
      data: {
        node,
        isHotSpot,
        costPercent,
        timePercent,
        isAnalyze,
        styles,
        isFullscreen,
        onClick: () => onSelectNode(node),
      },
    });

    if (parentId) {
      edges.push({
        id: `e-${parentId}-${currentId}`,
        source: parentId,
        target: currentId,
        type: "smoothstep",
        style: { strokeWidth: 2, stroke: "var(--border)" },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 12,
          height: 12,
          color: "var(--border)",
        },
      });
    }

    if (node.Plans && node.Plans.length > 0) {
      for (const childPlan of node.Plans) {
        traverse(childPlan, currentId);
      }
    }
  }

  traverse(rootNode);
  return { nodes, edges };
}

function applyDagreLayout(
  nodes: any[],
  edges: any[],
  nodeWidth = 260,
  nodeHeight = 160,
) {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({ rankdir: "TB", ranksep: 140, nodesep: 100 });

  for (const node of nodes) {
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  }

  for (const edge of edges) {
    dagreGraph.setEdge(edge.source, edge.target);
  }

  dagre.layout(dagreGraph);

  const laidOutNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - nodeWidth / 2,
        y: nodeWithPosition.y - nodeHeight / 2,
      },
    };
  });

  return laidOutNodes;
}

function VisualQueryPlanCanvas({
  plan,
  isFullscreen,
  onToggleFullscreen,
}: {
  plan: PlanNode;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
}) {
  const [selectedNode, setSelectedNode] = React.useState<PlanNode | null>(null);
  const { fitView, zoomIn, zoomOut } = useReactFlow();
  const [nodes, setNodes, onNodesChange] = useNodesState<any>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<any>([]);
  const { theme } = useTheme();
  const [isDark, setIsDark] = React.useState(() => resolveIsDark(theme));

  React.useEffect(() => {
    setIsDark(resolveIsDark(theme));
  }, [theme]);

  const rootNode = plan && (plan as any).Plan ? (plan as any).Plan : plan;
  const rootCost = rootNode["Total Cost"] || 1;
  const rootTime = rootNode["Actual Total Time"] || 1;
  const isAnalyze = rootNode["Actual Total Time"] !== undefined;

  React.useEffect(() => {
    const { nodes: initialNodes, edges: initialEdges } = buildPlanGraphElements(
      rootNode,
      rootCost,
      rootTime,
      isAnalyze,
      isFullscreen,
      setSelectedNode,
    );
    const layoutedNodes = applyDagreLayout(
      initialNodes,
      initialEdges,
      isFullscreen ? 320 : 260,
      isFullscreen ? 195 : 160,
    );
    setNodes(layoutedNodes);
    setEdges(initialEdges);

    const timer = setTimeout(() => {
      fitView({ padding: 0.15, duration: 400 });
    }, 100);
    return () => clearTimeout(timer);
  }, [
    plan,
    rootNode,
    rootCost,
    rootTime,
    isAnalyze,
    isFullscreen,
    fitView,
    setNodes,
    setEdges,
  ]);

  const handleExportPNG = async () => {
    const viewport = document.querySelector(
      ".react-flow__viewport",
    ) as HTMLElement;
    if (!viewport) return;

    const toastId = toast.loading("Generating PNG image...");
    try {
      let dataUrl = "";
      const isDark = document.documentElement.classList.contains("dark");
      if (isDark) {
        document.documentElement.classList.remove("dark");
      }
      try {
        dataUrl = await toPng(viewport, {
          backgroundColor: "#ffffff",
          style: {
            transform: "scale(1)",
            transformOrigin: "top center",
          },
        });
      } finally {
        if (isDark) {
          document.documentElement.classList.add("dark");
        }
      }

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
    const viewport = document.querySelector(
      ".react-flow__viewport",
    ) as HTMLElement;
    if (!viewport) return;

    const toastId = toast.loading("Generating SVG diagram...");
    try {
      let dataUrl = "";
      const isDark = document.documentElement.classList.contains("dark");
      if (isDark) {
        document.documentElement.classList.remove("dark");
      }
      try {
        dataUrl = await toSvg(viewport, {
          backgroundColor: "#ffffff",
          style: {
            transform: "scale(1)",
            transformOrigin: "top center",
          },
        });
      } finally {
        if (isDark) {
          document.documentElement.classList.add("dark");
        }
      }

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

  const calculateSelfCostAndType = (node: PlanNode) => {
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

    const costPercent = (selfCost / rootCost) * 100;
    const timePercent = isAnalyze ? (selfTime / rootTime) * 100 : 0;

    const isHotSpot = isAnalyze ? timePercent >= 30 : costPercent >= 30;

    return { selfCost, selfTime, costPercent, timePercent, isHotSpot };
  };

  return (
    <div
      className="w-full h-full relative"
      style={
        {
          "--xy-background-color": "var(--background)",
          "--xy-node-color": "var(--foreground)",
          "--xy-node-background-color": "transparent",
          "--xy-node-border": "none",
          "--xy-edge-stroke": "var(--border)",
          "--xy-minimap-background-color": "var(--card)",
          "--xy-minimap-mask-color": isDark
            ? "rgba(0,0,0,0.6)"
            : "rgba(255,255,255,0.6)",
        } as any
      }
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.15 }}
        minZoom={0.2}
        maxZoom={1.5}
        deleteKeyCode={null}
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={24} size={2} color="var(--border)" />

        {/* Floating Zoom & Export Toolbar */}
        <Panel position="top-left" className="m-4 z-10">
          <div className="flex items-center gap-1 bg-card/90 border border-border/80 p-1.5 rounded-xl shadow-lg backdrop-blur-md">
            <button
              onClick={() => zoomOut()}
              className="p-1 rounded-lg hover:bg-accent hover:text-accent-foreground text-muted-foreground transition-colors cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut className="size-4" />
            </button>
            <button
              onClick={() => zoomIn()}
              className="p-1 rounded-lg hover:bg-accent hover:text-accent-foreground text-muted-foreground transition-colors cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn className="size-4" />
            </button>
            <div className="w-[1px] h-4 bg-border mx-1" />
            <button
              onClick={() => fitView({ padding: 0.15, duration: 400 })}
              className="p-1 rounded-lg hover:bg-accent hover:text-accent-foreground text-muted-foreground transition-colors cursor-pointer"
              title="Reset Zoom & Fit View"
            >
              <Maximize className="size-4" />
            </button>
            <button
              onClick={onToggleFullscreen}
              className="p-1 rounded-lg hover:bg-accent hover:text-accent-foreground text-muted-foreground transition-colors cursor-pointer"
              title={isFullscreen ? "Exit Fullscreen" : "Fullscreen View"}
            >
              {isFullscreen ? (
                <Minimize2 className="size-4" />
              ) : (
                <Maximize2 className="size-4" />
              )}
            </button>
            <div className="w-[1px] h-4 bg-border mx-1" />
            <button
              onClick={handleExportPNG}
              className="p-1 rounded-lg hover:bg-accent hover:text-accent-foreground text-muted-foreground transition-colors cursor-pointer"
              title="Export as PNG Image"
            >
              <Image className="size-4" />
            </button>
            <button
              onClick={handleExportSVG}
              className="p-1 rounded-lg hover:bg-accent hover:text-accent-foreground text-muted-foreground transition-colors cursor-pointer"
              title="Export as SVG Diagram"
            >
              <Download className="size-4" />
            </button>
          </div>
        </Panel>

        {/* Legend Panel */}
        <Panel position="top-right" className="m-4 z-10">
          <div className="flex gap-2 text-xs bg-card/90 border border-border/80 py-1.5 px-3 rounded-full backdrop-blur-md text-muted-foreground font-mono shadow-md">
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
        </Panel>
      </ReactFlow>

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
                        <TriangleAlert className="size-4 shrink-0" />
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
                        <code className="text-foreground/90 font-mono break-all text-xs">
                          {selectedNode["Index Cond"]}
                        </code>
                      </div>
                    )}
                    {selectedNode["Hash Cond"] && (
                      <div className="text-sm border p-3 rounded-lg bg-muted/20">
                        <span className="text-[9.5px] font-mono text-sky-500 uppercase font-bold block mb-1">
                          Hash Join Condition
                        </span>
                        <code className="text-foreground/90 font-mono break-all text-xs">
                          {selectedNode["Hash Cond"]}
                        </code>
                      </div>
                    )}
                    {selectedNode.Filter && (
                      <div className="text-sm border border-red-500/20 p-3 rounded-lg bg-red-500/5">
                        <span className="text-[9.5px] font-mono text-red-500 uppercase font-bold block mb-1">
                          Filter (Sequential Scan)
                        </span>
                        <code className="text-foreground/90 font-mono break-all text-xs">
                          {selectedNode.Filter}
                        </code>
                      </div>
                    )}
                    {selectedNode["Join Filter"] && (
                      <div className="text-sm border p-3 rounded-lg bg-muted/20">
                        <span className="text-[9.5px] font-mono text-muted-foreground uppercase font-bold block mb-1">
                          Join Filter
                        </span>
                        <code className="text-foreground/90 font-mono break-all text-xs">
                          {selectedNode["Join Filter"]}
                        </code>
                      </div>
                    )}
                    {selectedNode["Recheck Cond"] && (
                      <div className="text-sm border p-3 rounded-lg bg-muted/20">
                        <span className="text-[9.5px] font-mono text-muted-foreground uppercase font-bold block mb-1">
                          Recheck Condition
                        </span>
                        <code className="text-foreground/90 font-mono break-all text-xs">
                          {selectedNode["Recheck Cond"]}
                        </code>
                      </div>
                    )}
                    {selectedNode["Merge Cond"] && (
                      <div className="text-sm border p-3 rounded-lg bg-muted/20">
                        <span className="text-[9.5px] font-mono text-muted-foreground uppercase font-bold block mb-1">
                          Merge Condition
                        </span>
                        <code className="text-foreground/90 font-mono break-all text-xs">
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

export function VisualQueryPlan({ plan }: { plan: PlanNode | null }) {
  const [isFullscreen, setIsFullscreen] = React.useState(false);

  React.useEffect(() => {
    if (!isFullscreen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsFullscreen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFullscreen]);

  if (!plan) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground p-8">
        No query plan data available.
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-xl overflow-hidden border bg-background",
        isFullscreen
          ? "fixed inset-0 z-40 w-screen h-screen"
          : "w-full h-full relative",
      )}
    >
      <ReactFlowProvider>
        <VisualQueryPlanCanvas
          plan={plan}
          isFullscreen={isFullscreen}
          onToggleFullscreen={() => setIsFullscreen((f) => !f)}
        />
      </ReactFlowProvider>
    </div>
  );
}
