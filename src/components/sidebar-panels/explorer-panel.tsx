import { useTranslation } from "react-i18next";
import * as React from "react";
import { TreeView, type TreeDataItem } from "@/components/tree-view";
import { SidebarItem } from "@/components/sidebar-item";
import { useSidebarStore } from "@/stores/sidebar-store";
import { useTreeData } from "@/hooks/use-tree-data";
import { useCommentsModal } from "@/hooks/use-comments-modal";
import { useSidebarSelect } from "@/hooks/use-sidebar-select";
import { useTabStore } from "@/stores/tab-store";
import { logger } from "@/lib/logger";
import { Plus, Network } from "lucide-react";
import { DrawerViewComments } from "@/components/drawer-view-comments";
import { SheetEditConnection } from "@/components/sheet-edit-connection";
import { SidebarConnectionDrawer } from "@/components/sidebar-connection-drawer";

const fetchDatabasesForConnection = async (conn: any) => {
  if (conn.dbType !== "postgres") {
    return [conn.database];
  }
  try {
    const res = await window.electron.executeQuery({
      ...conn,
      sql: "SELECT datname FROM pg_database WHERE datistemplate = false AND datallowconn = true ORDER BY datname;",
    });
    if (res.ok && res.rows) {
      return res.rows.map((row: any) => row.datname);
    }
  } catch (err) {
    console.error("Failed to fetch databases for connection:", err);
  }
  return [conn.database];
};

