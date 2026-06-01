import { Parser } from "node-sql-parser";
import type { StoryNode, StoryEdge } from "./types";

const parser = new Parser();

// Helper to stringify binary expressions, column references, etc. from node-sql-parser AST
export function exprToString(expr: any): string {
  if (!expr) return "";
  if (typeof expr === "string") return expr;
  if (typeof expr === "number") return String(expr);

  switch (expr.type) {
    case "column_ref":
      return expr.table ? `${expr.table}.${expr.column}` : expr.column;
    case "binary_expr":
      return `${exprToString(expr.left)} ${expr.operator} ${exprToString(expr.right)}`;
    case "number":
      return String(expr.value);
    case "single_quote_string":
    case "string":
      return `'${expr.value}'`;
    case "aggr_func": {
      const args = expr.args?.expr
        ? exprToString(expr.args.expr)
        : expr.args && Array.isArray(expr.args)
          ? expr.args.map(exprToString).join(", ")
          : "";
      let overStr = "";
      if (expr.over) {
        const partition = expr.over.partitionby
          ? `PARTITION BY ${expr.over.partitionby.map(exprToString).join(", ")}`
          : "";
        const order = expr.over.orderby
          ? `ORDER BY ${expr.over.orderby.map((o: any) => `${exprToString(o.expr)} ${o.type}`).join(", ")}`
          : "";
        const parts = [partition, order].filter(Boolean).join(" ");
        overStr = ` OVER (${parts})`;
      }
      return `${expr.name}(${args})${overStr}`;
    }
    case "case": {
      const cases = expr.args
        ?.map((arg: any) => {
          if (arg.type === "when") {
            return `WHEN ${exprToString(arg.cond)} THEN ${exprToString(arg.result)}`;
          }
          if (arg.type === "else") {
            return `ELSE ${exprToString(arg.result)}`;
          }
          return "";
        })
        .filter(Boolean)
        .join(" ");
      return `CASE ${cases} END`;
    }
    case "function": {
      const name = expr.name;
      const args = Array.isArray(expr.args)
        ? expr.args.map(exprToString).join(", ")
        : expr.args
          ? exprToString(expr.args)
          : "";
      return `${name}(${args})`;
    }
    case "expr_list": {
      return Array.isArray(expr.value)
        ? expr.value.map(exprToString).join(", ")
        : exprToString(expr.value);
    }
    default:
      if (expr.value !== undefined) return String(expr.value);
      return "";
  }
}

// Generate human-friendly label for joins
function formatJoinLabel(
  joinType: string,
  table: string,
  alias?: string,
): string {
  const tablePart = alias ? `${table} as ${alias}` : table;
  return `${joinType || "JOIN"} ${tablePart}`;
}

// Check if window function and filter indicates "Latest Records retrieval / deduplication"
export function detectLatestRecordsPattern(
  windowExprs: any[],
  whereExpr: any,
): { isMatched: boolean; description: string } | null {
  const hasRowNumber = windowExprs.some(
    (w) =>
      w.type === "aggr_func" &&
      (w.name?.toUpperCase() === "ROW_NUMBER" ||
        w.name?.toUpperCase() === "RANK"),
  );
  if (!hasRowNumber || !whereExpr) return null;

  // Check if WHERE filters by that column = 1
  const whereStr = JSON.stringify(whereExpr).toUpperCase();
  if (
    whereStr.includes(`"OPERATOR":"="`) &&
    (whereStr.includes(`"VALUE":1`) || whereStr.includes(`"VALUE":"1"`))
  ) {
    return {
      isMatched: true,
      description:
        "Deduplication: fetching only the latest record based on a ranking partition",
    };
  }
  return null;
}

