"use client";

import * as React from "react";
import { useSidebar } from "@/components/ui/sidebar";
import { ExplorerPanel } from "@/components/sidebar-panels/explorer-panel";
import { HistoryPanel } from "@/components/sidebar-panels/history-panel";
import { SettingsPanel } from "@/components/sidebar-panels/settings-panel";
import { ToolsPanel } from "@/components/sidebar-panels/tools-panel";
import { cn } from "@/lib/utils";

export function SidebarPanel() {
  const { activeTab, open, sidebarPosition } = useSidebar();
  const [width, setWidth] = React.useState(320); // Default width: 320px
  const [isDragging, setIsDragging] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
    const savedWidth = window.localStorage.getItem("usql:sidebar-width");
    if (savedWidth) {
      const parsed = Number.parseInt(savedWidth, 10);
      if (!Number.isNaN(parsed)) {
        setWidth(parsed);
      }
    }
  }, []);

  const handleMouseDown = React.useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsDragging(true);
      const startX = e.clientX;
      const startWidth = width;

      const handleMouseMove = (moveEvent: MouseEvent) => {
        let newWidth: number;
        if (sidebarPosition === "left") {
          newWidth = startWidth + (moveEvent.clientX - startX);
        } else {
          newWidth = startWidth - (moveEvent.clientX - startX);
        }

        // Limit range between 200px and 600px
        if (newWidth < 200) newWidth = 200;
        if (newWidth > 600) newWidth = 600;

        setWidth(newWidth);
        window.localStorage.setItem("usql:sidebar-width", String(newWidth));
      };

      const handleMouseUp = () => {
        setIsDragging(false);
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [width, sidebarPosition],
  );

  return (
    <div
      style={{
        order: 2,
        width: `${open ? width : 0}px`,
      }}
      className={cn(
        "bg-card h-full flex flex-col shrink-0 overflow-hidden relative select-none transition-all duration-200 ease-in-out",
        sidebarPosition === "left"
          ? "border-r items-start"
          : "border-l items-end",
        open ? "border-border" : "border-transparent",
      )}
    >
      {/* Inner wrapper container with fixed min-width to prevent squishing */}
      <div
        className={cn(
          "w-full min-w-[320px] h-full flex flex-col shrink-0 transition-opacity duration-200 ease-in-out",
          open
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none",
        )}
      >
        {!mounted ? (
          <div className="w-full min-w-[320px] h-full flex flex-col shrink-0 p-4 space-y-4 animate-in fade-in duration-300">
            {/* Header Skeleton */}
            <div className="flex items-center justify-between pb-3 border-b shrink-0 select-none">
              <div className="h-4 w-32 bg-muted rounded-md animate-pulse" />
              <div className="size-5 bg-muted rounded-md animate-pulse" />
            </div>
            {/* List Skeletons */}
            <div className="flex-1 space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 p-3 rounded-lg border border-border/60 bg-muted/20 select-none"
                >
                  <div className="size-4 rounded-md bg-muted animate-pulse shrink-0" />
                  <div className="h-3.5 w-1/2 bg-muted rounded-md animate-pulse" />
                  <div className="ml-auto size-2 rounded-full bg-muted animate-pulse shrink-0" />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <>
            {activeTab === "explorer" && <ExplorerPanel />}
            {activeTab === "history" && <HistoryPanel />}
            {activeTab === "tools" && <ToolsPanel />}
            {activeTab === "settings" && <SettingsPanel />}
          </>
        )}
      </div>

      {/* Resize Handle line (VS Code Style) */}
      <div
        onMouseDown={open ? handleMouseDown : undefined}
        className={cn(
          "absolute top-0 bottom-0 w-1 cursor-col-resize z-50 hover:bg-brand/40 transition-all duration-150 active:bg-brand",
          sidebarPosition === "left" ? "right-0" : "left-0",
          isDragging && "bg-brand",
          !open && "pointer-events-none opacity-0",
        )}
      />
    </div>
  );
}
