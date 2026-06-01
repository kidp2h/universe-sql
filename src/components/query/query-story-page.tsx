"use client";

import * as React from "react";
import { useTranslation } from "react-i18next";
import {
  ReactFlow,
  Background,
  Controls,
  Panel,
  useNodesState,
  useEdgesState,
  Handle,
  Position,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { useTabStore } from "@/stores/tab-store";
import { useConnection } from "@/hooks/use-connection";
import { parseSqlToVisualStory } from "@/lib/query-story/logical-builder";
import {
  buildLayoutedGraph,
  enrichGraphWithExplain,
  type XYFlowNode,
} from "@/lib/query-story/dag-builder";
import { toast } from "sonner";
import { toPng } from "html-to-image";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTheme } from "@/hooks/use-theme";
import { SqlEditor } from "@/components/query/query-codemirror-editor";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";

import {
  Database,
  Table,
  GitFork,
  Filter,
  Sigma,
  SquareSlash,
  Tag,
  Eye,
  Terminal,
  Play,
  RotateCcw,
  Sparkles,
  Info,
  Download,
} from "lucide-react";

// Lucide icon helper mapping for different operator types
function getOperatorIcon(type: string) {
  switch (type) {
    case "source":
      return <Table className="size-4.5 text-indigo-500" />;
    case "join":
      return <GitFork className="size-4.5 text-sky-500" />;
    case "filter":
      return <Filter className="size-4.5 text-emerald-500" />;
    case "aggregate":
      return <Sigma className="size-4.5 text-amber-500" />;
    case "window":
      return <SquareSlash className="size-4.5 text-purple-500" />;
    case "classify":
      return <Tag className="size-4.5 text-rose-500" />;
    case "exists":
      return <Eye className="size-4.5 text-teal-500" />;
    default:
      return <Terminal className="size-4.5 text-brand" />;
  }
}

// Colors configuration for themed node indicators
function getNodeColorClasses(type: string): {
  border: string;
  bg: string;
  iconBg: string;
  text: string;
} {
  switch (type) {
    case "source":
      return {
        border:
          "border-indigo-500/30 hover:border-indigo-500/60 dark:border-indigo-500/20",
        bg: "bg-indigo-500/5 dark:bg-indigo-950/10",
        iconBg: "bg-indigo-500/10 dark:bg-indigo-500/20",
        text: "text-indigo-600 dark:text-indigo-400",
      };
    case "join":
      return {
        border:
          "border-sky-500/30 hover:border-sky-500/60 dark:border-sky-500/20",
        bg: "bg-sky-500/5 dark:bg-sky-950/10",
        iconBg: "bg-sky-500/10 dark:bg-sky-500/20",
        text: "text-sky-600 dark:text-sky-400",
      };
    case "filter":
      return {
        border:
          "border-emerald-500/30 hover:border-emerald-500/60 dark:border-emerald-500/20",
        bg: "bg-emerald-500/5 dark:bg-emerald-950/10",
        iconBg: "bg-emerald-500/10 dark:bg-emerald-500/20",
        text: "text-emerald-600 dark:text-emerald-400",
      };
    case "aggregate":
      return {
        border:
          "border-amber-500/30 hover:border-amber-500/60 dark:border-amber-500/20",
        bg: "bg-amber-500/5 dark:bg-amber-950/10",
        iconBg: "bg-amber-500/10 dark:bg-amber-500/20",
        text: "text-amber-600 dark:text-amber-400",
      };
    case "window":
      return {
        border:
          "border-purple-500/30 hover:border-purple-500/60 dark:border-purple-500/20",
        bg: "bg-purple-500/5 dark:bg-purple-950/10",
        iconBg: "bg-purple-500/10 dark:bg-purple-500/20",
        text: "text-purple-600 dark:text-purple-400",
      };
    case "classify":
      return {
        border:
          "border-rose-500/30 hover:border-rose-500/60 dark:border-rose-500/20",
        bg: "bg-rose-500/5 dark:bg-rose-950/10",
        iconBg: "bg-rose-500/10 dark:bg-rose-500/20",
        text: "text-rose-600 dark:text-rose-400",
      };
    case "exists":
      return {
        border:
          "border-teal-500/30 hover:border-teal-500/60 dark:border-teal-500/20",
        bg: "bg-teal-500/5 dark:bg-teal-950/10",
        iconBg: "bg-teal-500/10 dark:bg-teal-500/20",
        text: "text-teal-600 dark:text-teal-400",
      };
    default:
      return {
        border: "border-brand/30 hover:border-brand/60 dark:border-brand/20",
        bg: "bg-brand/5 dark:bg-brand/10",
        iconBg: "bg-brand/10 dark:bg-brand/20",
        text: "text-brand",
      };
  }
}

