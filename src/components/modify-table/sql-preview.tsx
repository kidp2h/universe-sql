"use client";

import { Terminal } from "lucide-react";

interface SqlPreviewProps {
  sql: string;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export function SqlPreview({
  sql,
  isCollapsed,
  onToggleCollapse,
}: SqlPreviewProps) {
  return (
    <div className="mt-4 border rounded-xl overflow-hidden shrink-0">
      <button
        onClick={onToggleCollapse}
        className="w-full flex items-center justify-between px-4 py-2.5 bg-muted/20 border-b text-sm font-semibold text-foreground hover:bg-muted/30 transition-colors"
      >
        <span className="flex items-center gap-1.5">
          <Terminal className="size-3.5 text-brand" />
          SQL Alter Preview Statement
        </span>
        <span className="text-xs text-muted-foreground">
          {isCollapsed ? "Expand" : "Collapse"}
        </span>
      </button>
      {!isCollapsed && (
        <div className="p-3 bg-muted/15 font-mono text-[11px] leading-relaxed text-muted-foreground/90 max-h-[140px] overflow-y-auto whitespace-pre-wrap select-all">
          {sql || "-- No modifications detected."}
        </div>
      )}
    </div>
  );
}
