"use client";

import * as React from "react";
import { useTranslation } from "react-i18next";
import type { TreeDataItem } from "@/components/tree-view";
import {
  Lock,
  Hash,
  Type,
  ToggleLeft,
  Calendar,
  Braces,
  HelpCircle,
} from "lucide-react";
import { ConnectionContextMenu } from "@/components/connection-context-menu";
import { TableContextMenu } from "@/components/table-context-menu";
import { SchemaContextMenu } from "@/components/schema-context-menu";
import { cn, formatRelativeTime, formatBytes } from "@/lib/utils";
import {
  PostgresIcon,
  DatabaseIcon,
  SchemaIcon,
  TableIcon,
  FolderIcon,
  IndexIcon,
  QueryIcon,
  ColumnPrimaryIcon,
  ColumnForeignIcon,
  ColumnDefaultIcon,
} from "@/hooks/use-tree-data";

function getColumnTypeIcon(dataType: string) {
  const t = dataType.toLowerCase();
  if (
    t.includes("int") ||
    t.includes("serial") ||
    t.includes("num") ||
    t.includes("dec") ||
    t.includes("double") ||
    t.includes("float") ||
    t.includes("real")
  ) {
    return { icon: Hash, color: "text-blue-500" };
  }
  if (
    t.includes("char") ||
    t.includes("text") ||
    t.includes("varchar") ||
    t.includes("uuid")
  ) {
    return { icon: Type, color: "text-brand" };
  }
  if (t.includes("bool")) {
    return { icon: ToggleLeft, color: "text-purple-500" };
  }
  if (t.includes("time") || t.includes("date") || t.includes("interval")) {
    return { icon: Calendar, color: "text-orange-500" };
  }
  if (
    t.includes("json") ||
    t.includes("xml") ||
    t.includes("bytea") ||
    t.includes("lob")
  ) {
    return { icon: Braces, color: "text-teal-500" };
  }
  return { icon: HelpCircle, color: "text-muted-foreground" };
}

interface SidebarItemProps {
  item: TreeDataItem;
  onRefresh: (item: TreeDataItem) => void;
  onNewQuery: (connectionId: string, connectionName: string) => void;
  onEdit: (connection: any) => void;
  onViewComments: (ctx: any) => void;
}

