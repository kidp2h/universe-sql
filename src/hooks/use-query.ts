import * as React from "react";
import { parse } from "pgsql-ast-parser";
import { toast } from "sonner";
import { useTabStore } from "@/stores/tab-store";
import { useShallow } from "zustand/react/shallow";
import { logger } from "@/lib/logger";
import { useQueryHistoryStore } from "@/stores/query-history-store";
import { useQueryCommands } from "./use-query-commands";
import {
  EMPTY_RESULT_TABS,
  useQueryResultsStore,
  type ResultTab,
} from "@/stores/query-results-store";
import { useConnection } from "@/hooks/use-connection";

function applyQueryLimit(
  sql: string,
  limitStr: string,
): { sql: string; isLimited: boolean } {
  const limit = parseInt(limitStr, 10);
  if (Number.isNaN(limit) || limit <= 0) return { sql, isLimited: false };

  const trimmed = sql.trim();
  const upper = trimmed.toUpperCase();

  const isSelect = upper.startsWith("SELECT");
  const isCTE = upper.startsWith("WITH");

  if (!isSelect && !isCTE) {
    return { sql, isLimited: false };
  }

  if (isCTE && /\b(INSERT|UPDATE|DELETE)\b/i.test(upper)) {
    return { sql, isLimited: false };
  }

  // Check if it already has a LIMIT clause (ignoring trailing semicolon/whitespace)
  const cleanSqlForCheck = trimmed.replace(/;\s*$/, "");
  if (/\bLIMIT\s+(?:\d+|ALL|NULL)\b/i.test(cleanSqlForCheck)) {
    return { sql, isLimited: false };
  }

  if (trimmed.endsWith(";")) {
    return { sql: `${trimmed.slice(0, -1)} LIMIT ${limit};`, isLimited: true };
  }
  return { sql: `${trimmed} LIMIT ${limit}`, isLimited: true };
}

// Helper: Check if SQL is a SELECT or CTE query
function isSelectOrCTE(sql: string): boolean {
  const trimmed = sql.trim().toUpperCase();
  return trimmed.startsWith("SELECT") || trimmed.startsWith("WITH");
}

interface UseQueryProps {
  isEditorFocused: boolean;
  enableCommands?: boolean;
}

