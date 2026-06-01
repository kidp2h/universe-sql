import { useTranslation } from "react-i18next";
import { GitCompare, Zap, History, FileJson, BookOpen } from "lucide-react";
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
        <MenubarItem onSelect={() => dispatchCommand("benchmark")}>
          <Zap className="size-4 text-indigo-500" />
          {t("toolBenchmarkName")}
          <Shortcut shortcut="⌘ + ⇧ + B" />
        </MenubarItem>
        <MenubarItem onSelect={() => dispatchCommand("diff-optimizer")}>
          <GitCompare className="size-4 text-indigo-500" />
          {t("toolDiffName")}
          <Shortcut shortcut="⌘ + ⇧ + D" />
        </MenubarItem>
        <MenubarItem onSelect={() => dispatchCommand("open-history-snippets")}>
          <History className="size-4 text-indigo-500" />
          {t("toolHistoryName")}
          <Shortcut shortcut="⌘ + ⇧ + H" />
        </MenubarItem>
        <MenubarItem onSelect={() => dispatchCommand("jsonb-schema-map")}>
          <FileJson className="size-4 text-indigo-500" />
          {t("toolJsonbName")}
          <Shortcut shortcut="⌘ + ⇧ + M" />
        </MenubarItem>
        <MenubarItem onSelect={() => dispatchCommand("sql-reference")}>
          <BookOpen className="size-4 text-indigo-500" />
          {t("toolSqlRefName")}
          <Shortcut shortcut="⌘ + ⇧ + R" />
        </MenubarItem>
      </MenubarContent>
    </MenubarMenu>
  );
};