export const SidebarItem = React.memo(
  function SidebarItem({
    item,
    onRefresh,
    onNewQuery,
    onEdit,
    onViewComments,
  }: SidebarItemProps) {
    const { t } = useTranslation();

    const isConnection = !item.id.includes(":");
    const isTable =
      item.id.includes(":table:") &&
      !item.id.includes(":columns") &&
      !item.id.includes(":indexes") &&
      !item.id.includes(":column:") &&
      !item.id.includes(":index:");

    const isDatabase =
      item.id.includes(":db:") &&
      !item.id.includes(":schema:") &&
      !item.id.includes(":query:") &&
      !item.id.includes(":queries");

    const isFolder =
      (item.id.includes(":schema:") && !item.id.includes(":table:")) ||
      (item.id.includes(":columns") && !item.id.includes(":column:")) ||
      (item.id.includes(":indexes") && !item.id.includes(":index:")) ||
      (item.id.includes(":queries") && !item.id.includes(":query:"));

    const isSchema =
      item.id.includes(":schema:") &&
      !item.id.includes(":table:") &&
      !item.id.includes(":column:") &&
      !item.id.includes(":index:") &&
      !item.id.includes(":queries") &&
      !item.id.includes(":query:");

    // Resolve icon with clear priority to fix reported "wrong icon" issues
    const ResolvedIcon = React.useMemo(() => {
      // 1. Root Connection
      if (isConnection) return PostgresIcon;

      // 1.5 Database Node
      if (isDatabase) return DatabaseIcon;

      // 2. Specialized folders (Columns, Indexes, Queries)
      if (
        (item.id.includes(":columns") && !item.id.includes(":column:")) ||
        (item.id.includes(":indexes") && !item.id.includes(":index:")) ||
        (item.id.includes(":queries") && !item.id.includes(":query:"))
      )
        return FolderIcon;

      // 3. Database Leaf Items
      if (item.id.includes(":column:")) {
        if ((item as any).isPrimary) return ColumnPrimaryIcon;
        if ((item as any).isForeign) return ColumnForeignIcon;
        return ColumnDefaultIcon;
      }
      if (item.id.includes(":index:")) return IndexIcon;
      if (item.id.includes(":query:")) return QueryIcon;

      // 4. Tables
      if (isTable) return TableIcon;

      // 5. Schemas (least specific, often a prefix in other IDs)
      if (item.id.includes(":schema:")) return SchemaIcon;

      // 6. Fallback to provided icon (cover stale data or custom nodes)
      return item.icon || null;
    }, [
      item.id,
      item.icon,
      isConnection,
      isDatabase,
      isTable,
      (item as any).isPrimary,
      (item as any).isForeign,
    ]);

    const isColumn = item.id.includes(":column:");
    const typeInfo = React.useMemo(() => {
      if (isColumn && (item as any).dataType) {
        return getColumnTypeIcon((item as any).dataType);
      }
      return null;
    }, [isColumn, (item as any).dataType]);

    const displayedName = React.useMemo(() => {
      if (item.name === "Columns") return t("folderColumns");
      if (item.name === "Indexes") return t("folderIndexes");
      if (item.name === "No schemas found") return t("noSchemasFound");
      if (item.name === "Failed to load") return t("failedToLoad");
      return String(item.name);
    }, [item.name, t]);

    const content = (
      <div className="flex items-center w-full min-w-0 overflow-hidden">
        {item.isLoading ? (
          <div className="h-4 w-4 shrink-0 mr-2 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        ) : isColumn ? (
          <div className="flex items-center shrink-0 mr-2 gap-0.5 select-none">
            {/* 1. Key Icon (PK/FK) */}
            {(item as any).isPrimary && (
              <ColumnPrimaryIcon className="h-3.5 w-3.5 shrink-0" />
            )}
            {(item as any).isForeign && (
              <ColumnForeignIcon className="h-3.5 w-3.5 shrink-0" />
            )}

            {/* 2. Data Type Icon */}
            {typeInfo ? (
              <typeInfo.icon
                className={cn("h-3.5 w-3.5 shrink-0", typeInfo.color)}
              />
            ) : (
              <ColumnDefaultIcon className="h-3.5 w-3.5 shrink-0" />
            )}
          </div>
        ) : ResolvedIcon ? (
          <ResolvedIcon className="h-4 w-4 shrink-0 mr-2" />
        ) : null}
        <span
          className={cn(
            "text-sm flex items-center gap-1.5 min-w-0 shrink",
            (isConnection || isDatabase || isFolder) &&
              "font-medium font-display tracking-tight",
            (isTable || item.id.includes(":column:")) &&
              "font-mono text-[12.5px] tracking-tight",
            isTable && "font-medium",
          )}
        >
          <span className="truncate min-w-0">{displayedName}</span>
          {isConnection && (item as any).readOnly && (
            <Lock className="size-3.5 text-amber-500 shrink-0 inline-block" />
          )}
        </span>
        {isTable && (item as any).size !== undefined && (
          <span className="ml-auto text-xs text-muted-foreground font-mono shrink-0 pr-1">
            {formatBytes((item as any).size)}
          </span>
        )}
        {item.id.includes(":schema:") &&
          !item.id.includes(":table:") &&
          (item as any).tableCount !== undefined && (
            <span className="ml-auto text-xs text-muted-foreground font-mono shrink-0 pr-1">
              {(item as any).tableCount}{" "}
              {(item as any).tableCount === 1
                ? t("tableLabelOne")
                : t("tableLabelOther")}
            </span>
          )}
        {(item.id.includes(":columns") ||
          item.id.includes(":indexes") ||
          item.id.includes(":queries")) &&
          (item as any).count !== undefined && (
            <span className="ml-auto text-xs text-muted-foreground font-mono shrink-0 pr-1">
              {(item as any).count}{" "}
              {item.id.includes(":columns")
                ? (item as any).count === 1
                  ? t("columnLabelOne")
                  : t("columnLabelOther")
                : item.id.includes(":indexes")
                  ? (item as any).count === 1
                    ? t("indexLabelOne")
                    : t("indexLabelOther")
                  : (item as any).count === 1
                    ? t("queryLabelOne")
                    : t("queryLabelOther")}
            </span>
          )}
        {item.id.includes(":query:") && (item as any).mtimeMs && (
          <span className="ml-auto text-xs text-muted-foreground font-mono shrink-0">
            {formatRelativeTime((item as any).mtimeMs)}
          </span>
        )}
        {isColumn && (item as any).references && (
          <span className="ml-auto text-xs text-muted-foreground font-mono shrink-0 truncate max-w-[100px] pr-1">
            → {String((item as any).references)}
          </span>
        )}
      </div>
    );

    if (isConnection) {
      return (
        <ConnectionContextMenu
          item={item}
          onRefresh={onRefresh}
          onNewQuery={onNewQuery}
          onEdit={onEdit}
        >
          {content}
        </ConnectionContextMenu>
      );
    }

    if (isTable) {
      return (
        <TableContextMenu item={item} onViewComments={onViewComments}>
          {content}
        </TableContextMenu>
      );
    }

    if (isSchema) {
      return (
        <SchemaContextMenu item={item} onRefresh={onRefresh}>
          {content}
        </SchemaContextMenu>
      );
    }

    if (item.id.includes(":column:")) {
      return content;
    }

    return content;
  },
  (prev, next) => {
    return (
      prev.item.id === next.item.id &&
      prev.item.name === next.item.name &&
      prev.item.isLoading === next.item.isLoading &&
      prev.item.count === next.item.count &&
      prev.item.tableCount === next.item.tableCount &&
      (prev.item as any).size === (next.item as any).size &&
      (prev.item as any).mtimeMs === (next.item as any).mtimeMs &&
      (prev.item as any).dataType === (next.item as any).dataType &&
      (prev.item as any).references === (next.item as any).references &&
      (prev.item as any).isPrimary === (next.item as any).isPrimary &&
      (prev.item as any).isForeign === (next.item as any).isForeign &&
      (prev.item as any).readOnly === (next.item as any).readOnly
    );
  },
);