// Custom Premium Node component for displaying within XYFlow canvas
function CustomQueryNode({ data, selected }: NodeProps<XYFlowNode>) {
  const c = getNodeColorClasses(data.type);

  // Pretty format card estimates
  const formatRows = (rows?: number) => {
    if (rows === undefined) return null;
    if (rows >= 1000000) return `${(rows / 1000000).toFixed(1)}M rows`;
    if (rows >= 1000) return `${(rows / 1000).toFixed(1)}k rows`;
    return `${rows} rows`;
  };

  return (
    <div
      className={`relative px-4 py-3 rounded-2xl border bg-background shadow-xs select-none min-w-[280px] max-w-[340px] transition-all duration-300 ${
        selected
          ? "border-brand ring-2 ring-brand/20 shadow-md scale-102"
          : `${c.border} hover:shadow-xs`
      } ${c.bg}`}
    >
      {/* Target input handle (always on the left for standard pipeline direction) */}
      {data.type !== "source" && (
        <Handle
          type="target"
          position={Position.Left}
          className="!w-2.5 !h-2.5 !bg-muted-foreground/40 !border-2 !border-background hover:!bg-brand"
        />
      )}

      <div className="flex items-start gap-3">
        {/* Node Icon */}
        <div className={`p-2 rounded-xl ${c.iconBg} shrink-0`}>
          {getOperatorIcon(data.type)}
        </div>

        {/* Content detail */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className={`text-sm font-bold truncate ${c.text}`}>
              {data.label}
            </span>

            {/* Pattern Badge */}
            {data.pattern && (
              <span className="shrink-0 px-1.5 py-0.5 text-[9px] font-extrabold uppercase bg-brand/10 text-brand rounded-md tracking-wider">
                Pattern
              </span>
            )}
          </div>

          <p className="text-xs text-muted-foreground/80 font-medium leading-relaxed truncate mt-0.5">
            {data.details}
          </p>

          {/* Explain Statistics Row */}
          {(data.cardinality !== undefined || data.cost) && (
            <div className="flex items-center gap-2 mt-2 pt-1.5 border-t border-border/30 text-[9px] font-semibold text-muted-foreground/70">
              {data.cardinality !== undefined && (
                <span className="px-1.5 py-0.5 rounded bg-foreground/5 dark:bg-foreground/10 text-foreground/80 font-mono">
                  {formatRows(data.cardinality)}
                </span>
              )}
              {data.cost && (
                <span className="truncate font-mono">cost={data.cost}</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Source output handle (always on the right) */}
      {data.type !== "output" && (
        <Handle
          type="source"
          position={Position.Right}
          className="!w-2.5 !h-2.5 !bg-muted-foreground/40 !border-2 !border-background hover:!bg-brand"
        />
      )}
    </div>
  );
}

// Associate our premium node with ReactFlow nodeTypes registry
const nodeTypes = {
  customQueryNode: CustomQueryNode,
};

export function VisualQueryStoryPage() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const queryTabs = useTabStore((state) => state.queryTabs);
  const { activeConnection, connections } = useConnection();
  const dummySelectedTextRef = React.useRef<any>(null);

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

  // Filter only normal SQL editor tabs
  const sqlTabs = React.useMemo(() => {
    return queryTabs.filter((tab) => !tab.type || tab.type === "sql");
  }, [queryTabs]);

  // Selected source SQL tab id
  const [selectedTabId, setSelectedTabId] = React.useState<string>("");
  const [customSql, setCustomSql] = React.useState<string>("");

  // Default to first open SQL tab when loaded, or "__custom" if no open tabs
  React.useEffect(() => {
    if (!selectedTabId) {
      if (sqlTabs.length > 0) {
        setSelectedTabId(sqlTabs[0].id);
      } else {
        setSelectedTabId("__custom");
      }
    }
  }, [sqlTabs, selectedTabId]);

  // Find active sql text
  const selectedTab = React.useMemo(() => {
    return sqlTabs.find((tab) => tab.id === selectedTabId);
  }, [sqlTabs, selectedTabId]);

  const sourceSql = React.useMemo(() => {
    if (selectedTabId === "__custom") {
      return customSql;
    }
    return selectedTab?.sql || "";
  }, [selectedTabId, selectedTab, customSql]);

  // Visual layout states
  const [direction, setDirection] = React.useState<"LR" | "TB">("LR");
  const [nodes, setNodes, onNodesChange] = useNodesState<XYFlowNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [reactFlowInstance, setReactFlowInstance] = React.useState<any>(null);

  // Explain caching state
  const [explainCache, setExplainCache] = React.useState<Record<string, any[]>>(
    {},
  );
  const [isAnalyzing, setIsAnalyzing] = React.useState(false);

  // Core visual tree building
  const rebuildGraph = React.useCallback(() => {
    if (!sourceSql.trim()) {
      setNodes([]);
      setEdges([]);
      return;
    }

    // 1. Parse raw SQL into logical nodes & edges
    const story = parseSqlToVisualStory(sourceSql);

    // 2. Enrich with explain details if already cached for this SQL tab
    let enrichedNodes = story.nodes;
    const cachedPlan = explainCache[selectedTabId];
    if (cachedPlan) {
      enrichedNodes = enrichGraphWithExplain(story.nodes, cachedPlan);
    }

    // 3. Coordinate layouts via Dagre
    const layout = buildLayoutedGraph(enrichedNodes, story.edges, direction);
    setNodes(layout.nodes);
    setEdges(layout.edges as any);

    // Auto fit view after small delay
    if (reactFlowInstance) {
      setTimeout(() => {
        reactFlowInstance.fitView({ padding: 0.15, duration: 400 });
      }, 50);
    }
  }, [
    sourceSql,
    selectedTabId,
    direction,
    explainCache,
    reactFlowInstance,
    setNodes,
    setEdges,
  ]);

  // Re-trigger visual layouting whenever query text, orientation, or explain plan updates
  React.useEffect(() => {
    rebuildGraph();
  }, [rebuildGraph]);

  // Handles node selection in flow to highlight editor
  const onNodeClick = React.useCallback(
    (_event: React.MouseEvent, node: XYFlowNode) => {
      if (!selectedTabId || !node.data.sqlSnippet) return;

      // Fire a custom highlighting event targeted at CodeMirror
      const highlightEvent = new CustomEvent("usql:highlight-editor-text", {
        detail: {
          text: node.data.sqlSnippet,
          tabId: selectedTabId,
        },
      });
      globalThis.dispatchEvent(highlightEvent);
    },
    [selectedTabId],
  );

  // Executes EXPLAIN behind the scenes to enrich node cardinality
  const handleRunExplain = async () => {
    if (!currentConn) {
      toast.error(t("noActiveDbConn"));
      return;
    }
    if (!window.electron?.executeQuery) {
      toast.error(t("execEngineUnavailable"));
      return;
    }
    if (!sourceSql.trim()) {
      toast.error(t("sqlQueryEmpty"));
      return;
    }

    setIsAnalyzing(true);
    const explainQuery = `EXPLAIN ${sourceSql}`;

    try {
      const res = await window.electron.executeQuery({
        dbType: currentConn.dbType,
        host: currentConn.host,
        port: String(currentConn.port),
        database: currentConn.database,
        username: currentConn.username,
        password: currentConn.password,
        ssl: currentConn.ssl,
        readOnly: currentConn.readOnly,
        name: currentConn.name,
        sql: explainQuery,
      });

      if (res.ok && res.rows) {
        // Cache this explain result for the current tab
        setExplainCache((prev) => ({
          ...prev,
          [selectedTabId]: res.rows || [],
        }));

        toast.success(t("plannerDataEnriched"), {
          icon: <Sparkles className="size-4 text-brand" />,
        });
      } else {
        toast.error(res.message || t("failedToExecuteExplain"));
      }
    } catch (err: any) {
      toast.error(err.message || t("explainAnalysisError"));
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Export current graph canvas to high-quality image
  const handleExportCanvas = () => {
    const element = document.querySelector(".react-flow__viewport");
    if (!element) return;

    toast.promise(
      toPng(element as HTMLElement, {
        backgroundColor: "var(--background)",
        quality: 0.95,
        pixelRatio: 2,
      }).then((dataUrl) => {
        const link = document.createElement("a");
        link.download = `query-story-${selectedTab?.title || "query"}.png`;
        link.href = dataUrl;
        link.click();
      }),
      {
        loading: t("generatingSnapshot"),
        success: t("graphExportedSuccess"),
        error: t("snapshotCreationFailed"),
      },
    );
  };

  // Clear explain cache and reset graph view
  const handleResetGraph = () => {
    setExplainCache((prev) => {
      const copy = { ...prev };
      delete copy[selectedTabId];
      return copy;
    });
    rebuildGraph();
    if (reactFlowInstance) {
      reactFlowInstance.fitView({ padding: 0.15, duration: 400 });
    }
    toast.success(t("graphStateReset"));
  };

  // Count active pattern nodes present in the current visual DAG
  const patternCount = React.useMemo(() => {
    return nodes.filter((n) => n.data.pattern).length;
  }, [nodes]);

  return (
    <div className="flex-1 flex flex-col h-full bg-background select-none overflow-hidden">
      {/* Control Header Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-4 border-b shrink-0 bg-muted/10">
        <div className="flex flex-wrap items-center gap-6">
          {/* Source tab selector */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[11px] font-extrabold uppercase text-muted-foreground tracking-wider leading-none">
                {t("sourceEditorLabel")}
              </span>
            </div>

            <Select value={selectedTabId} onValueChange={setSelectedTabId}>
              <SelectTrigger className="pl-3.5 pr-8 py-2 rounded-xl border border-border/80 bg-background text-sm font-bold text-foreground cursor-pointer focus:outline-none focus:ring-1 focus:ring-brand hover:bg-muted/30 transition min-w-[160px]">
                <SelectValue placeholder={t("selectTabPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {sqlTabs.map((tab) => (
                  <SelectItem key={tab.id} value={tab.id}>
                    {tab.title}
                  </SelectItem>
                ))}
                <SelectItem
                  value="__custom"
                  className="font-semibold text-brand"
                >
                  ✨ {t("customQueryOption")}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Connection Selector */}
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-extrabold uppercase text-muted-foreground tracking-wider leading-none shrink-0">
              {t("erdConnectionLabel")}
            </span>
            <Select
              value={selectedConnId || ""}
              onValueChange={(val) => setSelectedConnId(val || undefined)}
              disabled={isAnalyzing}
            >
              <SelectTrigger className="pl-3.5 pr-8 py-2 rounded-xl border border-border/80 bg-background text-sm font-bold text-foreground cursor-pointer focus:outline-none focus:ring-1 focus:ring-brand hover:bg-muted/30 transition min-w-[180px]">
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

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Layout Direction segments */}
          <div className="flex items-center rounded-xl border border-border/80 p-0.5 bg-muted/10">
            <button
              onClick={() => setDirection("LR")}
              className={`px-3 py-1.5 rounded-lg text-sm font-bold cursor-pointer transition ${
                direction === "LR"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground/80 hover:text-foreground"
              }`}
            >
              {t("horizontalLR")}
            </button>
            <button
              onClick={() => setDirection("TB")}
              className={`px-3 py-1.5 rounded-lg text-sm font-bold cursor-pointer transition ${
                direction === "TB"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground/80 hover:text-foreground"
              }`}
            >
              {t("verticalTB")}
            </button>
          </div>

          {/* EXPLAIN execution analyzer */}
          <button
            onClick={handleRunExplain}
            disabled={isAnalyzing || !sourceSql.trim()}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-brand text-brand-foreground text-sm font-bold cursor-pointer transition hover:bg-brand/90 disabled:opacity-50 disabled:cursor-not-allowed shadow-xs select-none"
          >
            {isAnalyzing ? (
              <span className="size-3.5 border-2 border-brand-foreground border-t-transparent rounded-full animate-spin shrink-0" />
            ) : (
              <Play className="size-3.5 fill-current shrink-0" />
            )}
            {t("analyzePlanner")}
          </button>

          {/* Reset button */}
          <button
            onClick={handleResetGraph}
            disabled={!sourceSql.trim()}
            title={t("resetExplainTooltip")}
            className="p-2 rounded-xl border border-border bg-background cursor-pointer hover:bg-muted/40 text-muted-foreground hover:text-foreground transition disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs"
          >
            <RotateCcw className="size-3.5" />
          </button>

          {/* Export PNG */}
          <button
            onClick={handleExportCanvas}
            disabled={nodes.length === 0}
            title={t("exportPngTooltip")}
            className="p-2 rounded-xl border border-border bg-background cursor-pointer hover:bg-muted/40 text-muted-foreground hover:text-foreground transition disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs"
          >
            <Download className="size-3.5" />
          </button>
        </div>
      </div>

      {/* Main Flow Workspace */}
      <div className="flex-1 min-h-0 overflow-hidden bg-muted/5 dark:bg-muted/2">
        <ResizablePanelGroup
          key={selectedTabId === "__custom" ? "custom" : "standard"}
          orientation="horizontal"
          className="h-full w-full"
        >
          {/* Left Side: Custom SQL Editor Panel */}
          {selectedTabId === "__custom" ? (
            <ResizablePanel
              defaultSize={25}
              minSize={20}
              maxSize={45}
              className="flex flex-col bg-background min-w-[260px]"
            >
              {/* Panel Title */}
              <div className="p-4 border-b flex items-center justify-between shrink-0 select-none bg-muted/20">
                <span className="text-xs font-extrabold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                  <Terminal className="size-3.5 text-brand" />
                  {t("customQueryOption")}
                </span>
                <button
                  onClick={() => setCustomSql("")}
                  disabled={!customSql}
                  className="text-[10px] font-bold uppercase text-muted-foreground hover:text-destructive disabled:opacity-40 disabled:hover:text-muted-foreground transition cursor-pointer select-none"
                >
                  {t("cancelLabel") || "Clear"}
                </button>
              </div>

              {/* Embedded CodeMirror SQL Editor */}
              <div className="flex-1 p-4 flex flex-col min-h-0">
                <div className="flex-1 min-h-0 relative border border-border/85 rounded-xl overflow-hidden bg-background">
                  <SqlEditor
                    value={customSql}
                    onChange={setCustomSql}
                    theme={theme}
                    getSelectedTextRef={dummySelectedTextRef}
                    activeTabId={
                      selectedTabId === "__custom"
                        ? "custom-query-story"
                        : undefined
                    }
                    connection={currentConn}
                  />
                </div>
              </div>
            </ResizablePanel>
          ) : null}

          {selectedTabId === "__custom" ? <ResizableHandle withHandle /> : null}

          {/* Right Side: Visual Flow Canvas */}
          <ResizablePanel className="flex flex-col min-w-0 h-full relative">
            {!sourceSql.trim() ? (
              /* Empty SQL text State */
              <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center select-none animate-in fade-in duration-300">
                <div className="relative mb-6">
                  <div className="absolute -inset-6 bg-brand/5 rounded-full blur-2xl" />
                  <div className="relative flex items-center justify-center size-20 bg-gradient-to-br from-muted/60 to-muted/30 rounded-3xl border border-border/80 text-muted-foreground/60 shadow-sm">
                    <Terminal className="size-9" />
                  </div>
                </div>
                <h3 className="text-base font-bold text-foreground/80 mb-1.5">
                  {t("queryIsEmptyTitle")}
                </h3>
                <p className="text-sm text-muted-foreground max-w-[280px] leading-relaxed font-medium">
                  {selectedTabId === "__custom"
                    ? t("customQueryPlaceholder")
                    : t("queryIsEmptyDesc")}
                </p>
              </div>
            ) : (
              /* ReactFlow DAG Canvas */
              <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                nodeTypes={nodeTypes}
                onNodeClick={onNodeClick}
                onInit={setReactFlowInstance}
                fitView
                minZoom={0.15}
                maxZoom={1.5}
                defaultMarkerColor="var(--border)"
                className="w-full h-full"
              >
                <Background color="var(--border)" gap={16} size={1} />
                <Controls className="!bg-background !border !border-border !rounded-xl !shadow-xs !overflow-hidden" />

                {/* Instruction Banner overlay */}
                <Panel
                  position="top-left"
                  className="bg-background/95 backdrop-blur-md px-3.5 py-2.5 rounded-xl border border-border/80 shadow-sm max-w-[340px] pointer-events-none select-none"
                >
                  <div className="flex gap-2">
                    <Info className="size-4 text-brand shrink-0 mt-0.5" />
                    <div className="flex-col">
                      <h4 className="text-[11px] font-extrabold uppercase text-foreground leading-none mb-1">
                        {t("howItWorks")}
                      </h4>
                      <p className="text-xs text-muted-foreground leading-normal font-medium">
                        {t("mapTracesDesc")}
                      </p>
                      <ul className="text-[9px] text-muted-foreground/95 list-disc pl-3.5 mt-1.5 space-y-0.5 font-semibold">
                        <li>{t("clickNodeToHighlight")}</li>
                        <li>{t("hitAnalyzePlanner")}</li>
                      </ul>
                    </div>
                  </div>
                </Panel>

                {/* Business Pattern Alert Panel */}
                {patternCount > 0 && (
                  <Panel
                    position="bottom-left"
                    className="bg-gradient-to-r from-brand/10 to-teal-500/10 backdrop-blur-md px-4 py-3 rounded-2xl border border-brand/20 shadow-md max-w-[380px] pointer-events-none"
                  >
                    <div className="flex items-start gap-2.5">
                      <div className="p-1 rounded-lg bg-background/80 shrink-0">
                        <Sparkles className="size-4.5 text-brand" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-foreground leading-none mb-1">
                          {t("businessPatternsDetected")}
                        </h4>
                        <p className="text-xs text-muted-foreground/95 font-medium leading-relaxed">
                          {t("patternsDesc", { count: patternCount })}
                        </p>
                      </div>
                    </div>
                  </Panel>
                )}
              </ReactFlow>
            )}
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
}
