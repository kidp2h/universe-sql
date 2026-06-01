import { create } from "zustand";
import { persist } from "zustand/middleware";

export type QueryHistoryItem = {
  id: string;
  sql: string;
  connectionName: string;
  executedAt: number;
  status?: "success" | "error" | "running";
  duration?: number; // execution timing in ms
  error?: string; // full database error log if failed
};

type QueryHistoryState = {
  history: QueryHistoryItem[];
  addToHistory: (sql: string, connectionName: string) => string;
  updateHistoryItem: (id: string, updates: Partial<QueryHistoryItem>) => void;
  removeFromHistory: (id: string) => void;
  clearHistory: () => void;
  getHistory: () => QueryHistoryItem[];
};

export const useQueryHistoryStore = create<QueryHistoryState>()(
  persist(
    (set, get) => ({
      history: [],
      addToHistory: (sql: string, connectionName: string) => {
        const id =
          typeof crypto !== "undefined" && "randomUUID" in crypto
            ? crypto.randomUUID()
            : String(Date.now());

        set((state) => {
          const newItem: QueryHistoryItem = {
            id,
            sql: sql.trim(),
            connectionName,
            executedAt: Date.now(),
            status: "running",
          };

          // Keep only the last 100 queries
          return {
            history: [newItem, ...state.history].slice(0, 100),
          };
        });

        return id;
      },
      updateHistoryItem: (id: string, updates: Partial<QueryHistoryItem>) => {
        set((state) => ({
          history: state.history.map((item) =>
            item.id === id ? { ...item, ...updates } : item,
          ),
        }));
      },
      removeFromHistory: (id: string) => {
        set((state) => ({
          history: state.history.filter((item) => item.id !== id),
        }));
      },
      clearHistory: () => {
        set({ history: [] });
      },
      getHistory: () => get().history,
    }),
    {
      name: "usql-query-history",
      version: 1,
    },
  ),
);
