import { useTranslation } from "react-i18next";
import { Info, RefreshCw } from "lucide-react";
import {
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarTrigger,
} from "@/components/ui/menubar";
import { useGlobalEvents } from "@/hooks/use-global-events";
import { toast } from "sonner";

export const AppMenubarHelp = () => {
  const { t } = useTranslation();
  const { dispatchCommand } = useGlobalEvents();
  return (
    <MenubarMenu>
      <MenubarTrigger>{t("menuHelp")}</MenubarTrigger>
      <MenubarContent>
        <MenubarItem onSelect={() => dispatchCommand("open-about")}>
          <Info className="size-4 text-slate-500" />
          {t("aboutTitle")}
        </MenubarItem>
        <MenubarItem
          onSelect={() => {
            if (window.updater?.checkForUpdates) {
              window.updater.checkForUpdates();
            } else {
              toast.error(t("updaterUnavailableInBrowser"));
            }
          }}
        >
          <RefreshCw className="size-4 text-slate-500" />
          {t("checkForUpdates")}
        </MenubarItem>
      </MenubarContent>
    </MenubarMenu>
  );
};
