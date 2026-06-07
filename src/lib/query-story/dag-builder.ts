import dagre from "@dagrejs/dagre";
import type { Node } from "@xyflow/react";
import type { StoryNode, StoryEdge } from "./types";

export type XYFlowNode = Node<
  {
    label: string;
    details: string;
    type: string;
    sqlSnippet?: string;
    cardinality?: number;
    cost?: string;
    pattern?: {
      name: string;
      description: string;
    };
  },
  "customQueryNode"
>;

export interface XYFlowEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  animated?: boolean;
  type?: string;
  style?: React.CSSProperties;
}

// Compute beautiful coordinates for each node using dagre
export function buildLayoutedGraph(
  nodes: StoryNode[],
  edges: StoryEdge[],
  direction: "LR" | "TB" = "LR",
): { nodes: XYFlowNode[]; edges: XYFlowEdge[] } {
  const g = new dagre.graphlib.Graph();
  g.setGraph({
    rankdir: direction,
    nodesep: 60,
    ranksep: 120,
    marginx: 40,
    marginy: 40,
  });
  g.setDefaultEdgeLabel(() => ({}));

  const nodeWidth = 300;
  const nodeHeight = 85;

  // Add nodes to dagre
  for (const node of nodes) {
    g.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  }

  // Add edges to dagre
  for (const edge of edges) {
    g.setEdge(edge.source, edge.target);
  }

  // Compute layout
  dagre.layout(g);

  // Map to XYFlow nodes
  const layoutedNodes: XYFlowNode[] = nodes.map((node) => {
    const nodeWithPos = g.node(node.id);
    return {
      id: node.id,
      type: "customQueryNode", // Register a single custom type with premium themed look
      position: {
        x: nodeWithPos.x - nodeWidth / 2,
        y: nodeWithPos.y - nodeHeight / 2,
      },
      data: {
        label: node.label,
        details: node.details,
        type: node.type,
        sqlSnippet: node.sqlSnippet,
        cardinality: node.cardinality,
        cost: node.cost,
        pattern: node.pattern,
      },
    };
  });

  // Map to XYFlow edges
  const layoutedEdges: XYFlowEdge[] = edges.map((edge) => {
    return {
      id: edge.id,
      source: edge.source,
      target: edge.target,
      label: edge.label,
      animated:
        edge.animated ||
        edge.source.includes("cte_ref") ||
        edge.target.includes("cte_ref"),
      type: "smoothstep",
      style: {
        strokeWidth: 2,
      },
    };
  });

  return { nodes: layoutedNodes, edges: layoutedEdges };
}

