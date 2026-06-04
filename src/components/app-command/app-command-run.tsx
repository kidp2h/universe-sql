import { useTranslation } from "react-i18next";
import { Play, Activity } from "lucide-react";
import { CommandGroup } from "@/components/ui/command";
import { AppCommandItem as CommandItem } from "./app-command-item";
import { useGlobalEvents } from "@/hooks/use-global-events";
import { Shortcut } from "../ui/kbd";
import { useTabStore } from "@/stores/tab-store";

interface BaseCommandGroupProps {
  setOpen: (open: boolean) => void;
}

export function RunCommandGroup({ setOpen }: BaseCommandGroupProps) {
  const { t } = useTranslation();
  const { dispatchCommand } = useGlobalEvents();
  const queryTabs = useTabStore((state) => state.queryTabs);
  const activeQueryTabId = useTabStore((state) => state.activeQueryTabId);
  const activeTab = queryTabs.find((t) => t.id === activeQueryTabId);
  const isQueryTabActive =
    !!activeTab && (!activeTab.type || activeTab.type === "sql");

  return (
    <CommandGroup heading={t("menuRun")}>
      <CommandItem
        disabled={!isQueryTabActive}
        setOpen={setOpen}
        onSelect={() => {
          dispatchCommand("execute");
        }}
      >
        <Play className="size-4 text-brand mr-2" />
        {t("runQuery")}
        <Shortcut shortcut="⌘ + Enter" />
      </CommandItem>
      <CommandItem
        disabled={!isQueryTabActive}
        setOpen={setOpen}
        onSelect={() => {
          dispatchCommand("explain");
        }}
      >
        <Activity className="size-4 text-amber-500 mr-2" />
        {t("explainAnalyze")}
        <Shortcut shortcut="⌘ + ⇧ + Enter" />
      </CommandItem>
    </CommandGroup>
  );
}