export function useQuery({
  isEditorFocused: _isEditorFocused,
  enableCommands = true,
}: UseQueryProps) {
  // queryTabs subscription removed to prevent re-renders on keystroke
  const activeQueryTabId = useTabStore((state) => state.activeQueryTabId);
  const { connections, activeConnection, updateSelectedConnectionId } =
    useConnection();
  const activeTabResultsSelector = React.useCallback(
    (state: { resultsByTab: Record<string, ResultTab[]> }) =>
      activeQueryTabId ? state.resultsByTab[activeQueryTabId] : undefined,
    [activeQueryTabId],
  );
  const activeTabResults =
    useQueryResultsStore(activeTabResultsSelector) ?? EMPTY_RESULT_TABS;

  const activeResultTabIdSelector = React.useCallback(
    (state: { activeResultTabIdByTab: Record<string, string | undefined> }) =>
      activeQueryTabId
        ? state.activeResultTabIdByTab[activeQueryTabId]
        : undefined,
    [activeQueryTabId],
  );
  const activeResultTabId = useQueryResultsStore(activeResultTabIdSelector);

  const activeResult = React.useMemo(() => {
    if (activeResultTabId) {
      return activeTabResults.find((r) => r.id === activeResultTabId) || null;
    }
    return activeTabResults[0] || null;
  }, [activeTabResults, activeResultTabId]);

  const queryResult = activeResult ? activeResult.queryResult : null;
  const isExplainMode = activeResult ? activeResult.isExplainMode : false;
  const executionTime = activeResult ? activeResult.executionTime : null;

  const setQuerySql = useTabStore((state) => state.setQuerySql);
  const setQuerySaved = useTabStore((state) => state.setQuerySaved);
  const setQueryFilePath = useTabStore((state) => state.setQueryFilePath);
  const setQueryTitle = useTabStore((state) => state.setQueryTitle);
  const openSqlTab = useTabStore((state) => state.openSqlTab);
  const openQuery = useTabStore((state) => state.openQuery);
  const [isExecuting, setIsExecuting] = React.useState(false);
  const [dmlConfirmation, setDmlConfirmation] = React.useState<{
    open: boolean;
    sql: string;
    estimatedRows: number | null;
    isNoWhereClause?: boolean;
  }>({ open: false, sql: "", estimatedRows: null, isNoWhereClause: false });

  const getSelectedTextRef = React.useRef<
    (() => { text: string; range?: any } | null) | null
  >(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const activeTab = useTabStore(
    useShallow((state) => {
      const activeTabId = state.activeQueryTabId;
      const found = state.queryTabs.find((tab) => tab.id === activeTabId);
      if (found) {
        return {
          id: found.id,
          title: found.title,
          icon: found.icon,
          connectionId: found.connectionId,
          type: found.type,
          filePath: found.filePath,
          savedSql: found.savedSql,
        };
      }
      const fallback = state.queryTabs.find(
        (tab) => !tab.type || tab.type === "sql",
      );
      if (fallback) {
        return {
          id: fallback.id,
          title: fallback.title,
          icon: fallback.icon,
          connectionId: fallback.connectionId,
          type: fallback.type,
          filePath: fallback.filePath,
          savedSql: fallback.savedSql,
        };
      }
      return undefined;
    }),
  );

  const activeTabConnection = React.useMemo(() => {
    if (activeTab?.connectionId) {
      const conn = connections.find((c) => c.id === activeTab.connectionId);
      if (conn) return conn;
    }
    return activeConnection;
  }, [activeTab?.connectionId, activeConnection, connections]);

  // Sync sidebar connection with active tab
  React.useEffect(() => {
    const connId = activeTab?.connectionId;
    if (connId && connId !== activeConnection?.id) {
      const exists = connections.some((c) => c.id === connId);
      if (exists) {
        React.startTransition(() => {
          updateSelectedConnectionId(connId);
        });
      }
    }
  }, [
    activeTab?.id,
    activeTab?.connectionId,
    activeConnection?.id,
    connections,
    updateSelectedConnectionId,
  ]);
  const isAutoSaveEnabled = useTabStore((state) => state.isAutoSaveEnabled);

  const formatSQL = React.useCallback(async () => {
    const store = useTabStore.getState();
    const currentActiveTab =
      store.queryTabs.find((tab) => tab.id === activeQueryTabId) ||
      store.queryTabs.find((tab) => !tab.type || tab.type === "sql");

    if (!currentActiveTab?.sql) return;

    try {
      const { format } = await import("sql-formatter");
      const formatted = format(currentActiveTab.sql, {
        language: "postgresql",
        tabWidth: 2,
        keywordCase: "upper",
        linesBetweenQueries: 2,
      });
      setQuerySql(formatted);
    } catch (error) {
      console.error("Failed to format SQL:", error);
    }
  }, [activeQueryTabId, setQuerySql]);

  const copyText = React.useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      // Fallback for clipboard restrictions.
    }

    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "true");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
  }, []);

  const copySQL = React.useCallback(async () => {
    const store = useTabStore.getState();
    const currentActiveTab =
      store.queryTabs.find((tab) => tab.id === activeQueryTabId) ||
      store.queryTabs.find((tab) => !tab.type || tab.type === "sql");

    if (!currentActiveTab?.sql) return;
    await copyText(currentActiveTab.sql);
  }, [activeQueryTabId, copyText]);

  const saveAsSQL = React.useCallback(async () => {
    const store = useTabStore.getState();
    const currentActiveTab =
      store.queryTabs.find((tab) => tab.id === activeQueryTabId) ||
      store.queryTabs.find((tab) => !tab.type || tab.type === "sql");

    if (!currentActiveTab?.sql) {
      return;
    }

    if (!window.electron?.saveQuery) {
      alert("Save is only available in the desktop app.");
      return;
    }

    const suggestedName = `${currentActiveTab.title || "query"}.sql`;
    const result = await window.electron.saveQuery({
      content: currentActiveTab.sql,
      suggestedName,
      filePath: currentActiveTab.filePath,
      forceDialog: true,
    });

    if (result.ok && !result.canceled) {
      setQuerySaved(currentActiveTab.sql);
      if (result.filePath) {
        const filePath = result.filePath;
        setQueryFilePath(filePath);
        const name = filePath.split(/[/\\]/).pop()?.trim();
        if (name) {
          setQueryTitle(currentActiveTab.id, name);
        }

        // Record path in sidebar store
        if (activeTabConnection) {
          const { useSidebarStore } = await import("@/stores/sidebar-store");
          useSidebarStore
            .getState()
            .addQueryPathToConnection(activeTabConnection.id, filePath);
        }
      }
    } else if (!result.ok) {
      alert(result.message || "Save failed");
    }
  }, [
    activeQueryTabId,
    setQueryFilePath,
    setQuerySaved,
    setQueryTitle,
    activeTabConnection?.id,
  ]);

  const saveSQL = React.useCallback(async () => {
    const store = useTabStore.getState();
    const currentActiveTab =
      store.queryTabs.find((tab) => tab.id === activeQueryTabId) ||
      store.queryTabs.find((tab) => !tab.type || tab.type === "sql");

    if (!currentActiveTab?.sql || !activeTabConnection) {
      return;
    }

    if (!window.electron?.saveQuery) {
      alert("Save is only available in the desktop app.");
      return;
    }

    if (!currentActiveTab.filePath) {
      await saveAsSQL();
      return;
    }

    const suggestedName = `${currentActiveTab.title || "query"}.sql`;
    const result = await window.electron.saveQuery({
      content: currentActiveTab.sql,
      suggestedName,
      filePath: currentActiveTab.filePath,
    });

    if (result.ok && !result.canceled) {
      setQuerySaved(currentActiveTab.sql);
      if (result.filePath) {
        setQueryFilePath(result.filePath);

        // Record path in sidebar store
        if (activeTabConnection) {
          const { useSidebarStore } = await import("@/stores/sidebar-store");
          useSidebarStore
            .getState()
            .addQueryPathToConnection(activeTabConnection.id, result.filePath);
        }
      }
    } else if (!result.ok) {
      alert(result.message || "Save failed");
    }
  }, [
    activeQueryTabId,
    saveAsSQL,
    setQueryFilePath,
    setQuerySaved,
    activeTabConnection?.id,
  ]);

  const [isFilePickerOpen, setIsFilePickerOpen] = React.useState(false);

  const handleCustomFileSelect = React.useCallback(
    async (filePath: string) => {
      if (window.electron?.readQuery) {
        try {
          const res = await window.electron.readQuery(filePath);
          if (res.ok && res.content !== undefined) {
            const fileName = filePath.split(/[/\\]/).pop() || filePath;
            openSqlTab({
              title: fileName,
              sql: res.content,
              filePath,
              connectionId: activeTabConnection?.id,
            });
          } else {
            toast.error("Failed to read file", {
              description: res.message,
            });
          }
        } catch (error) {
          console.error("Error reading file via custom picker:", error);
          toast.error("An error occurred while reading the file.");
        }
      }
    },
    [openSqlTab, activeTabConnection?.id],
  );

  const handleOpenFileClick = React.useCallback(() => {
    setIsFilePickerOpen(true);
  }, []);

  const handleOpenFileChange = React.useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(event.target.files ?? []);
      if (files.length === 0) {
        return;
      }

      const allowedExtensions = new Set([".sql"]);
      const validFiles = files.filter((file) => {
        const name = file.name.toLowerCase();
        return Array.from(allowedExtensions).some((ext) => name.endsWith(ext));
      });

      const invalidFiles = files.filter((file) => !validFiles.includes(file));
      for (const file of invalidFiles) {
        toast.error(
          `Unsupported file: ${file.name}. Only .sql files are allowed.`,
        );
      }

      if (validFiles.length === 0) {
        event.target.value = "";
        return;
      }

      const entries = await Promise.all(
        validFiles.map(async (file) => {
          try {
            const sql = await file.text();
            return { file, sql };
          } catch {
            toast.error(`Failed to read file: ${file.name}`);
            return null;
          }
        }),
      );

      for (const entry of entries) {
        if (!entry) {
          continue;
        }

        const filePath = (entry.file as File & { path?: string }).path;
        openSqlTab({
          title: entry.file.name,
          sql: entry.sql,
          filePath: filePath ?? entry.file.name,
          connectionId: activeTabConnection?.id,
        });
      }

      event.target.value = "";
    },
    [openSqlTab, activeTabConnection?.id],
  );

  const executeQuery = React.useCallback(
    async (overrideSql?: string, skipConfirm = false, bypassLimit = false) => {
      const store = useTabStore.getState();
      const currentActiveTab =
        store.queryTabs.find((tab) => tab.id === activeQueryTabId) ||
        store.queryTabs.find((tab) => !tab.type || tab.type === "sql");

      if (
        !currentActiveTab ||
        !activeTabConnection ||
        !(overrideSql || currentActiveTab.sql).trim()
      ) {
        return;
      }

      if (!window.electron?.executeQuery) {
        console.warn("Query execution is only available in the desktop app.");
        return;
      }

      const sqlToExecuteRaw = overrideSql || currentActiveTab.sql;
      logger.log(
        `[Query] Initiating execution on connection: "${activeTabConnection.name}". Raw SQL length: ${sqlToExecuteRaw.length} characters.`,
      );

      let sqlToExecute = overrideSql || currentActiveTab.sql;
      if (!overrideSql && getSelectedTextRef.current) {
        const selectedText = getSelectedTextRef.current();
        if (selectedText?.text?.trim()) {
          sqlToExecute = selectedText.text;

          // Dispatch highlight event
          if (selectedText.range) {
            globalThis.dispatchEvent(
              new CustomEvent("usql:highlight-range", {
                detail: { range: selectedText.range },
              }),
            );
          }
        }
      }

      if (!sqlToExecute.trim()) {
        return;
      }

      if (activeTabConnection.readOnly) {
        // Check if query starts with WITH (CTE) - these are always SELECT
        const isCTE = sqlToExecute.trim().toUpperCase().startsWith("WITH");

        if (!isCTE) {
          try {
            const parsed = parse(sqlToExecute);
            const statements = Array.isArray(parsed)
              ? parsed
              : ((parsed as { statements?: unknown[] })?.statements ?? []);

            const hasNonSelect = statements.some((statement) => {
              const stmtType = (
                statement as { type?: string }
              )?.type?.toLowerCase();
              // Accept SELECT and WITH statements
              return stmtType !== "select" && stmtType !== "with";
            });

            if (statements.length === 0 || hasNonSelect) {
              toast.error(
                "SQL syntax error. Read-only connections only allow SELECT queries.",
              );
              return;
            }
          } catch {
            toast.error(
              "SQL syntax error. Read-only connections only allow SELECT queries.",
            );
            return;
          }
        }
      }

      // Dangerous query check (UPDATE/DELETE/DROP/TRUNCATE/ALTER)
      const dmlRegex = /^\s*(UPDATE|DELETE|DROP|TRUNCATE|ALTER)\b/i;
      let isDangerous = dmlRegex.test(sqlToExecute);

      // Try AST parsing for better accuracy if possible
      try {
        const parsed = parse(sqlToExecute);
        const statements = Array.isArray(parsed)
          ? parsed
          : ((parsed as any).statements ?? []);
        const hasDangerous = statements.some((stmt: any) =>
          ["update", "delete", "drop", "truncate", "alter"].includes(
            stmt.type?.toLowerCase(),
          ),
        );
        if (hasDangerous) isDangerous = true;
      } catch (_e) {
        // Ignore parser errors, rely on regex fallback
      }

      const dangerousQueryCheck =
        typeof window !== "undefined" &&
        window.localStorage.getItem("usql:dangerous-query-check") !== "false";

      if (dangerousQueryCheck && isDangerous && !skipConfirm) {
        const isUpdateOrDelete = /^\s*(UPDATE|DELETE)\b/i.test(sqlToExecute);
        const hasWhere = /\bWHERE\b/i.test(sqlToExecute);

        let isNoWhereClause = isUpdateOrDelete && !hasWhere;

        if (isUpdateOrDelete && hasWhere) {
          // Check for tautological always-true WHERE expression (e.g., 1=1, true, 'a'='a')
          const whereMatch = sqlToExecute.match(
            /WHERE\s+([\s\S]+?)(?:ORDER|GROUP|LIMIT|WINDOW|FOR|;|$)/i,
          );
          if (whereMatch) {
            const expr = whereMatch[1]
              .trim()
              .toLowerCase()
              .replace(/;\s*$/, "");
            const normalizedExpr = expr.replace(/\s+/g, "");

            const isTrivialTrue =
              normalizedExpr === "true" ||
              normalizedExpr === "1" ||
              normalizedExpr === "1=1" ||
              normalizedExpr === "2=2" ||
              normalizedExpr === "'a'='a'" ||
              normalizedExpr === '"a"="a"';

            if (isTrivialTrue) {
              isNoWhereClause = true;
            } else {
              // Check identical left and right operands like "column_name = column_name"
              const equalMatch = expr.match(
                /^\s*(['"\w]+)\s*=\s*(['"\w]+)\s*$/,
              );
              if (equalMatch && equalMatch[1] === equalMatch[2]) {
                isNoWhereClause = true;
              }
            }
          }
        }
        // Start with a loading state for the dialog if needed, but for now we'll just block
        try {
          let estimatedRows: number | null = null;

          // Try to get exact count for simple UPDATE/DELETE
          const tryGetExactCount = async (
            sql: string,
          ): Promise<number | null> => {
            try {
              const parsed = parse(sql);
              const stmt = (
                Array.isArray(parsed)
                  ? parsed[0]
                  : (parsed as any).statements?.[0]
              ) as any;

              if (!stmt) return null;

              let tableName = "";
              let whereClause = "";

              if (stmt.type === "delete") {
                tableName = stmt.from?.name;
                // Extract WHERE clause if it exists
                // Note: pgsql-ast-parser doesn't easily stringify back to SQL from AST,
                // so we do a simple regex extraction for typical simple cases
                const whereMatch = sql.match(/WHERE\s+([\s\S]+)$/i);
                whereClause = whereMatch ? `WHERE ${whereMatch[1]}` : "";
              } else if (stmt.type === "update") {
                tableName = stmt.table?.name;
                const whereMatch = sql.match(/WHERE\s+([\s\S]+)$/i);
                whereClause = whereMatch ? `WHERE ${whereMatch[1]}` : "";
              }

              if (tableName) {
                const countSql = `SELECT COUNT(*) FROM ${tableName} ${whereClause.replace(/;$/, "")}`;
                const countResult = await window.electron?.executeQuery({
                  ...activeTabConnection,
                  port: String(activeTabConnection.port),
                  sql: countSql,
                });

                if (countResult.ok && countResult.rows?.[0]) {
                  const count = Object.values(countResult.rows[0])[0];
                  return Number(count);
                }
              }
            } catch (e) {
              console.error("Failed to get exact count:", e);
            }
            return null;
          };

          const exactCount = await tryGetExactCount(sqlToExecute);
          if (exactCount !== null) {
            estimatedRows = exactCount;
          } else {
            // Fallback to EXPLAIN
            const explainSql = `EXPLAIN (FORMAT JSON) ${sqlToExecute}`;
            const result = await window.electron?.executeQuery({
              ...activeTabConnection,
              port: String(activeTabConnection.port),
              sql: explainSql,
            });

            if (result.ok && result.rows?.[0]) {
              try {
                const firstRow = result.rows[0] as any;
                const planKey = Object.keys(firstRow).find(
                  (key) =>
                    key.toUpperCase() === "QUERY PLAN" ||
                    key.toUpperCase() === "PLAN",
                );
                let planData = planKey ? firstRow[planKey] : firstRow;

                if (typeof planData === "string") {
                  try {
                    planData = JSON.parse(planData);
                  } catch (_e) {}
                }

                const planObj = Array.isArray(planData)
                  ? planData[0]
                  : planData;

                // Helper to recursively find rows (skipping 0 to find the actual estimate in DML sub-plans)
                const findRows = (obj: any): number | null => {
                  if (!obj || typeof obj !== "object") return null;

                  // Direct match for PostgreSQL JSON format
                  if (obj["Plan Rows"] !== undefined && obj["Plan Rows"] > 0)
                    return obj["Plan Rows"];
                  if (obj.Rows !== undefined && obj.Rows > 0) return obj.Rows;

                  // Search in "Plan" property if it exists (common in PG)
                  if (obj.Plan) {
                    const rows = findRows(obj.Plan);
                    if (rows !== null) return rows;
                  }

                  // Search in sub-plans (Plans array)
                  if (Array.isArray(obj.Plans)) {
                    for (const subPlan of obj.Plans) {
                      const rows = findRows(subPlan);
                      if (rows !== null) return rows;
                    }
                  }

                  // Generic recursive search for any key containing "Rows"
                  for (const key in obj) {
                    // Skip recursive search if we already looked at Plan or Plans
                    if (key === "Plan" || key === "Plans") continue;

                    if (
                      key.includes("Rows") &&
                      typeof obj[key] === "number" &&
                      obj[key] > 0
                    ) {
                      return obj[key];
                    }
                    if (typeof obj[key] === "object") {
                      const rows = findRows(obj[key]);
                      if (rows !== null) return rows;
                    }
                  }

                  // Fallback to 0 if we specifically found a 0 value earlier but no non-zero values exist
                  if (obj["Plan Rows"] === 0 || obj.Rows === 0) return 0;

                  return null;
                };

                estimatedRows = findRows(planObj);
                // Final fallback to 0 if the recursive search found nothing but we had a valid result
                if (estimatedRows === null && planObj) {
                  estimatedRows = 0;
                }
              } catch (e) {
                console.error("Failed to parse EXPLAIN rows:", e);
              }
            }
          }

          setDmlConfirmation({
            open: true,
            sql: sqlToExecute,
            estimatedRows,
            isNoWhereClause,
          });
          return;
        } catch (err) {
          console.error("DML estimation failed:", err);
          // Fallback: still show confirmation even if count fails
          setDmlConfirmation({
            open: true,
            sql: sqlToExecute,
            estimatedRows: null,
            isNoWhereClause,
          });
          return;
        }
      }

      setIsExecuting(true);

      let success = false;
      const startTime = performance.now();
      const historyId = useQueryHistoryStore
        .getState()
        .addToHistory(sqlToExecute, activeTabConnection.name);

      try {
        const savedLimit = bypassLimit
          ? "0"
          : (window.localStorage.getItem("usql:query-limit") ?? "1000");
        const { sql: sqlWithLimit, isLimited } = applyQueryLimit(
          sqlToExecute,
          savedLimit,
        );

        const result = await window.electron.executeQuery({
          dbType: activeTabConnection.dbType,
          host: activeTabConnection.host,
          port: String(activeTabConnection.port),
          database: activeTabConnection.database,
          username: activeTabConnection.username,
          password: activeTabConnection.password,
          ssl: activeTabConnection.ssl,
          readOnly: activeTabConnection.readOnly,
          name: activeTabConnection.name,
          sql: sqlWithLimit,
        });

        if (!result.ok) {
          const errorMsg = result.message || "Query failed";
          console.error(
            `[Query] Execution failed on connection "${activeTabConnection.name}":`,
            errorMsg,
            `\nSQL: "${sqlToExecute}"`,
          );

          const elapsedErr = Math.round(performance.now() - startTime);
          useQueryHistoryStore.getState().updateHistoryItem(historyId, {
            status: "error",
            duration: elapsedErr,
            error: errorMsg,
          });

          useQueryResultsStore.getState().addResult(currentActiveTab.id, {
            queryResult: {
              columns: [],
              rows: [],
              rowCount: 0,
              error: errorMsg,
            },
            isExplainMode: false,
            executionTime: null,
            sql: sqlToExecute,
          });
          return;
        }

        const rows = result.rows ?? [];
        logger.log(
          `[Query] Execution succeeded on connection "${activeTabConnection.name}". Returned ${rows.length} rows (limit config: ${savedLimit}).`,
        );
        const columns = rows[0] ? Object.keys(rows[0]) : [];

        let message: string | undefined;
        if (rows.length === 0) {
          const sqlTrimmed = sqlToExecute.trim().toUpperCase();
          if (
            sqlTrimmed.startsWith("UPDATE") ||
            sqlTrimmed.startsWith("DELETE") ||
            sqlTrimmed.startsWith("INSERT")
          ) {
            message = `${result.rowCount ?? 0} rows affected`;
          }
        }

        const limitVal = parseInt(savedLimit, 10);
        const actualIsLimited =
          isLimited && limitVal > 0 && rows.length >= limitVal;

        const endTime = performance.now();
        const elapsed = Math.round(endTime - startTime);

        useQueryHistoryStore.getState().updateHistoryItem(historyId, {
          status: "success",
          duration: elapsed,
        });

        useQueryResultsStore.getState().addResult(currentActiveTab.id, {
          queryResult: {
            columns,
            rows,
            rowCount: result.rowCount ?? rows.length,
            message,
            isLimited: actualIsLimited,
            executedSql: sqlToExecute,
          },
          isExplainMode: false,
          executionTime: elapsed,
          sql: sqlToExecute,
        });

        setIsExecuting(false);
        success = true;
      } catch (err: any) {
        const errorMsg = err?.message || "Execution error";
        const elapsedErr = Math.round(performance.now() - startTime);
        useQueryHistoryStore.getState().updateHistoryItem(historyId, {
          status: "error",
          duration: elapsedErr,
          error: errorMsg,
        });
        throw err;
      } finally {
        if (!success) {
          setIsExecuting(false);
        }
      }
    },
    [activeTabConnection, activeQueryTabId],
  );

  const explainAnalyzeQuery = React.useCallback(async () => {
    const store = useTabStore.getState();
    const currentActiveTab =
      store.queryTabs.find((tab) => tab.id === activeQueryTabId) ||
      store.queryTabs.find((tab) => !tab.type || tab.type === "sql");

    if (!currentActiveTab || !activeTabConnection || !currentActiveTab.sql.trim()) {
      return;
    }
    let sqlToExplain = currentActiveTab.sql.trim();
    if (getSelectedTextRef.current) {
      const selectedText = getSelectedTextRef.current();
      if (selectedText?.text?.trim()) {
        sqlToExplain = selectedText.text.trim();

        // Dispatch highlight event
        if (selectedText.range) {
          globalThis.dispatchEvent(
            new CustomEvent("usql:highlight-range", {
              detail: { range: selectedText.range },
            }),
          );
        }
      }
    }

    // Allow SELECT and CTE queries
    if (!isSelectOrCTE(sqlToExplain)) {
      toast.error("EXPLAIN ANALYZE only works with SELECT or CTE queries");
      return;
    }

    if (!window.electron?.executeQuery) {
      console.warn("Query execution is only available in the desktop app.");
      return;
    }

    setIsExecuting(true);

    logger.log(
      `[Query] Running EXPLAIN ANALYZE on connection: "${activeTabConnection.name}". SQL: "${sqlToExplain}"`,
    );
    const startTime = performance.now();
    const historyId = useQueryHistoryStore
      .getState()
      .addToHistory(sqlToExplain, activeTabConnection.name);

    try {
      const explainSql = `EXPLAIN (FORMAT JSON, ANALYZE) ${sqlToExplain}`;
      const result = await window.electron.executeQuery({
        dbType: activeTabConnection.dbType,
        host: activeTabConnection.host,
        port: String(activeTabConnection.port),
        database: activeTabConnection.database,
        username: activeTabConnection.username,
        password: activeTabConnection.password,
        ssl: activeTabConnection.ssl,
        readOnly: activeTabConnection.readOnly,
        name: activeTabConnection.name,
        sql: explainSql,
      });

      if (!result.ok) {
        const errorMsg = result.message || "EXPLAIN ANALYZE failed";
        console.error(
          `[Query] EXPLAIN ANALYZE failed on connection "${activeTabConnection.name}":`,
          errorMsg,
          `\nSQL: "${sqlToExplain}"`,
        );

        const elapsedErr = Math.round(performance.now() - startTime);
        useQueryHistoryStore.getState().updateHistoryItem(historyId, {
          status: "error",
          duration: elapsedErr,
          error: errorMsg,
        });

        useQueryResultsStore.getState().addResult(currentActiveTab.id, {
          queryResult: {
            columns: [],
            rows: [],
            rowCount: 0,
            error: errorMsg,
          },
          isExplainMode: true,
          executionTime: null,
          sql: sqlToExplain,
        });
        return;
      }

      const rows = result.rows ?? [];
      logger.log(
        `[Query] EXPLAIN ANALYZE succeeded on "${activeTabConnection.name}". Plan returned ${rows.length} lines.`,
      );
      const columns = rows[0] ? Object.keys(rows[0]) : [];

      let explainPlan = null;
      try {
        if (rows[0]) {
          const firstKey = Object.keys(rows[0])[0];
          const planData = rows[0][firstKey];
          if (planData) {
            const parsed =
              typeof planData === "string" ? JSON.parse(planData) : planData;
            explainPlan = Array.isArray(parsed) ? parsed[0] : parsed;
          }
        }
      } catch (err) {
        console.error("[Query] Failed to parse JSON explain plan:", err);
      }

      const endTime = performance.now();
      const elapsed = Math.round(endTime - startTime);

      useQueryHistoryStore.getState().updateHistoryItem(historyId, {
        status: "success",
        duration: elapsed,
      });

      useQueryResultsStore.getState().addResult(currentActiveTab.id, {
        queryResult: {
          columns,
          rows,
          rowCount: result.rowCount ?? rows.length,
          explainPlan,
        },
        isExplainMode: true,
        executionTime: elapsed,
        sql: sqlToExplain,
      });
    } catch (err: any) {
      const errorMsg = err?.message || "EXPLAIN ANALYZE error";
      const elapsedErr = Math.round(performance.now() - startTime);
      useQueryHistoryStore.getState().updateHistoryItem(historyId, {
        status: "error",
        duration: elapsedErr,
        error: errorMsg,
      });
      throw err;
    } finally {
      setIsExecuting(false);
    }
  }, [activeTabConnection, activeQueryTabId]);

  const explainResultTab = React.useCallback(
    async (queryTabId: string, resultTabId: string, sql: string) => {
      if (!activeTabConnection) return;
      if (!window.electron?.executeQuery) return;

      const trimmed = sql.trim().replace(/;\s*$/, "");
      // Allow SELECT and CTE queries
      if (!isSelectOrCTE(trimmed)) {
        toast.error("Explain only works with SELECT or CTE queries");
        return;
      }

      const explainSql = `EXPLAIN (FORMAT JSON, ANALYZE) ${trimmed}`;
      const startTime = performance.now();

      try {
        const result = await window.electron.executeQuery({
          dbType: activeTabConnection.dbType,
          host: activeTabConnection.host,
          port: String(activeTabConnection.port),
          database: activeTabConnection.database,
          username: activeTabConnection.username,
          password: activeTabConnection.password,
          ssl: activeTabConnection.ssl,
          readOnly: activeTabConnection.readOnly,
          name: activeTabConnection.name,
          sql: explainSql,
        });

        const elapsed = Math.round(performance.now() - startTime);

        if (!result.ok) {
          const errorMsg = result.message || "EXPLAIN failed";
          useQueryResultsStore
            .getState()
            .updateResult(queryTabId, resultTabId, {
              queryResult: {
                columns: [],
                rows: [],
                rowCount: 0,
                error: errorMsg,
              },
              isExplainMode: true,
              executionTime: null,
            });
          return;
        }

        const rows = result.rows ?? [];
        const columns = rows[0] ? Object.keys(rows[0]) : [];

        let explainPlan = null;
        try {
          if (rows[0]) {
            const firstKey = Object.keys(rows[0])[0];
            const planData = rows[0][firstKey];
            if (planData) {
              const parsed =
                typeof planData === "string" ? JSON.parse(planData) : planData;
              explainPlan = Array.isArray(parsed) ? parsed[0] : parsed;
            }
          }
        } catch (err) {
          console.error("[Query] Failed to parse explain plan:", err);
        }

        useQueryResultsStore.getState().updateResult(queryTabId, resultTabId, {
          queryResult: {
            columns,
            rows,
            rowCount: result.rowCount ?? rows.length,
            explainPlan,
          },
          isExplainMode: true,
          executionTime: elapsed,
        });
      } catch (err) {
        console.error("[Query] explainResultTab error:", err);
      }
    },
    [activeTabConnection],
  );

  const cancelQuery = React.useCallback(() => {
    setIsExecuting(false);
    if (activeQueryTabId) {
      useQueryResultsStore.getState().clearResults(activeQueryTabId);
    }
    toast.info("Query execution cancelled");
    logger.log("[Query] Execution cancelled by the user.");
  }, [activeQueryTabId]);

  const newQueryWithContext = React.useCallback(
    (context: { connectionId: string; connectionName: string }) => {
      openQuery(context);
    },
    [openQuery],
  );

  const newQuery = React.useCallback(() => {
    if (!activeConnection) {
      return;
    }
    openQuery({
      connectionId: activeConnection.id,
      connectionName: activeConnection.name,
    });
  }, [openQuery, activeConnection]);

  useQueryCommands(
    {
      newQueryWithContext,
      newQuery,
      saveSQL,
      saveAsSQL,
      formatSQL,
      copySQL,
      executeQuery,
      explainAnalyzeQuery,
      handleOpenFileClick,
    },
    enableCommands,
  );

  // Auto-save logic using store subscription to avoid React re-renders on every keystroke
  React.useEffect(() => {
    if (!isAutoSaveEnabled) {
      return;
    }

    let timer: any = null;

    const unsubscribe = useTabStore.subscribe((state) => {
      const activeTabId = state.activeQueryTabId;
      const currentActiveTab = state.queryTabs.find((t) => t.id === activeTabId);

      if (
        !currentActiveTab?.filePath ||
        !currentActiveTab?.sql ||
        currentActiveTab.sql === currentActiveTab.savedSql
      ) {
        if (timer) {
          clearTimeout(timer);
          timer = null;
        }
        return;
      }

      if (timer) {
        clearTimeout(timer);
      }
      timer = setTimeout(() => {
        void saveSQL();
      }, 2000);
    });

    return () => {
      unsubscribe();
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [isAutoSaveEnabled, saveSQL]);

  return {
    queryResult,
    isExecuting,
    isExplainMode,
    executionTime,
    getSelectedTextRef,
    fileInputRef,
    activeTab,
    activeConnection,
    handleOpenFileChange,
    copyText,
    executeQuery,
    explainAnalyzeQuery,
    explainResultTab,
    newQuery,
    newQueryWithContext,
    dmlConfirmation,
    setDmlConfirmation,
    cancelQuery,
    isFilePickerOpen,
    setIsFilePickerOpen,
    handleCustomFileSelect,
  };
}
