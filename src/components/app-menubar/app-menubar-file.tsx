import { useTranslation } from "react-i18next";
import {
  FilePlus,
  FolderOpen,
  Save,
  Layers,
  Sparkles,
  X,
  Check,
  SaveAll,
} from "lucide-react";
import { Shortcut } from "@/components/ui/kbd";
import {
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarSeparator,
  MenubarTrigger,
} from "@/components/ui/menubar";
import { useGlobalEvents } from "@/hooks/use-global-events";
import { useTabStore } from "@/stores/tab-store";

export const AppMenubarFile = () => {
  const { t } = useTranslation();
  const { dispatchCommand } = useGlobalEvents();
  const isAutoSaveEnabled = useTabStore((state) => state.isAutoSaveEnabled);
  const setAutoSaveEnabled = useTabStore((state) => state.setAutoSaveEnabled);

  return (
    <MenubarMenu>
      <MenubarTrigger>{t("menuFile")}</MenubarTrigger>
      <MenubarContent>
        <MenubarItem onSelect={() => dispatchCommand("open-file")}>
          <FolderOpen className="size-4 text-sky-500" />
          {t("openFile")}
          <Shortcut shortcut="⌘ + O" />
        </MenubarItem>
        <MenubarItem onSelect={() => dispatchCommand("save")}>
          <Save className="size-4 text-brand" />
          {t("save")}
          <Shortcut shortcut="⌘ + S" />
        </MenubarItem>
        <MenubarItem onSelect={() => dispatchCommand("save-as")}>
          <FilePlus className="size-4 text-brand/80" />
          {t("saveAs")}
          <Shortcut shortcut="⌘ + ⇧ + S" />
        </MenubarItem>
        <MenubarSeparator />
        <MenubarItem
          onSelect={(e) => {
            e.preventDefault(); // Keep menu open for toggling
            setAutoSaveEnabled(!isAutoSaveEnabled);
          }}
          className="flex items-center"
        >
          <SaveAll className="size-4 text-amber-500" />
          <span>{t("autoSave")}</span>
          {isAutoSaveEnabled && (
            <span className="ml-auto text-primary">
              <Check className="size-5" />
            </span>
          )}
        </MenubarItem>
        <MenubarSeparator />
        <MenubarItem onSelect={() => dispatchCommand("close-all-tabs")}>
          <Layers className="size-4 text-orange-500" />
          {t("closeAllTabs")}
          <Shortcut shortcut="⌘ + ⇧ + W" />
        </MenubarItem>
        <MenubarItem onSelect={() => dispatchCommand("format")}>
          <Sparkles className="size-4 text-violet-500" />
          {t("formatSql")}
          <Shortcut shortcut="⌘ + L" />
        </MenubarItem>
      </MenubarContent>
    </MenubarMenu>
  );
};
