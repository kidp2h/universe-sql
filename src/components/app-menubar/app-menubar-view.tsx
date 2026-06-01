import { useTranslation } from "react-i18next";
import {
  Palette,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Sun,
  Moon,
  PanelLeft,
} from "lucide-react";
import { Shortcut } from "@/components/ui/kbd";
import {
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarSeparator,
  MenubarSub,
  MenubarSubContent,
  MenubarSubTrigger,
  MenubarTrigger,
} from "@/components/ui/menubar";
import { useSidebar } from "@/components/ui/sidebar";
import { useTheme } from "@/hooks/use-theme";
import { useGlobalEvents } from "@/hooks/use-global-events";
import * as React from "react";

export const AppMenubarView = () => {
  const { t } = useTranslation();
  const { toggleSidebar } = useSidebar();
  const { theme, toggleTheme } = useTheme();
  const { dispatchAppearance } = useGlobalEvents();

  const _handleWindowMinimize = React.useCallback(async () => {
    if (window.electron?.windowMinimize) {
      await window.electron.windowMinimize();
    }
  }, []);

  const _handleWindowMaximize = React.useCallback(async () => {
    if (window.electron?.windowMaximize) {
      await window.electron.windowMaximize();
    }
  }, []);

  const _handleWindowClose = React.useCallback(async () => {
    if (window.electron?.windowClose) {
      await window.electron.windowClose();
    }
  }, []);

  return (
    <MenubarMenu>
      <MenubarTrigger>{t("menuView")}</MenubarTrigger>
      <MenubarContent>
        <MenubarSub>
          <MenubarSubTrigger className="justify-between gap-2">
            <Palette className="size-4 text-fuchsia-500" />
            {t("appearance")}
          </MenubarSubTrigger>
          <MenubarSubContent>
            <MenubarItem onSelect={() => dispatchAppearance("zoom-in")}>
              <ZoomIn className="size-4 text-brand" />
              {t("increaseFontSize")}
              <Shortcut shortcut="⌘ + Mouse Up" />
            </MenubarItem>
            <MenubarItem onSelect={() => dispatchAppearance("zoom-out")}>
              <ZoomOut className="size-4 text-orange-500" />
              {t("decreaseFontSize")}
              <Shortcut shortcut="⌘ + Mouse Down" />
            </MenubarItem>
            <MenubarSeparator />
            <MenubarItem onSelect={() => dispatchAppearance("zoom-reset")}>
              <RotateCcw className="size-4 text-slate-500" />
              {t("resetFontSize")}
              <Shortcut shortcut="⌘ + 0" />
            </MenubarItem>
            <MenubarSeparator />
            <MenubarItem onSelect={toggleTheme} className="justify-between">
              {theme === "dark" ? (
                <Sun className="size-4 text-amber-500" />
              ) : (
                <Moon className="size-4 text-indigo-400" />
              )}
              {theme === "dark" ? t("light") : t("dark")}
              <Shortcut shortcut="⌘ + ⇧ + D" />
            </MenubarItem>
          </MenubarSubContent>
        </MenubarSub>
        <MenubarItem onSelect={toggleSidebar}>
          <PanelLeft className="size-4 text-sky-500" />
          {t("toggleSidebar")}
          <Shortcut shortcut="⌘ + B" />
        </MenubarItem>
      </MenubarContent>
    </MenubarMenu>
  );
};