// Extract cost and rows estimates from PostgreSQL EXPLAIN results (supports both JSON or plain text formats)
export function enrichGraphWithExplain(
  nodes: StoryNode[],
  explainRows: any[],
): StoryNode[] {
  if (!explainRows || explainRows.length === 0) {
    return nodes;
  }

  try {
    // 1. Try parsing JSON format explain if present
    const firstRowVal = Object.values(explainRows[0])[0];
    if (
      typeof firstRowVal === "string" &&
      (firstRowVal.trim().startsWith("[") || firstRowVal.trim().startsWith("{"))
    ) {
      try {
        const jsonPlan = JSON.parse(firstRowVal);
        const plan = Array.isArray(jsonPlan)
          ? jsonPlan[0]?.Plan
          : jsonPlan.Plan;
        if (plan) {
          const statsMap = new Map<
            string,
            { rows: number; cost: string; nodeType: string }
          >();
          traverseJsonPlan(plan, statsMap);
          return mergeStatsIntoNodes(nodes, statsMap);
        }
      } catch (jsonErr) {
        console.warn("Failed to parse EXPLAIN JSON plan:", jsonErr);
      }
    } else if (typeof firstRowVal === "object" && firstRowVal !== null) {
      // It was already parsed as JSON object by the database runner
      const plan = Array.isArray(explainRows)
        ? explainRows[0]?.Plan || explainRows[0]?.["QUERY PLAN"]?.[0]?.Plan
        : null;
      if (plan) {
        const statsMap = new Map<
          string,
          { rows: number; cost: string; nodeType: string }
        >();
        traverseJsonPlan(plan, statsMap);
        return mergeStatsIntoNodes(nodes, statsMap);
      }
    }

    // 2. Fall back to text line scanning
    const statsMap = new Map<
      string,
      { rows: number; cost: string; nodeType: string }
    >();

    for (const row of explainRows) {
      const line = String(Object.values(row)[0] || "");

      // Look for table/relation scans: Seq Scan on users, Index Scan on orders, etc.
      // E.g. Seq Scan on customers c  (cost=0.00..12.50 rows=100 width=32)
      const scanMatch = line.match(
        /(Seq Scan|Index Scan|Index Only Scan|Bitmap Heap Scan)\s+on\s+([a-zA-Z0-9_]+)/i,
      );
      const costMatch = line.match(/cost=([0-9.]+)\.\.([0-9.]+)/i);
      const rowsMatch = line.match(/rows=(\d+)/i);

      if (scanMatch && rowsMatch) {
        const tableName = scanMatch[2];
        const costStr = costMatch ? `${costMatch[1]}..${costMatch[2]}` : "";
        statsMap.set(tableName.toLowerCase(), {
          rows: parseInt(rowsMatch[1], 10),
          cost: costStr,
          nodeType: scanMatch[1],
        });
      }

      // Capture join costs: Hash Join, Nested Loop, Merge Join
      const joinMatch = line.match(/(Hash Join|Nested Loop|Merge Join)/i);
      if (joinMatch && rowsMatch) {
        const costStr = costMatch ? `${costMatch[1]}..${costMatch[2]}` : "";
        statsMap.set("join", {
          rows: parseInt(rowsMatch[1], 10),
          cost: costStr,
          nodeType: joinMatch[1],
        });
      }

      // Capture aggregate costs
      const aggMatch = line.match(/(GroupAggregate|HashAggregate|Aggregate)/i);
      if (aggMatch && rowsMatch) {
        const costStr = costMatch ? `${costMatch[1]}..${costMatch[2]}` : "";
        statsMap.set("aggregate", {
          rows: parseInt(rowsMatch[1], 10),
          cost: costStr,
          nodeType: aggMatch[1],
        });
      }

      // Capture overall output cost (top line of EXPLAIN)
      if (
        line.trim().startsWith("Limit") ||
        line.trim().startsWith("Sort") ||
        line.trim().includes("Result")
      ) {
        if (rowsMatch) {
          const costStr = costMatch ? `${costMatch[1]}..${costMatch[2]}` : "";
          statsMap.set("output", {
            rows: parseInt(rowsMatch[1], 10),
            cost: costStr,
            nodeType: "output",
          });
        }
      }
    }

    return mergeStatsIntoNodes(nodes, statsMap);
  } catch (err) {
    console.error("Error enriching graph with EXPLAIN:", err);
    return nodes;
  }
}

// Deep JSON Plan traversal
function traverseJsonPlan(
  planNode: any,
  statsMap: Map<string, { rows: number; cost: string; nodeType: string }>,
) {
  if (!planNode) return;

  const nodeType = planNode["Node Type"];
  const relationName = planNode["Relation Name"];
  const rows = planNode["Plan Rows"];
  const cost = `${planNode["Startup Cost"]}..${planNode["Total Cost"]}`;

  if (relationName) {
    statsMap.set(relationName.toLowerCase(), { rows, cost, nodeType });
  }

  if (nodeType?.includes("Join") || nodeType === "Nested Loop") {
    statsMap.set("join", { rows, cost, nodeType });
  }

  if (nodeType === "Aggregate") {
    statsMap.set("aggregate", { rows, cost, nodeType });
  }

  if (nodeType === "Limit" || nodeType === "Sort") {
    statsMap.set("output", { rows, cost, nodeType });
  }

  // Traverse children
  if (planNode.Plans && Array.isArray(planNode.Plans)) {
    for (const subPlan of planNode.Plans) {
      traverseJsonPlan(subPlan, statsMap);
    }
  }
}

// Map parsed statistics to corresponding logical story nodes
function mergeStatsIntoNodes(
  nodes: StoryNode[],
  statsMap: Map<string, { rows: number; cost: string; nodeType: string }>,
): StoryNode[] {
  return nodes.map((node) => {
    // 1. Match Source Nodes by table name (e.g. "customers (c)" -> "customers")
    if (node.type === "source") {
      const matchWord = node.label.split(/\s+/)[0]?.toLowerCase() || "";
      const stats = statsMap.get(matchWord);
      if (stats) {
        return { ...node, cardinality: stats.rows, cost: stats.cost };
      }
    }

    // 2. Match Join Nodes
    if (node.type === "join") {
      const stats = statsMap.get("join");
      if (stats) {
        return { ...node, cardinality: stats.rows, cost: stats.cost };
      }
    }

    // 3. Match Aggregate Nodes
    if (node.type === "aggregate") {
      const stats = statsMap.get("aggregate");
      if (stats) {
        return { ...node, cardinality: stats.rows, cost: stats.cost };
      }
    }

    // 4. Match Output Nodes
    if (node.type === "output") {
      const stats = statsMap.get("output");
      if (stats) {
        return { ...node, cardinality: stats.rows, cost: stats.cost };
      }
    }

    return node;
  });
}
