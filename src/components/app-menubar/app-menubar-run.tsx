import { useTranslation } from "react-i18next";
import { Play, Activity } from "lucide-react";
import { Shortcut } from "@/components/ui/kbd";
import {
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarTrigger,
} from "@/components/ui/menubar";
import { useGlobalEvents } from "@/hooks/use-global-events";
import { useTabStore } from "@/stores/tab-store";

export const AppMenubarRun = () => {
  const { t } = useTranslation();
  const { dispatchCommand } = useGlobalEvents();
  const queryTabs = useTabStore((state) => state.queryTabs);
  const activeQueryTabId = useTabStore((state) => state.activeQueryTabId);
  const activeTab = queryTabs.find((t) => t.id === activeQueryTabId);
  const isQueryTabActive =
    !!activeTab && (!activeTab.type || activeTab.type === "sql");

  return (
    <MenubarMenu>
      <MenubarTrigger>{t("menuRun")}</MenubarTrigger>
      <MenubarContent>
        <MenubarItem
          disabled={!isQueryTabActive}
          onSelect={() => dispatchCommand("execute")}
        >
          <Play className="size-4 text-brand" />
          {t("runQuery")}
          <Shortcut shortcut="⌘ + Enter" />
        </MenubarItem>
        <MenubarItem
          disabled={!isQueryTabActive}
          onSelect={() => dispatchCommand("explain")}
        >
          <Activity className="size-4 text-amber-500" />
          {t("explainAnalyze")}
          <Shortcut shortcut="⌘ + ⇧ + Enter" />
        </MenubarItem>
      </MenubarContent>
    </MenubarMenu>
  );
};
