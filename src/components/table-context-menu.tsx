import { Wrench, FileJson, TableProperties } from "lucide-react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSeparator,
} from "@/components/ui/context-menu";
import { Shortcut } from "@/components/ui/kbd";
import { TreeDataItem } from "@/components/tree-view";
import { useTranslation } from "react-i18next";

interface TableContextMenuProps {
  item: TreeDataItem;
  children: React.ReactNode;
  onViewComments: (ctx: {
    connectionId: string;
    connectionName: string;
    schema?: string;
    table?: string;
  }) => void;
}

export function TableContextMenu({
  item,
  children,
  onViewComments,
}: TableContextMenuProps) {
  const { t } = useTranslation();
  const parts = item.id.split(":table:");
  const schemaPath = parts[0];
  const schemaName = schemaPath.split(":schema:")[1];
  const dbPath = schemaPath.split(":schema:")[0];
  const connId = dbPath.includes(":db:") ? dbPath.split(":db:")[0] : dbPath;
  const tableName = parts[1];

  return (
    <ContextMenu>
      <ContextMenuTrigger className="flex items-center w-full">
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem
          onSelect={(e) => {
            e.stopPropagation();
            globalThis.dispatchEvent(
              new CustomEvent("usql:open-modify-table", {
                detail: {
                  connectionId: connId,
                  schema: schemaName,
                  table: tableName,
                },
              }),
            );
          }}
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <Wrench className="mr-2 h-4 w-4" />
          {t("modifyTable")}
        </ContextMenuItem>
        <ContextMenuItem
          onSelect={(e) => {
            e.stopPropagation();
            globalThis.dispatchEvent(
              new CustomEvent("usql:open-jsonb-schema-map", {
                detail: {
                  connectionId: connId,
                  schema: schemaName,
                  table: tableName,
                },
              }),
            );
          }}
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <FileJson className="mr-2 h-4 w-4 text-violet-500" />
          {t("mapJsonbSchema")}
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem
          onSelect={(e) => {
            e.stopPropagation();
            onViewComments({
              connectionId: connId,
              connectionName: connId,
              schema: schemaName,
              table: tableName,
            });
          }}
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          onPointerUp={(e) => e.stopPropagation()}
        >
          <TableProperties className="mr-2 h-4 w-4 text-indigo-500" />
          {t("viewDetails")}
          <Shortcut shortcut="⌘ + ⌥ + C" />
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
