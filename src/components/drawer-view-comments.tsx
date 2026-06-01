"use client";

import * as React from "react";
import { useSidebarStore } from "@/stores/sidebar-store";
import type { TableColumnDetail } from "@/hooks/use-comments-modal";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertCircle,
  BookOpen,
  Check,
  Copy,
  Database,
  FileCode2,
  HelpCircle,
  Info,
  KeyRound,
  Layers,
  Search,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type DrawerViewCommentsProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tableName?: string;
  schemaName?: string;
  comments: TableColumnDetail[];
  loading: boolean;
  error?: string;
  connectionId?: string;
};

export function DrawerViewComments({
  open,
  onOpenChange,
  tableName,
  schemaName,
  comments,
  loading,
  error,
  connectionId,
}: DrawerViewCommentsProps) {
  const connections = useSidebarStore((state) => state.connections);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [copiedKey, setCopiedKey] = React.useState<string | null>(null);

  // Reset search on modal close
  React.useEffect(() => {
    if (!open) {
      setSearchTerm("");
      setCopiedKey(null);
    }
  }, [open]);

  // Resolve connection, table size, and indexes from sidebar store connection metadata
  const metadata = React.useMemo(() => {
    if (!connectionId || !schemaName || !tableName) return null;
    const conn = connections.find((c) => c.id === connectionId);
    if (!conn?.children) return null;

    const schemaNode = conn.children.find(
      (c) => c.id === `${connectionId}:schema:${schemaName}`,
    );
    const tableId = `${connectionId}:schema:${schemaName}:table:${tableName}`;
    const tableNode = schemaNode?.children?.find((t) => t.id === tableId);

    const indexesFolder = tableNode?.children?.find(
      (f) => f.name === "Indexes",
    );
    const indexNames = indexesFolder?.children?.map((idx) => idx.name) || [];

    return {
      size: (tableNode as any)?.size,
      indexes: indexNames,
    };
  }, [connections, connectionId, schemaName, tableName]);

  // Document Score mapping (percentage of columns with comments)
  const docScore = React.useMemo(() => {
    if (comments.length === 0) return 0;
    const documented = comments.filter(
      (c) => c.comment && c.comment.trim().length > 0,
    ).length;
    return {
      documented,
      total: comments.length,
      pct: Math.round((documented / comments.length) * 100),
    };
  }, [comments]);

  // DDL CREATE TABLE syntax generator
  const generatedDDL = React.useMemo(() => {
    if (comments.length === 0) return "";
    const colDefinitions = comments.map((col) => {
      let def = `  "${col.column_name}" ${col.data_type}`;
      if (col.is_nullable === "NO") {
        def += " NOT NULL";
      }
      if (col.column_default) {
        def += ` DEFAULT ${col.column_default}`;
      }
      return def;
    });

    const pkCols = comments
      .filter((c) => c.is_primary)
      .map((c) => `"${c.column_name}"`);
    if (pkCols.length > 0) {
      colDefinitions.push(`  PRIMARY KEY (${pkCols.join(", ")})`);
    }

    return `CREATE TABLE ${schemaName || "public"}.${tableName || "table"} (\n${colDefinitions.join(",\n")}\n);`;
  }, [comments, schemaName, tableName]);

  const handleCopyText = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopiedKey(null), 1800);
  };

  // Filter columns list by search criteria
  const filteredColumns = React.useMemo(() => {
    return comments.filter((c) => {
      const nameMatch = c.column_name
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
      const typeMatch = c.data_type
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
      const commentMatch = c.comment
        ? c.comment.toLowerCase().includes(searchTerm.toLowerCase())
        : false;
      return nameMatch || typeMatch || commentMatch;
    });
  }, [comments, searchTerm]);

  // Local helper for datatype styling
  const getTypeBadgeStyle = (type: string) => {
    const mainType = type.toLowerCase();
    if (
      mainType.includes("int") ||
      mainType.includes("serial") ||
      mainType.includes("numeric")
    ) {
      return "bg-brand/10 text-brand dark:text-brand/80 border-brand/20";
    }
    if (mainType.includes("char") || mainType.includes("text")) {
      return "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20";
    }
    if (mainType.includes("json")) {
      return "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20";
    }
    if (mainType.includes("bool")) {
      return "bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/20";
    }
    if (mainType.includes("time") || mainType.includes("date")) {
      return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
    }
    return "bg-muted text-muted-foreground border-border";
  };

  const formatBytes = (bytes?: number) => {
    if (bytes === undefined) return "Unknown size";
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / k ** i).toFixed(1))} ${sizes[i]}`;
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="app-region-no-drag w-[520px] sm:max-w-[520px] flex flex-col p-6 border-l border-border bg-background/95 backdrop-blur-md overflow-hidden">
        <SheetHeader className="pb-3 border-b select-none">
          <div className="flex items-center gap-1.5">
            <div className="size-6 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500">
              <Database className="size-4" />
            </div>
            <span className="text-xs font-bold font-mono tracking-tight text-indigo-500 uppercase">
              Table Metadata Inspector
            </span>
          </div>
          <SheetTitle className="text-base font-bold truncate tracking-tight mt-1">
            {schemaName}.{tableName}
          </SheetTitle>
          <SheetDescription className="text-sm text-muted-foreground">
            Explore schema schema columns datatypes, nullable constraints, and
            index metadata keys.
          </SheetDescription>
        </SheetHeader>

        {/* LOADING STATE SKELETON */}
        {loading && (
          <div className="flex-1 py-6 space-y-4">
            <div className="h-16 border rounded-2xl bg-muted/10" />
            <div className="space-y-3 pt-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-20 border rounded-xl bg-muted/10 p-3 space-y-2"
                >
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-full" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ERROR STATE */}
        {error && !loading && (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 select-none text-rose-500">
            <AlertCircle className="size-8 animate-bounce mb-2" />
            <p className="text-sm font-semibold">Error Loading Table Details</p>
            <p className="text-xs opacity-70 mt-1">{error}</p>
          </div>
        )}

        {/* SUCCESS INTERACTIVE CONTENT CONTAINER */}
        {!loading && !error && (
          <div className="flex-1 flex flex-col min-h-0 py-4 space-y-4">
            {/* Overview dashboard card */}
            <div className="border rounded-2xl p-3.5 bg-muted/10 grid grid-cols-3 gap-2 text-center text-sm select-none shadow-sm shrink-0">
              <div className="flex flex-col items-center justify-center">
                <span className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider leading-none">
                  Data size
                </span>
                <span className="font-mono font-bold text-foreground mt-1.5 text-sm truncate max-w-[100px]">
                  {metadata ? formatBytes(metadata.size) : "Unknown"}
                </span>
              </div>
              <div className="flex flex-col items-center justify-center border-x px-2">
                <span className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider leading-none">
                  Total Columns
                </span>
                <span className="font-mono font-bold text-foreground mt-1.5 text-sm">
                  {comments.length} fields
                </span>
              </div>
              <div className="flex flex-col items-center justify-center">
                <span className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider leading-none">
                  Documentation
                </span>
                {typeof docScore === "object" ? (
                  <div className="flex flex-col items-center mt-1 w-full">
                    <span
                      className={cn(
                        "font-mono font-extrabold text-[11px]",
                        docScore.pct === 100
                          ? "text-brand"
                          : docScore.pct > 50
                            ? "text-amber-500"
                            : "text-rose-500",
                      )}
                    >
                      {docScore.pct}%
                    </span>
                    <div className="w-12 h-1 bg-muted/40 rounded-full overflow-hidden border mt-1">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-300",
                          docScore.pct === 100
                            ? "bg-brand/60"
                            : docScore.pct > 50
                              ? "bg-amber-500/60"
                              : "bg-rose-500/60",
                        )}
                        style={{ width: `${docScore.pct}%` }}
                      />
                    </div>
                  </div>
                ) : (
                  <span className="font-mono font-bold text-muted-foreground mt-1.5">
                    0%
                  </span>
                )}
              </div>
            </div>

            {/* TAB CONTAINER */}
            <Tabs
              defaultValue="columns"
              className="flex-1 flex flex-col min-h-0"
            >
              <TabsList className="grid grid-cols-3 bg-muted/30 shrink-0 select-none border rounded-xl p-1 gap-1">
                <TabsTrigger
                  value="columns"
                  className="rounded-lg text-xs font-bold tracking-tight uppercase py-1"
                >
                  <BookOpen className="size-3 mr-1" />
                  Columns
                </TabsTrigger>
                <TabsTrigger
                  value="indexes"
                  className="rounded-lg text-xs font-bold tracking-tight uppercase py-1"
                >
                  <Zap className="size-3 mr-1" />
                  Indexes
                </TabsTrigger>
                <TabsTrigger
                  value="ddl"
                  className="rounded-lg text-xs font-bold tracking-tight uppercase py-1"
                >
                  <FileCode2 className="size-3 mr-1" />
                  CREATE DDL
                </TabsTrigger>
              </TabsList>

              {/* TAB 1 CONTENT: COLUMNS SCHEMA LIST */}
              <TabsContent
                value="columns"
                className="flex-1 flex flex-col min-h-0 pt-3.5 space-y-3 outline-none"
              >
                {/* Search input bar */}
                <div className="relative shrink-0 select-none">
                  <Search className="absolute left-3 top-2.5 size-3.5 text-muted-foreground/60" />
                  <Input
                    placeholder="Search columns by name, type or comment..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="h-8 pl-8 font-mono text-[11.5px] bg-background border-border shadow-none focus-visible:ring-1 focus-visible:ring-indigo-500"
                  />
                </div>

                {/* Main scrollable list */}
                <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 scrollbar-thin">
                  {filteredColumns.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-6 text-center text-muted-foreground select-none">
                      <HelpCircle className="size-8 opacity-20 mb-1" />
                      <span className="text-[11px] font-semibold">
                        No columns match criteria
                      </span>
                    </div>
                  ) : (
                    filteredColumns.map((col, idx) => {
                      const isPK = col.is_primary;
                      const hasComment =
                        col.comment && col.comment.trim().length > 0;

                      return (
                        <div
                          key={idx}
                          className="border rounded-xl p-3 bg-muted/5 flex flex-col gap-2 hover:bg-muted/10 transition-colors shadow-sm select-none relative group"
                        >
                          {/* Column details header */}
                          <div className="flex items-center gap-2 justify-between flex-wrap">
                            <div className="flex items-center gap-1.5 min-w-0">
                              {isPK && (
                                <KeyRound className="size-3.5 text-amber-500 shrink-0" />
                              )}
                              <span
                                onClick={() =>
                                  handleCopyText(col.column_name, `col-${idx}`)
                                }
                                className="font-mono text-[12px] font-bold text-foreground truncate hover:text-indigo-500 hover:underline cursor-pointer flex items-center gap-0.5"
                                title="Click to copy column name"
                              >
                                {col.column_name}
                              </span>
                            </div>

                            {/* Typings and null constraints badges */}
                            <div className="flex items-center gap-1 shrink-0 ml-auto">
                              <Badge
                                variant="outline"
                                className={cn(
                                  "text-[9px] py-0 h-4 font-mono font-bold tracking-tight rounded-md px-1 shrink-0 border-transparent",
                                  getTypeBadgeStyle(col.data_type),
                                )}
                              >
                                {col.data_type}
                              </Badge>
                              <Badge
                                variant="outline"
                                className={cn(
                                  "text-[9px] py-0 h-4 font-sans font-bold tracking-tight rounded-md px-1 shrink-0 border-transparent",
                                  col.is_nullable === "NO"
                                    ? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                                    : "bg-muted text-muted-foreground",
                                )}
                              >
                                {col.is_nullable === "NO" ? "NOT NULL" : "NULL"}
                              </Badge>
                            </div>
                          </div>

                          {/* Column description comment block */}
                          {hasComment ? (
                            <p className="text-[11px] font-semibold text-foreground/80 bg-muted/30 border-l-2 border-indigo-500 pl-2.5 py-1 rounded-r-md mt-0.5 whitespace-pre-wrap select-text">
                              {col.comment}
                            </p>
                          ) : (
                            <p className="text-xs italic text-muted-foreground/60 pl-1">
                              No description provided.
                            </p>
                          )}

                          {/* Default value context (if present) */}
                          {col.column_default && (
                            <div className="flex items-center text-[9px] text-muted-foreground font-mono opacity-80 pl-1 mt-0.5 select-all">
                              Default: {col.column_default}
                            </div>
                          )}

                          {/* Card action Copy trigger */}
                          {hasComment && (
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() =>
                                handleCopyText(col.comment || "", `comm-${idx}`)
                              }
                              className="absolute top-2 right-2 size-5 shrink-0 text-muted-foreground/60 hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity rounded-md hover:bg-muted"
                              title="Copy description"
                            >
                              {copiedKey === `comm-${idx}` ? (
                                <Check className="size-3 text-brand/80" />
                              ) : (
                                <Copy className="size-3" />
                              )}
                            </Button>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </TabsContent>

              {/* TAB 2 CONTENT: INDEXES LIST */}
              <TabsContent
                value="indexes"
                className="flex-1 overflow-y-auto pt-3.5 space-y-2.5 pr-1 outline-none scrollbar-thin"
              >
                {!metadata?.indexes || metadata.indexes.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-muted-foreground select-none">
                    <Zap className="size-10 opacity-15 mb-2" />
                    <span className="text-sm font-bold">No indexes found</span>
                    <p className="text-xs opacity-75 mt-0.5">
                      There are no index definitions declared on table "
                      {tableName}".
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="text-xs font-mono font-bold text-muted-foreground uppercase leading-none select-none pl-1 flex items-center gap-1.5 pb-2 border-b border-dashed mb-3">
                      <Layers className="size-3.5 text-indigo-500" />
                      Index Definitions ({metadata.indexes.length})
                    </div>
                    {metadata.indexes.map((idxName, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between border rounded-xl p-3 bg-muted/5 hover:bg-muted/10 transition-colors shadow-sm select-none"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Zap className="size-4 text-amber-500 shrink-0" />
                          <span className="font-mono text-sm font-bold text-foreground truncate">
                            {idxName}
                          </span>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleCopyText(idxName, `idx-${idx}`)}
                          className="size-6 shrink-0 text-muted-foreground/60 hover:text-foreground rounded-md"
                        >
                          {copiedKey === `idx-${idx}` ? (
                            <Check className="size-3.5 text-brand/80" />
                          ) : (
                            <Copy className="size-3.5" />
                          )}
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* TAB 3 CONTENT: CREATE TABLE DDL */}
              <TabsContent
                value="ddl"
                className="flex-1 flex flex-col min-h-0 pt-3.5 space-y-3 outline-none"
              >
                <div className="flex items-center justify-between select-none">
                  <span className="text-xs text-muted-foreground font-mono font-bold uppercase pl-1 flex items-center gap-1.5">
                    <Info className="size-3.5 text-indigo-500" />
                    Generated Schema SQL script
                  </span>
                  <Button
                    onClick={() => handleCopyText(generatedDDL, "ddl")}
                    className="h-7 px-2 font-bold text-xs bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-500 border border-indigo-500/20 shrink-0 gap-1 rounded-md uppercase"
                  >
                    {copiedKey === "ddl" ? (
                      <>
                        <Check className="size-3.5 text-brand/80" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="size-3.5" />
                        Copy DDL
                      </>
                    )}
                  </Button>
                </div>

                <div className="flex-1 border rounded-2xl p-4 bg-zinc-950 text-zinc-100 font-mono text-[11px] leading-relaxed overflow-auto whitespace-pre select-text scrollbar-thin shadow-inner relative max-h-[480px]">
                  {generatedDDL}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
