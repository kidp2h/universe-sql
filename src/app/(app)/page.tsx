"use client";

import * as React from "react";
import { logger } from "@/lib/logger";
import { QueryResultsPanel } from "@/components/query/query-results-panel";
import { QueryTabsBar } from "@/components/query/query-tabs-bar";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { useSidebar } from "@/components/ui/sidebar";
import { Alpha } from "@/components/alpha";
import { useQuery } from "@/hooks/use-query";
import { Loader2 } from "lucide-react";

import { DMLConfirmationDialog } from "@/components/query/dml-confirmation-dialog";
import { CustomFilePicker } from "@/components/custom-file-picker";
import { SqlEditor } from "@/components/query/query-codemirror-editor";
import { useTheme } from "@/hooks/use-theme";
import { useConnection } from "@/hooks/use-connection";

import { useTabStore } from "@/stores/tab-store";
import { useShallow } from "zustand/react/shallow";

import { useTranslation } from "react-i18next";

// Import tool components
import { QueryBenchmarkPage } from "@/components/query-benchmark-modal";
import { QueryDiffPage } from "@/components/query-diff-modal";
import { QueryHistorySnippetsPage } from "@/components/query-history-snippets-modal";
import { JSONBSchemaPage } from "@/components/jsonb-schema-map";
import SQLReferencePage from "@/components/sql-reference";
import { VisualQueryStoryPage } from "@/components/query/query-story-page";
import { ERDContainer } from "@/components/erd/erd-container";
import { DatabaseDumpPage } from "@/components/database-dump";

const TabEditorContainer = React.memo(
  function TabEditorContainer({
    tabId,
    isActive,
    connections,
    activeConnection,
    theme,
    getSelectedTextRef,
  }: {
    tabId: string;
    isActive: boolean;
    connections: any[];
    activeConnection: any;
    theme: string;
    getSelectedTextRef: any;
  }) {
    const tab = useTabStore(
      useShallow((state) => {
        const t = state.queryTabs.find((q) => q.id === tabId);
        if (!t) return null;
        return {
          id: t.id,
          connectionId: t.connectionId,
          type: t.type,
          sql: t.sql,
        };
      }),
    );

    const setQuerySql = useTabStore((state) => state.setQuerySql);

    if (!tab) return null;

    const isSqlTab = !tab.type || tab.type === "sql";
    if (!isSqlTab) return null;

    const tabConnection =
      connections.find((c) => c.id === tab.connectionId) || activeConnection;

    return (
      <div
        className="absolute inset-0"
        style={{ display: isActive ? "block" : "none" }}
      >
        <SqlEditor
          value={tab.sql || ""}
          onChange={setQuerySql}
          theme={theme}
          getSelectedTextRef={getSelectedTextRef}
          activeTabId={isActive ? tabId : undefined}
          connection={tabConnection}
        />
      </div>
    );
  }
);
TabEditorContainer.displayName = "TabEditorContainer";

const SqlWorkspace = React.memo(
  function SqlWorkspace({
    activeQueryTabId,
    connections,
    activeConnection,
    theme,
    getSelectedTextRef,
  }: {
    activeQueryTabId: string | undefined;
    connections: any[];
    activeConnection: any;
    theme: string;
    getSelectedTextRef: any;
  }) {
    const [, setIsPending] = React.useState(false);
    const [deferredTabId, setDeferredTabId] = React.useState(activeQueryTabId);

    const queryTabIds = useTabStore(
      useShallow((state) => state.queryTabs.map((t) => t.id))
    );

    const prevActiveTabIdRef = React.useRef(activeQueryTabId);
    const prevConnectionIdRef = React.useRef<string | null>(null);

    const activeConnectionId = useTabStore((state) => {
      const activeTab = state.queryTabs.find((t) => t.id === activeQueryTabId);
      return activeTab?.connectionId || activeConnection?.id || null;
    });

    React.useEffect(() => {
      const prevTabId = prevActiveTabIdRef.current;
      const prevConnectionId = prevConnectionIdRef.current;

      prevActiveTabIdRef.current = activeQueryTabId;
      prevConnectionIdRef.current = activeConnectionId;

      if (activeQueryTabId !== prevTabId) {
        if (prevConnectionId && activeConnectionId !== prevConnectionId) {
          setIsPending(true);
          const timer = setTimeout(() => {
            setDeferredTabId(activeQueryTabId);
            setIsPending(false);
          }, 120);
          return () => clearTimeout(timer);
        }
        setDeferredTabId(activeQueryTabId);
        setIsPending(false);
      }
    }, [activeQueryTabId, activeConnectionId]);

    return (
      <div className="h-full w-full relative">
        {queryTabIds.map((tabId) => {
          const isActive = tabId === deferredTabId;
          return (
            <TabEditorContainer
              key={tabId}
              tabId={tabId}
              isActive={isActive}
              connections={connections}
              activeConnection={activeConnection}
              theme={theme}
              getSelectedTextRef={getSelectedTextRef}
            />
          );
        })}
      </div>
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.activeQueryTabId === nextProps.activeQueryTabId &&
      prevProps.connections === nextProps.connections &&
      prevProps.activeConnection === nextProps.activeConnection &&
      prevProps.theme === nextProps.theme
    );
  },
);
SqlWorkspace.displayName = "SqlWorkspace";

