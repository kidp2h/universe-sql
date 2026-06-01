import { useTranslation } from "react-i18next";
import { Info } from "lucide-react";
import { CommandGroup } from "@/components/ui/command";
import { AppCommandItem as CommandItem } from "./app-command-item";

interface HelpCommandGroupProps {
  setOpen: (open: boolean) => void;
  setShowAboutDialog: (open: boolean) => void;
}

export function HelpCommandGroup({
  setOpen,
  setShowAboutDialog,
}: HelpCommandGroupProps) {
  const { t } = useTranslation();
  return (
    <CommandGroup heading={t("menuHelp")}>
      <CommandItem
        setOpen={setOpen}
        onSelect={() => {
          setShowAboutDialog(true);
        }}
      >
        <Info className="size-4 text-slate-500 mr-2" />
        {t("aboutTitle")}
      </CommandItem>
    </CommandGroup>
  );
}
