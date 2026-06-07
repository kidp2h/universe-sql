"use client";

import * as React from "react";
import { useConnection } from "@/hooks/use-connection";
import { toast } from "sonner";

export type DiffStats = {
  dbExecutionTime: number;
  dbPlanningTime: number;
  totalCost: number;
  startupCost: number;
  sharedHitBlocks: number;
  sharedReadBlocks: number;
};

export type RowDiff = {
  type: "identical" | "modified" | "added" | "deleted";
  keyVal?: any;
  rowA?: Record<string, any>;
  rowB?: Record<string, any>;
  diffFields?: string[];
};

export type QueryDiffResult = {
  queryA: {
    sql: string;
    stats: DiffStats | null;
    columns: string[];
    rowCount: number;
    plan: any | null;
  };
  queryB: {
    sql: string;
    stats: DiffStats | null;
    columns: string[];
    rowCount: number;
    plan: any | null;
  };
  diffRows: RowDiff[];
  summary: {
    identical: number;
    modified: number;
    added: number;
    deleted: number;
  };
  hasSchemaMismatch: boolean;
  commonColumns: string[];
};

function valuesEqual(a: any, b: any): boolean {
  if (a === b) return true;
  if (a == null || b == null) return a === b;
  if (typeof a === "object" && typeof b === "object") {
    try {
      return JSON.stringify(a) === JSON.stringify(b);
    } catch {
      return false;
    }
  }
  return String(a) === String(b);
}

function diffData(
  rowsA: Record<string, any>[],
  rowsB: Record<string, any>[],
  columnsA: string[],
  columnsB: string[],
  keyCol: string,
): {
  diffRows: RowDiff[];
  summary: {
    identical: number;
    modified: number;
    added: number;
    deleted: number;
  };
} {
  const diffRows: RowDiff[] = [];
  const summary = { identical: 0, modified: 0, added: 0, deleted: 0 };
  const commonColumns = columnsA.filter((c) => columnsB.includes(c));

  if (keyCol && commonColumns.includes(keyCol)) {
    const mapB = new Map<string, Record<string, any>>();
    for (const r of rowsB) {
      if (r && r[keyCol] !== undefined) {
        const kv = String(r[keyCol]);
        mapB.set(kv, r);
      }
    }

    const matchedKeysInB = new Set<string>();

    for (const rA of rowsA) {
      if (!rA) continue;
      const kv = String(rA[keyCol]);
      const rB = mapB.get(kv);

      if (rB === undefined) {
        diffRows.push({
          type: "deleted",
          keyVal: rA[keyCol],
          rowA: rA,
        });
        summary.deleted++;
      } else {
        matchedKeysInB.add(kv);
        const diffFields: string[] = [];
        for (const col of commonColumns) {
          if (!valuesEqual(rA[col], rB[col])) {
            diffFields.push(col);
          }
        }

        if (diffFields.length > 0) {
          diffRows.push({
            type: "modified",
            keyVal: rA[keyCol],
            rowA: rA,
            rowB: rB,
            diffFields,
          });
          summary.modified++;
        } else {
          diffRows.push({
            type: "identical",
            keyVal: rA[keyCol],
            rowA: rA,
            rowB: rB,
          });
          summary.identical++;
        }
      }
    }

    for (const rB of rowsB) {
      if (!rB) continue;
      const kv = String(rB[keyCol]);
      if (!matchedKeysInB.has(kv)) {
        diffRows.push({
          type: "added",
          keyVal: rB[keyCol],
          rowB: rB,
        });
        summary.added++;
      }
    }
  } else {
    const maxLen = Math.max(rowsA.length, rowsB.length);
    for (let i = 0; i < maxLen; i++) {
      const rA = rowsA[i];
      const rB = rowsB[i];

      if (rA && !rB) {
        diffRows.push({
          type: "deleted",
          rowA: rA,
        });
        summary.deleted++;
      } else if (!rA && rB) {
        diffRows.push({
          type: "added",
          rowB: rB,
        });
        summary.added++;
      } else if (rA && rB) {
        const diffFields: string[] = [];
        for (const col of commonColumns) {
          if (!valuesEqual(rA[col], rB[col])) {
            diffFields.push(col);
          }
        }

        if (diffFields.length > 0) {
          diffRows.push({
            type: "modified",
            rowA: rA,
            rowB: rB,
            diffFields,
          });
          summary.modified++;
        } else {
          diffRows.push({
            type: "identical",
            rowA: rA,
            rowB: rB,
          });
          summary.identical++;
        }
      }
    }
  }

  return { diffRows, summary };
}

