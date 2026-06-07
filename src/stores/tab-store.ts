import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Connection } from "./sidebar-store";

export type QueryTabIcon =
  | "connection"
  | "schema"
  | "table"
  | "query"
  | "diff-optimizer"
  | "db-designer"
  | "visual-query-story"
  | "erd"
  | "database-dump";

export type QueryContext = {
  connectionId: string;
  connectionName: string;
  schema?: string;
  table?: string;
  column?: string;
};

export type QueryTab = {
  id: string;
  title: string;
  icon?: QueryTabIcon;
  context?: QueryContext;
  connectionId?: Connection["id"];
  sql: string;
  savedSql?: string;
  filePath?: string;
  type?:
    | "sql"
    | "diff-optimizer"
    | "db-designer"
    | "visual-query-story"
    | "erd"
    | "database-dump";
};

type TabState = {
  queryTabs: QueryTab[];
  activeQueryTabId: string | undefined;
  updateQueryTab: (queryTab: QueryTab) => void;
  addQueryTab: (queryTab: QueryTab) => void;
  removeQueryTab: (queryTabId: QueryTab["id"]) => void;
  updateActiveQueryTabId: (queryTabId: QueryTab["id"] | undefined) => void;
  closeAllTabs: () => void;
  closeQuery: () => void;
  openSqlTab: (payload: {
    title?: string;
    sql: string;
    filePath?: string;
    connectionId?: string;
  }) => void;
  reorderQueryTabs: (fromIndex: number, toIndex: number) => void;
  setQuerySql: (sql: string) => void;
  setQuerySaved: (sql?: string) => void;
  setQueryFilePath: (filePath?: string) => void;
  setQueryTitle: (tabId: string, title: string) => void;
  isAutoSaveEnabled: boolean;
  setAutoSaveEnabled: (enabled: boolean) => void;
  openQuery: (context: {
    connectionId: string;
    connectionName: string;
    schema?: string;
    table?: string;
  }) => void;
  openToolTab: (
    toolType:
      | "diff-optimizer"
      | "db-designer"
      | "visual-query-story"
      | "erd"
      | "database-dump",
    context?: any,
  ) => void;
};

const createFileTabTitle = (baseTitle: string, existing: QueryTab[]) => {
  const normalized = baseTitle.trim().length > 0 ? baseTitle.trim() : "Query";
  let title = normalized;
  let suffix = 2;

  while (existing.some((tab) => tab.title === title)) {
    title = `${normalized} (${suffix})`;
    suffix += 1;
  }

  return title;
};

interface PendingWrite {
  value: string;
  timeout: any;
  write: () => void;
}

const pendingWrites = new Map<string, PendingWrite>();

const debouncedStorage = {
  getItem: (name: string): string | null => {
    const pending = pendingWrites.get(name);
    if (pending) return pending.value;
    if (typeof window === "undefined") return null;
    return localStorage.getItem(name);
  },
  setItem: (name: string, value: string): void => {
    let pending = pendingWrites.get(name);

    const write = () => {
      try {
        localStorage.setItem(name, value);
      } catch (e) {
        console.error("Failed to write to localStorage:", e);
      }
      pendingWrites.delete(name);
    };

    if (pending) {
      pending.value = value;
      clearTimeout(pending.timeout);
    } else {
      pending = { value, timeout: null, write };
      pendingWrites.set(name, pending);
    }

    pending.timeout = setTimeout(write, 1000);
  },
  removeItem: (name: string): void => {
    const pending = pendingWrites.get(name);
    if (pending) {
      clearTimeout(pending.timeout);
      pendingWrites.delete(name);
    }
    if (typeof window !== "undefined") {
      localStorage.removeItem(name);
    }
  },
};

if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", () => {
    for (const pending of Array.from(pendingWrites.values())) {
      clearTimeout(pending.timeout);
      pending.write();
    }
  });
}

