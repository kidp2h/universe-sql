"use client";

import { useKeyboard } from "@/hooks/use-keyboard";
import { useGlobalEvents } from "@/hooks/use-global-events";
import { useTheme } from "@/hooks/use-theme";
import { useTranslation } from "react-i18next";
import { Info, RefreshCw, LogOut, Terminal, Code2 } from "lucide-react";
import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarSeparator,
  MenubarTrigger,
} from "@/components/ui/menubar";
import { toast } from "sonner";
import { Shortcut } from "@/components/ui/kbd";
import { AppMenubarFile } from "./app-menubar-file";
import { AppMenubarView } from "./app-menubar-view";
import { AppMenubarTools } from "./app-menubar-tools";
import { AppMenubarRun } from "./app-menubar-run";
import { AppMenubarResult } from "./app-menubar-result";
import { TitlebarControls } from "./titlebar-controls";

export function AppMenubar() {
  const { t } = useTranslation();
  const { toggleTheme } = useTheme();
  const { dispatchCommand, dispatchAppearance } = useGlobalEvents();

  // New query
  useKeyboard({
    key: "n",
    ctrlKey: true,
    metaKey: true,
    onKeyDown: () => dispatchCommand("new-query"),
  });

  // Open file
  useKeyboard({
    key: "o",
    ctrlKey: true,
    metaKey: true,
    onKeyDown: () => dispatchCommand("open-file"),
  });

  useKeyboard({
    key: "d",
    ctrlKey: true,
    metaKey: true,
    shiftKey: true,
    onKeyDown: () => toggleTheme(),
  });

  useKeyboard({
    key: "+",
    ctrlKey: true,
    metaKey: true,
    onKeyDown: () => dispatchAppearance("zoom-in"),
  });

  useKeyboard({
    key: "=",
    ctrlKey: true,
    metaKey: true,
    onKeyDown: () => dispatchAppearance("zoom-in"),
  });

  useKeyboard({
    key: "-",
    ctrlKey: true,
    metaKey: true,
    onKeyDown: () => dispatchAppearance("zoom-out"),
  });

  useKeyboard({
    key: "0",
    ctrlKey: true,
    metaKey: true,
    onKeyDown: () => dispatchAppearance("zoom-reset"),
  });

  // Execute
  useKeyboard({
    key: "Enter",
    ctrlKey: true,
    metaKey: true,
    onKeyDown: () => dispatchCommand("execute"),
  });

  // Explain Analyze
  useKeyboard({
    key: "Enter",
    ctrlKey: true,
    metaKey: true,
    shiftKey: true,
    onKeyDown: () => dispatchCommand("explain"),
  });

  // Save
  useKeyboard({
    key: "s",
    ctrlKey: true,
    metaKey: true,
    onKeyDown: () => dispatchCommand("save"),
  });

  // Save As
  useKeyboard({
    key: "s",
    ctrlKey: true,
    metaKey: true,
    shiftKey: true,
    onKeyDown: () => dispatchCommand("save-as"),
  });

  // Format
  useKeyboard({
    key: "l",
    ctrlKey: true,
    metaKey: true,
    onKeyDown: () => dispatchCommand("format"),
  });

  // Benchmark
  useKeyboard({
    key: "b",
    ctrlKey: true,
    metaKey: true,
    shiftKey: true,
    onKeyDown: () => dispatchCommand("benchmark"),
  });

  // Diff & Optimizer
  useKeyboard({
    key: "d",
    ctrlKey: true,
    metaKey: true,
    shiftKey: true,
    onKeyDown: () => dispatchCommand("diff-optimizer"),
  });

  // History & Snippets Catalog
  useKeyboard({
    key: "h",
    ctrlKey: true,
    metaKey: true,
    shiftKey: true,
    onKeyDown: () => dispatchCommand("open-history-snippets"),
  });

  // JSONB Document Schema Map
  useKeyboard({
    key: "m",
    ctrlKey: true,
    metaKey: true,
    shiftKey: true,
    onKeyDown: () => dispatchCommand("jsonb-schema-map"),
  });

  // SQL Reference Library
  useKeyboard({
    key: "r",
    ctrlKey: true,
    metaKey: true,
    shiftKey: true,
    onKeyDown: () => dispatchCommand("sql-reference"),
  });

  // Open command palette (Ctrl+Shift+P)
  useKeyboard({
    key: "p",
    ctrlKey: true,
    metaKey: true,
    shiftKey: true,
    onKeyDown: () => dispatchCommand("open-command-palette"),
  });

  // Export CSV
  useKeyboard({
    key: "c",
    ctrlKey: true,
    metaKey: true,
    shiftKey: true,
    onKeyDown: () => dispatchCommand("result-export-csv"),
  });

  // Export JSON
  useKeyboard({
    key: "j",
    ctrlKey: true,
    metaKey: true,
    shiftKey: true,
    onKeyDown: () => dispatchCommand("result-export-json"),
  });

  return (
    <div className="border-b flex flex-col">
      <div className="flex items-stretch border-b">
        <Menubar className="border-0 shrink-0">
          {/* App Logo Dropdown Menu */}
          <MenubarMenu>
            <MenubarTrigger className="px-3 cursor-pointer flex items-center justify-center focus:bg-accent focus:text-accent-foreground data-[state=open]:bg-accent data-[state=open]:text-accent-foreground rounded-none h-full transition-colors select-none shrink-0 outline-hidden">
              <img
                src="/icon.png"
                alt="Universe SQL Logo"
                className="size-4.5 object-contain pointer-events-none dark:invert"
              />
            </MenubarTrigger>
            <MenubarContent className="min-w-[220px]">
              <MenubarItem
                onSelect={() => dispatchCommand("open-command-palette")}
              >
                <Terminal className="size-4 text-slate-500" />
                <span>{t("showAllCommands") || "Command Palette"}</span>
                <Shortcut shortcut="⌘ + ⇧ + P" />
              </MenubarItem>
              <MenubarItem
                onSelect={() => {
                  if (window.electron?.toggleDevTools) {
                    window.electron.toggleDevTools();
                  }
                }}
              >
                <Code2 className="size-4 text-slate-500" />
                <span>{t("toggleDevTools") || "Toggle Developer Tools"}</span>
                <Shortcut shortcut="⌘ + ⇧ + I" />
              </MenubarItem>
              <MenubarSeparator />
              <MenubarItem onSelect={() => dispatchCommand("open-about")}>
                <Info className="size-4 text-slate-500" />
                <span>{t("aboutTitle")}</span>
              </MenubarItem>
              <MenubarItem
                onSelect={() => {
                  if (window.updater?.checkForUpdates) {
                    window.updater.checkForUpdates();
                  } else {
                    toast.error(
                      t("updaterUnavailableInBrowser") ||
                        "Updater is not available in browser mode.",
                    );
                  }
                }}
              >
                <RefreshCw className="size-4 text-slate-500" />
                <span>{t("checkForUpdates")}</span>
              </MenubarItem>
              <MenubarSeparator />
              <MenubarItem
                onSelect={() => dispatchCommand("quit")}
                className="text-destructive focus:text-destructive"
              >
                <LogOut className="size-4" />
                <span>{t("exit")}</span>
              </MenubarItem>
            </MenubarContent>
          </MenubarMenu>

          <AppMenubarFile />
          <AppMenubarView />
          <AppMenubarTools />
          <AppMenubarRun />
          <AppMenubarResult />
        </Menubar>
        <div className="app-region-drag flex-1" />
        <TitlebarControls />
      </div>
    </div>
  );
}
