import * as React from "react";
import { useSidebarStore } from "@/stores/sidebar-store";

export interface TableColumnDetail {
  column_name: string;
  data_type: string;
  is_nullable: string;
  column_default: string | null;
  comment: string | null;
  is_primary: boolean;
}

export interface CommentsContext {
  connectionId: string;
  schema: string;
  table: string;
}

export function useCommentsModal() {
  const connections = useSidebarStore((state) => state.connections);

  const [open, setOpen] = React.useState(false);
  const [context, setContext] = React.useState<CommentsContext | null>(null);
  const [data, setData] = React.useState<TableColumnDetail[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | undefined>();

  const handleViewComments = React.useCallback(
    async (ctx: {
      connectionId: string;
      connectionName: string;
      schema?: string;
      table?: string;
    }) => {
      if (!ctx.schema || !ctx.table || !window.electron?.executeQuery) return;

      setContext({
        connectionId: ctx.connectionId,
        schema: ctx.schema,
        table: ctx.table,
      });
      setOpen(true);
      setLoading(true);
      setError(undefined);
      setData([]);

      try {
        const connection = connections.find(
          (item) => item.id === ctx.connectionId,
        );
        if (!connection) throw new Error("Connection not found");

        const query = `SELECT 
    c.column_name,
    c.data_type,
    c.is_nullable,
    c.column_default,
    col_description(pg_class.oid, c.ordinal_position) AS comment,
    COALESCE(
      (SELECT count(*) 
       FROM pg_constraint 
       WHERE conrelid = pg_class.oid 
         AND contype = 'p' 
         AND c.column_name = ANY(string_to_array(regexp_replace(pg_get_constraintdef(oid), 'PRIMARY KEY \\\\((.*)\\\\)', '\\\\1'), ', '))
      ) > 0, 
      false
    ) AS is_primary
FROM information_schema.columns c
JOIN pg_class ON pg_class.relname = c.table_name
JOIN pg_namespace ON pg_namespace.oid = pg_class.relnamespace AND pg_namespace.nspname = c.table_schema
WHERE c.table_schema = '${ctx.schema}'
  AND c.table_name = '${ctx.table}'
ORDER BY c.ordinal_position;`;

        const result = await window.electron.executeQuery({
          ...connection,
          sql: query,
        } as any);

        if (result.ok && result.rows) {
          setData(result.rows as unknown as TableColumnDetail[]);
        } else {
          setError(result.message || "Failed to fetch table details");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error occurred");
      } finally {
        setLoading(false);
      }
    },
    [connections],
  );

  React.useEffect(() => {
    const handler = (e: any) => {
      if (e.detail) {
        handleViewComments(e.detail);
      }
    };
    globalThis.addEventListener("usql:view-comments", handler);
    return () => globalThis.removeEventListener("usql:view-comments", handler);
  }, [handleViewComments]);

  return { open, setOpen, context, data, loading, error, handleViewComments };
}
