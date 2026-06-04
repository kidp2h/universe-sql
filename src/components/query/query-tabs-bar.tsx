"use client";

import {
  Database,
  FileCode,
  Folder,
  Table,
  X,
  Zap,
  GitCompare,
  History,
  FileJson,
  BookOpen,
  Network,
  Download,
} from "lucide-react";
import * as React from "react";

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Shortcut } from "@/components/ui/kbd";
import { Button } from "@/components/ui/button";
import { useTabStore } from "@/stores/tab-store";
import { useShallow } from "zustand/react/shallow";
import type { QueryTab } from "@/stores/tab-store";
import { useTranslation } from "react-i18next";

export function QueryTabsBar() {
  const { t } = useTranslation();
  const tabsSerialized = useTabStore(
    React.useCallback(
      (state) =>
        JSON.stringify(
          state.queryTabs
            .filter((t) => !t.type || t.type === "sql")
            .map((t) => ({
              id: t.id,
              title: t.title,
              icon: t.icon,
              type: t.type,
              isDirty: (t.savedSql ?? t.sql) !== t.sql,
            }))
        ),
      []
    )
  );
  const tabs = React.useMemo(() => JSON.parse(tabsSerialized), [tabsSerialized]);
  const activeTabId = useTabStore((state) => state.activeQueryTabId);
  const activeTab = useTabStore(
    useShallow((state) => {
      const activeTabId = state.activeQueryTabId;
      const tab =
        state.queryTabs.find((t) => t.id === activeTabId) ?? state.queryTabs[0];
      if (!tab) return undefined;
      return {
        id: tab.id,
        title: tab.title,
        icon: tab.icon,
        type: tab.type,
        isDirty: (tab.savedSql ?? tab.sql) !== tab.sql,
      };
    }),
  );
  const onActivateTab = useTabStore((state) => state.updateActiveQueryTabId);
  const onCloseTab = useTabStore((state) => state.removeQueryTab);
  const onCloseAllTabs = useTabStore((state) => state.closeAllTabs);
  const onReorderTabs = useTabStore((state) => state.reorderQueryTabs);
  const closeQuery = useTabStore((state) => state.closeQuery);

  const [draggedTabIndex, setDraggedTabIndex] = React.useState<number | null>(
    null,
  );
  const [dragOverTabIndex, setDragOverTabIndex] = React.useState<number | null>(
    null,
  );
  const scrollRef = React.useRef<HTMLDivElement | null>(null);
  const [indicatorStyle, setIndicatorStyle] =
    React.useState<React.CSSProperties>({
      transform: "translateX(0)",
      width: "0px",
      opacity: 0,
    });

  // Calculate sliding indicator position and manage auto-scrolling
  React.useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    const updateIndicator = () => {
      const activeElement = container.querySelector(
        `[data-active="true"]`,
      ) as HTMLElement | null;
      if (activeElement) {
        setIndicatorStyle({
          transform: `translateX(${activeElement.offsetLeft}px)`,
          width: `${activeElement.offsetWidth}px`,
          opacity: 1,
        });
      } else {
        setIndicatorStyle((prev) => ({ ...prev, opacity: 0 }));
      }
    };

    updateIndicator();

    // Auto-scroll active tab into view
    const activeElement = container.querySelector(
      `[data-active="true"]`,
    ) as HTMLElement | null;
    if (activeElement) {
      const containerLeft = container.scrollLeft;
      const containerRight = containerLeft + container.clientWidth;
      const elemLeft = activeElement.offsetLeft;
      const elemRight = elemLeft + activeElement.offsetWidth;

      if (elemLeft < containerLeft) {
        container.scrollTo({ left: elemLeft - 16, behavior: "smooth" });
      } else if (elemRight > containerRight) {
        container.scrollTo({
          left: elemRight - container.clientWidth + 16,
          behavior: "smooth",
        });
      }
    }

    window.addEventListener("resize", updateIndicator);
    return () => window.removeEventListener("resize", updateIndicator);
  }, [activeTabId, tabs]);

  const [showUnsavedDialog, setShowUnsavedDialog] = React.useState(false);
  const [pendingCloseTabId, setPendingCloseTabId] = React.useState<
    string | null
  >(null);
  const [pendingCloseType, setPendingCloseType] = React.useState<
    "tab" | "app" | "all" | null
  >(null);

  const isTabDirty = React.useCallback((tab?: typeof activeTab) => {
    return tab?.isDirty ?? false;
  }, []);

  const requestCloseQuery = React.useCallback(
    (tabId?: string) => {
      const targetTab = tabId
        ? tabs.find((tab) => tab.id === tabId)
        : activeTab;

      if (!targetTab) {
        closeQuery();
        return;
      }

      if (!isTabDirty(targetTab)) {
        if (tabId) {
          onCloseTab(tabId);
        } else {
          closeQuery();
        }
        return;
      }

      setPendingCloseTabId(targetTab.id);
      setPendingCloseType("tab");
      setShowUnsavedDialog(true);
    },
    [activeTab, closeQuery, onCloseTab, isTabDirty, tabs],
  );

  const requestCloseAllTabs = React.useCallback(() => {
    const hasDirty = tabs.some((tab) => isTabDirty(tab));
    if (!hasDirty) {
      onCloseAllTabs();
      return;
    }

    setPendingCloseTabId(null);
    setPendingCloseType("all");
    setShowUnsavedDialog(true);
  }, [onCloseAllTabs, isTabDirty, tabs]);

  React.useEffect(() => {
    const electronApi = window.electron as
      | {
          onAppCloseRequest?: (handler: () => void) => (() => void) | undefined;
          removeAppCloseRequest?: (handler: () => void) => void;
          confirmClose?: () => Promise<{ ok: boolean }>;
          cancelClose?: () => Promise<{ ok: boolean }>;
        }
      | undefined;

    if (!electronApi?.onAppCloseRequest) {
      return;
    }

    const handleAppCloseRequest = () => {
      void electronApi.cancelClose?.();
      const hasDirty = tabs.some((tab) => isTabDirty(tab));
      if (!hasDirty) {
        void electronApi.confirmClose?.();
        return;
      }

      setPendingCloseTabId(null);
      setPendingCloseType("app");
      setShowUnsavedDialog(true);
    };

    const cleanup = electronApi.onAppCloseRequest(handleAppCloseRequest);
    return () => {
      if (typeof cleanup === "function") {
        cleanup();
      } else {
        electronApi.removeAppCloseRequest?.(handleAppCloseRequest);
      }
    };
  }, [isTabDirty, tabs]);

  React.useEffect(() => {
    const handleAppQuitRequest = () => {
      const hasDirty = tabs.some((tab) => isTabDirty(tab));
      if (!hasDirty) {
        void window.electron?.confirmClose?.();
        return;
      }

      setPendingCloseTabId(null);
      setPendingCloseType("app");
      setShowUnsavedDialog(true);
    };

    globalThis.addEventListener("app-quit-request", handleAppQuitRequest);
    return () => {
      globalThis.removeEventListener("app-quit-request", handleAppQuitRequest);
    };
  }, [isTabDirty, tabs]);

  React.useEffect(() => {
    const handleCommand = (event: Event) => {
      const detail = (event as CustomEvent<{ type?: string; tabId?: string }>)
        .detail;
      const type = detail?.type;

      switch (type) {
        case "close-tab-by-id":
          if (detail.tabId) {
            requestCloseQuery(detail.tabId);
          }
          break;
        case "close-all-tabs":
          requestCloseAllTabs();
          break;
      }
    };

    globalThis.addEventListener("usql:command", handleCommand);
    return () => globalThis.removeEventListener("usql:command", handleCommand);
  }, [requestCloseAllTabs, requestCloseQuery]);

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        !(event.metaKey || event.ctrlKey) ||
        event.key.toLowerCase() !== "w"
      ) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      if (event.shiftKey) {
        requestCloseAllTabs();
      } else if (activeTabId) {
        requestCloseQuery(activeTabId);
      }
    };

    window.addEventListener("keydown", handleKeyDown, { capture: true });
    return () =>
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
  }, [activeTabId, requestCloseAllTabs, requestCloseQuery]);

  const handleWheel = React.useCallback(
    (event: React.WheelEvent<HTMLDivElement>) => {
      const target = scrollRef.current;
      if (!target || event.shiftKey) {
        return;
      }

      if (Math.abs(event.deltaY) < Math.abs(event.deltaX)) {
        return;
      }

      if (target.scrollWidth <= target.clientWidth) {
        return;
      }

      event.preventDefault();
      target.scrollLeft += event.deltaY;
    },
    [],
  );

  const renderTabIcon = (icon: QueryTab["icon"]) => {
    switch (icon) {
      case "table":
        return <Table className="size-4 text-muted-foreground" />;
      case "schema":
        return <Folder className="size-4 text-muted-foreground" />;
      case "connection":
        return <Database className="size-4 text-muted-foreground" />;
      case "benchmark":
        return <Zap className="size-4 text-indigo-400" />;
      case "diff-optimizer":
        return <GitCompare className="size-4 text-sky-400" />;
      case "history-snippets":
        return <History className="size-4 text-brand/80" />;
      case "jsonb-schema-map":
        return <FileJson className="size-4 text-teal-400" />;
      case "sql-reference":
        return <BookOpen className="size-4 text-orange-400" />;
      case "erd":
        return <Network className="size-4 text-emerald-400" />;
      case "database-dump":
        return <Download className="size-4 text-amber-400" />;
      default:
        return <FileCode className="size-4 text-muted-foreground" />;
    }
  };

  if (tabs.length === 0) return null;

  return (
    <div className="flex w-full min-w-0 max-w-full items-center gap-2 overflow-hidden border-b border-border/40 bg-background/95 backdrop-blur px-3 py-1.5">
      <div
        ref={scrollRef}
        onWheel={handleWheel}
        className="relative flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto overscroll-x-contain scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden py-1"
      >
        {/* Sliding active tab indicator */}
        <div
          className="absolute bottom-1 top-1 rounded-md bg-muted/80 border border-border/40 shadow-sm pointer-events-none"
          style={{
            ...indicatorStyle,
            transition:
              "transform 0.28s cubic-bezier(0.2, 0.8, 0.2, 1), width 0.28s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 0.15s ease",
            zIndex: 0,
          }}
        />

        {tabs.map((tab, index) => {
          const isActive = tab.id === activeTabId;
          const isDragging = draggedTabIndex === index;
          const isDragOver = dragOverTabIndex === index;
          const isDirty = tab.isDirty;

          return (
            <ContextMenu key={tab.id}>
              <ContextMenuTrigger asChild>
                <div
                  data-active={isActive ? "true" : "false"}
                  className={
                    "group relative z-10 flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors duration-200 select-none " +
                    (isActive
                      ? "text-foreground font-medium"
                      : "text-muted-foreground hover:bg-muted/40 hover:text-foreground") +
                    (isDragging ? " opacity-50" : "") +
                    (isDragOver ? " ring-2 ring-primary ring-offset-1" : "")
                  }
                >
                  <button
                    type="button"
                    draggable
                    onClick={() => onActivateTab(tab.id)}
                    onDragStart={(event) => {
                      setDraggedTabIndex(index);
                      event.dataTransfer.effectAllowed = "move";
                    }}
                    onDragOver={(event) => {
                      event.preventDefault();
                      event.dataTransfer.dropEffect = "move";
                      if (
                        draggedTabIndex !== null &&
                        draggedTabIndex !== index
                      ) {
                        setDragOverTabIndex(index);
                      }
                    }}
                    onDragLeave={() => {
                      setDragOverTabIndex(null);
                    }}
                    onDrop={(event) => {
                      event.preventDefault();
                      if (
                        draggedTabIndex !== null &&
                        draggedTabIndex !== index
                      ) {
                        onReorderTabs(draggedTabIndex, index);
                      }
                      setDraggedTabIndex(null);
                      setDragOverTabIndex(null);
                    }}
                    onDragEnd={() => {
                      setDraggedTabIndex(null);
                      setDragOverTabIndex(null);
                    }}
                    className="flex min-w-0 flex-1 items-center gap-2 text-left cursor-pointer outline-none"
                  >
                    {renderTabIcon(tab.icon)}
                    {isDirty ? (
                      <span
                        className="size-1.5 rounded-full bg-amber-500 animate-pulse shrink-0"
                        title="Unsaved"
                      />
                    ) : null}
                    <span className="max-w-40 truncate">{tab.title}</span>
                  </button>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      requestCloseQuery(tab.id);
                    }}
                    className="rounded-sm p-0.5 text-muted-foreground/40 hover:bg-rose-500/10 hover:text-rose-500 transition-colors shrink-0 cursor-pointer"
                    aria-label={`Close ${tab.title}`}
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              </ContextMenuTrigger>
              <ContextMenuContent>
                <ContextMenuItem onSelect={() => requestCloseQuery(tab.id)}>
                  {t("closeTab")}
                  <Shortcut shortcut="⌘ + W" />
                </ContextMenuItem>
                <ContextMenuItem onSelect={() => requestCloseAllTabs()}>
                  {t("closeAllTabs")}
                  <Shortcut shortcut="⌘ + ⇧ + W" />
                </ContextMenuItem>
              </ContextMenuContent>
            </ContextMenu>
          );
        })}
      </div>
      <Dialog
        open={showUnsavedDialog}
        onOpenChange={(open) => {
          if (!open) {
            setShowUnsavedDialog(false);
            setPendingCloseTabId(null);
            if (pendingCloseType === "app") {
              void window.electron?.cancelClose?.();
            }
            setPendingCloseType(null);
          }
        }}
      >
        <DialogContent className="max-w-md" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>{t("unsavedChanges")}</DialogTitle>
            <DialogDescription>
              {pendingCloseType === "app"
                ? t("confirmCloseApp")
                : pendingCloseType === "all"
                  ? t("confirmCloseAllTabs")
                  : t("confirmCloseTab")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowUnsavedDialog(false);
                setPendingCloseTabId(null);
                if (pendingCloseType === "app") {
                  void window.electron?.cancelClose?.();
                }
                setPendingCloseType(null);
              }}
            >
              {t("cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setShowUnsavedDialog(false);
                if (pendingCloseType === "app") {
                  void window.electron?.confirmClose?.();
                  setPendingCloseType(null);
                  setPendingCloseTabId(null);
                  return;
                }

                if (pendingCloseType === "all") {
                  onCloseAllTabs();
                  setPendingCloseType(null);
                  setPendingCloseTabId(null);
                  return;
                }

                if (pendingCloseTabId) {
                  onCloseTab(pendingCloseTabId);
                } else {
                  closeQuery();
                }
                setPendingCloseTabId(null);
                setPendingCloseType(null);
              }}
            >
              {t("closeWithoutSaving")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
