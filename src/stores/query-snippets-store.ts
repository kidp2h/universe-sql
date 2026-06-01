import { create } from "zustand";
import { persist } from "zustand/middleware";

export type QuerySnippet = {
  id: string;
  name: string;
  sql: string;
  trigger?: string; // autocomplete trigger word (e.g. 'get_users')
  description?: string;
  createdAt: number;
  tags?: string[];
};

type QuerySnippetsState = {
  snippets: QuerySnippet[];
  addSnippet: (snippet: Omit<QuerySnippet, "id" | "createdAt">) => string;
  updateSnippet: (
    id: string,
    updates: Partial<Omit<QuerySnippet, "id" | "createdAt">>,
  ) => void;
  removeSnippet: (id: string) => void;
  getSnippetByTrigger: (trigger: string) => QuerySnippet | undefined;
};

export const useQuerySnippetsStore = create<QuerySnippetsState>()(
  persist(
    (set, get) => ({
      snippets: [],
      addSnippet: (snippet) => {
        const id =
          typeof crypto !== "undefined" && "randomUUID" in crypto
            ? crypto.randomUUID()
            : String(Date.now());

        set((state) => ({
          snippets: [
            ...state.snippets,
            {
              ...snippet,
              id,
              createdAt: Date.now(),
            },
          ],
        }));

        return id;
      },
      updateSnippet: (id, updates) => {
        set((state) => ({
          snippets: state.snippets.map((s) =>
            s.id === id ? { ...s, ...updates } : s,
          ),
        }));
      },
      removeSnippet: (id) => {
        set((state) => ({
          snippets: state.snippets.filter((s) => s.id !== id),
        }));
      },
      getSnippetByTrigger: (trigger) => {
        return get().snippets.find((s) => s.trigger === trigger);
      },
    }),
    {
      name: "usql-query-snippets",
      version: 1,
    },
  ),
);
