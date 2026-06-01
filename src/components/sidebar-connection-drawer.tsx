"use client";

import { Plus } from "lucide-react";
import * as React from "react";
import { logger } from "@/lib/logger";
import {
  ConnectionForm,
  type ConnectionFormValues,
} from "@/components/connection-form";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useSidebarStore } from "@/stores/sidebar-store";

type SidebarConnectionDrawerProps = {
  children?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onClose?: () => void;
};

export function SidebarConnectionDrawer({
  children,
  open: openProp,
  onOpenChange: onOpenChangeProp,
}: SidebarConnectionDrawerProps) {
  const addConnection = useSidebarStore((state) => state.addConnection);
  const connections = useSidebarStore((state) => state.connections);
  const [open, setOpen] = React.useState(false);

  const onSubmit = React.useCallback(
    async (values: ConnectionFormValues) => {
      const normalizedName = values.name.trim().toLowerCase();
      const hasDuplicate = connections.some(
        (connection) => connection.name.trim().toLowerCase() === normalizedName,
      );

      if (hasDuplicate) {
        console.warn(
          `[Connection] Add connection rejected: Duplicate name "${values.name}"`,
        );
        return { ok: false, message: "Database name already exists." };
      }

      if (!window.electron?.testConnection) {
        return { ok: false, message: "Test only works in the desktop app." };
      }

      logger.log(
        `[Connection] Testing connection credentials for new database: "${values.name}"`,
      );
      const result = await window.electron.testConnection(values);

      if (result.ok) {
        logger.log(
          `[Connection] Test connection succeeded for "${values.name}". Encrypting password and saving connection to store...`,
        );
        const id = crypto.randomUUID();
        let passwordToSave = values.password;
        if (window.electron?.encryptPassword) {
          const encryptRes = await window.electron.encryptPassword(
            values.password,
          );
          if (encryptRes.ok && encryptRes.encrypted) {
            passwordToSave = encryptRes.encrypted;
          }
        }
        const newConnection = {
          id,
          name: values.name,
          dbType: values.dbType,
          host: values.host,
          port: values.port,
          database: values.database,
          username: values.username,
          password: passwordToSave,
          ssl: values.ssl,
          readOnly: values.readOnly,
          isLoading: true, // Set to true initially
          children: [],
        };
        addConnection(newConnection);
        setOpen(false);

        // Fetch full metadata (schemas, tables, and columns) in the background
        if (window.electron?.getFullMetadata) {
          logger.log(
            `[Connection] Connection "${values.name}" created. Dispatching background full metadata fetch...`,
          );
          window.electron
            .getFullMetadata(newConnection)
            .then((res: any) => {
              if (res.ok && res.metadata) {
                logger.log(
                  `[Connection] Background metadata fetch succeeded for "${values.name}" (${res.metadata.length} schemas)`,
                );
                const schemaNodes = res.metadata.map((s: any) => ({
                  id: `${id}:schema:${s.name}`,
                  name: s.name,
                  tableCount: s.tableCount,
                  children: s.tables.map((t: any) => ({
                    id: `${id}:schema:${s.name}:table:${t.name}`,
                    name: t.name,
                    size: t.size,
                    children: [
                      {
                        id: `${id}:schema:${s.name}:table:${t.name}:columns`,
                        name: "Columns",
                        count: t.columnCount,
                        children: t.columns.map((col: any) => ({
                          id: `${id}:schema:${s.name}:table:${t.name}:column:${col.name}`,
                          name: col.name,
                          isPrimary: col.isPrimary,
                          isForeign: col.isForeign,
                          dataType: col.dataType,
                          references: col.references,
                        })),
                      },
                      {
                        id: `${id}:schema:${s.name}:table:${t.name}:indexes`,
                        name: "Indexes",
                        count: t.indexCount,
                        children: t.indexes.map((idxName: any) => ({
                          id: `${id}:schema:${s.name}:table:${t.name}:index:${idxName}`,
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
                            id: `${id}:empty`,
                            name: "No schemas found",
                            disabled: true,
                          },
                        ],
                });
              } else {
                console.error(
                  `[Connection] Background metadata fetch failed for "${values.name}":`,
                  res.message,
                );
                useSidebarStore.getState().updateConnection({
                  ...newConnection,
                  isLoading: false,
                  children: [
                    {
                      id: `${id}:error`,
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
                `[Connection] Background metadata fetch failed for "${values.name}" with error:`,
                err,
              );
              useSidebarStore.getState().updateConnection({
                ...newConnection,
                isLoading: false,
                children: [
                  {
                    id: `${id}:error`,
                    name: "Failed to load",
                    disabled: true,
                    className: "text-destructive",
                  },
                ],
              });
            });
        }
      } else {
        console.error(
          `[Connection] Test connection failed for "${values.name}":`,
          result.message,
        );
      }

      return { ok: false, message: result.message || "Connection failed." };
    },
    [addConnection, connections],
  );

  const onTest = React.useCallback((values: ConnectionFormValues) => {
    console.info("Connection test", values);
  }, []);

  const isSheetOpen = openProp !== undefined ? openProp : open;
  const handleOpenChange =
    onOpenChangeProp !== undefined ? onOpenChangeProp : setOpen;

  return (
    <Sheet open={isSheetOpen} onOpenChange={handleOpenChange}>
      {children ? (
        <SheetTrigger asChild>{children}</SheetTrigger>
      ) : (
        <SheetTrigger asChild>
          <button
            type="button"
            className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg border bg-brand hover:bg-brand active:bg-brand/80 text-white text-sm font-semibold shadow-sm transition-colors cursor-pointer select-none"
          >
            <Plus className="size-3.5" />
            Add Connection
          </button>
        </SheetTrigger>
      )}
      <SheetContent
        side="right"
        className="app-region-no-drag w-full sm:max-w-xl lg:max-w-2xl"
      >
        <SheetHeader>
          <SheetTitle>New database connection</SheetTitle>
          <SheetDescription>
            Add credentials to connect to your database.
          </SheetDescription>
        </SheetHeader>
        <div className="px-4 pb-4">
          <ConnectionForm onSubmit={onSubmit} onTest={onTest} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