export function useQueryDiff(
  open: boolean,
  customConnId?: string,
  selectedDatabase?: string,
) {
  const { activeConnection: globalActiveConnection, connections } =
    useConnection();
  const activeConnection = React.useMemo(() => {
    if (customConnId) {
      return connections.find((c) => c.id === customConnId);
    }
    return globalActiveConnection;
  }, [customConnId, globalActiveConnection, connections]);
  const [queryA, setQueryA] = React.useState("");
  const [queryB, setQueryB] = React.useState("");
  const [limit, setLimit] = React.useState(1000);
  const [keyCol, setKeyCol] = React.useState("");
  const [isRunning, setIsRunning] = React.useState(false);
  const [progress, setProgress] = React.useState({
    current: 0,
    total: 0,
    stage: "",
  });
  const [result, setResult] = React.useState<QueryDiffResult | null>(null);
  const [errorA, setErrorA] = React.useState<string | null>(null);
  const [errorB, setErrorB] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) {
      setIsRunning(false);
      setResult(null);
      setErrorA(null);
      setErrorB(null);
      setKeyCol("");
    }
  }, [open]);

  const executeSingleQuery = async (
    sql: string,
    rowLimit: number,
    setError: (err: string | null) => void,
  ): Promise<{ rows: any[]; count: number } | null> => {
    if (!activeConnection || !window.electron?.executeQuery) return null;

    // Apply strict SELECT checking for safety
    const trimmed = sql.trim().toUpperCase();
    if (!trimmed.startsWith("SELECT") && !trimmed.startsWith("WITH")) {
      setError("Only SELECT or WITH queries can be diffed and optimized.");
      return null;
    }

    // Apply row limit
    let sqlWithLimit = sql.trim();
    if (!/\bLIMIT\s+\d+\b/i.test(sqlWithLimit) && rowLimit > 0) {
      if (sqlWithLimit.endsWith(";")) {
        sqlWithLimit = `${sqlWithLimit.slice(0, -1)} LIMIT ${rowLimit};`;
      } else {
        sqlWithLimit = `${sqlWithLimit} LIMIT ${rowLimit}`;
      }
    }

    const dbToQuery = selectedDatabase || activeConnection.database;

    try {
      const res = await window.electron.executeQuery({
        dbType: activeConnection.dbType,
        host: activeConnection.host,
        port: String(activeConnection.port),
        database: dbToQuery,
        username: activeConnection.username,
        password: activeConnection.password,
        ssl: activeConnection.ssl,
        readOnly: activeConnection.readOnly,
        name: activeConnection.name,
        sql: sqlWithLimit,
      });

      if (!res.ok) {
        setError(res.message || "Query execution failed");
        return null;
      }

      setError(null);
      return {
        rows: res.rows ?? [],
        count: res.rowCount ?? (res.rows ?? []).length,
      };
    } catch (err: any) {
      setError(err?.message || "Unknown error occurred");
      return null;
    }
  };

  const executeExplainQuery = async (
    sql: string,
  ): Promise<{ stats: DiffStats; plan: any } | null> => {
    if (!activeConnection || !window.electron?.executeQuery) return null;

    // EXPLAIN ANALYZE for stats
    const explainSql = `EXPLAIN (ANALYZE, COSTS, VERBOSE, BUFFERS, FORMAT JSON) ${sql}`;
    const dbToQuery = selectedDatabase || activeConnection.database;

    try {
      const res = await window.electron.executeQuery({
        dbType: activeConnection.dbType,
        host: activeConnection.host,
        port: String(activeConnection.port),
        database: dbToQuery,
        username: activeConnection.username,
        password: activeConnection.password,
        ssl: activeConnection.ssl,
        readOnly: activeConnection.readOnly,
        name: activeConnection.name,
        sql: explainSql,
      });

      if (!res.ok) return null;

      const rows = res.rows ?? [];
      if (rows[0]) {
        const firstKey = Object.keys(rows[0])[0];
        const planData = rows[0][firstKey];
        if (planData) {
          const parsed =
            typeof planData === "string" ? JSON.parse(planData) : planData;
          const planObj = Array.isArray(parsed) ? parsed[0] : parsed;
          const rootNode = planObj?.Plan ?? planObj;

          if (rootNode) {
            const dbExecutionTime =
              planObj?.["Execution Time"] ??
              rootNode?.["Actual Total Time"] ??
              0;
            const dbPlanningTime = planObj?.["Planning Time"] ?? 0;
            const totalCost = rootNode?.["Total Cost"] ?? 0;
            const startupCost = rootNode?.["Startup Cost"] ?? 0;
            const sharedHitBlocks = rootNode?.["Shared Hit Blocks"] ?? 0;
            const sharedReadBlocks = rootNode?.["Shared Read Blocks"] ?? 0;

            return {
              stats: {
                dbExecutionTime,
                dbPlanningTime,
                totalCost,
                startupCost,
                sharedHitBlocks,
                sharedReadBlocks,
              },
              plan: planObj,
            };
          }
        }
      }

      return null;
    } catch {
      return null;
    }
  };

  const executeDiffCompare = async () => {
    if (!activeConnection) {
      toast.error("Please select an active connection first");
      return;
    }

    if (!queryA.trim()) {
      setErrorA("Query A cannot be empty");
      return;
    }

    if (!queryB.trim()) {
      setErrorB("Query B cannot be empty");
      return;
    }

    setIsRunning(true);
    setResult(null);
    setErrorA(null);
    setErrorB(null);

    const totalSteps = 4;

    try {
      // Step 1: Run Query A Data
      setProgress({
        current: 1,
        total: totalSteps,
        stage: "Fetching Query A Data...",
      });
      const dataA = await executeSingleQuery(queryA, limit, setErrorA);
      if (!dataA) {
        setIsRunning(false);
        return;
      }

      // Step 2: Run Query B Data
      setProgress({
        current: 2,
        total: totalSteps,
        stage: "Fetching Query B Data...",
      });
      const dataB = await executeSingleQuery(queryB, limit, setErrorB);
      if (!dataB) {
        setIsRunning(false);
        return;
      }

      // Step 3: Run Explain A
      setProgress({
        current: 3,
        total: totalSteps,
        stage: "Analyzing Query A Cost/Time...",
      });
      const explainA = await executeExplainQuery(queryA);

      // Step 4: Run Explain B
      setProgress({
        current: 4,
        total: totalSteps,
        stage: "Analyzing Query B Cost/Time...",
      });
      const explainB = await executeExplainQuery(queryB);

      const columnsA = dataA.rows[0] ? Object.keys(dataA.rows[0]) : [];
      const columnsB = dataB.rows[0] ? Object.keys(dataB.rows[0]) : [];

      const hasSchemaMismatch =
        columnsA.length !== columnsB.length ||
        !columnsA.every((c) => columnsB.includes(c)) ||
        !columnsB.every((c) => columnsA.includes(c));

      const commonColumns = columnsA.filter((c) => columnsB.includes(c));

      // Calculate diffs
      const { diffRows, summary } = diffData(
        dataA.rows,
        dataB.rows,
        columnsA,
        columnsB,
        keyCol,
      );

      setResult({
        queryA: {
          sql: queryA,
          stats: explainA?.stats ?? null,
          columns: columnsA,
          rowCount: dataA.count,
          plan: explainA?.plan ?? null,
        },
        queryB: {
          sql: queryB,
          stats: explainB?.stats ?? null,
          columns: columnsB,
          rowCount: dataB.count,
          plan: explainB?.plan ?? null,
        },
        diffRows,
        summary,
        hasSchemaMismatch,
        commonColumns,
      });
    } catch (err: any) {
      toast.error("Comparison failed", {
        description: err.message || "An unexpected error occurred",
      });
    } finally {
      setIsRunning(false);
    }
  };

  const handleReset = () => {
    setQueryA("");
    setQueryB("");
    setLimit(1000);
    setKeyCol("");
    setResult(null);
    setErrorA(null);
    setErrorB(null);
  };

  return {
    queryA,
    setQueryA,
    queryB,
    setQueryB,
    limit,
    setLimit,
    keyCol,
    setKeyCol,
    isRunning,
    progress,
    result,
    errorA,
    errorB,
    executeDiffCompare,
    handleReset,
  };
}
