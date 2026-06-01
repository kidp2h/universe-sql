import { useTranslation } from "react-i18next";
import { Clock, Trash2, ArrowLeft } from "lucide-react";
import { CommandGroup } from "@/components/ui/command";
import { CommandItem } from "@/components/ui/command"; // raw CommandItem to prevent closing
import { AppCommandItem } from "./app-command-item"; // AppCommandItem for items that copy and close
import { useQueryHistoryStore } from "@/stores/query-history-store";
import { toast } from "sonner";

interface HistoryCommandGroupProps {
  setOpen: (open: boolean) => void;
  setPage: (page: "root" | "history") => void;
}

export function HistoryCommandGroup({
  setOpen,
  setPage,
}: HistoryCommandGroupProps) {
  const { t } = useTranslation();
  const history = useQueryHistoryStore((state) => state.getHistory());
  const clearHistory = useQueryHistoryStore((state) => state.clearHistory);

  const copyToClipboard = async (sql: string) => {
    try {
      await navigator.clipboard.writeText(sql);
      toast.success(t("queryCopied"));
    } catch {
      // Fallback for clipboard restrictions
      const textarea = document.createElement("textarea");
      textarea.value = sql;
      textarea.setAttribute("readonly", "true");
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      toast.success(t("queryCopied"));
    }
  };

  return (
    <CommandGroup heading={t("queryHistory")}>
      <CommandItem
        onSelect={() => {
          setPage("root");
        }}
        className="text-muted-foreground hover:text-foreground cursor-pointer"
      >
        <ArrowLeft className="size-4 mr-2" />
        {t("goBack")}
      </CommandItem>

      {history.length === 0 ? (
        <div className="py-6 text-center text-sm text-muted-foreground select-none">
          {t("noQueryHistoryYet")}
        </div>
      ) : (
        <>
          {history.slice(0, 20).map((item) => (
            <AppCommandItem
              key={item.id}
              setOpen={setOpen}
              onSelect={() => {
                copyToClipboard(item.sql);
              }}
            >
              <Clock className="size-4 text-blue-500 mr-2 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm truncate">{item.sql}</p>
                <p className="text-sm text-muted-foreground">
                  {item.connectionName} •{" "}
                  {new Date(item.executedAt).toLocaleTimeString()}
                </p>
              </div>
            </AppCommandItem>
          ))}
          {history.length > 20 && (
            <p className="px-2 py-1 text-sm text-muted-foreground">
              {t("moreItemsCount", { count: history.length - 20 })}
            </p>
          )}
          <AppCommandItem
            setOpen={setOpen}
            onSelect={() => {
              clearHistory();
              toast.success(t("historyCleared"));
            }}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="size-4 text-destructive mr-2" />
            {t("clearAllQueryHistory")}
          </AppCommandItem>
        </>
      )}
    </CommandGroup>
  );
}
