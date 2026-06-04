import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { QueryResult } from "@/components/query/types";

export interface ResultTab {
  id: string;
  queryResult: QueryResult;
  isExplainMode: boolean;
  executionTime: number | null;
  executedAt: number;
  sql: string;
  name?: string;
}

/** Stable empty array for selectors — avoids new `[]` on every getSnapshot call. */
export const EMPTY_RESULT_TABS: ResultTab[] = [];

interface QueryResultsState {
  resultsByTab: Record<string, ResultTab[]>;
  activeResultTabIdByTab: Record<string, string | undefined>;
  addResult: (
    tabId: string,
    result: Omit<ResultTab, "id" | "executedAt">,
  ) => void;
  updateResult: (
    tabId: string,
    resultTabId: string,
    partial: Partial<Omit<ResultTab, "id" | "executedAt">>,
  ) => void;
  removeResult: (tabId: string, resultTabId: string) => void;
  clearResults: (tabId: string) => void;
  setActiveResultTabId: (
    tabId: string,
    resultTabId: string | undefined,
  ) => void;
}

export const useQueryResultsStore = create<QueryResultsState>()(
  persist(
    (set) => ({
      resultsByTab: {},
      activeResultTabIdByTab: {},

      addResult: (tabId, result) =>
        set((state) => {
          const resultTabId = `res-${Date.now()}-${Math.random()
            .toString(36)
            .substring(2, 9)}`;

          const newResultTab: ResultTab = {
            ...result,
            id: resultTabId,
            executedAt: Date.now(),
          };

          const existingResults = state.resultsByTab[tabId] || [];
          const updatedResults = [...existingResults, newResultTab];

          return {
            resultsByTab: {
              ...state.resultsByTab,
              [tabId]: updatedResults,
            },
            activeResultTabIdByTab: {
              ...state.activeResultTabIdByTab,
              [tabId]: resultTabId,
            },
          };
        }),

      updateResult: (tabId, resultTabId, partial) =>
        set((state) => {
          const existingResults = state.resultsByTab[tabId] || [];
          const updatedResults = existingResults.map((r) =>
            r.id === resultTabId ? { ...r, ...partial } : r,
          );
          return {
            resultsByTab: {
              ...state.resultsByTab,
              [tabId]: updatedResults,
            },
          };
        }),

      removeResult: (tabId, resultTabId) =>
        set((state) => {
          const existingResults = state.resultsByTab[tabId] || [];
          const index = existingResults.findIndex((r) => r.id === resultTabId);
          if (index === -1) return state;

          const updatedResults = existingResults.filter(
            (r) => r.id !== resultTabId,
          );

          let nextActive = state.activeResultTabIdByTab[tabId];
          if (nextActive === resultTabId) {
            nextActive =
              updatedResults[index]?.id || updatedResults[index - 1]?.id;
          }

          return {
            resultsByTab: {
              ...state.resultsByTab,
              [tabId]: updatedResults,
            },
            activeResultTabIdByTab: {
              ...state.activeResultTabIdByTab,
              [tabId]: nextActive,
            },
          };
        }),

      clearResults: (tabId) =>
        set((state) => {
          const newResults = { ...state.resultsByTab };
          delete newResults[tabId];

          const newActive = { ...state.activeResultTabIdByTab };
          delete newActive[tabId];

          return {
            resultsByTab: newResults,
            activeResultTabIdByTab: newActive,
          };
        }),

      setActiveResultTabId: (tabId, resultTabId) =>
        set((state) => ({
          activeResultTabIdByTab: {
            ...state.activeResultTabIdByTab,
            [tabId]: resultTabId,
          },
        })),
    }),
    {
      name: "usql-query-results",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
