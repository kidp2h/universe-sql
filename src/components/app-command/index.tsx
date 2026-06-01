import { useTranslation } from "react-i18next";
import * as React from "react";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandSeparator,
  CommandGroup,
  CommandItem,
} from "../ui/command";
import { FileCommandGroup } from "./app-command-file";
import { RunCommandGroup } from "./app-command-run";
import { ResultCommandGroup } from "./app-command-result";
import { ViewCommentsCommandGroup } from "./app-command-view-comments";
import { HistoryCommandGroup } from "./app-command-history";
import { HelpCommandGroup } from "./app-command-help";
import { SearchX, Clock, MessageSquareText } from "lucide-react";
import { Kbd, Shortcut } from "../ui/kbd";
import { useKeyboard } from "@/hooks/use-keyboard";

export const AppCommand = ({
  open,
  setOpen,
  setShowSettingsDialog,
  setShowAboutDialog,
}: {
  open: boolean;
  setOpen: (open: boolean) => void;
  setShowSettingsDialog: (open: boolean) => void;
  setShowAboutDialog: (open: boolean) => void;
}) => {
  const { t } = useTranslation();
  const [page, setPage] = React.useState<"root" | "history" | "comments">(
    "root",
  );
  const [search, setSearch] = React.useState("");

  // Reset page to root and clear search when palette opens or closes
  React.useEffect(() => {
    if (!open) {
      setPage("root");
      setSearch("");
    }
  }, [open]);

  useKeyboard({
    key: "p",
    ctrlKey: true,
    metaKey: true,
    shiftKey: true,
    onKeyDown: () => setOpen(true),
  });

  return (
    <CommandDialog open={open} onOpenChange={setOpen} showCloseButton={false}>
      <CommandInput
        placeholder={
          page === "root"
            ? t("searchCommandsPlaceholder")
            : page === "history"
              ? t("searchHistoryPlaceholder")
              : t("searchCommentsPlaceholder")
        }
        value={search}
        onValueChange={setSearch}
        onKeyDown={(e) => {
          if (page !== "root" && e.key === "Backspace" && !search) {
            e.preventDefault();
            setPage("root");
          }
        }}
        suffix={
          <div className="flex items-center gap-1 shrink-0 ml-auto">
            <span className="text-xs text-muted-foreground uppercase font-medium">
              {t("press")}
            </span>
            <Kbd className="h-5 min-w-5 px-1 bg-muted/50 border-muted-foreground/20 text-xs shadow-none mr-1">
              Esc
            </Kbd>
            <span className="text-xs text-muted-foreground uppercase font-medium">
              {t("toClose")}
            </span>
          </div>
        }
      />
      <CommandList>
        <CommandEmpty className="py-12 text-center flex flex-col items-center justify-center gap-3 select-none">
          <div className="bg-muted rounded-full p-4 animate-in fade-in zoom-in duration-300">
            <SearchX className="size-8 text-muted-foreground stroke-[1.5]" />
          </div>
          <div className="space-y-1 animate-in fade-in slide-in-from-bottom-2 duration-500 delay-150 fill-mode-both">
            <p className="text-sm font-semibold tracking-tight">
              {t("noResultsFound")}
            </p>
            <p className="text-sm text-muted-foreground max-w-[200px] leading-relaxed mx-auto">
              {t("noResultsFoundDesc")}
            </p>
          </div>
        </CommandEmpty>

        {page === "root" ? (
          <>
            <FileCommandGroup
              setOpen={setOpen}
              setShowSettingsDialog={setShowSettingsDialog}
            />
            <CommandSeparator />
            <CommandGroup heading={t("recentActions")}>
              <CommandItem
                onSelect={() => {
                  setPage("history");
                  setSearch(""); // Clear search when transitioning
                }}
                className="cursor-pointer"
              >
                <Clock className="size-4 text-blue-500 mr-2" />
                {t("viewQueryHistory")}
              </CommandItem>
              <CommandItem
                onSelect={() => {
                  setPage("comments");
                  setSearch(""); // Clear search when transitioning
                }}
                className="cursor-pointer"
              >
                <MessageSquareText className="size-4 text-brand mr-2" />
                {t("viewTableComments")}
              </CommandItem>
            </CommandGroup>
            <CommandSeparator />
            <RunCommandGroup setOpen={setOpen} />
            <CommandSeparator />
            <ResultCommandGroup setOpen={setOpen} />
            <CommandSeparator />
            <HelpCommandGroup
              setOpen={setOpen}
              setShowAboutDialog={setShowAboutDialog}
            />
          </>
        ) : page === "history" ? (
          <HistoryCommandGroup setOpen={setOpen} setPage={setPage} />
        ) : (
          <ViewCommentsCommandGroup setOpen={setOpen} setPage={setPage} />
        )}
      </CommandList>
      <CommandSeparator />
      <div className="p-2 flex flex-row gap-3 items-center justify-end">
        <div className="flex flex-row gap-0.5 items-center">
          <span className="text-sm font-medium text-muted-foreground">
            {t("runQuery")}
          </span>
          <Shortcut shortcut="Enter" className="pl-1" />
        </div>
        <div className="flex flex-row gap-0.5 items-center justify-center">
          <span className="text-sm font-medium text-muted-foreground">
            {t("navigation")}
          </span>
          <Shortcut shortcut="↑" className="pl-1" />
          <Shortcut shortcut="↓" className="pl-1" />
        </div>
      </div>
    </CommandDialog>
  );
};
