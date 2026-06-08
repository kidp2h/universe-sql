import * as React from "react";
import {
  RefreshCw,
  FilePlusCorner,
  Edit,
  Trash2,
  Database,
  Lock,
  Network,
} from "lucide-react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Shortcut } from "@/components/ui/kbd";
import { useSidebarStore } from "@/stores/sidebar-store";
import { useTabStore } from "@/stores/tab-store";
import { useTranslation } from "react-i18next";
import { TreeDataItem } from "@/components/tree-view";

interface ConnectionContextMenuProps {
  item: TreeDataItem;
  children: React.ReactNode;
  onRefresh: (item: TreeDataItem) => void;
  onNewQuery: (connectionId: string, connectionName: string) => void;
  onEdit: (connection: any) => void;
}

export function ConnectionContextMenu({
  item,
  children,
  onRefresh,
  onNewQuery,
  onEdit,
}: ConnectionContextMenuProps) {
  const { t } = useTranslation();
  const connections = useSidebarStore((state) => state.connections);
  const conn = connections.find((c) => c.id === item.id);
  const openToolTab = useTabStore((state) => state.openToolTab);

  const isLoading = !!(item.isLoading || conn?.isLoading);

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger className="flex items-center w-full">
          {children}
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem
            disabled={isLoading}
            onSelect={(e) => {
              e.stopPropagation();
              onRefresh(item);
            }}
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            {t("menuRefresh")}
          </ContextMenuItem>
          <ContextMenuItem
            disabled={isLoading}
            onSelect={(e) => {
              e.stopPropagation();
              const conn = connections.find((c) => c.id === item.id);
              if (conn) onNewQuery(conn.id, conn.name);
            }}
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <FilePlusCorner className="mr-2 h-4 w-4" />
            {t("newQuery")}
            <Shortcut shortcut="⌘ + N" />
          </ContextMenuItem>
          <ContextMenuItem
            disabled={isLoading}
            onSelect={(e) => {
              e.stopPropagation();
              const conn = connections.find((c) => c.id === item.id);
              if (conn) openToolTab("erd", { connectionId: conn.id });
            }}
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <Network className="mr-2 h-4 w-4 text-emerald-500" />
            {t("viewErd")}
          </ContextMenuItem>
          <ContextMenuItem
            disabled={isLoading}
            onSelect={(e) => {
              e.stopPropagation();
              const conn = connections.find((c) => c.id === item.id);
              if (conn) onEdit({ id: conn.id, config: conn });
            }}
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <Edit className="mr-2 h-4 w-4" />
            {t("menuEditConnection")}
          </ContextMenuItem>
          <ContextMenuItem
            disabled={isLoading}
            onSelect={(e) => {
              e.stopPropagation();
              if (conn) {
                useSidebarStore.getState().updateConnection({
                  ...conn,
                  readOnly: !conn.readOnly,
                });
              }
            }}
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <Lock className="mr-2 h-4 w-4" />
            {conn?.readOnly ? t("menuUnlockDatabase") : t("menuLockDatabase")}
          </ContextMenuItem>
          <ContextMenuSeparator />

          <ContextMenuItem
            disabled={isLoading}
            onSelect={(e) => {
              e.stopPropagation();
              openToolTab("database-dump", { connectionId: item.id });
            }}
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <Database className="mr-2 h-4 w-4" />
            {t("menuDumpDatabase")}
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem
            disabled={isLoading}
            className="text-destructive focus:text-destructive"
            onSelect={(e) => {
              e.stopPropagation();
              useSidebarStore.getState().removeConnection(item.id);
            }}
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            {t("menuDelete")}
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>{" "}
    </>
  );
}