export function parseSqlToVisualStory(sql: string): {
  nodes: StoryNode[];
  edges: StoryEdge[];
} {
  try {
    const cleanedSql = sql.trim();
    if (!cleanedSql) {
      return { nodes: [], edges: [] };
    }

    // Try AST Parse
    let ast: any;
    try {
      ast = parser.astify(cleanedSql);
    } catch (e) {
      console.warn("AST Parser failed, falling back to regex parser", e);
      return parseSqlWithRegexFallback(cleanedSql);
    }

    const nodes: StoryNode[] = [];
    const edges: StoryEdge[] = [];
    let nodeIdCounter = 1;

    const getNextId = (prefix: string) => `${prefix}_${nodeIdCounter++}`;

    // Flatten AST if array (multiple queries), take first
    const root = Array.isArray(ast) ? ast[0] : ast;
    if (!root || (root.type !== "select" && !root.with)) {
      return parseSqlWithRegexFallback(cleanedSql);
    }

    const cteMap = new Map<string, string>(); // Maps CTE name to final output nodeId of CTE

    // 1. Process CTEs / WITH clauses
    if (root.with && Array.isArray(root.with)) {
      for (const cte of root.with) {
        const cteName = cte.alias?.value || cte.alias;
        if (!cteName) continue;

        const cteStmt = cte.stmt;
        const subResult = processSelectStatement(
          cteStmt,
          `cte_${cteName}`,
          getNextId,
          cteMap,
        );
        nodes.push(...subResult.nodes);
        edges.push(...subResult.edges);

        // Save last node of CTE sub-graph as source for references
        const finalNode = subResult.nodes[subResult.nodes.length - 1];
        if (finalNode) {
          cteMap.set(cteName, finalNode.id);
        }
      }
    }

    // 2. Process main SELECT query
    const mainResult = processSelectStatement(root, "main", getNextId, cteMap);
    nodes.push(...mainResult.nodes);
    edges.push(...mainResult.edges);

    return { nodes, edges };
  } catch (error) {
    console.error("Error parsing SQL to visual story:", error);
    return parseSqlWithRegexFallback(sql);
  }
}

