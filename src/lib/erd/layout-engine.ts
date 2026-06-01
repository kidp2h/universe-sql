import dagre from "@dagrejs/dagre";
import type { ERDNode, ERDEdge, TableNodeData, Relation } from "./types";
import { MarkerType } from "@xyflow/react";

export interface LayoutOptions {
  direction?: "TB" | "LR";
  nodeWidth?: number;
  nodeHeight?: number; // Base height, will dynamically size based on columns
}

export function buildGraphElements(
  tables: TableNodeData[],
  relations: Relation[],
): { nodes: ERDNode[]; edges: ERDEdge[] } {
  const nodes: ERDNode[] = tables.map((t) => ({
    id: `${t.schema}.${t.tableName}`,
    type: "table",
    position: { x: 0, y: 0 },
    data: t,
  }));

  const edges: ERDEdge[] = relations.map((rel, index) => {
    const sourceId = `${rel.sourceSchema}.${rel.sourceTable}`;
    const targetId = `${rel.targetSchema}.${rel.targetTable}`;
    return {
      id: `e-${sourceId}-${rel.sourceColumn}-${targetId}-${rel.targetColumn}-${index}`,
      source: sourceId,
      sourceHandle: `${sourceId}-${rel.sourceColumn}-source`,
      target: targetId,
      targetHandle: `${targetId}-${rel.targetColumn}-target`,
      type: "smoothstep",
      animated: false,
      style: {
        strokeWidth: 2,
        stroke: "var(--muted-foreground)", // will be overridden by CSS/theme
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 15,
        height: 15,
        color: "var(--muted-foreground)",
      },
    };
  });

  return { nodes, edges };
}

export function applyDagreLayout(
  nodes: ERDNode[],
  edges: ERDEdge[],
  options: LayoutOptions = {},
): { nodes: ERDNode[]; edges: ERDEdge[] } {
  const { direction = "LR", nodeWidth = 300, nodeHeight = 50 } = options;

  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  // LR provides a better view for ERDs
  dagreGraph.setGraph({ rankdir: direction, ranksep: 100, nodesep: 50 });

  nodes.forEach((node) => {
    // Calculate approximate height: header + each column
    const approxHeight = nodeHeight + node.data.columns.length * 28;
    dagreGraph.setNode(node.id, { width: nodeWidth, height: approxHeight });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const newNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - nodeWidth / 2,
        y: nodeWithPosition.y - nodeWithPosition.height / 2,
      },
    };
  });

  return { nodes: newNodes, edges };
}
