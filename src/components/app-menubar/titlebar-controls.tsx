import { useTranslation } from "react-i18next";
import * as React from "react";
import { Minus, PanelBottom, PanelRight, Square, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/components/ui/sidebar";

function TitlebarBtn({
  onClick,
  title,
  className,
  children,
}: {
  onClick: () => void;
  title?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={cn(
        "app-region-no-drag flex items-center justify-center w-[46px] h-full",
        "text-foreground/40 hover:text-foreground",
        "transition-colors duration-100 select-none",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function TitlebarControls() {
  const { t } = useTranslation();
  const { toggleSidebar, open, toggleResultsPanel, showResultsPanel } =
    useSidebar();

  const handleMinimize = React.useCallback(() => {
    if (window.electron?.windowMinimize) {
      void window.electron.windowMinimize();
    }
  }, []);

  const handleMaximize = React.useCallback(() => {
    if (window.electron?.windowMaximize) {
      void window.electron.windowMaximize();
    }
  }, []);

  const handleClose = React.useCallback(() => {
    if (window.electron?.windowClose) {
      void window.electron.windowClose();
    }
  }, []);

  return (
    <div className="app-region-no-drag flex items-stretch h-full shrink-0">
      {/* Sidebar toggle — like VSCode */}
      <TitlebarBtn
        onClick={toggleSidebar}
        title={open ? t("hideSidebar") : t("showSidebar")}
        className={cn("w-10 hover:bg-muted/70", open && "text-foreground/70")}
      >
        <PanelRight className="size-3.5" />
      </TitlebarBtn>

      {/* Query Results bottom panel toggle */}
      <TitlebarBtn
        onClick={toggleResultsPanel}
        title={showResultsPanel ? t("hideResults") : t("showResults")}
        className={cn(
          "w-10 hover:bg-muted/70",
          showResultsPanel && "text-foreground/70",
        )}
      >
        <PanelBottom className="size-3.5" />
      </TitlebarBtn>

      {/* Separator */}
      <div className="my-1.5 w-px bg-border/60 shrink-0" />

      {/* Window controls */}
      <TitlebarBtn
        onClick={handleMinimize}
        title={t("windowMinimize")}
        className="hover:bg-muted/70"
      >
        <Minus className="size-3.5" />
      </TitlebarBtn>
      <TitlebarBtn
        onClick={handleMaximize}
        title={t("windowMaximize")}
        className="hover:bg-muted/70"
      >
        <Square className="size-3" />
      </TitlebarBtn>
      <TitlebarBtn
        onClick={handleClose}
        title={t("windowClose")}
        className="hover:bg-red-500 hover:text-white dark:hover:bg-red-600"
      >
        <X className="size-3.5" />
      </TitlebarBtn>
    </div>
  );
}
