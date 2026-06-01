import { useTranslation } from "react-i18next";
import * as React from "react";
import { Network, Plus } from "lucide-react";
import { useSidebarStore } from "@/stores/sidebar-store";
import { SidebarConnectionDrawer } from "@/components/sidebar-connection-drawer";
import { SheetEditConnection } from "@/components/sheet-edit-connection";
import { ConnectionContextMenu } from "@/components/connection-context-menu";
import { useSidebar } from "@/components/ui/sidebar";
import { PostgresIcon } from "@/hooks/use-tree-data";
import { cn } from "@/lib/utils";
import { useTabStore } from "@/stores/tab-store";
import { logger } from "@/lib/logger";
import { useSidebarSelect } from "@/hooks/use-sidebar-select";

export function ConnectionsPanel() {
  const { t } = useTranslation();
  const { setActiveTab } = useSidebar();
  const connections = useSidebarStore((state) => state.connections);
  const selectedConnectionId = useSidebarStore(
    (state) => state.selectedConnectionId,
  );
  const updateSelectedConnectionId = useSidebarStore(
    (state) => state.updateSelectedConnectionId,
  );
  const _removeConnection = useSidebarStore((state) => state.removeConnection);

  const [editingConnection, setEditingConnection] = React.useState<any>(null);

  const openQuery = useTabStore((state) => state.openQuery);
  const newQueryWithContext = React.useCallback(
    (context: { connectionId: string; connectionName: string }) => {
      openQuery(context);
    },
    [openQuery],
  );

  const { handleSelectChange } = useSidebarSelect();

  const handleRefresh = React.useCallback(
    async (item: any) => {
      const conn = connections.find((c) => c.id === item.id);
      if (!conn) return;

      logger.log(
        `[Sidebar] Initiating metadata fetch for connection: "${conn.name}"`,
      );
      useSidebarStore
        .getState()
        .updateConnection({ ...conn, isLoading: true, children: [] });
      handleSelectChange(item);

      if (window.electron?.getFullMetadata) {
        try {
          const res = await window.electron.getFullMetadata(conn);
          if (res.ok && res.metadata) {
            logger.log(
              `[Sidebar] Metadata successfully loaded for "${conn.name}"`,
            );
            const schemaNodes = res.metadata.map((s: any) => ({
              id: `${conn.id}:schema:${s.name}`,
              name: s.name,
              tableCount: s.tableCount,
              children: s.tables.map((t: any) => ({
                id: `${conn.id}:schema:${s.name}:table:${t.name}`,
                name: t.name,
                size: t.size,
                children: [
                  {
                    id: `${conn.id}:schema:${s.name}:table:${t.name}:columns`,
                    name: "Columns",
                    count: t.columnCount,
                    children: t.columns.map((col: any) => ({
                      id: `${conn.id}:schema:${s.name}:table:${t.name}:column:${col.name}`,
                      name: col.name,
                      isPrimary: col.isPrimary,
                      isForeign: col.isForeign,
                      dataType: col.dataType,
                      references: col.references,
                    })),
                  },
                  {
                    id: `${conn.id}:schema:${s.name}:table:${t.name}:indexes`,
                    name: "Indexes",
                    count: t.indexCount,
                    children: t.indexes.map((idxName: any) => ({
                      id: `${conn.id}:schema:${s.name}:table:${t.name}:index:${idxName}`,
                      name: idxName,
                    })),
                  },
                ],
              })),
            }));

            useSidebarStore.getState().updateConnection({
              ...conn,
              isLoading: false,
              children:
                schemaNodes.length > 0
                  ? schemaNodes
                  : [
                      {
                        id: `${conn.id}:empty`,
                        name: "No schemas found",
                        disabled: true,
                      },
                    ],
            });
          } else {
            useSidebarStore.getState().updateConnection({
              ...conn,
              isLoading: false,
              children: [
                {
                  id: `${conn.id}:error`,
                  name: res.message || "Failed to load",
                  disabled: true,
                  className: "text-destructive",
                },
              ],
            });
          }
        } catch (_err) {
          useSidebarStore.getState().updateConnection({
            ...conn,
            isLoading: false,
            children: [
              {
                id: `${conn.id}:error`,
                name: "Failed to load",
                disabled: true,
                className: "text-destructive",
              },
            ],
          });
        }
      }
    },
    [connections, handleSelectChange],
  );

  return (
    <div className="flex flex-col h-full bg-card overflow-hidden">
      {/* Header and Add button */}
      <div className="p-4 flex items-center justify-between border-b shrink-0 select-none">
        <span className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
          {t("connectionsManager")}
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

      {/* Connections List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {connections.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center text-sm text-muted-foreground h-48 select-none">
            <Network className="size-8 text-muted-foreground/40 mb-2.5 stroke-1" />
            <p className="font-semibold text-foreground mb-1">
              {t("noConnectionsConfigured")}
            </p>
            <p className="mb-4 text-sm">{t("clickToAddFirstConnection")}</p>
            <SidebarConnectionDrawer />
          </div>
        ) : (
          connections.map((conn) => {
            const isSelected = selectedConnectionId === conn.id;
            return (
              <ConnectionContextMenu
                key={conn.id}
                item={conn}
                onRefresh={handleRefresh}
                onNewQuery={(id, name) => {
                  newQueryWithContext({
                    connectionId: id,
                    connectionName: name,
                  });
                }}
                onEdit={setEditingConnection}
              >
                <div
                  onClick={() => {
                    updateSelectedConnectionId(conn.id);
                    // Automatically switch to Explorer tab when a connection is selected/active
                    setActiveTab("explorer");
                  }}
                  className={cn(
                    "flex items-center justify-between w-full p-2.5 rounded-lg border text-left cursor-pointer transition-all select-none",
                    isSelected
                      ? "bg-brand/10 border-brand/30 text-brand font-medium"
                      : "bg-background border-border hover:bg-muted/50 hover:border-muted-foreground/30 text-foreground",
                  )}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <PostgresIcon className="size-4 shrink-0" />
                    <span className="truncate text-sm font-semibold">
                      {conn.name}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {conn.isLoading && (
                      <span className="flex size-1.5 rounded-full bg-amber-500 animate-pulse" />
                    )}
                    {isSelected && (
                      <span className="flex size-2 rounded-full bg-brand" />
                    )}
                  </div>
                </div>
              </ConnectionContextMenu>
            );
          })
        )}
      </div>

      <SheetEditConnection
        editingConnection={editingConnection}
        setEditingConnection={setEditingConnection}
      />
    </div>
  );
}
