import { create } from "zustand";

export interface DumpTableItem {
  name: string;
  size: number;
  columnCount?: number;
  indexCount?: number;
}

type DumpState = {
  selectedConnId: string;
  databases: string[];
  selectedDb: string;
  schemas: string[];
  selectedSchema: string;
  tables: DumpTableItem[];
  selectedTables: string[];
  searchTerm: string;
  loadingTables: boolean;
  fetchError: string | null;
  isDumping: boolean;
  exportMode: "copy" | "insert";
  exportType: "schema" | "both";

  setSelectedConnId: (connId: string) => void;
  setDatabases: (databases: string[]) => void;
  setSelectedDb: (db: string) => void;
  setSchemas: (schemas: string[]) => void;
  setSelectedSchema: (schema: string) => void;
  setTables: (tables: DumpTableItem[]) => void;
  setSelectedTables: (
    tables: string[] | ((prev: string[]) => string[]),
  ) => void;
  setSearchTerm: (term: string) => void;
  setLoadingTables: (loading: boolean) => void;
  setFetchError: (error: string | null) => void;
  setIsDumping: (dumping: boolean) => void;
  setExportMode: (mode: "copy" | "insert") => void;
  setExportType: (type: "schema" | "both") => void;
  resetSelections: () => void;
};

export const useDumpStore = create<DumpState>()((set) => ({
  selectedConnId: "",
  databases: [],
  selectedDb: "",
  schemas: [],
  selectedSchema: "",
  tables: [],
  selectedTables: [],
  searchTerm: "",
  loadingTables: false,
  fetchError: null,
  isDumping: false,
  exportMode: "copy",
  exportType: "both",

  setSelectedConnId: (selectedConnId) => set({ selectedConnId }),
  setDatabases: (databases) => set({ databases }),
  setSelectedDb: (selectedDb) => set({ selectedDb }),
  setSchemas: (schemas) => set({ schemas }),
  setSelectedSchema: (selectedSchema) => set({ selectedSchema }),
  setTables: (tables) => set({ tables }),
  setSelectedTables: (tables) =>
    set((state) => ({
      selectedTables:
        typeof tables === "function" ? tables(state.selectedTables) : tables,
    })),
  setSearchTerm: (searchTerm) => set({ searchTerm }),
  setLoadingTables: (loadingTables) => set({ loadingTables }),
  setFetchError: (fetchError) => set({ fetchError }),
  setIsDumping: (isDumping) => set({ isDumping }),
  setExportMode: (exportMode) => set({ exportMode }),
  setExportType: (exportType) => set({ exportType }),
  resetSelections: () =>
    set({
      selectedTables: [],
      searchTerm: "",
      fetchError: null,
    }),
}));