function processSelectStatement(
  stmt: any,
  scope: string,
  getNextId: (prefix: string) => string,
  cteMap: Map<string, string>,
): { nodes: StoryNode[]; edges: StoryEdge[] } {
  const nodes: StoryNode[] = [];
  const edges: StoryEdge[] = [];

  if (!stmt || stmt.type !== "select") {
    return { nodes, edges };
  }

  // Track sources and intermediate streams
  const tableNodes: string[] = []; // Stores nodeIds of source tables/subqueries
  let currentStreamNodeId: string | null = null;

  // Extract from sources
  const fromList = stmt.from || [];
  for (let i = 0; i < fromList.length; i++) {
    const item = fromList[i];
    const isJoin = !!item.join;

    let sourceNodeId = "";
    if (item.expr && item.expr.type === "select") {
      // Subquery in FROM clause
      const subScope = `${scope}_sub_${i}`;
      const subResult = processSelectStatement(
        item.expr,
        subScope,
        getNextId,
        cteMap,
      );
      nodes.push(...subResult.nodes);
      edges.push(...subResult.edges);

      const lastSubNode = subResult.nodes[subResult.nodes.length - 1];
      sourceNodeId = lastSubNode
        ? lastSubNode.id
        : getNextId(`${scope}_subquery`);
    } else {
      // Standard Table reference or CTE reference
      const tableName = item.table || item.expr?.table || "";
      const alias = item.as || item.expr?.as || "";

      // Check if reference to CTE
      if (cteMap.has(tableName)) {
        const cteOutputId = cteMap.get(tableName) || "";
        const referenceNodeId = getNextId(`${scope}_cte_ref`);

        nodes.push({
          id: referenceNodeId,
          type: "source",
          label: `${tableName}${alias ? ` (${alias})` : ""}`,
          details: `Reference to Common Table Expression: ${tableName}`,
          sqlSnippet: alias ? `${tableName} ${alias}` : tableName,
        });

        edges.push({
          id: getNextId("edge_cte_flow"),
          source: cteOutputId,
          target: referenceNodeId,
          animated: true,
        });

        sourceNodeId = referenceNodeId;
      } else {
        // Raw DB Table source
        sourceNodeId = getNextId(`${scope}_table`);
        nodes.push({
          id: sourceNodeId,
          type: "source",
          label: `${tableName}${alias ? ` (${alias})` : ""}`,
          details: `Source database table: ${tableName}`,
          sqlSnippet: alias ? `${tableName} ${alias}` : tableName,
        });
      }
    }

    if (!isJoin) {
      tableNodes.push(sourceNodeId);
      currentStreamNodeId = sourceNodeId;
    } else {
      // Create Join Node
      const joinNodeId = getNextId(`${scope}_join`);
      const joinType = item.join || "JOIN";
      const tableRef = item.table || "";
      const alias = item.as || "";
      const onCondition = item.on ? exprToString(item.on) : "";

      nodes.push({
        id: joinNodeId,
        type: "join",
        label: formatJoinLabel(joinType, tableRef, alias),
        details: onCondition
          ? `ON ${onCondition}`
          : "Cross Join / Cartesian Product",
        sqlSnippet: `${joinType} ${tableRef}${alias ? ` ${alias}` : ""}${item.on ? ` ON ${onCondition}` : ""}`,
      });

      // Join connects the current running stream AND the newly joined source
      if (currentStreamNodeId) {
        edges.push({
          id: getNextId("edge_join_stream"),
          source: currentStreamNodeId,
          target: joinNodeId,
        });
      }

      edges.push({
        id: getNextId("edge_join_source"),
        source: sourceNodeId,
        target: joinNodeId,
      });

      currentStreamNodeId = joinNodeId;
    }
  }

  // 3. Process WHERE / Filter Conditions
  if (stmt.where) {
    const filterNodeId = getNextId(`${scope}_filter`);
    const filterCondition = exprToString(stmt.where);

    nodes.push({
      id: filterNodeId,
      type: "filter",
      label: "Filter (WHERE)",
      details: filterCondition,
      sqlSnippet: `WHERE ${filterCondition}`,
    });

    if (currentStreamNodeId) {
      edges.push({
        id: getNextId("edge_filter"),
        source: currentStreamNodeId,
        target: filterNodeId,
      });
    }
    currentStreamNodeId = filterNodeId;
  }

  // Examine columns for window functions and CASE WHEN
  const selectColumns = stmt.columns || [];
  const windowExprs: any[] = [];
  const caseExprs: any[] = [];

  // Helper to deep extract CASE or Window functions from columns
  const extractExpressions = (expr: any) => {
    if (!expr) return;
    if (expr.type === "aggr_func" && expr.over) {
      windowExprs.push(expr);
    }
    if (expr.type === "case") {
      caseExprs.push(expr);
    }
    if (expr.left) extractExpressions(expr.left);
    if (expr.right) extractExpressions(expr.right);
    if (Array.isArray(expr.args)) {
      for (const arg of expr.args) {
        extractExpressions(arg);
        if (arg.cond) extractExpressions(arg.cond);
        if (arg.result) extractExpressions(arg.result);
      }
    }
  };

  for (const col of selectColumns) {
    if (col.expr) {
      extractExpressions(col.expr);
    }
  }

  // 4. Window Pattern Check & Creation
  if (windowExprs.length > 0) {
    const windowNodeId = getNextId(`${scope}_window`);
    const windowDetail = windowExprs.map(exprToString).join(", ");

    // Check for advanced Deduplication business pattern
    const pattern = detectLatestRecordsPattern(windowExprs, stmt.where);

    nodes.push({
      id: windowNodeId,
      type: "window",
      label: pattern
        ? "Deduplication (Rank/Latest)"
        : "Window Transform (Analytic)",
      details: windowDetail,
      sqlSnippet: windowDetail,
      pattern: pattern
        ? {
            name: "Retrieve Latest / Deduplicate",
            description: pattern.description,
          }
        : undefined,
    });

    if (currentStreamNodeId) {
      edges.push({
        id: getNextId("edge_window"),
        source: currentStreamNodeId,
        target: windowNodeId,
      });
    }
    currentStreamNodeId = windowNodeId;
  }

  // 5. CASE WHEN classification creation
  if (caseExprs.length > 0) {
    const classifyNodeId = getNextId(`${scope}_classify`);
    const caseDetails = caseExprs.map(exprToString).join("\n");

    nodes.push({
      id: classifyNodeId,
      type: "classify",
      label: "Categorization (CASE)",
      details: caseDetails,
      sqlSnippet: caseDetails,
    });

    if (currentStreamNodeId) {
      edges.push({
        id: getNextId("edge_classify"),
        source: currentStreamNodeId,
        target: classifyNodeId,
      });
    }
    currentStreamNodeId = classifyNodeId;
  }

  // 6. Aggregate Conditions (GROUP BY & Aggregations)
  const hasAggregates = selectColumns.some(
    (col: any) => col.expr && col.expr.type === "aggr_func" && !col.expr.over,
  );
  const hasGroupBy =
    stmt.groupby && Array.isArray(stmt.groupby) && stmt.groupby.length > 0;

  if (hasAggregates || hasGroupBy) {
    const aggregateNodeId = getNextId(`${scope}_aggregate`);
    const groupCols = hasGroupBy
      ? stmt.groupby.map(exprToString).join(", ")
      : "";
    const detailStr = [
      hasGroupBy ? `GROUP BY ${groupCols}` : "",
      hasAggregates
        ? `Aggregates: ${selectColumns
            .filter((col: any) => col.expr?.type === "aggr_func")
            .map(
              (col: any) =>
                `${exprToString(col.expr)}${col.as ? ` as ${col.as}` : ""}`,
            )
            .join(", ")}`
        : "",
    ]
      .filter(Boolean)
      .join("\n");

    nodes.push({
      id: aggregateNodeId,
      type: "aggregate",
      label: "Grouping & Aggregations",
      details: detailStr,
      sqlSnippet: hasGroupBy ? `GROUP BY ${groupCols}` : "GROUP BY",
    });

    if (currentStreamNodeId) {
      edges.push({
        id: getNextId("edge_aggregate"),
        source: currentStreamNodeId,
        target: aggregateNodeId,
      });
    }
    currentStreamNodeId = aggregateNodeId;
  }

  // 7. Final Select Output / Limits
  const outputNodeId = getNextId(`${scope}_output`);
  const columnsList = selectColumns
    .map((col: any) => col.as || exprToString(col.expr) || "*")
    .join(", ");
  const limitValue = stmt.limit
    ? stmt.limit.value?.map(exprToString).join(", ")
    : "";

  nodes.push({
    id: outputNodeId,
    type: "output",
    label: scope.startsWith("cte_")
      ? `Virtual Table: ${scope.replace("cte_", "")}`
      : "Query Result Output",
    details: [`Select: ${columnsList}`, limitValue ? `LIMIT ${limitValue}` : ""]
      .filter(Boolean)
      .join("\n"),
    sqlSnippet: `SELECT ${selectColumns.map((c: any) => exprToString(c.expr)).join(", ")}`,
  });

  if (currentStreamNodeId) {
    edges.push({
      id: getNextId("edge_output"),
      source: currentStreamNodeId,
      target: outputNodeId,
    });
  }

  return { nodes, edges };
}

