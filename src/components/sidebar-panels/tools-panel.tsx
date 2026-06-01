import { useTranslation } from "react-i18next";
import * as React from "react";
import {
  Zap,
  GitCompare,
  Sparkles,
  FileJson,
  Wrench,
  BookOpen,
  Workflow,
  Network,
  Download,
} from "lucide-react";
import { useTabStore } from "@/stores/tab-store";
import { cn } from "@/lib/utils";

export function ToolsPanel() {
  const { t } = useTranslation();
  const queryTabs = useTabStore((state) => state.queryTabs);
  const activeQueryTabId = useTabStore((state) => state.activeQueryTabId);
  const openToolTab = useTabStore((state) => state.openToolTab);

  const activeQueryTab = React.useMemo(() => {
    return queryTabs.find((t) => t.id === activeQueryTabId);
  }, [queryTabs, activeQueryTabId]);

  const activeToolType = activeQueryTab?.type; // "benchmark" | "diff-optimizer" | ...

  const toolsList = [
    {
      id: "benchmark",
      nameKey: "toolBenchmarkName",
      descriptionKey: "toolBenchmarkDesc",
      icon: Zap,
      colorClass: "text-indigo-500",
      bgClass: "bg-indigo-500/10",
      borderClass: "border-indigo-500/20 hover:border-indigo-500/35",
      activeBorderClass: "border-indigo-500/50",
    },
    {
      id: "diff-optimizer",
      nameKey: "toolDiffName",
      descriptionKey: "toolDiffDesc",
      icon: GitCompare,
      colorClass: "text-sky-500",
      bgClass: "bg-sky-500/10",
      borderClass: "border-sky-500/20 hover:border-sky-500/35",
      activeBorderClass: "border-sky-500/50",
    },
    {
      id: "history-snippets",
      nameKey: "toolHistoryName",
      descriptionKey: "toolHistoryDesc",
      icon: Sparkles,
      colorClass: "text-brand",
      bgClass: "bg-brand/10",
      borderClass: "border-brand/20 hover:border-brand/35",
      activeBorderClass: "border-brand/50",
    },
    {
      id: "jsonb-schema-map",
      nameKey: "toolJsonbName",
      descriptionKey: "toolJsonbDesc",
      icon: FileJson,
      colorClass: "text-teal-500",
      bgClass: "bg-teal-500/10",
      borderClass: "border-teal-500/20 hover:border-teal-500/35",
      activeBorderClass: "border-teal-500/50",
    },
    {
      id: "sql-reference",
      nameKey: "toolSqlRefName",
      descriptionKey: "toolSqlRefDesc",
      icon: BookOpen,
      colorClass: "text-orange-500",
      bgClass: "bg-orange-500/10",
      borderClass: "border-orange-500/20 hover:border-orange-500/35",
      activeBorderClass: "border-orange-500/50",
    },
    {
      id: "visual-query-story",
      nameKey: "toolVisualStoryName",
      descriptionKey: "toolVisualStoryDesc",
      icon: Workflow,
      colorClass: "text-rose-500",
      bgClass: "bg-rose-500/10",
      borderClass: "border-rose-500/20 hover:border-rose-500/35",
      activeBorderClass: "border-rose-500/50",
    },
    {
      id: "erd",
      nameKey: "toolErdName",
      descriptionKey: "toolErdDesc",
      icon: Network,
      colorClass: "text-emerald-500",
      bgClass: "bg-emerald-500/10",
      borderClass: "border-emerald-500/20 hover:border-emerald-500/35",
      activeBorderClass: "border-emerald-500/50",
    },
    {
      id: "database-dump",
      nameKey: "toolDumpName",
      descriptionKey: "toolDumpDesc",
      icon: Download,
      colorClass: "text-amber-500",
      bgClass: "bg-amber-500/10",
      borderClass: "border-amber-500/20 hover:border-amber-500/35",
      activeBorderClass: "border-amber-500/50",
    },
  ];

  return (
    <div className="flex-1 flex flex-col min-h-0 select-none overflow-hidden">
      {/* Panel Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b shrink-0 bg-muted/10">
        <h3 className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 leading-none">
          <Wrench className="size-3.5 text-brand animate-pulse" />
          {t("developerTools")}
        </h3>
      </div>

      {/* Tools Menu Cards List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
        {toolsList.map((tool) => {
          const isSelected = activeToolType === tool.id;
          const Icon = tool.icon;

          return (
            <button
              key={tool.id}
              onClick={() => openToolTab(tool.id as any)}
              className={cn(
                "flex flex-col w-full p-4 rounded-xl border text-left cursor-pointer transition-all select-none shadow-xs group outline-hidden",
                isSelected
                  ? cn(tool.bgClass, tool.activeBorderClass, "shadow-sm")
                  : "bg-background border-border hover:bg-muted/30 hover:border-border/80",
              )}
            >
              <div className="flex items-center gap-2.5 min-w-0 w-full mb-1">
                <div
                  className={cn(
                    "flex items-center justify-center size-7 rounded-lg border",
                    isSelected
                      ? "bg-background/80 border-border/20"
                      : "bg-muted/40 border-border/40 group-hover:bg-background transition",
                  )}
                >
                  <Icon
                    className={cn(
                      "size-4 shrink-0 transition-transform group-hover:scale-105",
                      tool.colorClass,
                    )}
                  />
                </div>
                <span className="truncate text-sm font-bold text-foreground">
                  {t(tool.nameKey)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground/90 font-medium pl-9 leading-normal">
                {t(tool.descriptionKey)}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