export const useTabStore = create<TabState>()(
  persist(
    (set) => ({
      queryTabs: [],
      activeQueryTabId: undefined,
      openQuery: (context) =>
        set((state) => {
          const id =
            typeof crypto !== "undefined" && "randomUUID" in crypto
              ? crypto.randomUUID()
              : String(Date.now());

          let title = context.table || context.schema || context.connectionName;
          let suffix = 2;
          while (state.queryTabs.some((tab) => tab.title === title)) {
            title = `${context.table || context.schema || context.connectionName} (${suffix})`;
            suffix += 1;
          }

          let defaultSql = "";
          if (context.table) {
            defaultSql = `SELECT * FROM ${context.table} LIMIT 100`;
          }

          const nextTab: QueryTab = {
            id,
            title,
            connectionId: context.connectionId,
            sql: defaultSql,
            savedSql: defaultSql,
            filePath: undefined,
          };

          return {
            queryTabs: [...state.queryTabs, nextTab],
            activeQueryTabId: id,
          };
        }),
      updateQueryTab: (queryTab: QueryTab) =>
        set((state) => ({
          queryTabs: state.queryTabs.map((q) =>
            q.id === queryTab.id ? queryTab : q,
          ),
        })),
      addQueryTab: (queryTab: QueryTab) =>
        set((state) => ({
          queryTabs: [...state.queryTabs, queryTab],
        })),
      removeQueryTab: (queryTabId: QueryTab["id"]) =>
        set((state) => {
          const index = state.queryTabs.findIndex(
            (tab) => tab.id === queryTabId,
          );
          if (index === -1) {
            return {
              queryTabs: state.queryTabs,
              activeQueryTabId: state.activeQueryTabId,
            };
          }

          // Clear query results from memory dynamically
          import("@/stores/query-results-store").then((store) => {
            store.useQueryResultsStore.getState().clearResults(queryTabId);
          });

          const nextTabs = state.queryTabs.filter(
            (tab) => tab.id !== queryTabId,
          );
          let nextActive = state.activeQueryTabId;
          if (state.activeQueryTabId === queryTabId) {
            const sqlTabs = state.queryTabs.filter(
              (tab) => !tab.type || tab.type === "sql",
            );
            const sqlIndex = sqlTabs.findIndex((tab) => tab.id === queryTabId);
            if (sqlIndex !== -1) {
              const remainingSqlTabs = sqlTabs.filter(
                (tab) => tab.id !== queryTabId,
              );
              nextActive =
                remainingSqlTabs[sqlIndex]?.id ||
                remainingSqlTabs[sqlIndex - 1]?.id;
            } else {
              nextActive = nextTabs[index]?.id || nextTabs[index - 1]?.id;
            }
          }

          return {
            queryTabs: nextTabs,
            activeQueryTabId: nextActive,
          };
        }),
      updateActiveQueryTabId: (queryTabId: QueryTab["id"] | undefined) =>
        set(() => ({
          activeQueryTabId: queryTabId,
        })),
      closeAllTabs: () =>
        set(() => ({ queryTabs: [], activeQueryTabId: undefined })),
      closeQuery: () =>
        set((state) => {
          if (!state.activeQueryTabId) {
            return { queryTabs: state.queryTabs, activeQueryTabId: undefined };
          }

          const index = state.queryTabs.findIndex(
            (tab) => tab.id === state.activeQueryTabId,
          );
          if (index === -1) {
            return { queryTabs: state.queryTabs, activeQueryTabId: undefined };
          }

          const targetId = state.activeQueryTabId;
          const nextTabs = state.queryTabs.filter((tab) => tab.id !== targetId);

          let nextActive: string | undefined;
          const sqlTabs = state.queryTabs.filter(
            (tab) => !tab.type || tab.type === "sql",
          );
          const sqlIndex = sqlTabs.findIndex((tab) => tab.id === targetId);
          if (sqlIndex !== -1) {
            const remainingSqlTabs = sqlTabs.filter(
              (tab) => tab.id !== targetId,
            );
            nextActive =
              remainingSqlTabs[sqlIndex]?.id ||
              remainingSqlTabs[sqlIndex - 1]?.id;
          } else {
            nextActive = nextTabs[index]?.id || nextTabs[index - 1]?.id;
          }

          return {
            queryTabs: nextTabs,
            activeQueryTabId: nextActive,
          };
        }),
      openSqlTab: ({ title, sql, filePath, connectionId }) =>
        set((state) => {
          const id =
            typeof crypto !== "undefined" && "randomUUID" in crypto
              ? crypto.randomUUID()
              : String(Date.now());
          const nextTitle = createFileTabTitle(
            title ?? "Query",
            state.queryTabs,
          );

          const nextTab: QueryTab = {
            id,
            title: nextTitle,
            icon: "query",
            context: undefined,
            connectionId,
            sql,
            savedSql: sql,
            filePath,
          };

          return {
            queryTabs: [...state.queryTabs, nextTab],
            activeQueryTabId: id,
          };
        }),
      reorderQueryTabs: (fromIndex: number, toIndex: number) =>
        set((state) => {
          const nextTabs = [...state.queryTabs];
          const [movedTab] = nextTabs.splice(fromIndex, 1);
          if (!movedTab) {
            return { queryTabs: state.queryTabs };
          }

          nextTabs.splice(toIndex, 0, movedTab);
          return { queryTabs: nextTabs };
        }),
      setQuerySql: (sql: string) =>
        set((state) => {
          if (!state.activeQueryTabId) {
            return { queryTabs: state.queryTabs };
          }

          return {
            queryTabs: state.queryTabs.map((tab) =>
              tab.id === state.activeQueryTabId ? { ...tab, sql } : tab,
            ),
          };
        }),
      setQuerySaved: (sql?: string) =>
        set((state) => {
          if (!state.activeQueryTabId) {
            return { queryTabs: state.queryTabs };
          }

          return {
            queryTabs: state.queryTabs.map((tab) =>
              tab.id === state.activeQueryTabId
                ? { ...tab, savedSql: sql ?? tab.sql }
                : tab,
            ),
          };
        }),
      setQueryFilePath: (filePath?: string) =>
        set((state) => {
          if (!state.activeQueryTabId) {
            return { queryTabs: state.queryTabs };
          }

          return {
            queryTabs: state.queryTabs.map((tab) =>
              tab.id === state.activeQueryTabId ? { ...tab, filePath } : tab,
            ),
          };
        }),
      setQueryTitle: (tabId: string, title: string) =>
        set((state) => ({
          queryTabs: state.queryTabs.map((tab) =>
            tab.id === tabId ? { ...tab, title } : tab,
          ),
        })),
      openToolTab: (toolType, context) =>
        set((state) => {
          const existing = state.queryTabs.find((tab) => tab.type === toolType);
          if (existing) {
            return {
              queryTabs: state.queryTabs.map((tab) =>
                tab.type === toolType ? { ...tab, context } : tab,
              ),
              activeQueryTabId: existing.id,
            };
          }

          const id = `tool-${toolType}-${Date.now()}`;
          let title = "";
          let icon: QueryTabIcon = "query";
          switch (toolType) {
            case "diff-optimizer":
              title = "Query Diff";
              icon = "diff-optimizer";
              break;
            case "db-designer":
              title = "Database Designer";
              icon = "db-designer";
              break;
            case "visual-query-story":
              title = "Query Story";
              icon = "visual-query-story";
              break;
            case "erd":
              title = "Database ERD";
              icon = "erd";
              break;
            case "database-dump":
              title = "Dump Database";
              icon = "database-dump";
              break;
          }

          const nextTab: QueryTab = {
            id,
            title,
            icon,
            type: toolType,
            sql: "",
            context,
          };

          return {
            queryTabs: [...state.queryTabs, nextTab],
            activeQueryTabId: id,
          };
        }),
      isAutoSaveEnabled: true,
      setAutoSaveEnabled: (enabled: boolean) =>
        set({ isAutoSaveEnabled: enabled }),
    }),
    {
      name: "usql-query-tabs",
      version: 1,
      storage: createJSONStorage(() => debouncedStorage),
    },
  ),
);
