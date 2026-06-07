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
  addEdge,
  ReactFlowProvider,
  Connection,
  MarkerType,
  ConnectionLineType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { toast } from "sonner";
import { Copy, FileCode, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/use-theme";
import { resolveIsDark } from "@/lib/theme-init";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import CodeMirror from "@uiw/react-codemirror";
import { sql } from "@codemirror/lang-sql";
import {
  editorThemeLight,
  editorThemeDark,
  fontTheme,
} from "@/components/query/query-codemirror-editor";
import { DesignerTableNode, ColumnData } from "./designer-table-node";
import { DesignerToolbar } from "./designer-toolbar";

const nodeTypes = {
  designerTable: DesignerTableNode,
};

function DBDesignerInner() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const [isDark, setIsDark] = React.useState(() => resolveIsDark(theme));
  const [isSqlPanelOpen, setIsSqlPanelOpen] = React.useState(true);
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    setIsDark(resolveIsDark(theme));
  }, [theme]);

  const [nodes, setNodes, onNodesChange] = useNodesState<any>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<any>([]);

  // Stable callbacks to modify tables/columns
  const onUpdateTable = React.useCallback(
    (id: string, tableName: string, columns: ColumnData[]) => {
      setNodes((nds) =>
        nds.map((n) =>
          n.id === id
            ? {
                ...n,
                data: {
                  ...n.data,
                  tableName,
                  columns,
                },
              }
            : n,
        ),
      );
    },
    [setNodes],
  );

  const onDeleteTable = React.useCallback(
    (id: string) => {
      setNodes((nds) => nds.filter((n) => n.id !== id));
      setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id));
    },
    [setNodes, setEdges],
  );

  const onStartEdit = React.useCallback(
    (id: string) => {
      setNodes((nds) =>
        nds.map((n) => ({
          ...n,
          data: {
            ...n.data,
            isEditing: n.id === id,
          },
        })),
      );
    },
    [setNodes],
  );

  const onEndEdit = React.useCallback(
    (id: string) => {
      setNodes((nds) =>
        nds.map((n) =>
          n.id === id
            ? {
                ...n,
                data: {
                  ...n.data,
                  isEditing: false,
                },
              }
            : n,
        ),
      );
    },
    [setNodes],
  );

  // Add new table node
  const handleAddTable = React.useCallback(() => {
    const id = `tbl-${Date.now()}`;
    const newTable = {
      id,
      type: "designerTable",
      selected: true,
      position: {
        x: 100 + Math.random() * 150,
        y: 100 + Math.random() * 150,
      },
      data: {
        id,
        tableName: `table_${nodes.length + 1}`,
        columns: [
          {
            id: `col-${Date.now()}-1`,
            name: "id",
            type: "SERIAL",
            isPrimary: true,
            isNullable: false,
          },
        ],
        isEditing: true,
        onUpdateTable,
        onDeleteTable,
        onStartEdit,
        onEndEdit,
      },
    };
    setNodes((nds) => {
      const updated = nds.map((n) => ({
        ...n,
        selected: false,
        data: {
          ...n.data,
          isEditing: false,
        },
      }));
      return [...updated, newTable];
    });
    toast.success(t("tableAdded") || "Table added to designer canvas!");
  }, [
    nodes.length,
    onUpdateTable,
    onDeleteTable,
    onStartEdit,
    onEndEdit,
    setNodes,
    t,
  ]);

  const handleClearCanvas = React.useCallback(() => {
    setNodes([]);
    setEdges([]);
    toast.success(t("canvasCleared") || "Canvas cleared successfully.");
  }, [setNodes, setEdges, t]);

  // Connect columns (represent as foreign key)
  const onConnect = React.useCallback(
    (connection: Connection) => {
      if (connection.source === connection.target) {
        toast.warning(
          t("selfReferenceWarning") ||
            "Self-referencing connections are not supported.",
        );
        return;
      }
      setEdges((eds) =>
        addEdge(
          {
            ...connection,
            animated: true,
            style: { strokeWidth: 2, stroke: "var(--brand)" },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: "var(--brand)",
            },
          },
          eds,
        ),
      );
    },
    [setEdges, t],
  );

  // Parse edges to identify foreign keys
  const enrichedNodes = React.useMemo(() => {
    const fkColIds = new Set<string>();
    for (const edge of edges) {
      // Format sourceHandle: tableId-columnId-source
      const sourceColId = edge.sourceHandle?.replace("-source", "");
      if (sourceColId) {
        fkColIds.add(sourceColId);
      }
    }

    return nodes.map((node: any) => ({
      ...node,
      data: {
        ...node.data,
        columns: node.data.columns.map((col: ColumnData) => ({
          ...col,
          isForeign: fkColIds.has(`${node.id}-${col.id}`),
        })),
      },
    }));
  }, [nodes, edges]);

  // Generate DDL SQL Script
  const generatedSql = React.useMemo(() => {
    let sql = `-- Database Schema DDL\n-- Generated by Universe SQL Database Designer\n\n`;

    // 1. Generate tables
    for (const node of nodes) {
      const { tableName, columns } = node.data;
      if (!tableName) continue;

      sql += `CREATE TABLE ${tableName} (\n`;
      const colLines = columns.map((col: ColumnData) => {
        let line = `    ${col.name} ${col.type}`;
        if (col.isPrimary) {
          line += " PRIMARY KEY";
        }
        if (!col.isNullable && !col.isPrimary) {
          line += " NOT NULL";
        }
        return line;
      });
      sql += colLines.join(",\n");
      sql += `\n);\n\n`;
    }

    // 2. Generate Foreign Keys
    for (const edge of edges) {
      const sourceNode = nodes.find((n: any) => n.id === edge.source);
      const targetNode = nodes.find((n: any) => n.id === edge.target);
      if (!sourceNode || !targetNode) continue;

      const sourceColId = edge.sourceHandle
        ?.replace("-source", "")
        ?.replace(`${edge.source}-`, "");
      const targetColId = edge.targetHandle
        ?.replace("-target", "")
        ?.replace(`${edge.target}-`, "");

      const sourceCol = sourceNode.data.columns.find(
        (c: ColumnData) => c.id === sourceColId,
      );
      const targetCol = targetNode.data.columns.find(
        (c: ColumnData) => c.id === targetColId,
      );

      if (!sourceCol || !targetCol) continue;

      const constraintName = `fk_${sourceNode.data.tableName}_${sourceCol.name}`;
      sql += `ALTER TABLE ${sourceNode.data.tableName}\n`;
      sql += `ADD CONSTRAINT ${constraintName}\n`;
      sql += `FOREIGN KEY (${sourceCol.name}) REFERENCES ${targetNode.data.tableName}(${targetCol.name});\n\n`;
    }

    return sql;
  }, [nodes, edges]);

  const handleCopySql = () => {
    navigator.clipboard.writeText(generatedSql);
    setCopied(true);
    toast.success(t("sqlCopied") || "SQL copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-background select-none overflow-hidden">
      {/* Header Panel */}
      <div className="flex items-center justify-between px-6 py-4 border-b shrink-0 bg-muted/10">
        <h3 className="text-sm font-extrabold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 leading-none">
          <FileCode className="size-4.5 text-brand" />
          {t("dbDesignerTitle") || "Database Designer"}
        </h3>
        <p className="text-xs text-muted-foreground/80 font-medium pl-6 leading-normal select-none hidden md:block">
          {t("dbDesignerDesc") ||
            "Visually design tables and columns, draw relationships, and generate SQL schema."}
        </p>
      </div>

      <div className="flex-1 min-h-0 relative">
        <ResizablePanelGroup orientation="horizontal" className="h-full w-full">
          {/* Main Visual Canvas */}
          <ResizablePanel
            defaultSize={65}
            minSize={30}
            className="relative flex flex-col"
          >
            <div
              className="w-full h-full relative"
              style={
                {
                  "--xy-background-color": "var(--background)",
                  "--xy-node-color": "var(--foreground)",
                  "--xy-edge-stroke": "var(--border)",
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
                nodes={enrichedNodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                nodeTypes={nodeTypes}
                connectionLineStyle={{ stroke: "var(--brand)", strokeWidth: 2 }}
                connectionLineType={ConnectionLineType.SmoothStep}
                fitView
                fitViewOptions={{ padding: 0.2 }}
                minZoom={0.2}
                maxZoom={1.5}
                deleteKeyCode={["Delete", "Backspace"]}
                proOptions={{ hideAttribution: true }}
              >
                <Background gap={24} size={2} color="var(--border)" />
                <Controls className="!bg-background !border !border-border !rounded-xl !shadow-xs !overflow-hidden" />

                <Panel position="bottom-right">
                  <DesignerToolbar
                    onAddTable={handleAddTable}
                    onClearCanvas={handleClearCanvas}
                    isSqlPanelOpen={isSqlPanelOpen}
                    onToggleSqlPanel={() => setIsSqlPanelOpen((p) => !p)}
                  />
                </Panel>
              </ReactFlow>
            </div>
          </ResizablePanel>

          {isSqlPanelOpen && <ResizableHandle withHandle />}

          {/* Generated SQL DDL Panel */}
          {isSqlPanelOpen && (
            <ResizablePanel
              defaultSize={35}
              minSize={20}
              className="flex flex-col bg-card border-l"
            >
              <div className="flex items-center justify-between px-4 py-3 border-b shrink-0 bg-muted/20">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  {t("generatedSql") || "Generated DDL SQL"}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5 text-xs font-bold cursor-pointer"
                  onClick={handleCopySql}
                >
                  {copied ? (
                    <>
                      <Check className="size-3.5 text-emerald-500" />
                      {t("copiedLabel") || "Copied"}
                    </>
                  ) : (
                    <>
                      <Copy className="size-3.5" />
                      {t("copySql") || "Copy SQL"}
                    </>
                  )}
                </Button>
              </div>

              {/* Readonly SQL Code Editor */}
              <div className="flex-1 relative min-h-0 overflow-hidden bg-background">
                <CodeMirror
                  value={generatedSql}
                  theme={theme === "light" ? editorThemeLight : editorThemeDark}
                  extensions={[sql(), fontTheme]}
                  height="100%"
                  editable={false}
                  readOnly={true}
                  className="h-full w-full"
                />
              </div>
            </ResizablePanel>
          )}
        </ResizablePanelGroup>
      </div>
    </div>
  );
}

export function DBDesignerPage() {
  return (
    <ReactFlowProvider>
      <DBDesignerInner />
    </ReactFlowProvider>
  );
}
