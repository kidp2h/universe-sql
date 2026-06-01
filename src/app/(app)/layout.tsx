"use client";

import "@/wdyr";
import { AppMenubar } from "@/components/app-menubar";
import {
  SidebarInset,
  SidebarProvider,
  useSidebar,
} from "@/components/ui/sidebar";
import React from "react";
import { useTheme } from "@/hooks/use-theme";
import { AboutModal } from "@/components/about-modal";
import { AppCommand } from "@/components/app-command";
import { ModifyTableModal } from "@/components/modify-table-modal";
import { useTabStore } from "@/stores/tab-store";
import { ActivityBar } from "@/components/activity-bar";
import { SidebarPanel } from "@/components/sidebar-panel";

function AppLayoutContent({
  children,
  showAboutDialog,
  setShowAboutDialog,
  setShowSettingsDialog,
  showModifyTableDialog,
  setShowModifyTableDialog,
  modifyTableContext,
  open,
  setOpen,
  theme,
  setThemeMode,
}: any) {
  const { sidebarPosition } = useSidebar();

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-background">
      <AppMenubar />
      <div className="flex flex-1 w-full overflow-hidden relative select-none">
        {/* Activity Bar */}
        <ActivityBar />

        {/* Sidebar Panel */}
        <SidebarPanel />

        {/* SidebarInset holding main content */}
        <SidebarInset
          style={{ order: sidebarPosition === "left" ? 3 : 1 }}
          className="flex-1 flex flex-col overflow-hidden bg-background min-w-0"
        >
          <AboutModal
            open={showAboutDialog}
            onOpenChange={setShowAboutDialog}
          />
          <ModifyTableModal
            open={showModifyTableDialog}
            onOpenChange={setShowModifyTableDialog}
            context={modifyTableContext}
          />
          <AppCommand
            open={open}
            setOpen={setOpen}
            setShowSettingsDialog={setShowSettingsDialog}
            setShowAboutDialog={setShowAboutDialog}
          />
          <main className="flex flex-1 flex-col overflow-hidden p-4 min-w-0">
            {children}
          </main>
        </SidebarInset>
      </div>
    </div>
  );
}

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [open, setOpen] = React.useState(false);
  const [showAboutDialog, setShowAboutDialog] = React.useState(false);
  const [showModifyTableDialog, setShowModifyTableDialog] =
    React.useState(false);
  const [modifyTableContext, setModifyTableContext] = React.useState<{
    connectionId: string;
    schema: string;
    table: string;
  } | null>(null);
  const openToolTab = useTabStore((state) => state.openToolTab);
  const { theme, setThemeMode } = useTheme();

  const handleCommand = React.useCallback((event: Event) => {
    const detail = (event as CustomEvent<{ type?: string }>).detail;
    const type = detail?.type;

    switch (type) {
      case "open-command-palette":
        setOpen(true);
        break;
      case "open-about":
        setShowAboutDialog(true);
        break;
      case "benchmark":
        openToolTab("benchmark");
        break;
      case "diff-optimizer":
        openToolTab("diff-optimizer");
        break;
      case "open-history-snippets":
        openToolTab("history-snippets");
        break;
      case "jsonb-schema-map":
        openToolTab("jsonb-schema-map", null);
        break;
      case "sql-reference":
        openToolTab("sql-reference", null);
        break;
      case "visual-query-story":
        openToolTab("visual-query-story", null);
        break;
      case "quit":
        if (window.electron?.windowClose) {
          void window.electron.windowClose();
        }
        break;
    }
  }, []);

  React.useEffect(() => {
    globalThis.addEventListener("usql:command", handleCommand);
    return () => globalThis.removeEventListener("usql:command", handleCommand);
  }, [handleCommand]);

  React.useEffect(() => {
    const handleOpenModifyTable = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      if (detail) {
        setModifyTableContext(detail);
        setShowModifyTableDialog(true);
      }
    };
    const handleOpenJsonbSchema = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      if (detail) {
        openToolTab("jsonb-schema-map", detail);
      }
    };
    globalThis.addEventListener(
      "usql:open-modify-table",
      handleOpenModifyTable,
    );
    globalThis.addEventListener(
      "usql:open-jsonb-schema-map",
      handleOpenJsonbSchema,
    );
    return () => {
      globalThis.removeEventListener(
        "usql:open-modify-table",
        handleOpenModifyTable,
      );
      globalThis.removeEventListener(
        "usql:open-jsonb-schema-map",
        handleOpenJsonbSchema,
      );
    };
  }, []);

  return (
    <SidebarProvider
      defaultOpen={true}
      style={
        {
          "--sidebar-width": "280px",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppLayoutContent
        showAboutDialog={showAboutDialog}
        setShowAboutDialog={setShowAboutDialog}
        showModifyTableDialog={showModifyTableDialog}
        setShowModifyTableDialog={setShowModifyTableDialog}
        modifyTableContext={modifyTableContext}
        open={open}
        setOpen={setOpen}
        theme={theme}
        setThemeMode={setThemeMode}
      >
        {children}
      </AppLayoutContent>
    </SidebarProvider>
  );
}
