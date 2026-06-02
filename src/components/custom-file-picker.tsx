"use client";

import * as React from "react";
import {
  Folder,
  FileText,
  ChevronRight,
  Home,
  ArrowLeft,
  Search,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface CustomFilePickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFileSelect: (filePath: string) => void;
  allowedExtensions?: string[];
}

interface FileItem {
  name: string;
  path: string;
  isDirectory: boolean;
  isFile: boolean;
  size: number;
  mtime: number;
}

export function CustomFilePicker({
  open,
  onOpenChange,
  onFileSelect,
  allowedExtensions = [".sql"],
}: CustomFilePickerProps) {
  const { t } = useTranslation();
  const [currentPath, setCurrentPath] = React.useState<string>("");
  const [items, setItems] = React.useState<FileItem[]>([]);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedPath, setSelectedPath] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  // Load home directory as default starting point
  React.useEffect(() => {
    if (open) {
      window.electron?.getUserHomeDir().then((homeDir) => {
        setCurrentPath(homeDir || "");
      });
    }
  }, [open]);

  // Read directory contents when current path changes
  React.useEffect(() => {
    if (!currentPath) return;

    let active = true;
    const loadDirectory = async () => {
      setLoading(true);
      try {
        const res = await window.electron.readDirectory(currentPath);
        if (active) {
          if (res.ok && res.items) {
            setItems(res.items);
          } else {
            console.error("Failed to read directory:", res.message);
            setItems([]);
          }
        }
      } catch (err) {
        console.error("Directory reading exception:", err);
        if (active) setItems([]);
      } finally {
        if (active) setLoading(false);
      }
    };

    loadDirectory();
    setSelectedPath(null);
    setSearchQuery("");

    return () => {
      active = false;
    };
  }, [currentPath]);

  // Navigate back to the parent folder
  const handleGoBack = React.useCallback(() => {
    const parts = currentPath.split(/[/\\]/);
    if (parts.length > 1) {
      parts.pop();
      // On Windows, if we split "C:\", the last part pop leaves empty or single segment.
      // Make sure we handle drive roots properly.
      const parentPath = parts.join("/") || "/";
      setCurrentPath(parentPath);
    }
  }, [currentPath]);

  const handleItemClick = React.useCallback((item: FileItem) => {
    if (item.isFile) {
      setSelectedPath(item.path);
    }
  }, []);

  const handleItemDoubleClick = React.useCallback(
    (item: FileItem) => {
      if (item.isDirectory) {
        setCurrentPath(item.path);
      } else if (item.isFile) {
        onFileSelect(item.path);
        onOpenChange(false);
      }
    },
    [onFileSelect, onOpenChange],
  );

  const handleOpenSelected = React.useCallback(() => {
    if (selectedPath) {
      onFileSelect(selectedPath);
      onOpenChange(false);
    }
  }, [selectedPath, onFileSelect, onOpenChange]);

  // Filter items according to search text and allowed extensions
  const filteredItems = React.useMemo(() => {
    return items.filter((item) => {
      const matchesSearch = item.name
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      if (item.isDirectory) return matchesSearch;

      const hasAllowedExt = allowedExtensions.some((ext) =>
        item.name.toLowerCase().endsWith(ext.toLowerCase()),
      );
      return matchesSearch && hasAllowedExt;
    });
  }, [items, searchQuery, allowedExtensions]);

  // Split path into clean breadcrumbs
  const breadcrumbs = React.useMemo(() => {
    return currentPath.split(/[/\\]/).filter(Boolean);
  }, [currentPath]);

  const handleBreadcrumbClick = React.useCallback(
    (index: number) => {
      // Re-assemble path up to the clicked breadcrumb
      const parts = currentPath.split(/[/\\]/);
      // Determine if path is Windows style (has drive letter like "D:")
      const isWindows = currentPath.includes(":");
      const count = isWindows ? index + 1 : index + 1;
      const targetPath = parts.slice(0, count).join("/");
      setCurrentPath(targetPath);
    },
    [currentPath],
  );

  const loadHomeDir = React.useCallback(() => {
    window.electron?.getUserHomeDir().then((homeDir) => {
      setCurrentPath(homeDir || "");
    });
  }, []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl h-[500px] flex flex-col p-0 overflow-hidden bg-card border border-border rounded-xl shadow-lg">
        <DialogHeader className="p-4 border-b border-border flex flex-row items-center justify-between space-y-0 shrink-0">
          <DialogTitle className="text-base font-semibold flex items-center gap-2 text-foreground font-sans">
            <Folder className="size-5 text-brand" />{" "}
            {t("customFileExplorerTitle")}
          </DialogTitle>
        </DialogHeader>

        {/* Address Bar, Navigation and Search Controls */}
        <div className="p-3 bg-muted/30 border-b border-border flex items-center gap-2 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleGoBack}
            className="size-8 hover:bg-muted"
            disabled={
              !currentPath || currentPath === "/" || currentPath.endsWith(":\\")
            }
          >
            <ArrowLeft className="size-4" />
          </Button>

          {/* Path Breadcrumbs Viewer */}
          <div className="flex-1 flex items-center gap-1 overflow-x-auto text-xs text-muted-foreground whitespace-nowrap scrollbar-none px-2 bg-background border border-border rounded-md h-8 items-center">
            <button
              onClick={loadHomeDir}
              className="hover:text-foreground shrink-0 focus:outline-hidden"
              type="button"
            >
              <Home className="size-3.5 text-brand/80" />
            </button>
            {breadcrumbs.map((folder, index) => (
              <React.Fragment key={`${folder}-${index}`}>
                <ChevronRight className="size-3 shrink-0 text-muted-foreground/50" />
                <button
                  type="button"
                  className="hover:text-foreground cursor-pointer transition-colors max-w-32 truncate focus:outline-hidden"
                  onClick={() => handleBreadcrumbClick(index)}
                >
                  {folder}
                </button>
              </React.Fragment>
            ))}
          </div>

          <div className="relative w-48 shrink-0">
            <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
            <Input
              placeholder={t("searchFilesPlaceholder")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8 text-xs bg-background border border-border"
            />
          </div>
        </div>

        {/* Files & Folder Listing Panel */}
        <div className="flex-1 overflow-y-auto p-2 min-h-0">
          {loading ? (
            <div className="h-full flex items-center justify-center text-xs text-muted-foreground font-sans">
              {t("loadingFiles")}
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-muted-foreground font-sans">
              {t("emptyDirectory")}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-0.5">
              {filteredItems.map((item) => (
                <button
                  type="button"
                  key={item.path}
                  onClick={() => handleItemClick(item)}
                  onDoubleClick={() => handleItemDoubleClick(item)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer select-none text-sm text-left transition-all duration-100 focus:outline-hidden w-full",
                    selectedPath === item.path
                      ? "bg-brand/10 text-brand border border-brand/20"
                      : "hover:bg-muted/60 text-foreground border border-transparent",
                  )}
                >
                  {item.isDirectory ? (
                    <Folder className="size-4.5 text-yellow-500 fill-yellow-500/10 shrink-0" />
                  ) : (
                    <FileText className="size-4.5 text-blue-500 shrink-0" />
                  )}
                  <span className="truncate flex-1 font-sans font-medium">
                    {item.name}
                  </span>
                  {!item.isDirectory && (
                    <span className="text-xs text-muted-foreground font-mono shrink-0">
                      {(item.size / 1024).toFixed(1)} KB
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Action button controls */}
        <div className="p-3 bg-muted/10 border-t border-border flex justify-end gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="hover:bg-muted"
          >
            {t("cancel")}
          </Button>
          <Button
            size="sm"
            disabled={!selectedPath}
            onClick={handleOpenSelected}
            className="bg-brand hover:bg-brand/90 text-brand-foreground"
          >
            {t("openFileBtn")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
