import { Handle, Position } from "@xyflow/react";
import { Key, Link, Hash } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TableNodeData } from "@/lib/erd/types";

interface ERDTableNodeProps {
  data: TableNodeData;
  selected?: boolean;
}

export function ERDTableNode({ data, selected }: ERDTableNodeProps) {
  return (
    <div
      className={cn(
        "min-w-[280px] bg-card rounded-xl border-2 shadow-sm overflow-hidden flex flex-col transition-colors",
        selected
          ? "border-brand shadow-md"
          : "border-border/60 hover:border-border",
      )}
    >
      {/* Header */}
      <div
        className={cn(
          "px-4 py-2 border-b flex items-center justify-between",
          selected
            ? "bg-brand/10 border-brand/20"
            : "bg-muted/30 border-border/60",
        )}
      >
        <span className="font-bold text-sm text-foreground truncate">
          {data.schema !== "public" && (
            <span className="text-muted-foreground/60 mr-1 font-medium">
              {data.schema}.
            </span>
          )}
          {data.tableName}
        </span>
      </div>

      {/* Columns */}
      <div className="flex flex-col py-1">
        {data.columns.map((col, _i) => (
          <div
            key={col.name}
            className="group relative flex items-center justify-between px-4 py-1.5 hover:bg-muted/30 transition-colors"
          >
            {/* Left Handle (Target) */}
            {(col.isPrimary || col.isForeign) && (
              <Handle
                type="target"
                position={Position.Left}
                id={`${data.schema}.${data.tableName}-${col.name}-target`}
                className="w-2 h-2 !bg-blue-500 !border-2 !border-background -ml-[19px]"
              />
            )}

            <div className="flex items-center gap-2 overflow-hidden w-full">
              {/* Icon */}
              <div className="w-4 shrink-0 flex justify-center">
                {col.isPrimary ? (
                  <Key className="size-3.5 text-yellow-500" />
                ) : col.isForeign ? (
                  <Link className="size-3.5 text-blue-500" />
                ) : (
                  <Hash className="size-3.5 text-muted-foreground/40" />
                )}
              </div>

              {/* Name */}
              <span
                className={cn(
                  "text-sm truncate font-medium",
                  col.isPrimary ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {col.name}
              </span>
            </div>

            {/* Type */}
            <span className="text-xs text-muted-foreground/50 uppercase tracking-wide ml-4 shrink-0">
              {col.type}
            </span>

            {/* Right Handle (Source) */}
            {(col.isPrimary || col.isForeign) && ( // Allow relations from both keys just in case
              <Handle
                type="source"
                position={Position.Right}
                id={`${data.schema}.${data.tableName}-${col.name}-source`}
                className="w-2 h-2 !bg-muted-foreground !border-2 !border-background -mr-[19px] opacity-0 group-hover:opacity-100 transition-opacity"
              />
            )}
          </div>
        ))}
        {data.columns.length === 0 && (
          <div className="px-4 py-3 text-sm text-muted-foreground italic text-center">
            No columns found
          </div>
        )}
      </div>
    </div>
  );
}
