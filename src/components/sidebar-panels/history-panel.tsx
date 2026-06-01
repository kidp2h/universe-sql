import { useTranslation } from "react-i18next";
import * as React from "react";
import {
  Search,
  Clock,
  Trash2,
  Copy,
  Check,
  CornerDownLeft,
} from "lucide-react";
import { useQueryHistoryStore } from "@/stores/query-history-store";
import { useTabStore } from "@/stores/tab-store";
import { Input } from "@/components/ui/input";
import { cn, formatRelativeTime } from "@/lib/utils";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function HistoryPanel() {
  const { t } = useTranslation();
  const history = useQueryHistoryStore((state) => state.history);
  const clearHistory = useQueryHistoryStore((state) => state.clearHistory);
  const setQuerySql = useTabStore((state) => state.setQuerySql);
  const activeQueryTabId = useTabStore((state) => state.activeQueryTabId);

  const [searchQuery, setSearchQuery] = React.useState("");
  const [copiedId, setCopiedId] = React.useState<string | null>(null);
  const [clearConfirmOpen, setClearConfirmOpen] = React.useState(false);

  const filteredHistory = React.useMemo(() => {
    if (!searchQuery.trim()) return history;
    const query = searchQuery.toLowerCase();
    return history.filter(
      (item) =>
        item.sql.toLowerCase().includes(query) ||
        item.connectionName.toLowerCase().includes(query),
    );
  }, [history, searchQuery]);

  const handleCopy = React.useCallback(
    (e: React.MouseEvent, id: string, text: string) => {
      e.stopPropagation();
      navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    },
    [],
  );

  const handleApply = React.useCallback(
    (sql: string) => {
      if (!activeQueryTabId) {
        toast.error(t("openEditorToLoadSql"));
        return;
      }
      setQuerySql(sql);
    },
    [activeQueryTabId, setQuerySql, t],
  );

  return (
    <div className="flex flex-col h-full bg-card overflow-hidden">
      {/* Header */}
      <div className="p-4 flex items-center justify-between border-b shrink-0 select-none">
        <span className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
          {t("queryHistory")}
        </span>
        {history.length > 0 && (
          <>
            <button
              onClick={() => setClearConfirmOpen(true)}
              className="p-1 rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors cursor-pointer outline-hidden"
              title={t("clearAllQueryHistory")}
            >
              <Trash2 className="size-3.5" />
            </button>

            <Dialog open={clearConfirmOpen} onOpenChange={setClearConfirmOpen}>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-destructive">
                    <Trash2 className="size-5" />
                    {t("clearQueryHistoryTitle")}
                  </DialogTitle>
                  <DialogDescription className="text-sm pt-1.5 leading-relaxed">
                    {t("clearHistoryConfirmDesc")}
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter className="gap-2 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => setClearConfirmOpen(false)}
                    className="text-sm h-8 cursor-pointer"
                  >
                    {t("cancel")}
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => {
                      clearHistory();
                      toast.success(t("historyClearedSuccess"));
                      setClearConfirmOpen(false);
                    }}
                    className="text-sm h-8 font-semibold cursor-pointer"
                  >
                    {t("clearAll")}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
        )}
      </div>

      {/* Search Input */}
      <div className="p-3 border-b shrink-0">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            type="text"
            placeholder={t("searchHistoryPlaceholder")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>
      </div>

      {/* History List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {filteredHistory.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center text-sm text-muted-foreground h-40 select-none">
            <Clock className="size-8 text-muted-foreground/50 mb-2 stroke-1" />
            <p>
              {searchQuery ? t("noMatchingQueries") : t("noQueryHistoryYet")}
            </p>
          </div>
        ) : (
          filteredHistory.map((item) => {
            const dateStr = formatRelativeTime(item.executedAt);
            const isSuccess = item.status === "success";
            const isError = item.status === "error";

            return (
              <div
                key={item.id}
                onClick={() => handleApply(item.sql)}
                className="group relative flex flex-col w-full p-3 rounded-lg border bg-background border-border hover:border-brand/30 hover:bg-muted/30 text-left cursor-pointer transition-all select-none"
              >
                {/* Meta details */}
                <div className="flex items-center justify-between text-sm text-muted-foreground mb-1.5 font-medium">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span
                      className={cn(
                        "size-1.5 rounded-full",
                        isSuccess && "bg-brand",
                        isError && "bg-destructive",
                        !isSuccess && !isError && "bg-amber-500 animate-pulse",
                      )}
                    />
                    <span className="truncate bg-muted px-1.5 py-0.5 rounded-md font-semibold max-w-28 text-foreground/80">
                      {item.connectionName}
                    </span>
                    <span className="truncate">{dateStr}</span>
                  </div>
                  {item.duration !== undefined && (
                    <span className="font-mono text-[9px] shrink-0">
                      {item.duration}ms
                    </span>
                  )}
                </div>

                {/* SQL snippet */}
                <div className="text-[11px] font-mono text-foreground/90 bg-muted/20 border p-2 rounded-md truncate max-h-16 overflow-hidden leading-relaxed whitespace-pre-wrap">
                  {item.sql}
                </div>

                {/* Hover actions */}
                <div className="absolute right-2 bottom-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-background border shadow-xs rounded-md p-0.5">
                  <button
                    onClick={(e) => handleCopy(e, item.id, item.sql)}
                    className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                    title={t("copyQueryText")}
                  >
                    {copiedId === item.id ? (
                      <Check className="size-3 text-brand" />
                    ) : (
                      <Copy className="size-3" />
                    )}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleApply(item.sql);
                    }}
                    className="p-1 rounded-md hover:bg-brand/10 text-muted-foreground hover:text-brand transition-colors"
                    title={t("loadSqlIntoEditor")}
                  >
                    <CornerDownLeft className="size-3" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
