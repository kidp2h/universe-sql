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
          const exists = connections.some(c => c.name.toLowerCase() === item.name.toLowerCase());
          if (exists) {
            skippedCount++;
            return;
          }

          const newConnection: Connection = {
            ...item,
            id: crypto.randomUUID(), // Generate new ID
            isLoading: false,
            children: [],
          };

          addConnection(newConnection);
          importedCount++;
        });

        if (importedCount > 0) {
          toast?.success(`Successfully imported ${importedCount} connection(s).`);
        } else if (skippedCount > 0) {
          toast?.error(`${skippedCount} connection(s) were skipped (duplicates or invalid).`);
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
