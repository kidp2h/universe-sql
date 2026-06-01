import { useTranslation } from "react-i18next";
import { Download, Braces } from "lucide-react";
import { CommandGroup } from "@/components/ui/command";
import { AppCommandItem as CommandItem } from "./app-command-item";
import { useGlobalEvents } from "@/hooks/use-global-events";
import { Shortcut } from "../ui/kbd";

interface BaseCommandGroupProps {
  setOpen: (open: boolean) => void;
}

export function ResultCommandGroup({ setOpen }: BaseCommandGroupProps) {
  const { t } = useTranslation();
  const { dispatchCommand } = useGlobalEvents();
  return (
    <CommandGroup heading={t("menuResult")}>
      <CommandItem
        setOpen={setOpen}
        onSelect={() => {
          dispatchCommand("result-export-csv");
        }}
      >
        <Download className="size-4 text-brand mr-2" />
        {t("exportCsv")}
        <Shortcut shortcut="⌘ + ⇧ + C" />
      </CommandItem>
      <CommandItem
        setOpen={setOpen}
        onSelect={() => {
          dispatchCommand("result-export-json");
        }}
      >
        <Braces className="size-4 text-sky-500 mr-2" />
        {t("exportJson")}
        <Shortcut shortcut="⌘ + ⇧ + J" />
      </CommandItem>
    </CommandGroup>
  );
}
