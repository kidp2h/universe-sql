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
import { CreateTableModal } from "@/components/create-table-modal";
import { useTabStore } from "@/stores/tab-store";
import { ActivityBar } from "@/components/activity-bar";
import { SidebarPanel } from "@/components/sidebar-panel";
import { Loader2 } from "lucide-react";

function AppLayoutContent({
  children,
  showAboutDialog,
  setShowAboutDialog,
  setShowSettingsDialog,
  showModifyTableDialog,
  setShowModifyTableDialog,
  modifyTableContext,
  showCreateTableDialog,
  setShowCreateTableDialog,
  createTableContext,
  open,
  setOpen,
  _theme,
  _setThemeMode,
}: any) {
  const {
    sidebarPosition,
    setActiveTab,
    setOpen: setSidebarOpen,
  } = useSidebar();
  const openToolTab = useTabStore((state) => state.openToolTab);

  const handleCommand = React.useCallback(
    (event: Event) => {
      const detail = (event as CustomEvent<{ type?: string }>).detail;
      const type = detail?.type;

      switch (type) {
        case "open-command-palette":
          setOpen(true);
          break;
        case "open-about":
          setShowAboutDialog(true);
          break;
        case "diff-optimizer":
          openToolTab("diff-optimizer");
          break;
        case "open-history-snippets":
          setActiveTab("history");
          setSidebarOpen(true);
          break;
        case "db-designer":
          openToolTab("db-designer", null);
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
    },
    [setOpen, setShowAboutDialog, openToolTab, setActiveTab, setSidebarOpen],
  );

  React.useEffect(() => {
    globalThis.addEventListener("usql:command", handleCommand);
    return () => globalThis.removeEventListener("usql:command", handleCommand);
  }, [handleCommand]);

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
          <CreateTableModal
            open={showCreateTableDialog}
            onOpenChange={setShowCreateTableDialog}
            context={createTableContext}
            onRefresh={(item) =>
              globalThis.dispatchEvent(
                new CustomEvent("usql:refresh-node", {
                  detail: { id: item.id },
                }),
              )
            }
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
  const [showCreateTableDialog, setShowCreateTableDialog] =
    React.useState(false);
  const [createTableContext, setCreateTableContext] = React.useState<{
    connectionId: string;
    schema: string;
    dbPath: string;
    dbName: string;
  } | null>(null);
  const { theme, setThemeMode } = useTheme();

  React.useEffect(() => {
    const handleOpenModifyTable = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      if (detail) {
        setModifyTableContext(detail);
        setShowModifyTableDialog(true);
      }
    };
    const handleOpenCreateTable = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      if (detail) {
        setCreateTableContext(detail);
        setShowCreateTableDialog(true);
      }
    };
    globalThis.addEventListener(
      "usql:open-modify-table",
      handleOpenModifyTable,
    );
    globalThis.addEventListener(
      "usql:open-create-table",
      handleOpenCreateTable,
    );
    return () => {
      globalThis.removeEventListener(
        "usql:open-modify-table",
        handleOpenModifyTable,
      );
      globalThis.removeEventListener(
        "usql:open-create-table",
        handleOpenCreateTable,
      );
    };
  }, []);

  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center select-none bg-background animate-in fade-in duration-300">
        <div className="relative flex flex-col items-center justify-center">
          {/* Glowing blur background */}
          <div className="absolute -inset-10 bg-brand/10 rounded-full blur-3xl animate-pulse" />

          {/* Premium Logo container */}
          <div className="relative mb-6 flex items-center justify-center size-24 bg-gradient-to-br from-brand/10 via-brand/5 to-teal-500/10 rounded-3xl border border-brand/20 shadow-md animate-bounce duration-1000 overflow-hidden">
            <div className="absolute inset-0 bg-white/5 rounded-3xl" />
            <img
              src="/icon.png"
              alt="Universe SQL Logo"
              className="size-14 object-contain select-none pointer-events-none dark:invert"
            />
          </div>

          {/* Brand text */}
          <h3 className="text-xl font-bold tracking-tight mb-2 bg-gradient-to-r from-foreground via-foreground/95 to-foreground/80 bg-clip-text text-transparent">
            Universe SQL
          </h3>

          {/* Spinner and Status */}
          <div className="flex items-center gap-2 mt-2">
            <Loader2 className="size-4 animate-spin text-brand" />
            <span
              id="loading-status-text"
              className="text-sm text-muted-foreground font-medium font-sans"
            >
              Restoring your workspace...
            </span>
          </div>
        </div>
        <script
          // biome-ignore lint/security/noDangerouslySetInnerHtml: inline localizer script is static and safe
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var lng = localStorage.getItem("usql:language");
                  var text = "Restoring your workspace...";
                  if (lng === "vi") {
                    text = "Đang khôi phục không gian làm việc của bạn...";
                  } else if (lng === "ja") {
                    text = "ワークスペースの復元中...";
                  } else if (lng === "zh") {
                    text = "正在恢复您的工作空间...";
                  } else if (lng === "ko") {
                    text = "작업 공간을 복원하는 중입니다...";
                  } else if (lng === "ru") {
                    text = "Восстановление вашего рабочего пространства...";
                  } else if (lng === "es") {
                    text = "Restaurando su espacio de trabalho...";
                  }
                  var el = document.getElementById("loading-status-text");
                  if (el) el.textContent = text;
                } catch(e) {}
              })();
            `,
          }}
        />
      </div>
    );
  }

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
        showCreateTableDialog={showCreateTableDialog}
        setShowCreateTableDialog={setShowCreateTableDialog}
        createTableContext={createTableContext}
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
