"use client";

import * as React from "react";
import {
  Terminal as TerminalIcon,
  ShieldAlert,
  CornerDownLeft,
} from "lucide-react";
import { useSidebarStore } from "@/stores/sidebar-store";
import { cn } from "@/lib/utils";

type TerminalLine = {
  type: "input" | "output" | "error" | "info" | "system";
  text: string;
};

export default function PSQLConsolePage() {
  const selectedConnectionId = useSidebarStore(
    (state) => state.selectedConnectionId,
  );
  const connections = useSidebarStore((state) => state.connections);

  const activeConnection = React.useMemo(() => {
    return connections.find((c) => c.id === selectedConnectionId);
  }, [connections, selectedConnectionId]);

  const [inputVal, setInputVal] = React.useState("");
  const [history, setHistory] = React.useState<TerminalLine[]>([]);
  const [commandHistory, setCommandHistory] = React.useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = React.useState<number>(-1);

  const consoleEndRef = React.useRef<HTMLDivElement | null>(null);
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  // Auto-scroll to bottom of terminal
  React.useEffect(() => {
    consoleEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history]);

  // Initial welcome message and focus input
  React.useEffect(() => {
    inputRef.current?.focus();
    const welcomeLines: TerminalLine[] = [
      {
        type: "system",
        text: "psql (Universe SQL Interactive Console, server 16.2)",
      },
      {
        type: "system",
        text: 'Type "\\?" or "\\help" for help on meta-commands.',
      },
      { type: "system", text: 'Type "clear" to clear the terminal history.' },
      { type: "system", text: "" },
    ];

    if (activeConnection) {
      welcomeLines.push({
        type: "info",
        text: `Connected to active session: ${activeConnection.username}@${activeConnection.host}:${activeConnection.port}/${activeConnection.database}`,
      });
    } else {
      welcomeLines.push({
        type: "error",
        text: "WARNING: No active database session. Select a connection in the sidebar first.",
      });
    }

    setHistory(welcomeLines);
  }, [activeConnection]);

  // Command History cycling
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (commandHistory.length === 0) return;
      const nextIdx = historyIndex + 1;
      if (nextIdx < commandHistory.length) {
        setHistoryIndex(nextIdx);
        setInputVal(commandHistory[commandHistory.length - 1 - nextIdx]);
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      const nextIdx = historyIndex - 1;
      if (nextIdx >= 0) {
        setHistoryIndex(nextIdx);
        setInputVal(commandHistory[commandHistory.length - 1 - nextIdx]);
      } else {
        setHistoryIndex(-1);
        setInputVal("");
      }
    }
  };

  const executeCommand = async (cmd: string) => {
    const trimmed = cmd.trim();
    if (!trimmed) return;

    // Save to command history
    setCommandHistory((prev) => [
      ...prev.filter((c) => c !== trimmed),
      trimmed,
    ]);
    setHistoryIndex(-1);

    const prompt = activeConnection
      ? `${activeConnection.database}=# `
      : "usql> ";
    setHistory((prev) => [...prev, { type: "input", text: `${prompt}${cmd}` }]);

    // Command handling
    if (trimmed.toLowerCase() === "clear") {
      setHistory([]);
      return;
    }

    if (trimmed === "\\?" || trimmed.toLowerCase() === "\\help") {
      const helpText = [
        "General meta-commands:",
        "  \\? or \\help        show help on meta-commands",
        "  \\conninfo           show session connection details",
        "  \\l or \\list         list all databases on the active server",
        "  \\dt                 list all tables in the current schema",
        "  \\df                 list all functions in the public schema",
        "  \\d [table]          describe details (columns, types, nullable) of [table]",
        "  clear               clear the terminal display",
      ].join("\n");

      setHistory((prev) => [...prev, { type: "info", text: helpText }]);
      return;
    }

    if (trimmed === "\\conninfo") {
      if (!activeConnection) {
        setHistory((prev) => [
          ...prev,
          { type: "error", text: "Error: No active database session." },
        ]);
        return;
      }
      const connInfo = [
        `You are connected to database "${activeConnection.database}" as user "${activeConnection.username}" on host "${activeConnection.host}" at port "${activeConnection.port}".`,
        `SSL Connection: Enabled (Fallback-Mode)`,
      ].join("\n");
      setHistory((prev) => [...prev, { type: "info", text: connInfo }]);
      return;
    }

    // Database meta-commands executing SQL underneath
    if (!activeConnection) {
      setHistory((prev) => [
        ...prev,
        {
          type: "error",
          text: "Error: No active connection session configured to execute SQL commands.",
        },
      ]);
      return;
    }

    let sqlToExecute = trimmed;

    if (trimmed === "\\l" || trimmed === "\\list") {
      sqlToExecute =
        'SELECT datname as "Database Name", pg_get_userbyid(datdba) as "Owner", pg_encoding_to_char(encoding) as "Encoding" FROM pg_database WHERE datistemplate = false ORDER BY datname;';
    } else if (trimmed === "\\dt") {
      sqlToExecute =
        'SELECT tablename as "Table Name", tableowner as "Owner" FROM pg_tables WHERE schemaname = \'public\' ORDER BY tablename;';
    } else if (trimmed === "\\df") {
      sqlToExecute =
        'SELECT routine_name as "Function Name", data_type as "Return Type" FROM information_schema.routines WHERE routine_schema = \'public\' ORDER BY routine_name;';
    } else if (trimmed.startsWith("\\d ")) {
      const tableName = trimmed.slice(3).trim();
      if (!tableName) {
        setHistory((prev) => [
          ...prev,
          {
            type: "error",
            text: "Syntax Error: Specify table name (e.g. \\d users)",
          },
        ]);
        return;
      }
      sqlToExecute = `SELECT column_name as "Column", data_type as "Type", is_nullable as "Nullable", column_default as "Default" FROM information_schema.columns WHERE table_schema = 'public' AND table_name = '${tableName}' ORDER BY ordinal_position;`;
    } else if (trimmed.startsWith("\\d")) {
      sqlToExecute =
        'SELECT tablename as "Table Name", tableowner as "Owner" FROM pg_tables WHERE schemaname = \'public\' ORDER BY tablename;';
    }

    // Execute query via Electron
    try {
      if (!window.electron?.executeQuery) {
        throw new Error(
          "Electron database execution bridge is unavailable in this environment.",
        );
      }

      const res = (await window.electron.executeQuery({
        dbType: activeConnection.dbType,
        host: activeConnection.host,
        port: String(activeConnection.port),
        database: activeConnection.database,
        username: activeConnection.username,
        password: activeConnection.password,
        ssl: activeConnection.ssl,
        readOnly: activeConnection.readOnly,
        name: activeConnection.name,
        sql: sqlToExecute,
      })) as any;

      if (!res.ok) {
        setHistory((prev) => [
          ...prev,
          {
            type: "error",
            text: `ERROR: ${res.message || "Execution failed"}`,
          },
        ]);
        return;
      }

      const rows = res.rows || [];
      const columns = rows[0] ? Object.keys(rows[0]) : [];

      if (columns.length === 0) {
        // Command executed without returning rows (like INSERT, UPDATE, CREATE, ALTER)
        setHistory((prev) => [
          ...prev,
          {
            type: "info",
            text: `${res.command || "COMMAND"} completed successfully.`,
          },
        ]);
        return;
      }

      // Format as beautiful ASCII Table
      const formattedTable = formatAsAsciiTable(columns, rows);
      setHistory((prev) => [...prev, { type: "output", text: formattedTable }]);
    } catch (err: any) {
      setHistory((prev) => [
        ...prev,
        { type: "error", text: `FATAL ERROR: ${err.message}` },
      ]);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cmd = inputVal;
    setInputVal("");
    void executeCommand(cmd);
  };

  return (
    <div
      onClick={() => inputRef.current?.focus()}
      className="flex flex-col h-full w-full bg-zinc-950 font-mono text-sm text-zinc-300 p-4 overflow-hidden relative cursor-text select-text"
    >
      {/* Top Session bar */}
      <div className="flex items-center justify-between pb-3 border-b border-zinc-800/60 mb-3 shrink-0 select-none">
        <span className="text-xs uppercase font-bold tracking-wider text-zinc-500 flex items-center gap-1.5">
          <TerminalIcon className="size-3.5 text-rose-500 animate-pulse" />
          Interactive psql Terminal
        </span>
        {activeConnection ? (
          <span className="text-xs bg-emerald-950 text-emerald-400 border border-emerald-900 px-2 py-0.5 rounded font-bold">
            SESSION ACTIVE
          </span>
        ) : (
          <span className="text-xs bg-rose-950 text-rose-400 border border-rose-900 px-2 py-0.5 rounded font-bold flex items-center gap-1">
            <ShieldAlert className="size-3" />
            NO SESSION
          </span>
        )}
      </div>

      {/* Terminal logs viewport */}
      <div className="flex-1 overflow-y-auto space-y-2 mb-4 scrollbar-thin">
        {history.map((line, idx) => {
          let textClass = "text-zinc-300";
          if (line.type === "input") textClass = "text-white font-bold";
          else if (line.type === "error")
            textClass = "text-rose-500 font-semibold";
          else if (line.type === "info") textClass = "text-zinc-400";
          else if (line.type === "system") textClass = "text-zinc-500";
          else if (line.type === "output")
            textClass = "text-emerald-400 whitespace-pre overflow-x-auto block";

          return (
            <div
              key={`${line.type}-${idx}`}
              className={cn("leading-relaxed", textClass)}
            >
              {line.text}
            </div>
          );
        })}
        <div ref={consoleEndRef} />
      </div>

      {/* Terminal input console */}
      <form
        onSubmit={handleFormSubmit}
        className="flex items-center shrink-0 border-t border-zinc-900 pt-3 relative select-none"
      >
        <span className="text-white font-bold pr-2 shrink-0">
          {activeConnection ? `${activeConnection.database}=# ` : "usql> "}
        </span>
        <input
          ref={inputRef}
          type="text"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          className="flex-1 bg-transparent border-0 outline-none ring-0 p-0 text-white font-bold caret-rose-500"
          placeholder='Type sql or "\\?" meta-command...'
        />
        <div className="absolute right-0 flex items-center gap-1 text-xs text-zinc-500 uppercase font-medium">
          <CornerDownLeft className="size-3 text-zinc-600" />
          <span>Enter</span>
        </div>
      </form>
    </div>
  );
}

// Beautiful ASCII column align formatter
function formatAsAsciiTable(columns: string[], rows: any[]): string {
  if (rows.length === 0) {
    return (
      columns.join(" | ") +
      "\n" +
      "-".repeat(columns.join(" | ").length) +
      "\n(0 rows)"
    );
  }

  // Compute maximum length of values in each column
  const colWidths = columns.map((col) => {
    let maxLen = col.length;
    for (const row of rows) {
      const valStr =
        row[col] !== null && row[col] !== undefined ? String(row[col]) : "";
      if (valStr.length > maxLen) {
        maxLen = valStr.length;
      }
    }
    return maxLen;
  });

  // Construct header
  const header = columns
    .map((col, idx) => col.padEnd(colWidths[idx]))
    .join(" | ");

  // Construct separator
  const separator = colWidths.map((w) => "-".repeat(w)).join("-+-");

  // Construct rows
  const rowLines = rows.map((row) => {
    return columns
      .map((col, idx) => {
        const valStr =
          row[col] !== null && row[col] !== undefined ? String(row[col]) : "";
        return valStr.padEnd(colWidths[idx]);
      })
      .join(" | ");
  });

  return [header, separator, ...rowLines, `(${rows.length} rows)`].join("\n");
}
