import { useTranslation } from "react-i18next";
import * as React from "react";
import {
  Search,
  Clock,
  Trash2,
  Copy,
  Check,
  CornerDownLeft,
  Star,
  Plus,
  Edit2,
  Sparkles,
} from "lucide-react";
import { useQueryHistoryStore } from "@/stores/query-history-store";
import {
  useQuerySnippetsStore,
  QuerySnippet,
} from "@/stores/query-snippets-store";
import { useTabStore } from "@/stores/tab-store";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
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

  const snippets = useQuerySnippetsStore((state) => state.snippets);
  const addSnippet = useQuerySnippetsStore((state) => state.addSnippet);
  const updateSnippet = useQuerySnippetsStore((state) => state.updateSnippet);
  const removeSnippet = useQuerySnippetsStore((state) => state.removeSnippet);

  const [activeTab, setActiveTab] = React.useState<"history" | "snippets">(
    "history",
  );
  const [searchQuery, setSearchQuery] = React.useState("");
  const [copiedId, setCopiedId] = React.useState<string | null>(null);
  const [clearConfirmOpen, setClearConfirmOpen] = React.useState(false);

  // Snippet modal/form state
  const [snippetFormOpen, setSnippetFormOpen] = React.useState(false);
  const [editingSnippetId, setEditingSnippetId] = React.useState<string | null>(
    null,
  );
  const [snippetName, setSnippetName] = React.useState("");
  const [snippetTrigger, setSnippetTrigger] = React.useState("");
  const [snippetDescription, setSnippetDescription] = React.useState("");
  const [snippetSql, setSnippetSql] = React.useState("");

  const filteredHistory = React.useMemo(() => {
    if (!searchQuery.trim()) return history;
    const query = searchQuery.toLowerCase();
    return history.filter(
      (item) =>
        item.sql.toLowerCase().includes(query) ||
        item.connectionName.toLowerCase().includes(query),
    );
  }, [history, searchQuery]);

  const filteredSnippets = React.useMemo(() => {
    if (!searchQuery.trim()) return snippets;
    const query = searchQuery.toLowerCase();
    return snippets.filter(
      (s) =>
        s.name.toLowerCase().includes(query) ||
        s.sql.toLowerCase().includes(query) ||
        s.trigger?.toLowerCase().includes(query) ||
        s.description?.toLowerCase().includes(query),
    );
  }, [snippets, searchQuery]);

  const handleCopy = React.useCallback(
    (e: React.MouseEvent, id: string, text: string) => {
      e.stopPropagation();
      navigator.clipboard.writeText(text);
      setCopiedId(id);
      toast.success(
        t("copiedSelectionToClipboard", {
          defaultValue: "Copied to clipboard!",
        }),
      );
      setTimeout(() => setCopiedId(null), 2000);
    },
    [t],
  );

  const handleApply = React.useCallback(
    (sql: string) => {
      if (!activeQueryTabId) {
        toast.error(t("openEditorToLoadSql"));
        return;
      }
      setQuerySql(sql);
      toast.success(
        t("sqlLoadedToEditor", { defaultValue: "Query loaded into editor!" }),
      );
    },
    [activeQueryTabId, setQuerySql, t],
  );

  const handleOpenAddSnippet = () => {
    setEditingSnippetId(null);
    setSnippetName("");
    setSnippetTrigger("");
    setSnippetDescription("");
    setSnippetSql("");
    setSnippetFormOpen(true);
  };

  const handleOpenEditSnippet = (e: React.MouseEvent, s: QuerySnippet) => {
    e.stopPropagation();
    setEditingSnippetId(s.id);
    setSnippetName(s.name);
    setSnippetTrigger(s.trigger || "");
    setSnippetDescription(s.description || "");
    setSnippetSql(s.sql);
    setSnippetFormOpen(true);
  };

  const handleSaveSnippet = () => {
    if (!snippetName.trim()) {
      toast.error(t("pleaseEnterSnippetName"));
      return;
    }
    if (!snippetSql.trim()) {
      toast.error(
        t("pleaseEnterSnippetSql", { defaultValue: "Please enter SQL code" }),
      );
      return;
    }

    if (editingSnippetId) {
      updateSnippet(editingSnippetId, {
        name: snippetName.trim(),
        trigger: snippetTrigger.trim() || undefined,
        description: snippetDescription.trim() || undefined,
        sql: snippetSql,
      });
      toast.success(t("snippetUpdatedSuccess"));
    } else {
      addSnippet({
        name: snippetName.trim(),
        trigger: snippetTrigger.trim() || undefined,
        description: snippetDescription.trim() || undefined,
        sql: snippetSql,
      });
      toast.success(t("snippetSavedSuccess", { name: snippetName }));
    }

    setSnippetFormOpen(false);
  };

  const handleDeleteSnippet = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    removeSnippet(id);
    toast.success(t("snippetDeletedSuccess"));
  };

  return (
    <div className="flex flex-col h-full bg-card overflow-hidden">
      {/* Header */}
      <div className="p-4 flex items-center justify-between border-b shrink-0 select-none bg-muted/10">
        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          {activeTab === "history"
            ? t("queryHistory")
            : t("snippetsTab", { defaultValue: "Snippets" })}
        </span>
        <div className="flex items-center gap-1">
          {activeTab === "snippets" && (
            <button
              onClick={handleOpenAddSnippet}
              className="p-1 rounded-md text-brand hover:bg-brand/10 transition-colors cursor-pointer outline-hidden"
              title={t("addSnippet", { defaultValue: "Add Snippet" })}
            >
              <Plus className="size-4" />
            </button>
          )}
          {activeTab === "history" && history.length > 0 && (
            <button
              onClick={() => setClearConfirmOpen(true)}
              className="p-1 rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors cursor-pointer outline-hidden"
              title={t("clearAllQueryHistory")}
            >
              <Trash2 className="size-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Tabs list switchers */}
      <div className="flex border-b shrink-0 bg-muted/30 p-1 gap-1">
        <button
          onClick={() => setActiveTab("history")}
          className={cn(
            "flex-1 py-1.5 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 select-none transition-all duration-200 cursor-pointer",
            activeTab === "history"
              ? "bg-background text-foreground shadow-xs border border-border/20"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Clock className="size-3" />
          {t("historyTab", { defaultValue: "History" })}
        </button>
        <button
          onClick={() => setActiveTab("snippets")}
          className={cn(
            "flex-1 py-1.5 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 select-none transition-all duration-200 cursor-pointer",
            activeTab === "snippets"
              ? "bg-background text-foreground shadow-xs border border-border/20"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Star className="size-3" />
          {t("snippetsTab", { defaultValue: "Snippets" })}
        </button>
      </div>

      {/* Search Input */}
      <div className="p-3 border-b shrink-0">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            type="text"
            placeholder={
              activeTab === "history"
                ? t("searchHistoryPlaceholder")
                : t("searchSnippetsPlaceholderShort", {
                    defaultValue: "Search snippets...",
                  })
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>
      </div>

      {/* Main List Area */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {activeTab === "history" ? (
          filteredHistory.length === 0 ? (
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
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5 font-medium">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span
                        className={cn(
                          "size-1.5 rounded-full",
                          isSuccess && "bg-brand",
                          isError && "bg-destructive",
                          !isSuccess &&
                            !isError &&
                            "bg-amber-500 animate-pulse",
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

                  <div className="text-[11px] font-mono text-foreground/90 bg-muted/20 border p-2 rounded-md truncate max-h-16 overflow-hidden leading-relaxed whitespace-pre-wrap">
                    {item.sql}
                  </div>

                  <div className="absolute right-2 bottom-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-background border shadow-xs rounded-md p-0.5">
                    <button
                      onClick={(e) => handleCopy(e, item.id, item.sql)}
                      className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
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
                      className="p-1 rounded-md hover:bg-brand/10 text-muted-foreground hover:text-brand transition-colors cursor-pointer"
                      title={t("loadSqlIntoEditor")}
                    >
                      <CornerDownLeft className="size-3" />
                    </button>
                  </div>
                </div>
              );
            })
          )
        ) : filteredSnippets.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center text-sm text-muted-foreground h-40 select-none">
            <Star className="size-8 text-muted-foreground/50 mb-2 stroke-1" />
            <p>
              {searchQuery ? t("noSnippetsMatch") : t("createSnippetToBegin")}
            </p>
          </div>
        ) : (
          filteredSnippets.map((s) => (
            <div
              key={s.id}
              onClick={() => handleApply(s.sql)}
              className="group relative flex flex-col w-full p-3 rounded-lg border bg-background border-border hover:border-brand/30 hover:bg-muted/30 text-left cursor-pointer transition-all select-none"
            >
              <div className="flex flex-col gap-0.5 mb-1.5">
                <span className="font-bold text-xs text-foreground truncate">
                  {s.name}
                </span>
                {s.trigger && (
                  <span className="font-mono text-[10px] font-extrabold text-brand">
                    /{s.trigger}
                  </span>
                )}
              </div>

              {s.description && (
                <p className="text-[10px] text-muted-foreground mb-2 leading-normal line-clamp-2 font-medium">
                  {s.description}
                </p>
              )}

              <div className="text-[11px] font-mono text-foreground/90 bg-muted/20 border p-2 rounded-md truncate max-h-16 overflow-hidden leading-relaxed whitespace-pre-wrap">
                {s.sql}
              </div>

              <div className="absolute right-2 bottom-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-background border shadow-xs rounded-md p-0.5">
                <button
                  onClick={(e) => handleCopy(e, s.id, s.sql)}
                  className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  title={t("copyQueryText")}
                >
                  {copiedId === s.id ? (
                    <Check className="size-3 text-brand" />
                  ) : (
                    <Copy className="size-3" />
                  )}
                </button>
                <button
                  onClick={(e) => handleOpenEditSnippet(e, s)}
                  className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  title={t("editSnippetMetadata")}
                >
                  <Edit2 className="size-3" />
                </button>
                <button
                  onClick={(e) => handleDeleteSnippet(e, s.id)}
                  className="p-1 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                  title={t("deleteSnippet", { defaultValue: "Delete Snippet" })}
                >
                  <Trash2 className="size-3" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleApply(s.sql);
                  }}
                  className="p-1 rounded-md hover:bg-brand/10 text-muted-foreground hover:text-brand transition-colors cursor-pointer"
                  title={t("loadSqlIntoEditor")}
                >
                  <CornerDownLeft className="size-3" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Global Dialogs inside Panel */}
      {/* 1. Clear History confirmation */}
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

      {/* 2. Add / Edit Snippet Modal */}
      <Dialog open={snippetFormOpen} onOpenChange={setSnippetFormOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-1.5 text-sm font-extrabold uppercase tracking-wider text-foreground">
              <Sparkles className="size-4 text-brand" />
              {editingSnippetId
                ? t("editSnippetMetadata")
                : t("addSnippet", { defaultValue: "Add Snippet" })}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground font-medium">
              Create a reusable SQL query snippet template.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Snippet Title */}
            <div className="space-y-1.5">
              <label
                htmlFor="snip-name"
                className="text-xs font-bold text-muted-foreground uppercase tracking-wider"
              >
                {t("snippetTitleLabel")}
              </label>
              <Input
                id="snip-name"
                value={snippetName}
                onChange={(e) => setSnippetName(e.target.value)}
                placeholder="e.g. Select Active Users"
                className="h-9 text-sm"
              />
            </div>
            {/* Snippet Trigger */}
            <div className="space-y-1.5">
              <label
                htmlFor="snip-trigger"
                className="text-xs font-bold text-muted-foreground uppercase tracking-wider"
              >
                Trigger Prefix (optional)
              </label>
              <Input
                id="snip-trigger"
                value={snippetTrigger}
                onChange={(e) =>
                  setSnippetTrigger(
                    e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""),
                  )
                }
                placeholder="e.g. act_users"
                className="h-9 text-sm font-mono"
              />
              <p className="text-[10px] text-muted-foreground/85">
                Type this keyword in the editor followed by Tab to autocomplete.
              </p>
            </div>
            {/* Snippet Description */}
            <div className="space-y-1.5">
              <label
                htmlFor="snip-desc"
                className="text-xs font-bold text-muted-foreground uppercase tracking-wider"
              >
                {t("snippetDescription")}
              </label>
              <Input
                id="snip-desc"
                value={snippetDescription}
                onChange={(e) => setSnippetDescription(e.target.value)}
                placeholder="Brief description of this query template"
                className="h-9 text-sm"
              />
            </div>
            {/* Snippet SQL code */}
            <div className="space-y-1.5">
              <label
                htmlFor="snip-sql"
                className="text-xs font-bold text-muted-foreground uppercase tracking-wider"
              >
                SQL Query Code *
              </label>
              <Textarea
                id="snip-sql"
                value={snippetSql}
                onChange={(e) => setSnippetSql(e.target.value)}
                placeholder="SELECT * FROM users WHERE active = true;"
                className="h-32 font-mono text-xs p-3"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => setSnippetFormOpen(false)}
              className="text-sm h-8 cursor-pointer"
            >
              {t("cancel")}
            </Button>
            <Button
              onClick={handleSaveSnippet}
              className="text-sm h-8 bg-brand hover:bg-brand/90 text-white font-semibold cursor-pointer"
            >
              {t("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
