import { useTranslation } from "react-i18next";
import { Sun, Moon, PanelLeft } from "lucide-react";
import { Shortcut } from "@/components/ui/kbd";
import {
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarTrigger,
} from "@/components/ui/menubar";
import { useSidebar } from "@/components/ui/sidebar";
import { useTheme } from "@/hooks/use-theme";

export const AppMenubarView = () => {
  const { t } = useTranslation();
  const { toggleSidebar } = useSidebar();
  const { theme, toggleTheme } = useTheme();

  return (
    <MenubarMenu>
      <MenubarTrigger>{t("menuView")}</MenubarTrigger>
      <MenubarContent>
        <MenubarItem onSelect={toggleTheme}>
          {theme === "dark" ? (
            <Sun className="size-4 text-amber-500" />
          ) : (
            <Moon className="size-4 text-indigo-400" />
          )}
          <span className="ml-2 flex-1">
            {theme === "dark" ? t("light") : t("dark")}
          </span>
          <Shortcut shortcut="⌘ + ⇧ + D" />
        </MenubarItem>
        <MenubarItem onSelect={toggleSidebar}>
          <PanelLeft className="size-4 text-sky-500 mr-2" />
          {t("toggleSidebar")}
          <Shortcut shortcut="⌘ + B" />
        </MenubarItem>
      </MenubarContent>
    </MenubarMenu>
  );
};
