import * as React from "react";
import { useTranslation } from "react-i18next";
import { useErdSchema } from "@/hooks/use-erd-schema";
import { useConnection } from "@/hooks/use-connection";
import { useTabStore } from "@/stores/tab-store";
import { ERDCanvas } from "./erd-canvas";
import { ReactFlowProvider } from "@xyflow/react";
import { Loader2, Database, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function ERDContainer() {
  const { t } = useTranslation();
  const { activeConnection, connections } = useConnection();

  const queryTabs = useTabStore((state) => state.queryTabs);
  const activeQueryTabId = useTabStore((state) => state.activeQueryTabId);
  const activeTab = React.useMemo(() => {
    return queryTabs.find((tab) => tab.id === activeQueryTabId);
  }, [queryTabs, activeQueryTabId]);

  const contextConnId = activeTab?.context?.connectionId;

  const [selectedConnId, setSelectedConnId] = React.useState<
    string | undefined
  >(contextConnId || activeConnection?.id);

  const selectedConnection = React.useMemo(() => {
    return connections.find((c) => c.id === selectedConnId) || null;
  }, [connections, selectedConnId]);

  const [databases, setDatabases] = React.useState<string[]>([]);
  const [selectedDb, setSelectedDb] = React.useState<string | undefined>(
    undefined,
  );
  const [loadingDbs, setLoadingDbs] = React.useState(false);

  // Sync local selected connection with active connection or context if changed/not set
  React.useEffect(() => {
    if (contextConnId) {
      setSelectedConnId(contextConnId);
    } else if (activeConnection?.id && !selectedConnId) {
      setSelectedConnId(activeConnection.id);
    }
  }, [activeConnection, selectedConnId, contextConnId]);

  // Reset/Fetch databases when connection changes
  React.useEffect(() => {
    if (!selectedConnection) {
      setDatabases([]);
      setSelectedDb(undefined);
      return;
    }

    setSelectedDb(selectedConnection.database);
    setDatabases([selectedConnection.database]);

    const fetchDbs = async () => {
      if (selectedConnection.dbType !== "postgres") {
        return;
      }

      setLoadingDbs(true);
      try {
        const res = await window.electron.executeQuery({
          dbType: selectedConnection.dbType,
          host: selectedConnection.host,
          port: String(selectedConnection.port),
          database: selectedConnection.database,
          username: selectedConnection.username,
          password: selectedConnection.password,
          ssl: selectedConnection.ssl,
          readOnly: selectedConnection.readOnly,
          name: selectedConnection.name,
          sql: "SELECT datname FROM pg_database WHERE datistemplate = false AND datallowconn = true ORDER BY datname;",
        });
        if (res.ok && res.rows) {
          const dbNames = res.rows.map((row: any) => row.datname);
          setDatabases(dbNames);
          if (dbNames.includes(selectedConnection.database)) {
            setSelectedDb(selectedConnection.database);
          } else if (dbNames.length > 0) {
            setSelectedDb(dbNames[0]);
          }
        }
      } catch (err) {
        console.error("Failed to query databases for ERD:", err);
      } finally {
        setLoadingDbs(false);
      }
    };

    fetchDbs();
  }, [selectedConnId, selectedConnection]);

  const { tables, relations, isLoading, error, fetchSchema } = useErdSchema(
    selectedConnId,
    selectedDb,
  );

  React.useEffect(() => {
    fetchSchema();
  }, [fetchSchema]);

  return (
    <div className="w-full h-full flex flex-col bg-background overflow-hidden">
      {/* Header Bar */}
      <div className="flex items-center justify-between px-6 h-14 border-b shrink-0 bg-card/25 backdrop-blur-md">
        <div className="flex flex-col">
          <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
            {t("erdTitle")}
            {!isLoading && !error && tables.length > 0 && (
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 font-semibold border border-emerald-500/20">
                {tables.length}{" "}
                {t("erdTableCount", { count: tables.length }).toLowerCase()}
              </span>
            )}
          </h2>
          <p className="text-xs text-muted-foreground/80 font-medium leading-none mt-0.5">
            {t("erdSubTitle")}
          </p>
        </div>

        {/* Selectors */}
        <div className="flex items-center gap-4 shrink-0">
          {/* Connection Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-bold uppercase tracking-wider">
              {t("erdConnectionLabel")}
            </span>
            <Select
              value={selectedConnId || ""}
              onValueChange={(val) => setSelectedConnId(val || undefined)}
            >
              <SelectTrigger className="h-8 min-w-[180px] text-sm font-semibold bg-background rounded-lg border-muted-foreground/20 hover:border-muted-foreground/30 transition-colors">
                <SelectValue
                  placeholder={t("erdSelectConnectionPlaceholder")}
                />
              </SelectTrigger>
              <SelectContent>
                {connections.map((conn) => (
                  <SelectItem key={conn.id} value={conn.id} className="text-sm">
                    <div className="flex items-center gap-2 leading-none">
                      <Database className="size-3.5 text-indigo-500 shrink-0" />
                      <span className="font-semibold text-foreground text-sm leading-none flex items-center">
                        {conn.name}
                      </span>
                      <span className="text-[10px] text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-1.5 py-0.5 rounded shrink-0 font-mono leading-none flex items-center">
                        {conn.database}
                      </span>
                    </div>
                  </SelectItem>
                ))}
                {connections.length === 0 && (
                  <SelectItem
                    value="_empty"
                    disabled
                    className="text-sm italic text-muted-foreground"
                  >
                    {t("erdNoConnections")}
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Database Selector */}
          {selectedConnection && (
            <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2 duration-200">
              <span className="text-xs text-muted-foreground font-bold uppercase tracking-wider">
                {t("selectDatabase")}
              </span>
              <Select
                value={selectedDb || ""}
                onValueChange={(val) => setSelectedDb(val)}
                disabled={databases.length <= 1}
              >
                <SelectTrigger className="h-8 min-w-[150px] max-w-[200px] text-sm font-semibold bg-background rounded-lg border-muted-foreground/20 hover:border-muted-foreground/30 transition-colors">
                  {loadingDbs ? (
                    <div className="flex items-center gap-1.5">
                      <Loader2 className="size-3 animate-spin text-muted-foreground" />
                      <span className="text-xs text-muted-foreground font-normal italic">
                        Loading...
                      </span>
                    </div>
                  ) : (
                    <SelectValue placeholder={t("selectDatabase")} />
                  )}
                </SelectTrigger>
                <SelectContent>
                  {databases.map((db) => (
                    <SelectItem
                      key={db}
                      value={db}
                      className="text-sm font-mono"
                    >
                      {db}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 min-h-0 relative">
        {isLoading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/50 text-muted-foreground gap-3">
            <Loader2 className="size-6 animate-spin text-brand" />
            <p className="text-sm font-semibold">{t("erdAnalyzingDatabase")}</p>
          </div>
        ) : error ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/50 text-muted-foreground gap-3 p-4 text-center">
            <AlertCircle className="size-8 text-destructive" />
            <p className="text-sm font-semibold text-destructive max-w-md break-words">
              {error}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchSchema}
              className="mt-2 text-sm font-bold"
            >
              {t("erdTryAgain")}
            </Button>
          </div>
        ) : !selectedConnId ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/50 text-muted-foreground gap-3">
            <Database className="size-8 opacity-20" />
            <p className="text-sm font-semibold">
              {t("erdSelectConnectionPrompt")}
            </p>
          </div>
        ) : tables.length === 0 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/50 text-muted-foreground gap-3">
            <Database className="size-8 opacity-20" />
            <p className="text-sm font-semibold">{t("erdNoTablesFound")}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchSchema}
              className="mt-2 text-sm font-bold"
            >
              {t("erdReloadSchema")}
            </Button>
          </div>
        ) : (
          <ReactFlowProvider>
            <ERDCanvas tables={tables} relations={relations} />
          </ReactFlowProvider>
        )}
      </div>
    </div>
  );
}
