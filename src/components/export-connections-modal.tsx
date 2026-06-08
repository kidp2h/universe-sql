"use client";

import * as React from "react";
import { Download } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useSidebarStore } from "@/stores/sidebar-store";
import { Label } from "@/components/ui/label";

export function ExportConnectionsModal() {
  const connections = useSidebarStore((state) => state.connections);
  const [open, setOpen] = React.useState(false);
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());

  // Reset selection when modal opens
  React.useEffect(() => {
    if (open) {
      setSelectedIds(new Set(connections.map((c) => c.id)));
    }
  }, [open, connections]);

  const handleToggleAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(connections.map((c) => c.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleToggleOne = (id: string, checked: boolean) => {
    const newSet = new Set(selectedIds);
    if (checked) {
      newSet.add(id);
    } else {
      newSet.delete(id);
    }
    setSelectedIds(newSet);
  };

  const handleExport = () => {
    if (selectedIds.size === 0) return;

    const exportData = connections
      .filter((c) => selectedIds.has(c.id))
      .map((c) => {
        // Exclude children, isLoading, and dynamically fetched metadata
        const { children, isLoading, ...safeConnection } = c as any;
        return safeConnection;
      });

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `usql-connections-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setOpen(false);
  };

  const allSelected =
    connections.length > 0 && selectedIds.size === connections.length;
  const someSelected =
    selectedIds.size > 0 && selectedIds.size < connections.length;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          title="Export Connections"
          className="p-1 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer outline-hidden"
        >
          <Download className="size-4" />
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Export Connections</DialogTitle>
          <DialogDescription>
            Select the database connections you want to export to a JSON file.
          </DialogDescription>
        </DialogHeader>

        {connections.length === 0 ? (
          <div className="py-6 text-center text-muted-foreground text-sm">
            No connections to export.
          </div>
        ) : (
          <div className="py-2 flex flex-col gap-3 max-h-[300px] overflow-y-auto pr-2">
            <div className="flex items-center space-x-2 pb-2 border-b">
              <Checkbox
                id="select-all"
                checked={
                  allSelected ? true : someSelected ? "indeterminate" : false
                }
                onCheckedChange={(checked) => handleToggleAll(checked === true)}
              />
              <Label
                htmlFor="select-all"
                className="font-semibold cursor-pointer"
              >
                Select All ({selectedIds.size}/{connections.length})
              </Label>
            </div>

            {connections.map((conn) => (
              <div key={conn.id} className="flex items-center space-x-2">
                <Checkbox
                  id={`export-${conn.id}`}
                  checked={selectedIds.has(conn.id)}
                  onCheckedChange={(checked) =>
                    handleToggleOne(conn.id, checked === true)
                  }
                />
                <Label
                  htmlFor={`export-${conn.id}`}
                  className="flex-1 cursor-pointer truncate"
                >
                  {conn.name}{" "}
                  <span className="text-muted-foreground text-xs font-normal">
                    ({conn.host})
                  </span>
                </Label>
              </div>
            ))}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={selectedIds.size === 0}>
            Export {selectedIds.size > 0 ? `(${selectedIds.size})` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