// Resilient Regex-based fallback parser for active-typing or unsupported dialect queries
export function parseSqlWithRegexFallback(sql: string): {
  nodes: StoryNode[];
  edges: StoryEdge[];
} {
  const nodes: StoryNode[] = [];
  const edges: StoryEdge[] = [];
  let nodeIdCounter = 1;

  const getNextId = (prefix: string) => `${prefix}_${nodeIdCounter++}`;

  const clean = sql.replace(/\/\*[\s\S]*?\*\/|([^\\:]|^)--.*$/gm, ""); // Remove comments

  // Find CTE declarations: WITH cte_name AS (
  const cteMatches = [
    ...clean.matchAll(/\b(?:WITH|,)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s+AS\s*\(/gi),
  ];
  const cteMap = new Map<string, string>(); // name -> output node id

  for (const match of cteMatches) {
    const cteName = match[1];
    const index = match.index ?? 0;

    // Attempt basic extraction of the CTE's inner text by matching parentheses
    let parenCount = 1;
    let endIdx = index + match[0].length;
    let cteInner = "";

    while (parenCount > 0 && endIdx < clean.length) {
      const char = clean[endIdx];
      if (char === "(") parenCount++;
      else if (char === ")") parenCount--;
      if (parenCount > 0) cteInner += char;
      endIdx++;
    }

    if (cteInner.trim()) {
      // Process inner CTE query via regex
      const cteResult = parseSingleSelectRegex(
        cteInner,
        `cte_${cteName}`,
        getNextId,
        cteMap,
      );
      nodes.push(...cteResult.nodes);
      edges.push(...cteResult.edges);

      const finalNode = cteResult.nodes[cteResult.nodes.length - 1];
      if (finalNode) {
        cteMap.set(cteName, finalNode.id);
      }
    }
  }

  // Parse Main query (anything after CTE definitions)
  let mainSql = clean;
  if (cteMatches.length > 0) {
    // Basic split to capture everything after the last CTE block
    const lastMatch = cteMatches[cteMatches.length - 1];
    const searchIdx = lastMatch.index ?? 0;
    // Find the end of this CTE parentheses block
    let parenCount = 1;
    let idx = searchIdx + lastMatch[0].length;
    while (parenCount > 0 && idx < clean.length) {
      if (clean[idx] === "(") parenCount++;
      else if (clean[idx] === ")") parenCount--;
      idx++;
    }
    mainSql = clean.slice(idx);
  }

  const mainResult = parseSingleSelectRegex(mainSql, "main", getNextId, cteMap);
  nodes.push(...mainResult.nodes);
  edges.push(...mainResult.edges);

  return { nodes, edges };
}

function parseSingleSelectRegex(
  sql: string,
  scope: string,
  getNextId: (prefix: string) => string,
  cteMap: Map<string, string>,
): { nodes: StoryNode[]; edges: StoryEdge[] } {
  const nodes: StoryNode[] = [];
  const edges: StoryEdge[] = [];
  let currentStreamNodeId: string | null = null;

  // Extract FROM tables: FROM table_name [alias] or JOIN table_name [alias]
  // Resiliently matches standard table structures
  const fromMatch = sql.match(
    /FROM\s+([a-zA-Z0-9_."]+)(?:\s+(?:AS\s+)?([a-zA-Z0-9_"]+))?/i,
  );
  if (!fromMatch) return { nodes, edges };

  const primaryTableName = fromMatch[1].replace(/["']/g, "");
  const primaryAlias = fromMatch[2] ? fromMatch[2].replace(/["']/g, "") : "";

  let sourceNodeId = "";
  if (cteMap.has(primaryTableName)) {
    const cteOutputId = cteMap.get(primaryTableName) || "";
    sourceNodeId = getNextId(`${scope}_cte_ref`);
    nodes.push({
      id: sourceNodeId,
      type: "source",
      label: `${primaryTableName}${primaryAlias ? ` (${primaryAlias})` : ""}`,
      details: `Reference to Common Table Expression: ${primaryTableName}`,
      sqlSnippet: fromMatch[0],
    });
    edges.push({
      id: getNextId("edge_cte_flow"),
      source: cteOutputId,
      target: sourceNodeId,
      animated: true,
    });
  } else {
    sourceNodeId = getNextId(`${scope}_table`);
    nodes.push({
      id: sourceNodeId,
      type: "source",
      label: `${primaryTableName}${primaryAlias ? ` (${primaryAlias})` : ""}`,
      details: `Database table: ${primaryTableName}`,
      sqlSnippet: fromMatch[0],
    });
  }

  currentStreamNodeId = sourceNodeId;

  // Extract JOINS: JOIN table_name [alias] ON condition
  const joinRegex =
    /(LEFT|RIGHT|INNER|FULL|CROSS)?\s*JOIN\s+([a-zA-Z0-9_."]+)(?:\s+(?:AS\s+)?([a-zA-Z0-9_"]+))?\s*(?:ON\s+([\s\S]*?))?(?=\b(?:LEFT|RIGHT|INNER|FULL|CROSS)?\s*JOIN\b|\bWHERE\b|\bGROUP\b|\bLIMIT\b|$)/gi;
  const joins = [...sql.matchAll(joinRegex)];

  for (const join of joins) {
    const joinType = `${(join[1] || "INNER").toUpperCase()} JOIN`;
    const joinTable = join[2].replace(/["']/g, "");
    const joinAlias = join[3] ? join[3].replace(/["']/g, "") : "";
    const joinCondition = join[4] ? join[4].trim() : "";

    let joinSourceId = "";
    if (cteMap.has(joinTable)) {
      const cteOutputId = cteMap.get(joinTable) || "";
      joinSourceId = getNextId(`${scope}_cte_ref`);
      nodes.push({
        id: joinSourceId,
        type: "source",
        label: `${joinTable}${joinAlias ? ` (${joinAlias})` : ""}`,
        details: `Reference to Common Table Expression: ${joinTable}`,
        sqlSnippet: join[0],
      });
      edges.push({
        id: getNextId("edge_cte_flow"),
        source: cteOutputId,
        target: joinSourceId,
        animated: true,
      });
    } else {
      joinSourceId = getNextId(`${scope}_table`);
      nodes.push({
        id: joinSourceId,
        type: "source",
        label: `${joinTable}${joinAlias ? ` (${joinAlias})` : ""}`,
        details: `Database table: ${joinTable}`,
        sqlSnippet: join[0],
      });
    }

    const joinNodeId = getNextId(`${scope}_join`);
    nodes.push({
      id: joinNodeId,
      type: "join",
      label: `${joinType} ${joinTable}${joinAlias ? ` (${joinAlias})` : ""}`,
      details: joinCondition ? `ON ${joinCondition}` : "Cross Join",
      sqlSnippet: join[0],
    });

    if (currentStreamNodeId) {
      edges.push({
        id: getNextId("edge_join_stream"),
        source: currentStreamNodeId,
        target: joinNodeId,
      });
    }
    edges.push({
      id: getNextId("edge_join_source"),
      source: joinSourceId,
      target: joinNodeId,
    });

    currentStreamNodeId = joinNodeId;
  }

  // Extract WHERE filters
  const whereMatch = sql.match(
    /WHERE\s+([\s\S]*?)(?=\bGROUP\s+BY\b|\bORDER\s+BY\b|\bLIMIT\b|$)/i,
  );
  if (whereMatch) {
    const filterNodeId = getNextId(`${scope}_filter`);
    const condition = whereMatch[1].trim();
    nodes.push({
      id: filterNodeId,
      type: "filter",
      label: "Filter (WHERE)",
      details: condition,
      sqlSnippet: whereMatch[0],
    });

    if (currentStreamNodeId) {
      edges.push({
        id: getNextId("edge_filter"),
        source: currentStreamNodeId,
        target: filterNodeId,
      });
    }
    currentStreamNodeId = filterNodeId;
  }

  // Detect advanced business pattern: ROW_NUMBER / RANK & where filters (deduplication)
  const hasWindowRegex =
    /ROW_NUMBER\s*\(\s*\)|RANK\s*\(\s*\)|DENSE_RANK\s*\(\s*\)/i.test(sql);
  if (hasWindowRegex) {
    const windowNodeId = getNextId(`${scope}_window`);
    const isDeduplication = sql.match(
      /WHERE[\s\S]*?(?:rn|row_num|rank)\s*=\s*1/i,
    );

    nodes.push({
      id: windowNodeId,
      type: "window",
      label: isDeduplication
        ? "Deduplication (Rank/Latest)"
        : "Window Transform (Analytic)",
      details: "ROW_NUMBER() OVER (PARTITION BY ... ORDER BY ...)",
      pattern: isDeduplication
        ? {
            name: "Retrieve Latest / Deduplicate",
            description:
              "Deduplication: fetching only the latest record based on a ranking partition",
          }
        : undefined,
    });

    if (currentStreamNodeId) {
      edges.push({
        id: getNextId("edge_window"),
        source: currentStreamNodeId,
        target: windowNodeId,
      });
    }
    currentStreamNodeId = windowNodeId;
  }

  // Extract GROUP BY
  const groupByMatch = sql.match(
    /GROUP\s+BY\s+([\s\S]*?)(?=\bORDER\s+BY\b|\bLIMIT\b|$)/i,
  );
  if (groupByMatch) {
    const aggNodeId = getNextId(`${scope}_aggregate`);
    const cols = groupByMatch[1].trim();
    nodes.push({
      id: aggNodeId,
      type: "aggregate",
      label: "Grouping & Aggregations",
      details: `GROUP BY ${cols}`,
      sqlSnippet: groupByMatch[0],
    });

    if (currentStreamNodeId) {
      edges.push({
        id: getNextId("edge_aggregate"),
        source: currentStreamNodeId,
        target: aggNodeId,
      });
    }
    currentStreamNodeId = aggNodeId;
  }

  // Final SELECT Result
  const outputNodeId = getNextId(`${scope}_output`);
  const limitMatch = sql.match(/LIMIT\s+(\d+)/i);
  const selectMatch = sql.match(/SELECT\s+([\s\S]*?)FROM/i);
  const selectCols = selectMatch ? selectMatch[1].trim() : "*";

  nodes.push({
    id: outputNodeId,
    type: "output",
    label: scope.startsWith("cte_")
      ? `Virtual Table: ${scope.replace("cte_", "")}`
      : "Query Result Output",
    details: [
      `Select: ${selectCols.length > 100 ? `${selectCols.substring(0, 100)}...` : selectCols}`,
      limitMatch ? `LIMIT ${limitMatch[1]}` : "",
    ]
      .filter(Boolean)
      .join("\n"),
    sqlSnippet: selectMatch ? selectMatch[0] : "SELECT",
  });

  if (currentStreamNodeId) {
    edges.push({
      id: getNextId("edge_output"),
      source: currentStreamNodeId,
      target: outputNodeId,
    });
  }

  return { nodes, edges };
}
