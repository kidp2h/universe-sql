"use client";

import * as React from "react";
import type { JSONBSchemaNode } from "./schema-math";
import { Badge } from "@/components/ui/badge";
import {
  Folder,
  FolderOpen,
  FileJson,
  ChevronRight,
  HelpCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface VisualSchemaTreeProps {
  node: JSONBSchemaNode;
  onSelect: (node: JSONBSchemaNode) => void;
  selectedPath: string[] | null;
  defaultExpanded?: boolean;
}

export function VisualSchemaTree({
  node,
  onSelect,
  selectedPath,
  defaultExpanded = true,
}: VisualSchemaTreeProps) {
  return (
    <div className="space-y-1">
      <div className="font-mono text-sm font-bold text-muted-foreground select-none pb-1.5 border-b border-dashed mb-2 flex items-center gap-1.5">
        <FileJson className="size-3.5 text-indigo-500" />
        JSONB Schema Tree
      </div>
      <div className="border rounded-xl p-3 bg-muted/5 max-h-[500px] overflow-y-auto scrollbar-thin">
        <SchemaTreeNode
          node={node}
          level={0}
          onSelect={onSelect}
          selectedPath={selectedPath}
          defaultExpanded={defaultExpanded}
        />
      </div>
    </div>
  );
}

function SchemaTreeNode({
  node,
  level,
  onSelect,
  selectedPath,
  defaultExpanded,
}: {
  node: JSONBSchemaNode;
  level: number;
  onSelect: (node: JSONBSchemaNode) => void;
  selectedPath: string[] | null;
  defaultExpanded: boolean;
}) {
  const isRoot = node.fullPath.length === 0;
  const isSelected =
    selectedPath !== null &&
    selectedPath.length === node.fullPath.length &&
    selectedPath.every((val, index) => val === node.fullPath[index]);

  const hasChildren = node.children && node.children.length > 0;
  const [expanded, setExpanded] = React.useState(isRoot || defaultExpanded);

  // Parse type color theme
  const getBadgeStyle = (types: string[]) => {
    const mainType = types[0].toLowerCase();
    if (mainType === "object") {
      return "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20";
    }
    if (mainType.includes("array")) {
      return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
    }
    if (mainType === "string") {
      return "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20";
    }
    if (mainType === "number") {
      return "bg-brand/10 text-brand dark:text-brand/80 border-brand/20";
    }
    if (mainType === "boolean") {
      return "bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/20";
    }
    if (mainType === "null") {
      return "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20";
    }
    return "bg-muted text-muted-foreground";
  };

  const handleToggle = (e: React.MouseEvent) => {
    if (hasChildren) {
      e.stopPropagation();
      setExpanded(!expanded);
    }
  };

  const handleSelect = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(node);
  };

  const formattedType = node.types.join(" | ");

  return (
    <div className="flex flex-col select-none">
      {/* Node Row element */}
      <div
        onClick={handleSelect}
        className={cn(
          "group flex items-center h-8 rounded-lg px-2 cursor-pointer transition-all gap-2 border border-transparent font-mono text-[12px] select-none",
          isSelected
            ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-600 dark:text-indigo-400 font-bold"
            : "hover:bg-muted/40 text-foreground/80 hover:text-foreground",
        )}
        style={{ paddingLeft: `${Math.max(6, level * 14)}px` }}
      >
        {/* Collapsible toggle chevron */}
        {hasChildren ? (
          <button
            onClick={handleToggle}
            className="size-4 flex items-center justify-center hover:bg-muted-foreground/10 rounded transition-colors"
          >
            <ChevronRight
              className={cn(
                "size-3.5 transition-transform duration-150 text-muted-foreground/60 group-hover:text-muted-foreground",
                expanded && "rotate-90",
              )}
            />
          </button>
        ) : (
          <div className="w-4" />
        )}

        {/* Tree Icon */}
        {hasChildren ? (
          expanded ? (
            <FolderOpen className="size-4 shrink-0 text-violet-500" />
          ) : (
            <Folder className="size-4 shrink-0 text-violet-500" />
          )
        ) : (
          <HelpCircle className="size-4 shrink-0 text-muted-foreground/60" />
        )}

        {/* Key Display Name */}
        <span className="truncate max-w-[180px] font-medium leading-none">
          {node.key}
        </span>

        {/* Unified datatype badge */}
        <Badge
          variant="outline"
          className={cn(
            "text-[9px] py-0 h-4 font-mono font-bold tracking-tight rounded-md border-transparent px-1 shrink-0 scale-90",
            getBadgeStyle(node.types),
          )}
        >
          {formattedType}
        </Badge>

        {/* Frequency of occurrence indicator */}
        {!isRoot && (
          <div className="ml-auto flex items-center gap-1.5 shrink-0 select-none">
            <span
              className={cn(
                "text-[9.5px] font-bold opacity-75 font-mono",
                node.frequency === 100
                  ? "text-muted-foreground"
                  : node.frequency > 50
                    ? "text-amber-500"
                    : "text-rose-500",
              )}
            >
              {node.frequency}%
            </span>
            <div className="w-8 h-1 bg-muted/40 rounded-full overflow-hidden hidden sm:block border">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-300",
                  node.frequency === 100
                    ? "bg-indigo-500/40"
                    : node.frequency > 50
                      ? "bg-amber-500/50 animate-pulse"
                      : "bg-rose-500/50 animate-pulse",
                )}
                style={{ width: `${node.frequency}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Children containers */}
      {hasChildren && expanded && (
        <div className="flex flex-col relative before:absolute before:left-[14px] before:top-1 before:bottom-3 before:w-[1px] before:bg-border/40 ml-1.5 mt-0.5">
          {node.children.map((child) => (
            <SchemaTreeNode
              key={child.key}
              node={child}
              level={level + 1}
              onSelect={onSelect}
              selectedPath={selectedPath}
              defaultExpanded={defaultExpanded}
            />
          ))}
        </div>
      )}
    </div>
  );
}
