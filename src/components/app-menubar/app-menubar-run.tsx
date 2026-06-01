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

export const AppMenubarRun = () => {
  const { t } = useTranslation();
  const { dispatchCommand } = useGlobalEvents();
  return (
    <MenubarMenu>
      <MenubarTrigger>{t("menuRun")}</MenubarTrigger>
      <MenubarContent>
        <MenubarItem onSelect={() => dispatchCommand("execute")}>
          <Play className="size-4 text-brand" />
          {t("runQuery")}
          <Shortcut shortcut="⌘ + Enter" />
        </MenubarItem>
        <MenubarItem onSelect={() => dispatchCommand("explain")}>
          <Activity className="size-4 text-amber-500" />
          {t("explainAnalyze")}
          <Shortcut shortcut="⌘ + ⇧ + Enter" />
        </MenubarItem>
      </MenubarContent>
    </MenubarMenu>
  );
};
