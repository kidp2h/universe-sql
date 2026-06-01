import { useTranslation } from "react-i18next";
import * as React from "react";
import { MessageSquareText, ArrowLeft } from "lucide-react";
import { CommandGroup, CommandItem } from "@/components/ui/command";
import { AppCommandItem } from "./app-command-item";
import { useGlobalEvents } from "@/hooks/use-global-events";
import { useSidebarStore } from "@/stores/sidebar-store";

interface ViewCommentsCommandGroupProps {
  setOpen: (open: boolean) => void;
  setPage: (page: "root" | "history" | "comments") => void;
}

export function ViewCommentsCommandGroup({
  setOpen,
  setPage,
}: ViewCommentsCommandGroupProps) {
  const { t } = useTranslation();
  const { dispatchViewComments } = useGlobalEvents();
  const connections = useSidebarStore((state) => state.connections);
  const selectedConnectionId = useSidebarStore(
    (state) => state.selectedConnectionId,
  );

  const activeConnection = React.useMemo(() => {
    return connections.find((c) => c.id === selectedConnectionId);
  }, [connections, selectedConnectionId]);

  const allTables = React.useMemo(() => {
    if (!activeConnection?.children) return [];

    const tables: { id: string; name: string; schemaName?: string }[] = [];

    // Helper to traverse and find table nodes
    activeConnection.children.forEach((node) => {
      // Is it a direct table node?
      if (node.id.includes(":table:")) {
        tables.push({ id: node.id, name: node.name });
      }
      // Is it a schema node?
      else if (node.id.includes(":schema:")) {
        const schemaName = node.name;
        node.children?.forEach((subNode) => {
          if (subNode.id.includes(":table:")) {
            tables.push({ id: subNode.id, name: subNode.name, schemaName });
          }
        });
      }
    });

    return tables;
  }, [activeConnection]);

  const headingText = activeConnection
    ? `${t("viewTableComments")} (${activeConnection.name})`
    : t("viewTableComments");

  return (
    <CommandGroup heading={headingText}>
      <CommandItem
        onSelect={() => {
          setPage("root");
        }}
        className="text-muted-foreground hover:text-foreground cursor-pointer"
      >
        <ArrowLeft className="size-4 mr-2" />
        {t("goBack")}
      </CommandItem>

      {!activeConnection ? (
        <div className="py-6 text-center text-sm text-muted-foreground select-none">
          {t("selectConnectionToViewComments")}
        </div>
      ) : allTables.length === 0 ? (
        <div className="py-6 text-center text-sm text-muted-foreground select-none">
          {t("noTablesFoundForConnection")}
        </div>
      ) : (
        allTables.map((table) => {
          const tableName = table.schemaName
            ? `${table.schemaName}.${table.name}`
            : table.name;
          return (
            <AppCommandItem
              key={table.id}
              setOpen={setOpen}
              onSelect={() => {
                dispatchViewComments(
                  activeConnection.id,
                  activeConnection.name,
                  table.schemaName || "public",
                  table.name,
                );
              }}
            >
              <MessageSquareText className="size-4 text-brand mr-2" />
              <span className="flex-1 truncate">
                {t("viewCommentsForTable", { tableName })}
              </span>
            </AppCommandItem>
          );
        })
      )}
    </CommandGroup>
  );
}