export default function Home() {
  const { t } = useTranslation();
  logger.log("[Home] Rendered");
  const { showResultsPanel } = useSidebar();
  const [isEditorFocused] = React.useState(false);
  const { theme } = useTheme();
  const { connections, activeConnection } = useConnection();
  const activeQueryTabId = useTabStore((state) => state.activeQueryTabId);
  const {
    queryResult,
    isExecuting,
    isExplainMode,
    executionTime,
    getSelectedTextRef,
    fileInputRef,
    activeTab,
    handleOpenFileChange,
    copyText,
    executeQuery,
    explainResultTab,
    dmlConfirmation,
    setDmlConfirmation,
    cancelQuery,
    isFilePickerOpen,
    setIsFilePickerOpen,
    handleCustomFileSelect,
  } = useQuery({ isEditorFocused });

  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => {
    setMounted(true);

    // On app startup, if the active tab restored from storage is a tool tab,
    // fall back to the first visible SQL query tab or undefined (which shows Alpha welcome page)
    const store = useTabStore.getState();
    const currentActiveTab = store.queryTabs.find(
      (t) => t.id === store.activeQueryTabId,
    );
    if (currentActiveTab?.type && currentActiveTab.type !== "sql") {
      const firstSqlTab = store.queryTabs.find(
        (t) => !t.type || t.type === "sql",
      );
      store.updateActiveQueryTabId(firstSqlTab?.id);
    }
  }, []);

  const isToolTabActive = React.useMemo(() => {
    return (
      !!activeTab &&
      [
        "benchmark",
        "diff-optimizer",
        "history-snippets",
        "jsonb-schema-map",
        "sql-reference",
        "visual-query-story",
        "erd",
        "database-dump",
      ].includes(activeTab.type || "")
    );
  }, [activeTab]);

  return (
    <section className="flex h-full min-h-105 min-w-0 flex-col overflow-hidden rounded-xl border bg-card shadow-sm">
      <input
        ref={fileInputRef}
        type="file"
        accept=".sql"
        multiple
        onChange={handleOpenFileChange}
        className="hidden"
      />
      <CustomFilePicker
        open={isFilePickerOpen}
        onOpenChange={setIsFilePickerOpen}
        onFileSelect={handleCustomFileSelect}
      />
      {!mounted ? (
        <div className="flex h-full w-full flex-col items-center justify-center select-none bg-background animate-in fade-in duration-300">
          <div className="relative flex flex-col items-center justify-center">
            {/* Glowing blur background */}
            <div className="absolute -inset-10 bg-brand/10 rounded-full blur-3xl animate-pulse" />

            {/* Premium Logo container */}
            <div className="relative mb-6 flex items-center justify-center size-24 bg-gradient-to-br from-brand/10 via-brand/5 to-teal-500/10 rounded-3xl border border-brand/20 shadow-md animate-bounce duration-1000 overflow-hidden">
              <div className="absolute inset-0 bg-white/5 rounded-3xl" />
              <img
                src="/icon.png"
                alt="Universe SQL Logo"
                className="size-14 object-contain select-none pointer-events-none dark:invert"
              />
            </div>

            {/* Brand text */}
            <h3 className="text-xl font-bold tracking-tight mb-2 bg-gradient-to-r from-foreground via-foreground/95 to-foreground/80 bg-clip-text text-transparent">
              Universe SQL
            </h3>

            {/* Spinner and Status */}
            <div className="flex items-center gap-2 mt-2">
              <Loader2 className="size-4 animate-spin text-brand" />
              <span className="text-sm text-muted-foreground font-medium font-sans">
                {t("restoringYourWorkspace")}
              </span>
            </div>
          </div>
        </div>
      ) : activeTab ? (
        <>
          {/* QueryTabsBar - always render, hidden when tool is active to preserve state */}
          <div style={{ display: isToolTabActive ? "none" : "block" }}>
            <QueryTabsBar />
          </div>

          {/* Shared flex-1 container - holds both SQL workspace and Tool pages as absolute layers */}
          <div className="relative flex-1 min-h-0">
            {/* Main SQL Editor Workspace - Always mounted, using visibility to prevent CodeMirror layout recalc */}
            <div
              className="absolute inset-0 flex flex-col"
              style={{
                visibility: isToolTabActive ? "hidden" : "visible",
                pointerEvents: isToolTabActive ? "none" : "auto",
              }}
            >
              <ResizablePanelGroup
                orientation="vertical"
                className="flex-1 min-w-0"
              >
                <ResizablePanel defaultSize={50} minSize={15}>
                  <SqlWorkspace
                    activeQueryTabId={activeQueryTabId}
                    connections={connections}
                    activeConnection={activeConnection}
                    theme={theme}
                    getSelectedTextRef={getSelectedTextRef}
                  />
                </ResizablePanel>
                {activeTab && showResultsPanel ? (
                  <ResizableHandle withHandle />
                ) : null}
                {activeTab && showResultsPanel ? (
                  <ResizablePanel defaultSize={50} minSize={15}>
                    <QueryResultsPanel
                      isExecuting={isExecuting}
                      queryResult={queryResult}
                      isExplainMode={isExplainMode}
                      executionTime={executionTime}
                      copyText={copyText}
                      onRunWithoutLimit={() =>
                        executeQuery(queryResult?.executedSql, false, true)
                      }
                      onCancel={cancelQuery}
                      onExplainResultTab={explainResultTab}
                    />
                  </ResizablePanel>
                ) : null}
              </ResizablePanelGroup>
            </div>

            {/* Active Tool Tab Content - absolute overlay, only visible when tool is active */}
            <div
              className="absolute inset-0 flex flex-col"
              style={{
                visibility: isToolTabActive ? "visible" : "hidden",
                pointerEvents: isToolTabActive ? "auto" : "none",
              }}
            >
              {activeTab?.type === "benchmark" && <QueryBenchmarkPage />}
              {activeTab?.type === "diff-optimizer" && <QueryDiffPage />}
              {activeTab?.type === "history-snippets" && (
                <QueryHistorySnippetsPage />
              )}
              {activeTab?.type === "jsonb-schema-map" && <JSONBSchemaPage />}
              {activeTab?.type === "sql-reference" && <SQLReferencePage />}
              {activeTab?.type === "visual-query-story" && (
                <VisualQueryStoryPage />
              )}
              {activeTab?.type === "erd" && <ERDContainer />}
              {activeTab?.type === "database-dump" && <DatabaseDumpPage />}
            </div>
          </div>

          <DMLConfirmationDialog
            open={dmlConfirmation.open}
            onOpenChange={(open) =>
              setDmlConfirmation((prev) => ({ ...prev, open }))
            }
            estimatedRows={dmlConfirmation.estimatedRows}
            sql={dmlConfirmation.sql}
            isNoWhereClause={dmlConfirmation.isNoWhereClause}
            onConfirm={() => executeQuery(dmlConfirmation.sql, true)}
          />
        </>
      ) : (
        <Alpha />
      )}
    </section>
  );
}

if (process.env.NODE_ENV === "development") {
  Home.whyDidYouRender = true;
}
