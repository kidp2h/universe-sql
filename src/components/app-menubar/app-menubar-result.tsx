import { useTranslation } from "react-i18next";
import { Download, Braces } from "lucide-react";
import { Shortcut } from "@/components/ui/kbd";
import {
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarTrigger,
} from "@/components/ui/menubar";
import { useGlobalEvents } from "@/hooks/use-global-events";
import { useTabStore } from "@/stores/tab-store";
import { useSidebar } from "@/components/ui/sidebar";
import { useQueryResultsStore } from "@/stores/query-results-store";

export const AppMenubarResult = () => {
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
    <MenubarMenu>
      <MenubarTrigger>{t("menuResult")}</MenubarTrigger>
      <MenubarContent>
        <MenubarItem
          disabled={!canExport}
          onSelect={() => dispatchCommand("result-export-csv")}
        >
          <Download className="size-4 text-brand" />
          {t("exportCsv")}
          <Shortcut shortcut="⌘ + ⇧ + C" />
        </MenubarItem>
        <MenubarItem
          disabled={!canExport}
          onSelect={() => dispatchCommand("result-export-json")}
        >
          <Braces className="size-4 text-sky-500" />
          {t("exportJson")}
          <Shortcut shortcut="⌘ + ⇧ + J" />
        </MenubarItem>
      </MenubarContent>
    </MenubarMenu>
  );
};
