"use client";

import * as React from "react";
import { useTranslation } from "react-i18next";
import { RefreshCw, Plus, Trash2 } from "lucide-react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { TreeDataItem } from "@/components/tree-view";
import { useSidebarStore } from "@/stores/sidebar-store";
import { toast } from "sonner";

interface SchemaContextMenuProps {
  item: TreeDataItem;
  children: React.ReactNode;
  onRefresh: (item: TreeDataItem) => void;
}

export function SchemaContextMenu({
  item,
  children,
  onRefresh,
}: SchemaContextMenuProps) {
  const { t } = useTranslation();
  const connections = useSidebarStore((state) => state.connections);

  const parts = item.id.split(":schema:");
  const schemaName = parts[1];
  const dbPath = parts[0];
  const dbName = dbPath.split(":db:")[1];
  const connId = dbPath.includes(":db:") ? dbPath.split(":db:")[0] : dbPath;

  const conn = connections.find((c) => c.id === connId);

  const handleNewTable = (e: Event) => {
    e.stopPropagation();
    if (!conn) return;

    globalThis.dispatchEvent(
      new CustomEvent("usql:open-create-table", {
        detail: {
          connectionId: conn.id,
          schema: schemaName,
          dbPath: dbPath,
          dbName: dbName,
        },
      }),
    );
  };

  const handleDropSchema = async (e: Event) => {
    e.stopPropagation();
    if (!conn) return;

    const confirmDrop = confirm(
      t("confirmDropSchema", { name: schemaName }) ||
        `Are you sure you want to drop schema "${schemaName}"? This will delete all tables and data!`,
    );

    if (!confirmDrop) return;

    const dropSql = `DROP SCHEMA "${schemaName}" CASCADE;`;

    try {
      toast.loading(t("droppingSchema") || "Dropping schema...", {
        id: "drop-schema",
      });

      const res = await window.electron.executeQuery({
        ...conn,
        database: dbName,
        sql: dropSql,
      });

      if (res.ok) {
        toast.success(
          t("dropSchemaSuccess", { name: schemaName }) ||
            `Schema "${schemaName}" dropped successfully`,
          {
            id: "drop-schema",
          },
        );

        // Refresh parent database to remove the schema node
        onRefresh({ id: dbPath } as TreeDataItem);
      } else {
        toast.error(res.message || "Failed to drop schema", {
          id: "drop-schema",
        });
      }
    } catch (err: any) {
      toast.error(err.message || String(err), { id: "drop-schema" });
    }
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger className="flex items-center w-full">
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent className="w-48">
        <ContextMenuItem
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

        <ContextMenuSeparator />

        <ContextMenuItem
          onSelect={handleNewTable}
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <Plus className="mr-2 h-4 w-4" />
          {t("menuNewTable")}
        </ContextMenuItem>

        <ContextMenuSeparator />

        <ContextMenuItem
          className="text-destructive focus:text-destructive"
          onSelect={handleDropSchema}
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          {t("menuDropSchema")}
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
