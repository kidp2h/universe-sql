"use client";

import * as React from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useQueryHistoryStore } from "@/stores/query-history-store";
import { useQuerySnippetsStore } from "@/stores/query-snippets-store";
import { useTabStore } from "@/stores/tab-store";
import { useSidebarStore } from "@/stores/sidebar-store";
import {
  Search,
  History,
  Star,
  Copy,
  Check,
  Trash2,
  Play,
  AlertTriangle,
  Clock,
  ExternalLink,
  Database,
  Tag,
  CornerDownLeft,
  X,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type TabMode = "history" | "snippets";
type HistoryFilter = "all" | "success" | "error" | "slow";

export function QueryHistorySnippetsPage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = React.useState<TabMode>("history");
  const [historyFilter, setHistoryFilter] =
    React.useState<HistoryFilter>("all");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [clearConfirmOpen, setClearConfirmOpen] = React.useState(false);

  const history = useQueryHistoryStore((state) => state.history);
  const removeFromHistory = useQueryHistoryStore(
    (state) => state.removeFromHistory,
  );
  const clearHistory = useQueryHistoryStore((state) => state.clearHistory);

  const snippets = useQuerySnippetsStore((state) => state.snippets);
  const addSnippet = useQuerySnippetsStore((state) => state.addSnippet);
  const updateSnippet = useQuerySnippetsStore((state) => state.updateSnippet);
  const removeSnippet = useQuerySnippetsStore((state) => state.removeSnippet);

  const queryTabs = useTabStore((state) => state.queryTabs);
  const activeQueryTabId = useTabStore((state) => state.activeQueryTabId);
  const updateQueryTab = useTabStore((state) => state.updateQueryTab);
  const updateActiveQueryTabId = useTabStore(
    (state) => state.updateActiveQueryTabId,
  );
  const openSqlTab = useTabStore((state) => state.openSqlTab);

  const [selectedHistoryId, setSelectedHistoryId] = React.useState<
    string | null
  >(null);
  const [selectedSnippetId, setSelectedSnippetId] = React.useState<
    string | null
  >(null);

  // Snippet inline form states
  const [showSaveForm, setShowSaveForm] = React.useState(false);
  const [snippetName, setSnippetName] = React.useState("");
  const [snippetTrigger, setSnippetTrigger] = React.useState("");
  const [snippetDescription, setSnippetDescription] = React.useState("");
  const [snippetTags, setSnippetTags] = React.useState("");

  // Snippet editing states
  const [isEditingSnippet, setIsEditingSnippet] = React.useState(false);

  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  // Selected Item lookups
  const selectedHistoryItem = React.useMemo(() => {
    return history.find((item) => item.id === selectedHistoryId) || null;
  }, [history, selectedHistoryId]);

  const selectedSnippetItem = React.useMemo(() => {
    return snippets.find((s) => s.id === selectedSnippetId) || null;
  }, [snippets, selectedSnippetId]);

  // Reset states on tab change
  React.useEffect(() => {
    setShowSaveForm(false);
    setIsEditingSnippet(false);
  }, [activeTab]);

  // Filter lists
  const filteredHistory = React.useMemo(() => {
    return history.filter((item) => {
      // Filter by status
      if (historyFilter === "success" && item.status !== "success")
        return false;
      if (historyFilter === "error" && item.status !== "error") return false;
      if (historyFilter === "slow" && (!item.duration || item.duration < 100))
        return false;

      // Filter by search
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        item.sql.toLowerCase().includes(q) ||
        item.connectionName.toLowerCase().includes(q)
      );
    });
  }, [history, historyFilter, searchQuery]);

  const filteredSnippets = React.useMemo(() => {
    return snippets.filter((s) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        s.name.toLowerCase().includes(q) ||
        s.sql.toLowerCase().includes(q) ||
        s.trigger?.toLowerCase().includes(q) ||
        s.description?.toLowerCase().includes(q) ||
        s.tags?.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [snippets, searchQuery]);

  // Default selection on list load/change
  React.useEffect(() => {
    if (activeTab === "history") {
      if (filteredHistory.length > 0 && !selectedHistoryId) {
        setSelectedHistoryId(filteredHistory[0].id);
      }
    } else {
      if (filteredSnippets.length > 0 && !selectedSnippetId) {
        setSelectedSnippetId(filteredSnippets[0].id);
      }
    }
  }, [
    activeTab,
    filteredHistory,
    filteredSnippets,
    selectedHistoryId,
    selectedSnippetId,
  ]);

  // Action Handlers
  const handleCopy = (sql: string, id: string) => {
    navigator.clipboard.writeText(sql);
    setCopiedId(id);
    toast.success(t("sqlCopiedToClipboard"));
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleRestore = (sql: string) => {
    const sqlTabs = queryTabs.filter((tab) => !tab.type || tab.type === "sql");
    if (sqlTabs.length > 0) {
      const currentTab = queryTabs.find((t) => t.id === activeQueryTabId);
      const targetTab =
        !currentTab?.type || currentTab?.type === "sql"
          ? currentTab
          : sqlTabs[0];
      if (targetTab) {
        updateQueryTab({ ...targetTab, sql });
        updateActiveQueryTabId(targetTab.id);
        return;
      }
    }
    openSqlTab({
      title: "Restored Query",
      sql,
      connectionId: useSidebarStore.getState().selectedConnectionId,
    });
    toast.success(t("sqlOpenedNewTab"));
  };

  const handleSaveAsSnippet = () => {
    if (!selectedHistoryItem) return;
    if (!snippetName.trim()) {
      toast.error(t("pleaseEnterSnippetName"));
      return;
    }

    addSnippet({
      name: snippetName.trim(),
      sql: selectedHistoryItem.sql,
      trigger: snippetTrigger.trim() ? snippetTrigger.trim() : undefined,
      description: snippetDescription.trim()
        ? snippetDescription.trim()
        : undefined,
      tags: snippetTags.trim()
        ? snippetTags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean)
        : undefined,
    });

    toast.success(t("snippetSavedSuccess", { name: snippetName }));
    setShowSaveForm(false);
    setSnippetName("");
    setSnippetTrigger("");
    setSnippetDescription("");
    setSnippetTags("");

    // Switch tab to snippets and select it
    setActiveTab("snippets");
    const lastSnippet = useQuerySnippetsStore.getState().snippets;
    if (lastSnippet.length > 0) {
      setSelectedSnippetId(lastSnippet[lastSnippet.length - 1].id);
    }
  };

  const handleUpdateSnippet = () => {
    if (!selectedSnippetItem) return;
    if (!snippetName.trim()) {
      toast.error(t("snippetNameNotEmpty"));
      return;
    }

    updateSnippet(selectedSnippetItem.id, {
      name: snippetName.trim(),
      trigger: snippetTrigger.trim() ? snippetTrigger.trim() : undefined,
      description: snippetDescription.trim()
        ? snippetDescription.trim()
        : undefined,
      tags: snippetTags.trim()
        ? snippetTags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean)
        : undefined,
    });

    toast.success(t("snippetUpdatedSuccess"));
    setIsEditingSnippet(false);
  };

  const startEditSnippet = () => {
    if (!selectedSnippetItem) return;
    setSnippetName(selectedSnippetItem.name);
    setSnippetTrigger(selectedSnippetItem.trigger || "");
    setSnippetDescription(selectedSnippetItem.description || "");
    setSnippetTags(selectedSnippetItem.tags?.join(", ") || "");
    setIsEditingSnippet(true);
  };

  const handleDeleteHistory = (id: string) => {
    removeFromHistory(id);
    toast.success(t("historyEntryRemoved"));
    if (selectedHistoryId === id) {
      setSelectedHistoryId(null);
    }
  };

  const handleDeleteSnippet = (id: string) => {
    removeSnippet(id);
    toast.success(t("snippetDeletedSuccess"));
    if (selectedSnippetId === id) {
      setSelectedSnippetId(null);
    }
  };

  const formatRelativeTime = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 5) return t("justNow", { defaultValue: "just now" });
    if (seconds < 60)
      return `${seconds}${t("secondsAgo", { defaultValue: "s ago" })}`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60)
      return `${minutes}${t("minutesAgo", { defaultValue: "m ago" })}`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24)
      return `${hours}${t("hoursAgo", { defaultValue: "h ago" })}`;
    return new Date(timestamp).toLocaleDateString();
  };

  return (
    <div className="flex flex-col h-full w-full bg-background overflow-hidden p-6 space-y-6 animate-in fade-in duration-300">
      <div className="mb-2 shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2 select-none tracking-tight text-foreground">
              <History className="size-6 text-indigo-500 animate-pulse" />
              {t("historySnippetsTitle")}
            </h2>
            <p className="text-sm text-muted-foreground select-none mt-1">
              {t("historySnippetsDesc")}
            </p>
          </div>
          {/* Quick Header Badges */}
          <div className="flex items-center gap-3">
            <Badge
              variant="outline"
              className="text-xs select-none font-mono py-1 px-2.5 bg-muted/30"
            >
              {t("runsLogged", { count: history.length })}
            </Badge>
            <Badge
              variant="outline"
              className="text-xs select-none font-mono py-1 px-2.5 bg-muted/30"
            >
              {t("templatesSaved", { count: snippets.length })}
            </Badge>
          </div>
        </div>
      </div>

      {/* Dual-Pane View */}
      <div className="flex-1 flex overflow-hidden min-h-0 border rounded-xl bg-card shadow-sm">
        {/* Left Column: Navigator List */}
        <div className="w-[420px] border-r flex flex-col bg-muted/10 shrink-0">
          {/* Search Input Bar */}
          <div className="p-3 border-b shrink-0 relative">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder={
                activeTab === "history"
                  ? t("searchHistoryPlaceholderShort")
                  : t("searchSnippetsPlaceholderShort")
              }
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-sm bg-background/50 border-border/60 hover:border-border focus-visible:ring-indigo-500/30"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-6 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="size-3" />
              </button>
            )}
          </div>

          {/* Custom Tab Switcher */}
          <div className="flex border-b shrink-0 bg-muted/30 p-1 gap-1">
            <button
              onClick={() => setActiveTab("history")}
              className={cn(
                "flex-1 py-1.5 rounded-md text-sm font-semibold flex items-center justify-center gap-2 select-none transition-all duration-200",
                activeTab === "history"
                  ? "bg-background text-foreground shadow-sm border border-border/20"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <History className="size-3.5" />
              {t("historyTab")}
            </button>
            <button
              onClick={() => setActiveTab("snippets")}
              className={cn(
                "flex-1 py-1.5 rounded-md text-sm font-semibold flex items-center justify-center gap-2 select-none transition-all duration-200",
                activeTab === "snippets"
                  ? "bg-background text-foreground shadow-sm border border-border/20"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Star className="size-3.5" />
              {t("snippetsTab")}
            </button>
          </div>

          {/* Sub-Filters for History */}
          {activeTab === "history" && (
            <div className="px-3 py-2 border-b shrink-0 flex items-center gap-1.5 bg-muted/10 overflow-x-auto whitespace-nowrap scrollbar-none">
              {(
                [
                  { id: "all", label: t("allRuns") },
                  { id: "success", label: t("success") },
                  { id: "error", label: t("errors") },
                  { id: "slow", label: t("slowRuns") },
                ] as const
              ).map((f) => (
                <button
                  key={f.id}
                  onClick={() => {
                    setHistoryFilter(f.id);
                    setSelectedHistoryId(null); // Reset detail lookup
                  }}
                  className={cn(
                    "px-2.5 py-1 rounded-full text-sm font-bold transition-all select-none border",
                    historyFilter === f.id
                      ? "bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 border-indigo-500/30"
                      : "bg-background/40 hover:bg-background text-muted-foreground border-border/40",
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
          )}

          {/* List Containers */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1 bg-background/10">
            {/* History list rendering */}
            {activeTab === "history" &&
              (filteredHistory.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-center p-4">
                  <History className="size-8 text-muted-foreground/30 mb-2" />
                  <p className="text-sm font-semibold text-muted-foreground">
                    {t("noHistoryMatch")}
                  </p>
                  <p className="text-sm text-muted-foreground/70">
                    {t("executeToLog")}
                  </p>
                </div>
              ) : (
                filteredHistory.map((item) => {
                  const isSelected = item.id === selectedHistoryId;
                  const isSlow = item.duration && item.duration >= 100;
                  return (
                    <div
                      key={item.id}
                      onClick={() => setSelectedHistoryId(item.id)}
                      className={cn(
                        "group p-2.5 rounded-lg border text-left cursor-pointer transition-all duration-200 flex flex-col gap-1.5",
                        isSelected
                          ? "bg-muted/80 border-border/80 shadow-sm"
                          : "hover:bg-muted/40 border-transparent hover:border-border/30",
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        {/* Left: icon + SQL snippet */}
                        <div className="flex-1 min-w-0 flex items-center gap-2">
                          {item.status === "success" ? (
                            <div className="size-4 shrink-0 rounded-full bg-brand/10 border border-brand/30 flex items-center justify-center text-brand">
                              <Play className="size-2 fill-brand" />
                            </div>
                          ) : item.status === "error" ? (
                            <div className="size-4 shrink-0 rounded-full bg-destructive/10 border border-destructive/30 flex items-center justify-center text-destructive">
                              <AlertTriangle className="size-2" />
                            </div>
                          ) : (
                            <div className="size-4 shrink-0 rounded-full bg-zinc-500/10 border border-zinc-500/30 flex items-center justify-center text-zinc-500 animate-pulse">
                              <Clock className="size-2" />
                            </div>
                          )}
                          <span className="font-mono text-sm text-foreground font-semibold truncate flex-1 leading-none select-none">
                            {item.sql}
                          </span>
                        </div>

                        {/* Right delete button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteHistory(item.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-destructive/10 hover:text-destructive rounded text-muted-foreground transition-all shrink-0"
                        >
                          <Trash2 className="size-3" />
                        </button>
                      </div>

                      {/* Footer metadata */}
                      <div className="flex items-center justify-between text-xs text-muted-foreground select-none">
                        <span className="flex items-center gap-1">
                          <Database className="size-2.5" />
                          {item.connectionName}
                        </span>
                        <div className="flex items-center gap-2">
                          {item.duration !== undefined && (
                            <span
                              className={cn(
                                "font-mono font-bold flex items-center gap-0.5",
                                isSlow
                                  ? "text-amber-500"
                                  : "text-muted-foreground",
                              )}
                            >
                              <Clock className="size-2.5" />
                              {item.duration}ms
                            </span>
                          )}
                          <span>{formatRelativeTime(item.executedAt)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })
              ))}

            {/* Snippet list rendering */}
            {activeTab === "snippets" &&
              (filteredSnippets.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-center p-4">
                  <Star className="size-8 text-muted-foreground/30 mb-2" />
                  <p className="text-sm font-semibold text-muted-foreground">
                    {t("noSnippetsMatch")}
                  </p>
                  <p className="text-xs text-muted-foreground/70">
                    {t("createSnippetToBegin")}
                  </p>
                </div>
              ) : (
                filteredSnippets.map((s) => {
                  const isSelected = s.id === selectedSnippetId;
                  return (
                    <div
                      key={s.id}
                      onClick={() => setSelectedSnippetId(s.id)}
                      className={cn(
                        "group p-2.5 rounded-lg border text-left cursor-pointer transition-all duration-200 flex flex-col gap-1.5",
                        isSelected
                          ? "bg-muted/80 border-border/80 shadow-sm"
                          : "hover:bg-muted/40 border-transparent hover:border-border/30",
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        {/* Left: trigger + name */}
                        <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                          <span className="font-semibold text-sm truncate select-none">
                            {s.name}
                          </span>
                          {s.trigger && (
                            <span className="font-mono text-xs font-extrabold text-indigo-500 dark:text-indigo-400 select-none">
                              {s.trigger}
                            </span>
                          )}
                        </div>

                        {/* Right delete button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteSnippet(s.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-destructive/10 hover:text-destructive rounded text-muted-foreground transition-all shrink-0"
                        >
                          <Trash2 className="size-3" />
                        </button>
                      </div>

                      {/* Snippet description / tags */}
                      <div className="flex items-center justify-between text-xs text-muted-foreground select-none">
                        <span className="truncate max-w-[200px] leading-tight">
                          {s.description || t("noTagsAssigned")}
                        </span>
                        {s.tags && s.tags.length > 0 && (
                          <Badge
                            variant="secondary"
                            className="text-[8px] h-4 py-0 px-1 border border-border/40"
                          >
                            {s.tags[0]}
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })
              ))}
          </div>

          {/* Bulk Actions Footer */}
          {activeTab === "history" && history.length > 0 && (
            <div className="p-2 border-t shrink-0 bg-muted/10 flex items-center justify-between">
              <span className="text-xs text-muted-foreground select-none font-mono pl-1">
                {t("historyLimitDesc")}
              </span>
              <button
                onClick={() => setClearConfirmOpen(true)}
                className="px-2.5 py-1 text-xs font-bold text-destructive hover:bg-destructive/10 hover:text-destructive transition rounded flex items-center gap-1 select-none cursor-pointer"
              >
                <Trash2 className="size-3" />
                {t("clearAllHistoryBtn")}
              </button>

              <Dialog
                open={clearConfirmOpen}
                onOpenChange={setClearConfirmOpen}
              >
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
            </div>
          )}
        </div>

        {/* Right Column: Code & Inspector Pane */}
        <div className="flex-1 flex flex-col bg-background overflow-hidden">
          {/* History Detail Inspector */}
          {activeTab === "history" &&
            (!selectedHistoryItem ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-muted/5">
                <History className="size-12 text-muted-foreground/10 mb-2" />
                <p className="text-sm font-semibold text-muted-foreground">
                  {t("selectRunFromTimeline")}
                </p>
                <p className="text-sm text-muted-foreground/70">
                  {t("clickEntryToInspect")}
                </p>
              </div>
            ) : (
              <div className="flex-1 flex flex-col p-5 overflow-y-auto gap-4">
                {/* Header bar: Restore and Copy */}
                <div className="flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        selectedHistoryItem.status === "success"
                          ? "outline"
                          : selectedHistoryItem.status === "error"
                            ? "destructive"
                            : "secondary"
                      }
                      className="px-2.5 py-0.5 font-bold uppercase tracking-wider text-xs"
                    >
                      {selectedHistoryItem.status === "success"
                        ? t("success")
                        : selectedHistoryItem.status === "error"
                          ? t("errors")
                          : t("queryTabDefault")}
                    </Badge>
                    <span className="text-xs text-muted-foreground select-none font-mono">
                      {t("loggedAt", { defaultValue: "Logged at" })}{" "}
                      {new Date(
                        selectedHistoryItem.executedAt,
                      ).toLocaleString()}
                    </span>
                  </div>

                  {/* Right action triggers */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() =>
                        handleCopy(
                          selectedHistoryItem.sql,
                          selectedHistoryItem.id,
                        )
                      }
                      className="h-8 px-3 rounded-md border text-sm font-semibold hover:bg-muted bg-background transition flex items-center gap-1.5 select-none"
                    >
                      {copiedId === selectedHistoryItem.id ? (
                        <>
                          <Check className="size-3.5 text-brand" />
                          {t("copied")}
                        </>
                      ) : (
                        <>
                          <Copy className="size-3.5" />
                          {t("copySql")}
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => handleRestore(selectedHistoryItem.sql)}
                      className="h-8 px-3 rounded-md bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-bold transition flex items-center gap-1.5 select-none shadow-sm shadow-indigo-500/20"
                    >
                      <CornerDownLeft className="size-3.5" />
                      {t("restoreIntoEditor")}
                    </button>
                  </div>
                </div>

                {/* Metadata detail cards */}
                <div className="grid grid-cols-3 gap-3 shrink-0 select-none">
                  <div className="p-3 border rounded-xl flex items-center gap-3 bg-muted/10 shadow-sm">
                    <Database className="size-5 text-indigo-500 shrink-0" />
                    <div className="flex flex-col">
                      <span className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider">
                        {t("connectionsManager")}
                      </span>
                      <span className="text-sm font-bold truncate max-w-[150px]">
                        {selectedHistoryItem.connectionName}
                      </span>
                    </div>
                  </div>
                  <div className="p-3 border rounded-xl flex items-center gap-3 bg-muted/10 shadow-sm">
                    <Clock className="size-5 text-amber-500 shrink-0" />
                    <div className="flex flex-col">
                      <span className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider">
                        {t("iterationsDesc", {
                          defaultValue: "Execution Timing",
                        })}
                      </span>
                      <span className="text-sm font-bold font-mono">
                        {selectedHistoryItem.duration !== undefined
                          ? `${selectedHistoryItem.duration}ms`
                          : "N/A"}
                      </span>
                    </div>
                  </div>
                  <div className="p-3 border rounded-xl flex items-center gap-3 bg-muted/10 shadow-sm">
                    <ExternalLink className="size-5 text-brand shrink-0" />
                    <div className="flex flex-col">
                      <span className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider">
                        {t("save", { defaultValue: "Save to catalog" })}
                      </span>
                      <button
                        onClick={() => {
                          setShowSaveForm(true);
                          setSnippetName(
                            `Query ${new Date(selectedHistoryItem.executedAt).toLocaleDateString()}`,
                          );
                          setSnippetTrigger("");
                        }}
                        className="text-sm font-bold text-indigo-500 hover:text-indigo-600 hover:underline flex items-center gap-0.5 text-left leading-none"
                      >
                        <Star className="size-3 text-indigo-500 fill-indigo-500" />
                        {t("saveAsSnippet", {
                          defaultValue: "Save as Snippet",
                        })}
                      </button>
                    </div>
                  </div>
                </div>

                {/* SQL Sandbox Preview container */}
                <div className="flex-1 min-h-0 bg-zinc-950 dark:bg-zinc-950/80 rounded-xl border border-zinc-800/80 overflow-hidden flex flex-col shadow-inner shrink-0 min-h-[180px]">
                  <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800 bg-zinc-900/50">
                    <span className="text-[9px] font-mono text-zinc-400 select-none uppercase tracking-wider font-extrabold">
                      {t("sqlQueryCode")}
                    </span>
                  </div>
                  <pre className="flex-1 overflow-auto p-4 font-mono text-sm text-zinc-100 select-all leading-relaxed whitespace-pre-wrap">
                    {selectedHistoryItem.sql}
                  </pre>
                </div>

                {/* Error display if query failed */}
                {selectedHistoryItem.status === "error" &&
                  selectedHistoryItem.error && (
                    <div className="p-4 rounded-xl border border-destructive/20 bg-destructive/5 flex flex-col gap-2 shrink-0 select-none">
                      <div className="flex items-center gap-2 text-destructive">
                        <AlertTriangle className="size-4 shrink-0" />
                        <span className="text-sm font-bold font-mono">
                          {t("dbRuntimeExceptionLog")}
                        </span>
                      </div>
                      <p className="font-mono text-[11px] leading-relaxed text-destructive/90 break-words max-h-24 overflow-y-auto bg-destructive/10 p-3 rounded-lg border border-destructive/10">
                        {selectedHistoryItem.error}
                      </p>
                    </div>
                  )}

                {/* Save to Snippet Form Dialog */}
                {showSaveForm && (
                  <div className="p-4 rounded-xl border border-indigo-500/20 bg-indigo-500/5 flex flex-col gap-3 shrink-0 shadow-sm relative transition-all duration-300">
                    <button
                      onClick={() => setShowSaveForm(false)}
                      className="absolute right-3 top-3 p-1 hover:bg-muted text-muted-foreground rounded"
                    >
                      <X className="size-3" />
                    </button>
                    <div className="flex items-center gap-1.5 text-indigo-500">
                      <Sparkles className="size-4 text-indigo-500" />
                      <span className="text-sm font-bold">
                        {t("configureAutocompleteTemplate")}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex flex-col gap-1">
                        <div className="text-xs text-muted-foreground uppercase font-bold select-none">
                          {t("snippetTitleLabel")}
                        </div>
                        <Input
                          placeholder="e.g. Fetch Active Users"
                          value={snippetName}
                          onChange={(e) => setSnippetName(e.target.value)}
                          className="h-8 text-sm bg-background"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <div className="text-xs text-muted-foreground uppercase font-bold select-none">
                          {t("keyboardTriggerKey")}
                        </div>
                        <Input
                          placeholder="e.g. :active_users"
                          value={snippetTrigger}
                          onChange={(e) => setSnippetTrigger(e.target.value)}
                          className="h-8 text-sm bg-background font-mono text-indigo-500 font-bold"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex flex-col gap-1">
                        <div className="text-xs text-muted-foreground uppercase font-bold select-none">
                          {t("description")}
                        </div>
                        <Input
                          placeholder="Describe query template purpose..."
                          value={snippetDescription}
                          onChange={(e) =>
                            setSnippetDescription(e.target.value)
                          }
                          className="h-8 text-sm bg-background"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <div className="text-xs text-muted-foreground uppercase font-bold select-none">
                          {t("tagsLabel")}
                        </div>
                        <Input
                          placeholder="e.g. users, admin, filter"
                          value={snippetTags}
                          onChange={(e) => setSnippetTags(e.target.value)}
                          className="h-8 text-sm bg-background"
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-end gap-2 mt-1">
                      <button
                        onClick={() => setShowSaveForm(false)}
                        className="h-7 px-3 text-xs font-bold rounded-md hover:bg-muted select-none border transition"
                      >
                        {t("cancel")}
                      </button>
                      <button
                        onClick={handleSaveAsSnippet}
                        className="h-7 px-4 text-xs font-bold rounded-md bg-indigo-500 hover:bg-indigo-600 text-white select-none transition shadow-sm"
                      >
                        {t("saveTemplate")}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}

          {/* Snippet Detail Inspector */}
          {activeTab === "snippets" &&
            (!selectedSnippetItem ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-muted/5">
                <Star className="size-12 text-muted-foreground/10 mb-2" />
                <p className="text-sm font-semibold text-muted-foreground">
                  {t("selectSnippetFromList")}
                </p>
                <p className="text-sm text-muted-foreground/70">
                  {t("clickTemplateToInspect")}
                </p>
              </div>
            ) : (
              <div className="flex-1 flex flex-col p-5 overflow-y-auto gap-4">
                {/* Header bar: Edit, Copy, Restore */}
                <div className="flex items-center justify-between shrink-0">
                  <div className="flex flex-col">
                    <span className="text-xs text-muted-foreground select-none font-mono">
                      {t("savedOn", { defaultValue: "Saved on" })}{" "}
                      {new Date(
                        selectedSnippetItem.createdAt,
                      ).toLocaleDateString()}
                    </span>
                    <h3 className="font-extrabold text-sm select-none truncate max-w-[320px]">
                      {selectedSnippetItem.name}
                    </h3>
                  </div>

                  {/* Right action triggers */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        if (isEditingSnippet) {
                          setIsEditingSnippet(false);
                        } else {
                          startEditSnippet();
                        }
                      }}
                      className={cn(
                        "h-8 px-3 rounded-md border text-sm font-semibold transition select-none",
                        isEditingSnippet
                          ? "bg-indigo-500/10 text-indigo-500 border-indigo-500/30 font-bold"
                          : "hover:bg-muted bg-background",
                      )}
                    >
                      {isEditingSnippet ? t("cancel") : t("editDetails")}
                    </button>
                    <button
                      onClick={() =>
                        handleCopy(
                          selectedSnippetItem.sql,
                          selectedSnippetItem.id,
                        )
                      }
                      className="h-8 px-3 rounded-md border text-sm font-semibold hover:bg-muted bg-background transition flex items-center gap-1.5 select-none"
                    >
                      {copiedId === selectedSnippetItem.id ? (
                        <>
                          <Check className="size-3.5 text-brand" />
                          {t("copied")}
                        </>
                      ) : (
                        <>
                          <Copy className="size-3.5" />
                          {t("copySql")}
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => handleRestore(selectedSnippetItem.sql)}
                      className="h-8 px-3 rounded-md bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-bold transition flex items-center gap-1.5 select-none shadow-sm shadow-indigo-500/20"
                    >
                      <CornerDownLeft className="size-3.5" />
                      {t("restoreIntoEditor")}
                    </button>
                  </div>
                </div>

                {/* Metadata tags grid */}
                <div className="flex items-center gap-3 shrink-0 flex-wrap select-none bg-muted/20 p-3 rounded-xl border border-border/40">
                  {selectedSnippetItem.trigger && (
                    <div className="flex items-center gap-1">
                      <span className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider">
                        {t("autocompleteTrigger")}
                      </span>
                      <code className="text-sm font-extrabold text-indigo-500 dark:text-indigo-400 bg-indigo-500/5 px-2 py-0.5 border border-indigo-500/10 rounded-md font-mono">
                        {selectedSnippetItem.trigger}
                      </code>
                    </div>
                  )}
                  {selectedSnippetItem.tags &&
                  selectedSnippetItem.tags.length > 0 ? (
                    <div className="flex items-center gap-1 ml-auto">
                      <Tag className="size-3 text-muted-foreground shrink-0" />
                      <div className="flex items-center gap-1">
                        {selectedSnippetItem.tags.map((tag) => (
                          <Badge
                            key={tag}
                            variant="secondary"
                            className="text-[8px] py-0 px-1 border border-border/40"
                          >
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground/70 italic select-none ml-auto">
                      {t("noTagsAssigned")}
                    </span>
                  )}
                </div>

                {/* SQL Sandbox Preview container */}
                <div className="flex-1 min-h-0 bg-zinc-950 dark:bg-zinc-950/80 rounded-xl border border-zinc-800/80 overflow-hidden flex flex-col shadow-inner shrink-0 min-h-[180px]">
                  <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800 bg-zinc-900/50">
                    <span className="text-[9px] font-mono text-zinc-400 select-none uppercase tracking-wider font-extrabold">
                      {t("templateSqlCode")}
                    </span>
                  </div>
                  <pre className="flex-1 overflow-auto p-4 font-mono text-sm text-zinc-100 select-all leading-relaxed whitespace-pre-wrap">
                    {selectedSnippetItem.sql}
                  </pre>
                </div>

                {/* Description Card */}
                {selectedSnippetItem.description && (
                  <div className="p-3 rounded-xl border bg-muted/10 shrink-0 select-none">
                    <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider select-none mb-1">
                      {t("snippetDescription")}
                    </p>
                    <p className="text-sm text-foreground/80 leading-relaxed font-semibold">
                      {selectedSnippetItem.description}
                    </p>
                  </div>
                )}

                {/* Inline edit details form */}
                {isEditingSnippet && (
                  <div className="p-4 rounded-xl border border-indigo-500/20 bg-indigo-500/5 flex flex-col gap-3 shrink-0 shadow-sm relative transition-all duration-300">
                    <div className="flex items-center gap-1.5 text-indigo-500">
                      <Sparkles className="size-4 text-indigo-500" />
                      <span className="text-sm font-bold">
                        {t("editSnippetMetadata")}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex flex-col gap-1">
                        <div className="text-xs text-muted-foreground uppercase font-bold select-none">
                          {t("snippetTitleLabel")}
                        </div>
                        <Input
                          placeholder="e.g. Fetch Active Users"
                          value={snippetName}
                          onChange={(e) => setSnippetName(e.target.value)}
                          className="h-8 text-sm bg-background"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <div className="text-xs text-muted-foreground uppercase font-bold select-none">
                          {t("keyboardTriggerKey")}
                        </div>
                        <Input
                          placeholder="e.g. :active_users"
                          value={snippetTrigger}
                          onChange={(e) => setSnippetTrigger(e.target.value)}
                          className="h-8 text-sm bg-background font-mono text-indigo-500 font-bold"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex flex-col gap-1">
                        <div className="text-xs text-muted-foreground uppercase font-bold select-none">
                          {t("description")}
                        </div>
                        <Input
                          placeholder="Describe query template purpose..."
                          value={snippetDescription}
                          onChange={(e) =>
                            setSnippetDescription(e.target.value)
                          }
                          className="h-8 text-sm bg-background"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <div className="text-xs text-muted-foreground uppercase font-bold select-none">
                          {t("tagsLabel")}
                        </div>
                        <Input
                          placeholder="e.g. users, admin, filter"
                          value={snippetTags}
                          onChange={(e) => setSnippetTags(e.target.value)}
                          className="h-8 text-sm bg-background"
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-end gap-2 mt-1">
                      <button
                        onClick={() => setIsEditingSnippet(false)}
                        className="h-7 px-3 text-xs font-bold rounded-md hover:bg-muted select-none border transition"
                      >
                        {t("cancel")}
                      </button>
                      <button
                        onClick={handleUpdateSnippet}
                        className="h-7 px-4 text-xs font-bold rounded-md bg-indigo-500 hover:bg-indigo-600 text-white select-none transition shadow-sm"
                      >
                        {t("saveUpdates")}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
