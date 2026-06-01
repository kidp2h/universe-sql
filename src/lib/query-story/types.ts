export type StoryNodeType =
  | "source" // Table / CTE reference
  | "join" // JOIN clause
  | "filter" // WHERE / HAVING clause
  | "aggregate" // GROUP BY / aggregates
  | "window" // Window function / RANK / ROW_NUMBER
  | "classify" // CASE WHEN / classification
  | "exists" // EXISTS / IN subquery check
  | "cte" // CTE definition wrapper (with virtual table)
  | "output"; // Final SELECT / Limit

export interface StoryNode {
  id: string;
  type: StoryNodeType;
  label: string;
  details: string;
  sqlSnippet?: string; // Text fragment to highlight in SQL editor
  cardinality?: number; // Planner estimated rows from EXPLAIN
  cost?: string; // Planner estimated cost (e.g. "0.00..12.50")
  columns?: string[]; // Output columns or columns involved
  // Business logic category/pattern details
  pattern?: {
    name: string; // "Deduplication", "Latest Records", "VIP Classification", etc.
    description: string;
  };
}

export interface StoryEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  animated?: boolean;
}

export interface VisualQueryStoryData {
  nodes: StoryNode[];
  edges: StoryEdge[];
}

export interface QueryExplainResult {
  ok: boolean;
  message?: string;
  rows?: any[];
}