export function ExplorerPanel() {
  const { t } = useTranslation();
  const connections = useSidebarStore((state) => state.connections);
  const selectedConnectionId = useSidebarStore(
    (state) => state.selectedConnectionId,
  );
  const updateSelectedConnectionId = useSidebarStore(
    (state) => state.updateSelectedConnectionId,
  );

  const [editingConnection, setEditingConnection] = React.useState<any>(null);
  const [selectedItemId, setSelectedItemId] = React.useState<
    string | undefined
  >(selectedConnectionId);

  React.useEffect(() => {
    if (selectedConnectionId) {
      setSelectedItemId(selectedConnectionId);
    }
  }, [selectedConnectionId]);

  React.useEffect(() => {
    // Clean up any corrupted database names containing colons/queries in connections store
    for (const conn of connections) {
      if (conn.database?.includes(":")) {
        const cleanDb = conn.database.split(":")[0];
        useSidebarStore.getState().updateConnection({
          ...conn,
          database: cleanDb,
        });
      }
    }
  }, [connections]);

  const openQuery = useTabStore((state) => state.openQuery);
  const newQueryWithContext = React.useCallback(
    (context: { connectionId: string; connectionName: string }) => {
      openQuery(context);
    },
    [openQuery],
  );

  const {
    open: commentsOpen,
    setOpen: setCommentsOpen,
    context,
    data: commentsData,
    loading: commentsLoading,
    error: commentsError,
    handleViewComments,
  } = useCommentsModal();

  const { handleSelectChange: handleSidebarSelect } = useSidebarSelect();
  const { treeData } = useTreeData(connections);

  const handleRefresh = React.useCallback(
    async (item: TreeDataItem) => {
      const connId = item.id.includes(":") ? item.id.split(":")[0] : item.id;
      const conn = connections.find((c) => c.id === connId);
      if (!conn) return;

      const isConnection = !item.id.includes(":");
      const isDatabase =
        item.id.includes(":db:") &&
        !item.id.includes(":schema:") &&
        !item.id.includes(":query:") &&
        !item.id.includes(":queries");
      const isSchema =
        item.id.includes(":schema:") && !item.id.includes(":table:");

      if (isConnection) {
        logger.log(
          `[Explorer] Refreshing databases for connection: "${conn.name}"`,
        );
        useSidebarStore.getState().updateConnection({
          ...conn,
          isLoading: true,
        });

        try {
          const dbNames = await fetchDatabasesForConnection(conn);
          const dbNodes = dbNames.map((dbName) => ({
            id: `${conn.id}:db:${dbName}`,
            name: dbName,
            type: "database",
            children: [],
          }));

          useSidebarStore.getState().updateConnection({
            ...conn,
            isLoading: false,
            children: dbNodes,
          });
        } catch (err) {
          console.error("Error refreshing databases:", err);
          useSidebarStore.getState().updateConnection({
            ...conn,
            isLoading: false,
            children: [],
          });
        }
      } else if (isDatabase) {
        const dbName = item.id.split(":db:")[1];
        logger.log(`[Explorer] Refreshing database metadata: "${dbName}"`);

        const loadingDbNodes =
          conn.children?.map((child) => {
            if (child.id === item.id) {
              return { ...child, isLoading: true };
            }
            return child;
          }) || [];

        useSidebarStore.getState().updateConnection({
          ...conn,
          children: loadingDbNodes,
        });

        try {
          const res = await window.electron.getFullMetadata({
            ...conn,
            database: dbName,
          });

          if (res.ok && res.metadata) {
            const schemaNodes = res.metadata.map((s: any) => ({
              id: `${conn.id}:db:${dbName}:schema:${s.name}`,
              name: s.name,
              type: "schema",
              tableCount: s.tableCount,
              children: s.tables.map((t: any) => ({
                id: `${conn.id}:db:${dbName}:schema:${s.name}:table:${t.name}`,
                name: t.name,
                type: "table",
                size: t.size,
                children: [
                  {
                    id: `${conn.id}:db:${dbName}:schema:${s.name}:table:${t.name}:columns`,
                    name: "Columns",
                    count: t.columnCount,
                    children: t.columns.map((col: any) => ({
                      id: `${conn.id}:db:${dbName}:schema:${s.name}:table:${t.name}:column:${col.name}`,
                      name: col.name,
                      isPrimary: col.isPrimary,
                      isForeign: col.isForeign,
                      dataType: col.dataType,
                      references: col.references,
                    })),
                  },
                  {
                    id: `${conn.id}:db:${dbName}:schema:${s.name}:table:${t.name}:indexes`,
                    name: "Indexes",
                    count: t.indexCount,
                    children: t.indexes.map((idxName: any) => ({
                      id: `${conn.id}:db:${dbName}:schema:${s.name}:table:${t.name}:index:${idxName}`,
                      name: idxName,
                    })),
                  },
                ],
              })),
            }));

            const finalDbNodes =
              conn.children?.map((child) => {
                if (child.id === item.id) {
                  return {
                    ...child,
                    isLoading: false,
                    children:
                      schemaNodes.length > 0
                        ? schemaNodes
                        : [
                            {
                              id: `${conn.id}:db:${dbName}:empty`,
                              name: "No schemas found",
                              disabled: true,
                            },
                          ],
                  };
                }
                return child;
              }) || [];

            useSidebarStore.getState().updateConnection({
              ...conn,
              children: finalDbNodes,
            });
          }
        } catch (err) {
          console.error("Error refreshing database metadata:", err);
          const resetDbNodes =
            conn.children?.map((child) => {
              if (child.id === item.id) {
                return { ...child, isLoading: false };
              }
              return child;
            }) || [];
          useSidebarStore.getState().updateConnection({
            ...conn,
            children: resetDbNodes,
          });
        }
      } else if (isSchema) {
        const parts = item.id.split(":schema:");
        const schemaName = parts[1];
        const dbPath = parts[0];
        const dbName = dbPath.split(":db:")[1];

        logger.log(
          `[Explorer] Refreshing schema metadata: "${schemaName}" inside "${dbName}"`,
        );

        // 1. Mark schema as loading in tree
        const dbChildren = conn.children || [];
        const loadingDbNodes = dbChildren.map((dbNode) => {
          if (dbNode.id === dbPath) {
            const schemas = dbNode.children || [];
            const updatedSchemas = schemas.map((sNode) => {
              if (sNode.id === item.id) {
                return { ...sNode, isLoading: true };
              }
              return sNode;
            });
            return { ...dbNode, children: updatedSchemas };
          }
          return dbNode;
        });

        useSidebarStore.getState().updateConnection({
          ...conn,
          children: loadingDbNodes,
        });

        try {
          const res = await window.electron.getSchemaMetadata(conn, schemaName);

          if (res.ok && res.schema) {
            const s = res.schema;
            const newSchemaNode = {
              id: `${conn.id}:db:${dbName}:schema:${s.name}`,
              name: s.name,
              type: "schema",
              tableCount: s.tableCount,
              children: s.tables.map((t: any) => ({
                id: `${conn.id}:db:${dbName}:schema:${s.name}:table:${t.name}`,
                name: t.name,
                type: "table",
                size: t.size,
                children: [
                  {
                    id: `${conn.id}:db:${dbName}:schema:${s.name}:table:${t.name}:columns`,
                    name: "Columns",
                    count: t.columnCount,
                    children: t.columns.map((col: any) => ({
                      id: `${conn.id}:db:${dbName}:schema:${s.name}:table:${t.name}:column:${col.name}`,
                      name: col.name,
                      isPrimary: col.isPrimary,
                      isForeign: col.isForeign,
                      dataType: col.dataType,
                      references: col.references,
                    })),
                  },
                  {
                    id: `${conn.id}:db:${dbName}:schema:${s.name}:table:${t.name}:indexes`,
                    name: "Indexes",
                    count: t.indexCount,
                    children: t.indexes.map((idxName: any) => ({
                      id: `${conn.id}:db:${dbName}:schema:${s.name}:table:${t.name}:index:${idxName}`,
                      name: idxName,
                    })),
                  },
                ],
              })),
            };

            const finalDbNodes = (conn.children || []).map((dbNode) => {
              if (dbNode.id === dbPath) {
                const schemas = dbNode.children || [];
                const updatedSchemas = schemas.map((sNode) => {
                  if (sNode.id === item.id) {
                    return {
                      ...newSchemaNode,
                      isLoading: false,
                    };
                  }
                  return sNode;
                });
                return { ...dbNode, children: updatedSchemas };
              }
              return dbNode;
            });

            useSidebarStore.getState().updateConnection({
              ...conn,
              children: finalDbNodes,
            });
            logger.log(
              `[Explorer] Successfully refreshed schema "${schemaName}"`,
            );
          } else {
            // Revert loading on error
            const resetDbNodes = (conn.children || []).map((dbNode) => {
              if (dbNode.id === dbPath) {
                const schemas = dbNode.children || [];
                const updatedSchemas = schemas.map((sNode) => {
                  if (sNode.id === item.id) {
                    return { ...sNode, isLoading: false };
                  }
                  return sNode;
                });
                return { ...dbNode, children: updatedSchemas };
              }
              return dbNode;
            });
            useSidebarStore.getState().updateConnection({
              ...conn,
              children: resetDbNodes,
            });
          }
        } catch (err) {
          console.error("Error refreshing schema metadata:", err);
          const resetDbNodes = (conn.children || []).map((dbNode) => {
            if (dbNode.id === dbPath) {
              const schemas = dbNode.children || [];
              const updatedSchemas = schemas.map((sNode) => {
                if (sNode.id === item.id) {
                  return { ...sNode, isLoading: false };
                }
                return sNode;
              });
              return { ...dbNode, children: updatedSchemas };
            }
            return dbNode;
          });
          useSidebarStore.getState().updateConnection({
            ...conn,
            children: resetDbNodes,
          });
        }
      }
    },
    [connections],
  );

  React.useEffect(() => {
    const handleRefreshNode = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.id) {
        handleRefresh({ id: detail.id } as TreeDataItem);
      }
    };
    globalThis.addEventListener("usql:refresh-node", handleRefreshNode);
    return () => {
      globalThis.removeEventListener("usql:refresh-node", handleRefreshNode);
    };
  }, [handleRefresh]);

  const handleSelectChange = React.useCallback(
    async (item: TreeDataItem | undefined) => {
      if (!item) return;

      setSelectedItemId(item.id);

      const isConnection = !item.id.includes(":");
      const isDatabase =
        item.id.includes(":db:") &&
        !item.id.includes(":schema:") &&
        !item.id.includes(":query:") &&
        !item.id.includes(":queries");

      if (isConnection) {
        const conn = connections.find((c) => c.id === item.id);
        if (!conn) return;

        updateSelectedConnectionId(conn.id);

        if (!conn.children || conn.children.length === 0) {
          useSidebarStore.getState().updateConnection({
            ...conn,
            isLoading: true,
          });

          try {
            const dbNames = await fetchDatabasesForConnection(conn);
            const dbNodes = dbNames.map((dbName) => ({
              id: `${conn.id}:db:${dbName}`,
              name: dbName,
              type: "database",
              children: [],
            }));

            useSidebarStore.getState().updateConnection({
              ...conn,
              isLoading: false,
              children: dbNodes,
            });
          } catch (err) {
            console.error("Error loading databases on selection:", err);
            useSidebarStore.getState().updateConnection({
              ...conn,
              isLoading: false,
              children: [
                {
                  id: `${conn.id}:error`,
                  name: "Failed to load databases",
                  disabled: true,
                  className: "text-destructive",
                },
              ],
            });
          }
        }
        return;
      }

      if (isDatabase) {
        const connId = item.id.split(":db:")[0];
        const dbName = item.id.split(":db:")[1];
        const conn = connections.find((c) => c.id === connId);
        if (!conn) return;

        updateSelectedConnectionId(conn.id);

        if (conn.database !== dbName) {
          useSidebarStore.getState().updateConnection({
            ...conn,
            database: dbName,
          });
        }

        const children = conn.children || [];
        const dbNode = children.find((c) => c.id === item.id);
        if (dbNode && (!dbNode.children || dbNode.children.length === 0)) {
          const loadingDbNodes = children.map((child) => {
            if (child.id === item.id) {
              return { ...child, isLoading: true };
            }
            return child;
          });
          useSidebarStore.getState().updateConnection({
            ...conn,
            children: loadingDbNodes,
          });

          try {
            const res = await window.electron.getFullMetadata({
              ...conn,
              database: dbName,
            });

            if (res.ok && res.metadata) {
              const schemaNodes = res.metadata.map((s: any) => ({
                id: `${conn.id}:db:${dbName}:schema:${s.name}`,
                name: s.name,
                type: "schema",
                tableCount: s.tableCount,
                children: s.tables.map((t: any) => ({
                  id: `${conn.id}:db:${dbName}:schema:${s.name}:table:${t.name}`,
                  name: t.name,
                  type: "table",
                  size: t.size,
                  children: [
                    {
                      id: `${conn.id}:db:${dbName}:schema:${s.name}:table:${t.name}:columns`,
                      name: "Columns",
                      count: t.columnCount,
                      children: t.columns.map((col: any) => ({
                        id: `${conn.id}:db:${dbName}:schema:${s.name}:table:${t.name}:column:${col.name}`,
                        name: col.name,
                        isPrimary: col.isPrimary,
                        isForeign: col.isForeign,
                        dataType: col.dataType,
                        references: col.references,
                      })),
                    },
                    {
                      id: `${conn.id}:db:${dbName}:schema:${s.name}:table:${t.name}:indexes`,
                      name: "Indexes",
                      count: t.indexCount,
                      children: t.indexes.map((idxName: any) => ({
                        id: `${conn.id}:db:${dbName}:schema:${s.name}:table:${t.name}:index:${idxName}`,
                        name: idxName,
                      })),
                    },
                  ],
                })),
              }));

              const finalDbNodes = children.map((child) => {
                if (child.id === item.id) {
                  return {
                    ...child,
                    isLoading: false,
                    children:
                      schemaNodes.length > 0
                        ? schemaNodes
                        : [
                            {
                              id: `${conn.id}:db:${dbName}:empty`,
                              name: "No schemas found",
                              disabled: true,
                            },
                          ],
                  };
                }
                return child;
              });

              useSidebarStore.getState().updateConnection({
                ...conn,
                children: finalDbNodes,
              });
            } else {
              const errorDbNodes = children.map((child) => {
                if (child.id === item.id) {
                  return {
                    ...child,
                    isLoading: false,
                    children: [
                      {
                        id: `${conn.id}:db:${dbName}:error`,
                        name: res.message || "Failed to load",
                        disabled: true,
                        className: "text-destructive",
                      },
                    ],
                  };
                }
                return child;
              });
              useSidebarStore.getState().updateConnection({
                ...conn,
                children: errorDbNodes,
              });
            }
          } catch (err) {
            console.error("Error loading database metadata on selection:", err);
            const errorDbNodes = children.map((child) => {
              if (child.id === item.id) {
                return {
                  ...child,
                  isLoading: false,
                  children: [
                    {
                      id: `${conn.id}:db:${dbName}:error`,
                      name: "Failed to load",
                      disabled: true,
                      className: "text-destructive",
                    },
                  ],
                };
              }
              return child;
            });
            useSidebarStore.getState().updateConnection({
              ...conn,
              children: errorDbNodes,
            });
          }
        }
      }

      handleSidebarSelect(item);
    },
    [connections, handleSidebarSelect, updateSelectedConnectionId],
  );

  const renderSidebarItem = React.useCallback(
    ({ item }: any) => (
      <SidebarItem
        item={item}
        onRefresh={handleRefresh}
        onNewQuery={(id, name) =>
          newQueryWithContext({ connectionId: id, connectionName: name })
        }
        onEdit={setEditingConnection}
        onViewComments={handleViewComments}
      />
    ),
    [
      handleRefresh,
      newQueryWithContext,
      setEditingConnection,
      handleViewComments,
    ],
  );

  return (
    <div className="flex flex-col h-full bg-card overflow-hidden">
      {/* Unified Sidebar Header */}
      <div className="p-4 flex items-center justify-between border-b shrink-0 select-none">
        <span className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
          {t("databaseExplorer")}
        </span>
        <SidebarConnectionDrawer>
          <button
            type="button"
            className="p-1 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer outline-hidden"
            title={t("addConnectionTitle")}
          >
            <Plus className="size-4" />
          </button>
        </SidebarConnectionDrawer>
      </div>

      {/* Explorer Tree */}
      <div className="flex-1 overflow-y-auto p-2">
        {connections.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center text-sm text-muted-foreground h-48 select-none">
            <Network className="size-8 text-muted-foreground/40 mb-2.5 stroke-1" />
            <p className="font-semibold text-foreground mb-1">
              {t("noConnectionsConfigured") || "No connections configured"}
            </p>
            <p className="mb-4 text-xs">
              {t("clickToAddFirstConnection") ||
                "Click the + button to add your first database connection"}
            </p>
            <SidebarConnectionDrawer />
          </div>
        ) : (
          <TreeView
            data={treeData}
            onSelectChange={handleSelectChange}
            selectedItemId={selectedItemId}
            initialSelectedItemId={selectedItemId}
            renderItem={renderSidebarItem}
          />
        )}
      </div>

      <SheetEditConnection
        editingConnection={editingConnection}
        setEditingConnection={setEditingConnection}
      />

      <DrawerViewComments
        open={commentsOpen}
        onOpenChange={setCommentsOpen}
        tableName={context?.table}
        schemaName={context?.schema}
        comments={commentsData}
        loading={commentsLoading}
        error={commentsError}
        connectionId={context?.connectionId}
      />
    </div>
  );
}
