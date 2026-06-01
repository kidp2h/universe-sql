"use client";

import { useKeyboard } from "@/hooks/use-keyboard";
import { useGlobalEvents } from "@/hooks/use-global-events";
import { useTheme } from "@/hooks/use-theme";
import { Menubar } from "@/components/ui/menubar";
import { AppMenubarFile } from "./app-menubar-file";
import { AppMenubarView } from "./app-menubar-view";
import { AppMenubarTools } from "./app-menubar-tools";
import { AppMenubarRun } from "./app-menubar-run";
import { AppMenubarResult } from "./app-menubar-result";
import { AppMenubarHelp } from "./app-menubar-help";
import { TitlebarControls } from "./titlebar-controls";

export function AppMenubar() {
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
        {/* App Logo */}
        <div className="flex items-center pl-3 pr-1.5 shrink-0 select-none">
          <img
            src="/icon.png"
            alt="Universe SQL Logo"
            className="size-4.5 object-contain pointer-events-none dark:invert"
          />
        </div>
        <Menubar className="border-0 shrink-0">
          <AppMenubarFile />
          <AppMenubarView />
          <AppMenubarTools />
          <AppMenubarRun />
          <AppMenubarResult />
          <AppMenubarHelp />
        </Menubar>
        <div className="app-region-drag flex-1" />
        <TitlebarControls />
      </div>
    </div>
  );
}
