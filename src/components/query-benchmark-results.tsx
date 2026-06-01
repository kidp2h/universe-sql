"use client";

import { Activity, CheckCircle, Sparkles, TrendingUp } from "lucide-react";
import type { BenchmarkResult } from "@/hooks/use-query-benchmark";
import { useTranslation } from "react-i18next";

type QueryBenchmarkResultsProps = {
  result: BenchmarkResult;
  winnerInfo: {
    winner: string;
    diff: number;
    text: string;
  } | null;
};

export function QueryBenchmarkResults({
  result,
  winnerInfo,
}: QueryBenchmarkResultsProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      {/* Winner Card */}
      {winnerInfo && (
        <div
          className={`p-5 rounded-2xl border flex flex-col sm:flex-row items-center justify-between gap-4 ${
            winnerInfo.winner === "Tie"
              ? "border-muted-foreground/20 bg-muted/10 text-muted-foreground"
              : "border-brand/20 bg-brand/5 text-brand"
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-full bg-brand/10 border border-brand/10 text-brand flex items-center justify-center">
              {winnerInfo.winner === "Tie" ? (
                <CheckCircle className="size-6 text-muted-foreground" />
              ) : (
                <Sparkles className="size-6 animate-bounce" />
              )}
            </div>
            <div>
              <h4 className="font-bold text-lg text-foreground flex items-center gap-1.5">
                {winnerInfo.winner === "Tie"
                  ? t("performanceTie")
                  : `${winnerInfo.winner} ${t("wins")}`}
                {winnerInfo.diff > 0 && (
                  <span className="text-sm bg-brand/10 text-brand/80 font-semibold border border-brand/20 px-2 py-0.5 rounded-full flex items-center gap-0.5">
                    <TrendingUp className="size-3" />
                    {winnerInfo.diff.toFixed(1)}% {t("faster")}
                  </span>
                )}
              </h4>
              <p className="text-sm text-muted-foreground mt-0.5">
                {winnerInfo.text} ({t("basedOnAvg")}).
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Performance Chart */}
      <div className="p-5 border rounded-2xl bg-muted/5 flex flex-col gap-4">
        <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Activity className="size-4 text-indigo-400" />
          {t("visualChartTitle")}
        </h4>

        {/* Horizontal Bar Chart Custom Implemented using CSS/Tailwind */}
        <div className="space-y-5 py-2">
          {/* Query A Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
            <span className="text-sm font-semibold text-indigo-400 w-20">
              {t("queryLabel")} A
            </span>
            <div className="flex-1 flex items-center gap-3">
              <div className="flex-1 h-8 bg-muted rounded-lg overflow-hidden relative border border-border">
                <div
                  className="h-full bg-indigo-500 rounded-lg flex items-center px-3 text-sm font-bold text-white transition-all duration-500 border-r border-indigo-600/30"
                  style={{
                    width: `${Math.max(
                      10,
                      Math.min(
                        100,
                        (result.queryA.avgDbExec /
                          Math.max(
                            result.queryA.avgDbExec,
                            result.queryB.avgDbExec,
                          )) *
                          100,
                      ),
                    )}%`,
                  }}
                >
                  {result.queryA.avgDbExec.toFixed(3)} ms
                </div>
              </div>
            </div>
          </div>

          {/* Query B Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
            <span className="text-sm font-semibold text-sky-400 w-20">
              {t("queryLabel")} B
            </span>
            <div className="flex-1 flex items-center gap-3">
              <div className="flex-1 h-8 bg-muted rounded-lg overflow-hidden relative border border-border">
                <div
                  className="h-full bg-sky-500 rounded-lg flex items-center px-3 text-sm font-bold text-white transition-all duration-500 border-r border-sky-600/30"
                  style={{
                    width: `${Math.max(
                      10,
                      Math.min(
                        100,
                        (result.queryB.avgDbExec /
                          Math.max(
                            result.queryA.avgDbExec,
                            result.queryB.avgDbExec,
                          )) *
                          100,
                      ),
                    )}%`,
                  }}
                >
                  {result.queryB.avgDbExec.toFixed(3)} ms
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Metrics Table */}
      <div className="border rounded-2xl overflow-hidden">
        <table className="w-full text-sm text-left border-collapse">
          <thead>
            <tr className="bg-muted/40 border-b border-border">
              <th className="p-3 font-semibold text-muted-foreground text-sm">
                {t("metric")}
              </th>
              <th className="p-3 font-semibold text-indigo-400 text-sm">
                {t("queryLabel")} A
              </th>
              <th className="p-3 font-semibold text-sky-400 text-sm">
                {t("queryLabel")} B
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            <tr>
              <td className="p-3 font-medium text-foreground">
                {t("dbExecAvg")}
              </td>
              <td className="p-3 font-mono text-indigo-400 font-bold">
                {result.queryA.avgDbExec.toFixed(3)} ms
              </td>
              <td className="p-3 font-mono text-sky-400 font-bold">
                {result.queryB.avgDbExec.toFixed(3)} ms
              </td>
            </tr>
            <tr>
              <td className="p-3 font-medium text-foreground">
                {t("dbPlanAvg")}
              </td>
              <td className="p-3 font-mono text-muted-foreground">
                {result.queryA.avgDbPlan.toFixed(3)} ms
              </td>
              <td className="p-3 font-mono text-muted-foreground">
                {result.queryB.avgDbPlan.toFixed(3)} ms
              </td>
            </tr>
            <tr>
              <td className="p-3 font-medium text-foreground">
                {t("clientRoundtripAvg")}
              </td>
              <td className="p-3 font-mono text-muted-foreground">
                {result.queryA.avgClient.toFixed(1)} ms
              </td>
              <td className="p-3 font-mono text-muted-foreground">
                {result.queryB.avgClient.toFixed(1)} ms
              </td>
            </tr>
            <tr>
              <td className="p-3 font-medium text-foreground">
                {t("minExecTime")}
              </td>
              <td className="p-3 font-mono text-muted-foreground">
                {result.queryA.minDbExec.toFixed(3)} ms
              </td>
              <td className="p-3 font-mono text-sky-400">
                {result.queryB.minDbExec.toFixed(3)} ms
              </td>
            </tr>
            <tr>
              <td className="p-3 font-medium text-foreground">
                {t("maxExecTime")}
              </td>
              <td className="p-3 font-mono text-muted-foreground">
                {result.queryA.maxDbExec.toFixed(3)} ms
              </td>
              <td className="p-3 font-mono text-sky-400">
                {result.queryB.maxDbExec.toFixed(3)} ms
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
