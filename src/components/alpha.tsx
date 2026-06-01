"use client";

import { useTranslation } from "react-i18next";
import {
  FolderOpen,
  FilePlus,
  Terminal,
  CommandIcon,
  Palette,
  PanelLeft,
  Clock,
  ArrowRight,
} from "lucide-react";
import { Shortcut } from "./ui/kbd";
import { cn, formatRelativeTime } from "@/lib/utils";
import { useQueryHistoryStore } from "@/stores/query-history-store";
import { useTabStore } from "@/stores/tab-store";
import { useSidebarStore } from "@/stores/sidebar-store";
import * as React from "react";

export function Alpha() {
  const { t } = useTranslation();
  const history = useQueryHistoryStore((state) => state.history).slice(0, 4);
  const activeQueryTabId = useTabStore((state) => state.activeQueryTabId);
  const setQuerySql = useTabStore((state) => state.setQuerySql);
  const openSqlTab = useTabStore((state) => state.openSqlTab);

  const handleApply = React.useCallback(
    (sql: string) => {
      if (activeQueryTabId) {
        setQuerySql(sql);
      } else {
        openSqlTab({
          title: "Query",
          sql,
          connectionId: useSidebarStore.getState().selectedConnectionId,
        });
      }
    },
    [activeQueryTabId, setQuerySql, openSqlTab, t],
  );

  const actions = [
    {
      label: t("shortcutOpenFile"),
      icon: FolderOpen,
      color: "text-sky-500 bg-sky-500/10 border-sky-500/20 dark:bg-sky-500/5",
      shortcut: "⌘ + O",
    },
    {
      label: t("shortcutNewQuery"),
      icon: FilePlus,
      color:
        "text-purple-500 bg-purple-500/10 border-purple-500/20 dark:bg-purple-500/5",
      shortcut: "⌘ + N",
    },
    {
      label: t("shortcutToggleSidebar"),
      icon: PanelLeft,
      color:
        "text-blue-500 bg-blue-500/10 border-blue-500/20 dark:bg-blue-500/5",
      shortcut: "⌘ + B",
    },
    {
      label: t("shortcutToggleTheme"),
      icon: Palette,
      color:
        "text-emerald-500 bg-emerald-500/10 border-emerald-500/20 dark:bg-emerald-500/5",
      shortcut: "⌘ + ⇧ + D",
    },
    {
      label: t("shortcutCommandPalette"),
      icon: CommandIcon,
      color:
        "text-rose-500 bg-rose-500/10 border-rose-500/20 dark:bg-rose-500/5",
      shortcut: "⌘ + ⇧ + P",
    },
  ];

  return (
    <div className="relative flex h-full w-full items-center justify-center select-none bg-gradient-to-b from-background via-background/98 to-brand/2 overflow-hidden py-10">
      {/* Background ambient glowing details */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-brand/5 rounded-full blur-[130px] opacity-45 pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-[550px] h-[550px] bg-indigo-500/5 rounded-full blur-[130px] opacity-45 pointer-events-none" />

      <div className="w-[92%] max-w-4xl flex flex-col justify-center items-center relative z-10 animate-in fade-in slide-in-from-bottom-6 duration-700">
        {/* App Logo with ambient glow */}
        <div className="relative mb-6 flex items-center justify-center size-24 bg-gradient-to-br from-brand/15 via-brand/5 to-teal-500/15 rounded-3xl border border-brand/20 shadow-xl overflow-hidden group hover:border-brand/40 transition-all duration-500 hover:shadow-brand/5">
          <div className="absolute -inset-10 bg-brand/10 rounded-full blur-2xl opacity-70 group-hover:opacity-100 transition-opacity" />
          <div className="absolute inset-0 bg-white/5 rounded-3xl" />
          <img
            src="/icon.png"
            alt="Universe SQL Logo"
            className="size-14 object-contain select-none pointer-events-none dark:invert transition-transform duration-500 group-hover:scale-105"
          />
        </div>

        {/* Brand details */}
        <div className="flex flex-col justify-center items-center text-center max-w-md mb-10">
          <h2 className="text-2xl font-black tracking-tight mb-2 bg-gradient-to-r from-foreground via-foreground/90 to-foreground/75 bg-clip-text text-transparent">
            {t("welcomeTitle")}
          </h2>
          <p className="text-sm text-muted-foreground/80 leading-relaxed font-semibold">
            {t("welcomeSubtitle")}
          </p>
        </div>

        {/* Two-Column Workspace Layout */}
        <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
          {/* LEFT COLUMN: Shortcuts Action Cards */}
          <div className="flex flex-col gap-3.5 w-full">
            {actions.map((act, index) => {
              const Icon = act.icon;
              return (
                <div
                  key={index}
                  className="group relative flex items-center justify-between p-3.5 rounded-2xl bg-card/25 backdrop-blur-md border border-border/50 hover:bg-card/45 hover:border-brand/35 transition-all duration-300 shadow-xs hover:shadow-md hover:shadow-brand/2"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "p-2 rounded-xl border shrink-0 transition-transform group-hover:scale-105",
                        act.color,
                      )}
                    >
                      <Icon className="size-4.5" />
                    </div>
                    <span className="text-sm text-foreground/85 font-bold group-hover:text-foreground transition-colors">
                      {act.label}
                    </span>
                  </div>
                  <Shortcut className="ml-auto pl-4" shortcut={act.shortcut} />
                </div>
              );
            })}
          </div>

          {/* RIGHT COLUMN: Recently Executed Queries */}
          <div className="flex flex-col gap-3.5 w-full h-full min-h-[300px]">
            <div className="flex flex-col gap-1.5 text-left mb-1 px-1">
              <h3 className="text-sm font-extrabold uppercase text-foreground/95 tracking-wider leading-none flex items-center gap-1.5">
                <Clock className="size-4 text-brand animate-pulse" />
                {t("recentQueriesTitle")}
              </h3>
              <p className="text-xs text-muted-foreground/80 font-medium">
                {t("recentQueriesDesc")}
              </p>
            </div>

            {history.length === 0 ? (
              /* History Placeholder State */
              <div className="flex-1 flex flex-col items-center justify-center p-6 border border-dashed rounded-2xl bg-card/10 backdrop-blur-xs select-none">
                <Clock className="size-8 text-muted-foreground/30 mb-2 stroke-1" />
                <p className="text-xs text-muted-foreground/75 font-semibold text-center leading-relaxed">
                  {t("noRecentQueries")}
                </p>
              </div>
            ) : (
              /* History Cards stack */
              <div className="flex flex-col gap-2.5">
                {history.map((item) => {
                  const relativeTime = formatRelativeTime(item.executedAt);
                  const isSuccess = item.status === "success";
                  const isError = item.status === "error";

                  return (
                    <div
                      key={item.id}
                      onClick={() => handleApply(item.sql)}
                      className="group relative flex flex-col w-full p-3.5 rounded-2xl border bg-card/20 border-border/50 hover:border-brand/35 hover:bg-card/40 text-left cursor-pointer transition-all duration-300 shadow-xs hover:shadow-md hover:shadow-brand/2"
                    >
                      {/* Meta header */}
                      <div className="flex items-center justify-between text-xs text-muted-foreground mb-2 font-semibold">
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className={cn(
                              "size-1.5 rounded-full shrink-0",
                              isSuccess && "bg-brand",
                              isError && "bg-destructive",
                              !isSuccess &&
                                !isError &&
                                "bg-amber-500 animate-pulse",
                            )}
                          />
                          <span className="truncate bg-muted dark:bg-muted/30 px-1.5 py-0.5 rounded-md font-extrabold text-foreground/75 text-[10px] uppercase border tracking-wider">
                            {item.connectionName}
                          </span>
                          <span className="truncate text-[10px] text-muted-foreground/85">
                            {relativeTime}
                          </span>
                        </div>
                        {item.duration !== undefined && (
                          <span className="font-mono text-[9px] text-muted-foreground/80 shrink-0">
                            {item.duration}ms
                          </span>
                        )}
                      </div>

                      {/* SQL preview code snippet */}
                      <div className="text-[11px] font-mono text-foreground/80 bg-muted/30 dark:bg-muted/15 border p-2.5 rounded-xl truncate max-h-14 overflow-hidden leading-relaxed whitespace-pre-wrap transition-colors group-hover:text-foreground">
                        {item.sql}
                      </div>

                      {/* Load query arrow visual icon */}
                      <ArrowRight className="absolute right-3.5 bottom-3.5 size-3.5 text-muted-foreground/0 group-hover:text-brand transition-all duration-300 group-hover:translate-x-0.5" />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer database active status prompt */}
        <div className="mt-12 flex items-center gap-1.5 px-4 py-2 rounded-full border border-border/30 bg-muted/10 text-[11px] text-muted-foreground/70 font-bold uppercase tracking-wider select-none animate-pulse">
          <Terminal className="size-3.5 text-brand" />
          {t("noActiveConnection")}
        </div>
      </div>
    </div>
  );
}
