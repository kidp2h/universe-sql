import * as React from "react";
import { useTranslation } from "react-i18next";
import {
  ReactFlow,
  Background,
  useNodesState,
  useEdgesState,
  Panel,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useTheme } from "@/hooks/use-theme";
import { resolveIsDark } from "@/lib/theme-init";
import { Search, X, Database } from "lucide-react";
import { ERDTableNode } from "./erd-table-node";
import { ERDToolbar } from "./erd-toolbar";
import { buildGraphElements, applyDagreLayout } from "@/lib/erd/layout-engine";
import type {
  TableNodeData,
  Relation,
  ERDNode,
  ERDEdge,
} from "@/lib/erd/types";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const nodeTypes = {
  table: ERDTableNode,
};

interface ERDCanvasProps {
  tables: TableNodeData[];
  relations: Relation[];
}

export function ERDCanvas({ tables, relations }: ERDCanvasProps) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const [isDark, setIsDark] = React.useState(() => resolveIsDark(theme));

  React.useEffect(() => {
    setIsDark(resolveIsDark(theme));
  }, [theme]);

  const [nodes, setNodes, onNodesChange] = useNodesState<ERDNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<ERDEdge>([]);

  // Tables Checklist State
  const [visibleTableKeys, setVisibleTableKeys] = React.useState<Set<string>>(
    new Set(),
  );
  const [isTablesPanelOpen, setIsTablesPanelOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [showOnlyKeys, setShowOnlyKeys] = React.useState(false);

  // Default to empty Set (deselect all) when database tables prop updates
  React.useEffect(() => {
    setVisibleTableKeys(new Set());
  }, [tables]);

  // Filter tables and relations based on visibleTableKeys
  const visibleTables = React.useMemo(() => {
    const filtered = tables.filter((t) =>
      visibleTableKeys.has(`${t.schema}.${t.tableName}`),
    );
    if (showOnlyKeys) {
      return filtered.map((t) => ({
        ...t,
        columns: t.columns.filter((col) => col.isPrimary || col.isForeign),
      }));
    }
    return filtered;
  }, [tables, visibleTableKeys, showOnlyKeys]);

  const visibleRelations = React.useMemo(() => {
    return relations.filter(
      (r) =>
        visibleTableKeys.has(`${r.sourceSchema}.${r.sourceTable}`) &&
        visibleTableKeys.has(`${r.targetSchema}.${r.targetTable}`),
    );
  }, [relations, visibleTableKeys]);

  // Recalculate layout whenever filtered tables/relations update
  React.useEffect(() => {
    const { nodes: initialNodes, edges: initialEdges } = buildGraphElements(
      visibleTables,
      visibleRelations,
    );
    const layouted = applyDagreLayout(initialNodes, initialEdges);
    setNodes(layouted.nodes);
    setEdges(layouted.edges);
  }, [visibleTables, visibleRelations, setNodes, setEdges]);

  const handleAutoLayout = React.useCallback(() => {
    const layouted = applyDagreLayout(nodes as any, edges as any);
    setNodes(layouted.nodes);
    setEdges([...layouted.edges]);
  }, [nodes, edges, setNodes, setEdges]);

  // Checklist Actions
  const handleToggleTable = (key: string) => {
    setVisibleTableKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    setVisibleTableKeys(
      new Set(tables.map((t) => `${t.schema}.${t.tableName}`)),
    );
  };

  const handleClearAll = () => {
    setVisibleTableKeys(new Set());
  };

  // Search filtering for checklist
  const filteredTablesForChecklist = React.useMemo(() => {
    return tables.filter(
      (t) =>
        t.tableName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.schema.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [tables, searchQuery]);

  return (
    <div
      className="w-full h-full relative select-none"
      style={
        {
          "--xy-background-color": "var(--background)",
          "--xy-node-color": "var(--foreground)",
          "--xy-edge-stroke": "var(--muted-foreground)",
          "--xy-node-background-color": "transparent",
          "--xy-node-border": "none",
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
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.1}
        maxZoom={1.5}
        deleteKeyCode={null}
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={24} size={2} color="var(--border)" />

        {visibleTables.length === 0 && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-10">
            <div className="bg-card/85 backdrop-blur-md border border-border/80 rounded-xl p-6 shadow-xl max-w-sm text-center flex flex-col items-center gap-3 animate-fade-in pointer-events-auto">
              <Database className="h-8 w-8 text-brand animate-pulse" />
              <h3 className="text-sm font-extrabold text-foreground uppercase tracking-wider">
                {t("erdTitle")}
              </h3>
              <p className="text-sm text-muted-foreground/90 font-medium leading-normal">
                {t("erdSelectTablesPrompt")}
              </p>
              <Button
                size="sm"
                className="h-8 text-sm font-bold w-full mt-1 bg-brand text-white hover:bg-brand/90 cursor-pointer border-0"
                onClick={() => setIsTablesPanelOpen(true)}
              >
                {t("erdTablesList")}
              </Button>
            </div>
          </div>
        )}

        {/* Floating Sidebar checklist Panel */}
        {isTablesPanelOpen && (
          <Panel position="top-left" className="m-4 z-20">
            <div className="w-72 max-h-[calc(100vh-180px)] flex flex-col bg-card/90 backdrop-blur-md border border-border/80 rounded-xl shadow-xl overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-border/60 shrink-0">
                <span className="text-xs font-extrabold text-foreground flex items-center gap-1.5 uppercase tracking-wider leading-none">
                  <Database className="h-3.5 w-3.5 text-emerald-500" />
                  {t("erdTablesList")}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 rounded-md text-muted-foreground hover:text-foreground shrink-0"
                  onClick={() => setIsTablesPanelOpen(false)}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>

              {/* Action/Search Bar */}
              <div className="p-3 border-b border-border/60 flex flex-col gap-2 shrink-0 bg-muted/10">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/60" />
                  <Input
                    placeholder={t("erdSearchTables")}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 h-8 text-sm bg-background"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>

                <div className="flex items-center justify-between gap-2">
                  <Button
                    variant="outline"
                    className="h-6 flex-1 text-[9px] font-bold py-0"
                    onClick={handleSelectAll}
                  >
                    {t("erdSelectAll")}
                  </Button>
                  <Button
                    variant="outline"
                    className="h-6 flex-1 text-[9px] font-bold py-0"
                    onClick={handleClearAll}
                  >
                    {t("erdClearAll")}
                  </Button>
                </div>
              </div>

              {/* Scrollable Checklist */}
              <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
                {filteredTablesForChecklist.map((t) => {
                  const key = `${t.schema}.${t.tableName}`;
                  const isChecked = visibleTableKeys.has(key);
                  return (
                    <div
                      key={key}
                      onClick={() => handleToggleTable(key)}
                      className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-muted/40 cursor-pointer transition-colors"
                    >
                      <Checkbox
                        checked={isChecked}
                        className="rounded-[4px] shrink-0 pointer-events-none"
                      />
                      <span className="text-sm truncate font-medium text-foreground">
                        {t.schema !== "public" && (
                          <span className="text-muted-foreground/60 mr-0.5">
                            {t.schema}.
                          </span>
                        )}
                        {t.tableName}
                      </span>
                    </div>
                  );
                })}
                {filteredTablesForChecklist.length === 0 && (
                  <div className="py-6 text-center text-sm text-muted-foreground italic">
                    {t("erdNoTablesMatching")}
                  </div>
                )}
              </div>
            </div>
          </Panel>
        )}

        <Panel position="bottom-right">
          <ERDToolbar
            onAutoLayout={handleAutoLayout}
            onToggleTablesPanel={() => setIsTablesPanelOpen((p) => !p)}
            isTablesPanelOpen={isTablesPanelOpen}
            totalTablesCount={tables.length}
            visibleTablesCount={visibleTables.length}
            showOnlyKeys={showOnlyKeys}
            onToggleOnlyKeys={() => setShowOnlyKeys((k) => !k)}
          />
        </Panel>
      </ReactFlow>
    </div>
  );
}
