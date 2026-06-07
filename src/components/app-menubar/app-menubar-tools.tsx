import { useTranslation } from "react-i18next";
import { GitCompare, Zap, History, Database } from "lucide-react";
import { Shortcut } from "@/components/ui/kbd";
import {
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarTrigger,
} from "@/components/ui/menubar";
import { useGlobalEvents } from "@/hooks/use-global-events";

export const AppMenubarTools = () => {
  const { t } = useTranslation();
  const { dispatchCommand } = useGlobalEvents();
  return (
    <MenubarMenu>
      <MenubarTrigger>{t("menuTools")}</MenubarTrigger>
      <MenubarContent>
        <MenubarItem onSelect={() => dispatchCommand("diff-optimizer")}>
          <GitCompare className="size-4 text-indigo-500" />
          {t("toolDiffName")}
          <Shortcut shortcut="⌘ + ⇧ + D" />
        </MenubarItem>
        <MenubarItem onSelect={() => dispatchCommand("db-designer")}>
          <Database className="size-4 text-indigo-500" />
          {t("toolDbDesignerName")}
          <Shortcut shortcut="⌘ + ⇧ + E" />
        </MenubarItem>
      </MenubarContent>
    </MenubarMenu>
  );
};
