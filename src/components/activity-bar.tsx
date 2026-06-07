"use client";

import { useTranslation } from "react-i18next";
import { Database, History, Settings, Wrench } from "lucide-react";
import { useSidebar } from "@/components/ui/sidebar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useTabStore } from "@/stores/tab-store";
import { useSidebarStore } from "@/stores/sidebar-store";
import * as React from "react";

type TabType = "explorer" | "history" | "settings" | "tools";

export function ActivityBar() {
  const { t } = useTranslation();
  const { activeTab, setActiveTab, open, setOpen, sidebarPosition } =
    useSidebar();

  const queryTabs = useTabStore((state) => state.queryTabs);
  const activeQueryTabId = useTabStore((state) => state.activeQueryTabId);
  const updateActiveQueryTabId = useTabStore(
    (state) => state.updateActiveQueryTabId,
  );

  const activeQueryTab = React.useMemo(() => {
    return queryTabs.find((t) => t.id === activeQueryTabId);
  }, [queryTabs, activeQueryTabId]);

  const activeToolType = activeQueryTab?.type; // "benchmark" | "diff-optimizer" | ...

  // Track last active tool tab ID in localStorage
  React.useEffect(() => {
    if (activeQueryTabId && activeToolType && activeToolType !== "sql") {
      window.localStorage.setItem(
        "usql:last-active-tool-tab-id",
        activeQueryTabId,
      );
    }
  }, [activeQueryTabId, activeToolType]);

  const handleTabClick = (tab: TabType) => {
    if (activeTab === tab) {
      // Toggle sidebar open/closed if clicking the already active tab
      setOpen(!open);
    } else {
      // Switch tab and guarantee sidebar is open
      setActiveTab(tab);
      setOpen(true);
    }

    if (tab === "tools") {
      const isToolActive = activeToolType && activeToolType !== "sql";
      if (!isToolActive) {
        const lastId =
          typeof window !== "undefined"
            ? window.localStorage.getItem("usql:last-active-tool-tab-id")
            : null;
        const existingToolTab = lastId
          ? queryTabs.find((t) => t.id === lastId)
          : null;
        if (existingToolTab) {
          updateActiveQueryTabId(existingToolTab.id);
        } else {
          // Fallback to any tool tab if the last active one is no longer in queryTabs
          const fallbackToolTab = queryTabs.find(
            (t) => t.type && t.type !== "sql",
          );
          if (fallbackToolTab) {
            updateActiveQueryTabId(fallbackToolTab.id);
          } else {
            // Open default/first tool tab
            useTabStore.getState().openToolTab("diff-optimizer");
          }
        }
      }
    } else {
      const isNavTab = tab === "explorer" || tab === "history";
      if (activeToolType && isNavTab) {
        const lastSqlTab = queryTabs.find((t) => !t.type || t.type === "sql");
        if (lastSqlTab) {
          updateActiveQueryTabId(lastSqlTab.id);
        } else {
          // Create new SQL tab
          useTabStore.getState().openSqlTab({
            title: "Query",
            sql: "",
            connectionId: useSidebarStore.getState().selectedConnectionId,
          });
        }
      }
    }
  };

  const topItems = [
    {
      id: "explorer" as TabType,
      labelKey: "databaseExplorer",
      icon: Database,
    },
    {
      id: "history" as TabType,
      labelKey: "queryHistory",
      icon: History,
    },
    {
      id: "tools" as TabType,
      labelKey: "databaseTools",
      icon: Wrench,
    },
  ];

  const bottomItems = [
    {
      id: "settings" as TabType,
      labelKey: "applicationSettings",
      icon: Settings,
    },
  ];

  const renderItem = (item: (typeof topItems)[0]) => {
    // A tab is active if it matches activeTab and sidebar is open, or if it is "tools" and a fullscreen tool is currently active
    const isSelected = open
      ? activeTab === item.id
      : item.id === "tools" && !!activeToolType;
    const Icon = item.icon;

    return (
      <Tooltip key={item.id} delayDuration={300}>
        <TooltipTrigger asChild>
          <button
            onClick={() => handleTabClick(item.id)}
            className={cn(
              "relative flex items-center justify-center size-12 cursor-pointer transition-all group outline-hidden",
              isSelected
                ? "text-brand"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="size-5 transition-transform group-hover:scale-105" />

            {/* Native-style active indicator bar */}
            {isSelected && (
              <span
                className={cn(
                  "absolute top-2 bottom-2 w-1 bg-brand rounded-sm",
                  sidebarPosition === "left" ? "left-0" : "right-0",
                )}
              />
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent
          side={sidebarPosition === "left" ? "right" : "left"}
          className="text-sm select-none"
        >
          {t(item.labelKey)}
        </TooltipContent>
      </Tooltip>
    );
  };

  return (
    <TooltipProvider>
      <div
        style={{ order: sidebarPosition === "left" ? 1 : 3 }}
        className={cn(
          "w-12 bg-card/60 backdrop-blur-md flex flex-col justify-between items-center py-2 h-full select-none shrink-0",
          sidebarPosition === "left"
            ? "border-r border-border"
            : "border-l border-border",
        )}
      >
        {/* Top Database Explorer & Connections Icons */}
        <div className="flex flex-col items-center w-full space-y-1">
          {topItems.map(renderItem)}
        </div>

        {/* Bottom Config Settings Icon */}
        <div className="flex flex-col items-center w-full">
          {bottomItems.map(renderItem)}
        </div>
      </div>
    </TooltipProvider>
  );
}
