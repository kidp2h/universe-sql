import * as React from "react";
import { useConnection } from "@/hooks/use-connection";
import { postgresQueries } from "@/lib/erd/schema-adapter";
import type { TableNodeData, Relation } from "@/lib/erd/types";

export function useErdSchema(selectedConnectionId?: string) {
  const { activeConnection, connections } = useConnection();
  const [tables, setTables] = React.useState<TableNodeData[]>([]);
  const [relations, setRelations] = React.useState<Relation[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const targetConnection = React.useMemo(() => {
    if (selectedConnectionId) {
      return connections.find((conn) => conn.id === selectedConnectionId);
    }
    return activeConnection;
  }, [selectedConnectionId, connections, activeConnection]);

  const fetchSchema = React.useCallback(async () => {
    if (!targetConnection || !window.electron?.executeQuery) return;

    setIsLoading(true);
    setError(null);

    try {
      // Fetch Tables and Columns
      const tablesRes = await window.electron.executeQuery({
        dbType: targetConnection.dbType,
        host: targetConnection.host,
        port: String(targetConnection.port),
        database: targetConnection.database,
        username: targetConnection.username,
        password: targetConnection.password,
        ssl: targetConnection.ssl,
        readOnly: targetConnection.readOnly,
        name: targetConnection.name,
        sql: postgresQueries.getTablesAndColumns,
      });

      if (!tablesRes.ok) {
        throw new Error(tablesRes.message || "Failed to fetch tables");
      }

      // Fetch Foreign Keys
      const fkRes = await window.electron.executeQuery({
        dbType: targetConnection.dbType,
        host: targetConnection.host,
        port: String(targetConnection.port),
        database: targetConnection.database,
        username: targetConnection.username,
        password: targetConnection.password,
        ssl: targetConnection.ssl,
        readOnly: targetConnection.readOnly,
        name: targetConnection.name,
        sql: postgresQueries.getForeignKeys,
      });

      if (!fkRes.ok) {
        throw new Error(fkRes.message || "Failed to fetch foreign keys");
      }

      // Process relations
      const fks: Relation[] = (fkRes.rows as unknown as Relation[]) || [];

      // Process tables
      const rows = (tablesRes.rows as unknown as any[]) || [];
      const tablesMap = new Map<string, TableNodeData>();

      for (const row of rows) {
        const key = `${row.schema}.${row.tableName}`;
        if (!tablesMap.has(key)) {
          tablesMap.set(key, {
            schema: row.schema,
            tableName: row.tableName,
            columns: [],
          });
        }

        const isForeign = fks.some(
          (fk) =>
            fk.sourceSchema === row.schema &&
            fk.sourceTable === row.tableName &&
            fk.sourceColumn === row.name,
        );

        tablesMap.get(key)?.columns.push({
          name: row.name,
          type: row.type,
          isPrimary: row.isPrimary,
          isForeign,
        });
      }

      setTables(Array.from(tablesMap.values()));
      setRelations(fks);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Unknown error fetching schema");
    } finally {
      setIsLoading(false);
    }
  }, [targetConnection]);

  return { tables, relations, isLoading, error, fetchSchema };
}
