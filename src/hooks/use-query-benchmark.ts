"use client";

import * as React from "react";
import { useConnection } from "@/hooks/use-connection";
import { toast } from "sonner";

export type QueryStats = {
  dbExecutionTime: number; // EXPLAIN ANALYZE execution time (ms)
  dbPlanningTime: number; // EXPLAIN ANALYZE planning time (ms)
  clientTime: number; // performance.now() roundtrip time (ms)
};

export type BenchmarkResult = {
  queryA: {
    sql: string;
    runs: QueryStats[];
    avgDbExec: number;
    avgDbPlan: number;
    avgClient: number;
    minDbExec: number;
    maxDbExec: number;
  };
  queryB: {
    sql: string;
    runs: QueryStats[];
    avgDbExec: number;
    avgDbPlan: number;
    avgClient: number;
    minDbExec: number;
    maxDbExec: number;
  };
};

export function useQueryBenchmark(open: boolean, customConnId?: string) {
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
  const [iterations, setIterations] = React.useState(10);
  const [isRunning, setIsRunning] = React.useState(false);
  const [progress, setProgress] = React.useState({
    current: 0,
    total: 0,
    stage: "", // "Query A", "Query B", etc.
  });
  const [result, setResult] = React.useState<BenchmarkResult | null>(null);
  const [errorA, setErrorA] = React.useState<string | null>(null);
  const [errorB, setErrorB] = React.useState<string | null>(null);

  // Clear state when connection changes or modal closes
  React.useEffect(() => {
    if (!open) {
      setIsRunning(false);
      setResult(null);
      setErrorA(null);
      setErrorB(null);
    }
  }, [open]);

  const runSingleQueryBenchmark = async (
    sql: string,
    setError: (err: string | null) => void,
  ): Promise<QueryStats | null> => {
    if (!activeConnection || !window.electron?.executeQuery) return null;

    const explainSql = `EXPLAIN (ANALYZE, FORMAT JSON) ${sql}`;
    const startTime = performance.now();

    try {
      const res = await window.electron.executeQuery({
        dbType: activeConnection.dbType,
        host: activeConnection.host,
        port: String(activeConnection.port),
        database: activeConnection.database,
        username: activeConnection.username,
        password: activeConnection.password,
        ssl: activeConnection.ssl,
        readOnly: activeConnection.readOnly,
        name: activeConnection.name,
        sql: explainSql,
      });

      const endTime = performance.now();
      const clientTime = endTime - startTime;

      if (!res.ok) {
        setError(res.message || "Query execution failed");
        return null;
      }

      setError(null);

      const rows = res.rows ?? [];
      if (rows[0]) {
        const firstKey = Object.keys(rows[0])[0];
        const planData = rows[0][firstKey];
        if (planData) {
          const parsed =
            typeof planData === "string" ? JSON.parse(planData) : planData;
          const planObj = Array.isArray(parsed) ? parsed[0] : parsed;

          const dbExecutionTime = planObj["Execution Time"] ?? 0;
          const dbPlanningTime = planObj["Planning Time"] ?? 0;

          return {
            dbExecutionTime,
            dbPlanningTime,
            clientTime,
          };
        }
      }

      return {
        dbExecutionTime: clientTime,
        dbPlanningTime: 0,
        clientTime,
      };
    } catch (err: any) {
      setError(err?.message || "Unknown error occurred");
      return null;
    }
  };

  const executeBenchmark = async () => {
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

    const iterCount = Math.max(1, Math.min(50, iterations));
    setIsRunning(true);
    setResult(null);
    setErrorA(null);
    setErrorB(null);

    const runsA: QueryStats[] = [];
    const runsB: QueryStats[] = [];
    const totalSteps = iterCount * 2;

    try {
      // 1. Dry run/validation for both
      setProgress({
        current: 0,
        total: totalSteps,
        stage: "Validating Query A...",
      });
      const testA = await runSingleQueryBenchmark(queryA, setErrorA);
      if (!testA) {
        setIsRunning(false);
        return;
      }

      setProgress({
        current: 0,
        total: totalSteps,
        stage: "Validating Query B...",
      });
      const testB = await runSingleQueryBenchmark(queryB, setErrorB);
      if (!testB) {
        setIsRunning(false);
        return;
      }

      // 2. Sequential Benchmark Loop
      for (let i = 0; i < iterCount; i++) {
        // Query A
        setProgress({
          current: i * 2 + 1,
          total: totalSteps,
          stage: `Running Query A (Iteration ${i + 1}/${iterCount})...`,
        });
        const statsA = await runSingleQueryBenchmark(queryA, setErrorA);
        if (!statsA) {
          setIsRunning(false);
          return;
        }
        runsA.push(statsA);

        // Query B
        setProgress({
          current: i * 2 + 2,
          total: totalSteps,
          stage: `Running Query B (Iteration ${i + 1}/${iterCount})...`,
        });
        const statsB = await runSingleQueryBenchmark(queryB, setErrorB);
        if (!statsB) {
          setIsRunning(false);
          return;
        }
        runsB.push(statsB);
      }

      // 3. Process results
      const processStats = (runs: QueryStats[]) => {
        const dbExecs = runs.map((r) => r.dbExecutionTime);
        const dbPlans = runs.map((r) => r.dbPlanningTime);
        const clients = runs.map((r) => r.clientTime);

        const avg = (arr: number[]) =>
          arr.reduce((a, b) => a + b, 0) / arr.length;

        return {
          avgDbExec: avg(dbExecs),
          avgDbPlan: avg(dbPlans),
          avgClient: avg(clients),
          minDbExec: Math.min(...dbExecs),
          maxDbExec: Math.max(...dbExecs),
        };
      };

      const summaryA = processStats(runsA);
      const summaryB = processStats(runsB);

      setResult({
        queryA: { sql: queryA, runs: runsA, ...summaryA },
        queryB: { sql: queryB, runs: runsB, ...summaryB },
      });
    } catch (err: any) {
      toast.error("Benchmark failed", {
        description: err.message || "An unexpected error occurred",
      });
    } finally {
      setIsRunning(false);
    }
  };

  const handleReset = () => {
    setQueryA("");
    setQueryB("");
    setResult(null);
    setErrorA(null);
    setErrorB(null);
  };

  // Winner calculations
  const getWinnerInfo = () => {
    if (!result) return null;
    const a = result.queryA.avgDbExec;
    const b = result.queryB.avgDbExec;

    if (Math.abs(a - b) < 0.01) {
      return {
        winner: "Tie",
        diff: 0,
        text: "Both queries perform equally well!",
      };
    }

    if (a < b) {
      const diffPercent = ((b - a) / b) * 100;
      return {
        winner: "Query A",
        diff: diffPercent,
        text: `Query A is ${diffPercent.toFixed(1)}% faster than Query B`,
      };
    } else {
      const diffPercent = ((a - b) / a) * 100;
      return {
        winner: "Query B",
        diff: diffPercent,
        text: `Query B is ${diffPercent.toFixed(1)}% faster than Query A`,
      };
    }
  };

  return {
    queryA,
    setQueryA,
    queryB,
    setQueryB,
    iterations,
    setIterations,
    isRunning,
    progress,
    result,
    errorA,
    errorB,
    executeBenchmark,
    handleReset,
    winnerInfo: getWinnerInfo(),
  };
}
