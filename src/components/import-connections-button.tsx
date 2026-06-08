"use client";

import * as React from "react";
import { Upload } from "lucide-react";
import { useSidebarStore } from "@/stores/sidebar-store";
import type { Connection } from "@/stores/sidebar-store";
import { toast } from "sonner"; // Assuming sonner is used for toasts, if not I should check

export function ImportConnectionsButton() {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const addConnection = useSidebarStore((state) => state.addConnection);
  const connections = useSidebarStore((state) => state.connections);

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const data = JSON.parse(content);

        if (!Array.isArray(data)) {
          throw new Error("Invalid format: Expected an array of connections.");
        }

        let importedCount = 0;
        let skippedCount = 0;

        data.forEach((item: any) => {
          // Basic validation to ensure it looks like a connection
          if (!item.name || !item.host || !item.dbType) {
            return; // Skip invalid
          }

          // Check if connection with same name already exists to avoid duplicates
          const exists = connections.some(
            (c) => c.name.toLowerCase() === item.name.toLowerCase(),
          );
          if (exists) {
            skippedCount++;
            return;
          }

          // Remove queryPaths if any
          const { ...cleanItem } = item;

          const newConnectionId = crypto.randomUUID();
          const newConnection: Connection = {
            ...cleanItem,
            id: newConnectionId, // Generate new ID
            isLoading: !!window.electron?.getFullMetadata,
            children: [],
          };

          addConnection(newConnection);
          importedCount++;

          if (window.electron?.getFullMetadata) {
            window.electron
              .getFullMetadata(newConnection)
              .then((res: any) => {
                if (res.ok && res.metadata) {
                  const schemaNodes = res.metadata.map((s: any) => ({
                    id: `${newConnectionId}:schema:${s.name}`,
                    name: s.name,
                    tableCount: s.tableCount,
                    children: s.tables.map((t: any) => ({
                      id: `${newConnectionId}:schema:${s.name}:table:${t.name}`,
                      name: t.name,
                      size: t.size,
                      children: [
                        {
                          id: `${newConnectionId}:schema:${s.name}:table:${t.name}:columns`,
                          name: "Columns",
                          count: t.columnCount,
                          children: t.columns.map((col: any) => ({
                            id: `${newConnectionId}:schema:${s.name}:table:${t.name}:column:${col.name}`,
                            name: col.name,
                            isPrimary: col.isPrimary,
                            isForeign: col.isForeign,
                            dataType: col.dataType,
                            references: col.references,
                            comment: col.comment || null,
                          })),
                        },
                        {
                          id: `${newConnectionId}:schema:${s.name}:table:${t.name}:indexes`,
                          name: "Indexes",
                          count: t.indexCount,
                          children: t.indexes.map((idxName: any) => ({
                            id: `${newConnectionId}:schema:${s.name}:table:${t.name}:index:${idxName}`,
                            name: idxName,
                          })),
                        },
                      ],
                    })),
                  }));

                  useSidebarStore.getState().updateConnection({
                    ...newConnection,
                    isLoading: false,
                    children:
                      schemaNodes.length > 0
                        ? schemaNodes
                        : [
                            {
                              id: `${newConnectionId}:empty`,
                              name: "No schemas found",
                              disabled: true,
                            },
                          ],
                  });
                } else {
                  useSidebarStore.getState().updateConnection({
                    ...newConnection,
                    isLoading: false,
                    children: [
                      {
                        id: `${newConnectionId}:error`,
                        name: res.message || "Failed to load",
                        disabled: true,
                        className: "text-destructive",
                      },
                    ],
                  });
                }
              })
              .catch((err) => {
                console.error(
                  `Failed to load metadata for connection "${newConnection.name}":`,
                  err,
                );
                useSidebarStore.getState().updateConnection({
                  ...newConnection,
                  isLoading: false,
                  children: [
                    {
                      id: `${newConnectionId}:error`,
                      name: "Failed to load",
                      disabled: true,
                      className: "text-destructive",
                    },
                  ],
                });
              });
          }
        });

        if (importedCount > 0) {
          toast?.success(
            `Successfully imported ${importedCount} connection(s).`,
          );
        } else if (skippedCount > 0) {
          toast?.error(
            `${skippedCount} connection(s) were skipped (duplicates or invalid).`,
          );
        } else {
          toast?.error("No valid connections found in file.");
        }
      } catch (err) {
        console.error("Failed to parse connections file:", err);
        toast?.error("Failed to parse JSON file.");
      }

      // Reset input so the same file can be selected again
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    };
    reader.readAsText(file);
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={handleFileChange}
      />
      <button
        type="button"
        onClick={handleImportClick}
        title="Import Connections"
        className="p-1 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer outline-hidden"
      >
        <Upload className="size-4" />
      </button>
    </>
  );
}
