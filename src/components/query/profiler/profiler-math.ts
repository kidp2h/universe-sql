export interface QueryPlanNode {
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
  Plans?: QueryPlanNode[];
  [key: string]: any;
}

export interface CalculatedPlanNode {
  id: string;
  nodeType: string;
  relationName?: string;
  alias?: string;
  indexName?: string;
  filter?: string;
  indexCond?: string;
  hashCond?: string;
  joinFilter?: string;

  startupTime: number;
  totalTime: number;
  loops: number;
  rows: number;
  planRows: number;

  inclusiveTime: number; // Actual Total Time * Loops (ms)
  exclusiveTime: number; // Inclusive Time - Sum(Children Inclusive Time) (ms)

  percentageInclusive: number; // of root total timing
  percentageExclusive: number; // of root total timing

  plans: CalculatedPlanNode[];
  rawNode: QueryPlanNode;
}

/**
 * Recursively parses Postgres raw explain plan node, calculating inclusive/exclusive times.
 */
export function calculateNodeTimings(
  rawNode: any,
  rootTiming?: number,
): CalculatedPlanNode {
  // Normalize node object (PostgreSQL JSON can wrap it under "Plan" key at root)
  const node = rawNode?.Plan ? rawNode.Plan : rawNode;

  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : String(Math.random() + Date.now());

  const nodeType = node["Node Type"] || "Unknown";
  const loops = node["Actual Loops"] !== undefined ? node["Actual Loops"] : 1;
  const startupTime =
    node["Actual Startup Time"] !== undefined ? node["Actual Startup Time"] : 0;
  const totalTime =
    node["Actual Total Time"] !== undefined ? node["Actual Total Time"] : 0;
  const rows = node["Actual Rows"] !== undefined ? node["Actual Rows"] : 0;
  const planRows = node["Plan Rows"] !== undefined ? node["Plan Rows"] : 0;

  // Inclusive Time = Actual Total Time * Loops (total active ms)
  const inclusiveTime = totalTime * loops;

  // If this is the root node, it defines the root total timing
  const currentRootTiming =
    rootTiming || (inclusiveTime > 0 ? inclusiveTime : 1);

  // Recursively calculate timings for children sub-plans
  const plans: CalculatedPlanNode[] = [];
  let childrenInclusiveSum = 0;

  if (node.Plans && Array.isArray(node.Plans)) {
    for (const childRaw of node.Plans) {
      const childCalculated = calculateNodeTimings(childRaw, currentRootTiming);
      plans.push(childCalculated);
      childrenInclusiveSum += childCalculated.inclusiveTime;
    }
  }

  // Exclusive Time = Inclusive Time - Sum of Children's Inclusive Times
  // Bound to 0 to prevent negative values due to slight measurement variance in PostgreSQL
  const exclusiveTime = Math.max(0, inclusiveTime - childrenInclusiveSum);

  // Compute percentages
  const percentageInclusive = (inclusiveTime / currentRootTiming) * 100;
  const percentageExclusive = (exclusiveTime / currentRootTiming) * 100;

  return {
    id,
    nodeType,
    relationName: node["Relation Name"],
    alias: node.Alias,
    indexName: node["Index Name"],
    filter: node.Filter,
    indexCond: node["Index Cond"],
    hashCond: node["Hash Cond"],
    joinFilter: node["Join Filter"],

    startupTime,
    totalTime,
    loops,
    rows,
    planRows,

    inclusiveTime,
    exclusiveTime,

    percentageInclusive,
    percentageExclusive,

    plans,
    rawNode: node,
  };
}

/**
 * Formats time in milliseconds to a highly readable string.
 */
export function formatTiming(ms: number): string {
  if (ms === 0) return "0ms";
  if (ms < 1) return `${(ms * 1000).toFixed(0)}µs`;
  if (ms < 1000) return `${ms.toFixed(1)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

/**
 * Searches the tree recursively to find the node with the highest exclusive execution time.
 */
export function findHotNode(node: CalculatedPlanNode): {
  node: CalculatedPlanNode;
  time: number;
} {
  let hotNode = node;
  let maxExclusive = node.exclusiveTime;

  function traverse(currentNode: CalculatedPlanNode) {
    if (currentNode.exclusiveTime > maxExclusive) {
      maxExclusive = currentNode.exclusiveTime;
      hotNode = currentNode;
    }
    for (const child of currentNode.plans) {
      traverse(child);
    }
  }

  traverse(node);
  return { node: hotNode, time: maxExclusive };
}
