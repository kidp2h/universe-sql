import { useTranslation } from "react-i18next";
import {
  FolderOpen,
  Save,
  FilePlus,
  Layers,
  X,
  Sparkles,
  PanelLeft,
  Sun,
  Moon,
  Settings,
} from "lucide-react";
import { CommandGroup } from "@/components/ui/command";
import { AppCommandItem as CommandItem } from "./app-command-item";
import { useGlobalEvents } from "@/hooks/use-global-events";
import { useSidebar } from "@/components/ui/sidebar";
import { useTheme } from "@/hooks/use-theme";
import { Shortcut } from "../ui/kbd";

interface FileCommandGroupProps {
  setOpen: (open: boolean) => void;
  setShowSettingsDialog: (open: boolean) => void;
}

export function FileCommandGroup({
  setOpen,
  setShowSettingsDialog,
}: FileCommandGroupProps) {
  const { t } = useTranslation();
  const { toggleSidebar } = useSidebar();
  const { theme, toggleTheme } = useTheme();
  const { dispatchCommand } = useGlobalEvents();

  return (
    <CommandGroup heading={t("menuFile")}>
      <CommandItem
        setOpen={setOpen}
        onSelect={() => {
          dispatchCommand("open-file");
        }}
      >
        <FolderOpen className="size-4 text-sky-500 mr-2" />
        {t("openFile")}
        <Shortcut shortcut="⌘ + O" />
      </CommandItem>
      <CommandItem
        setOpen={setOpen}
        onSelect={() => {
          dispatchCommand("save");
        }}
      >
        <Save className="size-4 text-brand mr-2" />
        {t("save")}
        <Shortcut shortcut="⌘ + S" />
      </CommandItem>
      <CommandItem
        setOpen={setOpen}
        onSelect={() => {
          dispatchCommand("save-as");
        }}
      >
        <FilePlus className="size-4 text-brand/80 mr-2" />
        {t("saveAs")}
        <Shortcut shortcut="⌘ + ⇧ + S" />
      </CommandItem>
      <CommandItem
        setOpen={setOpen}
        onSelect={() => {
          dispatchCommand("close-all-tabs");
        }}
      >
        <Layers className="size-4 text-orange-500 mr-2" />
        {t("closeAllTabs")}
        <Shortcut shortcut="⌘ + ⇧ + W" />
      </CommandItem>
      <CommandItem
        setOpen={setOpen}
        onSelect={() => {
          dispatchCommand("format");
        }}
      >
        <Sparkles className="size-4 text-violet-500 mr-2" />
        {t("formatSql")}
        <Shortcut shortcut="⌘ + L" />
      </CommandItem>
      <CommandItem
        setOpen={setOpen}
        onSelect={() => {
          setShowSettingsDialog(true);
        }}
      >
        <Settings className="size-4 text-blue-500 mr-2" />
        {t("settingsTitle")}
        <Shortcut shortcut="⌘ + ," />
      </CommandItem>
      <CommandItem
        setOpen={setOpen}
        onSelect={() => {
          dispatchCommand("quit");
        }}
      >
        <X className="size-4 text-red-500 mr-2" />
        {t("exit")}
        <Shortcut shortcut="⌘ + Q" />
      </CommandItem>
      <CommandItem
        setOpen={setOpen}
        onSelect={() => {
          toggleSidebar();
        }}
      >
        <PanelLeft className="size-4 text-sky-500 mr-2" />
        {t("toggleSidebar")}
        <Shortcut shortcut="⌘ + B" />
      </CommandItem>
      <CommandItem
        setOpen={setOpen}
        onSelect={() => {
          toggleTheme();
        }}
      >
        {theme === "dark" ? (
          <Sun className="size-4 text-amber-500 mr-2" />
        ) : (
          <Moon className="size-4 text-indigo-400 mr-2" />
        )}
        {theme === "dark" ? t("light") : t("dark")}
        <Shortcut shortcut="⌘ + ⇧ + D" />
      </CommandItem>
    </CommandGroup>
  );
}
