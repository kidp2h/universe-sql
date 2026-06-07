import { useTranslation } from "react-i18next";
import { Download, Braces } from "lucide-react";
import { CommandGroup } from "@/components/ui/command";
import { AppCommandItem as CommandItem } from "./app-command-item";
import { useGlobalEvents } from "@/hooks/use-global-events";
import { Shortcut } from "../ui/kbd";
import { useTabStore } from "@/stores/tab-store";
import { useSidebar } from "@/components/ui/sidebar";
import { useQueryResultsStore } from "@/stores/query-results-store";

interface BaseCommandGroupProps {
  setOpen: (open: boolean) => void;
}

export function ResultCommandGroup({ setOpen }: BaseCommandGroupProps) {
  const { t } = useTranslation();
  const { dispatchCommand } = useGlobalEvents();
  const queryTabs = useTabStore((state) => state.queryTabs);
  const activeQueryTabId = useTabStore((state) => state.activeQueryTabId);
  const activeTab = queryTabs.find((t) => t.id === activeQueryTabId);
  const isQueryTabActive =
    !!activeTab && (!activeTab.type || activeTab.type === "sql");

  const { showResultsPanel } = useSidebar();
  const resultsByTab = useQueryResultsStore((state) => state.resultsByTab);
  const results = activeQueryTabId ? resultsByTab[activeQueryTabId] : [];
  const hasResults = results && results.length > 0;

  const canExport = isQueryTabActive && showResultsPanel && hasResults;

  return (
    <CommandGroup heading={t("menuResult")}>
      <CommandItem
        disabled={!canExport}
        setOpen={setOpen}
        onSelect={() => {
          dispatchCommand("result-export-csv");
        }}
      >
        <Download className="size-4 text-brand mr-2" />
        {t("exportCsv")}
        <Shortcut shortcut="⌘ + ⇧ + C" />
      </CommandItem>
      <CommandItem
        disabled={!canExport}
        setOpen={setOpen}
        onSelect={() => {
          dispatchCommand("result-export-json");
        }}
      >
        <Braces className="size-4 text-sky-500 mr-2" />
        {t("exportJson")}
        <Shortcut shortcut="⌘ + ⇧ + J" />
      </CommandItem>
    </CommandGroup>
  );
}
