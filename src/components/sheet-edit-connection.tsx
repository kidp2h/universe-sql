import React from "react";
import { logger } from "@/lib/logger";
import { ConnectionForm, ConnectionFormValues } from "./connection-form";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "./ui/sheet";
import { useSidebarStore as useSidebarStoreV2 } from "@/stores/sidebar-store";

export type SheetEditConnectionProps = {
  editingConnection: {
    id: string;
    config: ConnectionFormValues;
  } | null;
  setEditingConnection: React.Dispatch<
    React.SetStateAction<{
      id: string;
      config: ConnectionFormValues;
    } | null>
  >;
};

export function SheetEditConnection({
  editingConnection,
  setEditingConnection,
}: SheetEditConnectionProps) {
  const connections = useSidebarStoreV2((state) => state.connections);

  const updateConnection = useSidebarStoreV2((state) => state.updateConnection);
  const handleUpdateConnection = React.useCallback(
    async (values: ConnectionFormValues) => {
      if (!editingConnection) {
        return { ok: false, message: "No connection selected for editing." };
      }

      const normalizedName = values.name.trim().toLowerCase();
      const hasDuplicate = connections.some(
        (connection) =>
          connection.id !== editingConnection.id &&
          connection.name.trim().toLowerCase() === normalizedName,
      );

      if (hasDuplicate) {
        console.warn(
          `[Connection] Edit connection rejected: Duplicate name "${values.name}"`,
        );
        return { ok: false, message: "Database name already exists." };
      }

      const electron = (
        globalThis as typeof globalThis & { electron?: Window["electron"] }
      ).electron;

      if (!electron?.testConnection) {
        return { ok: false, message: "Test only works in the desktop app." };
      }

      logger.log(
        `[Connection] Testing connection credentials for edited database: "${values.name}"`,
      );
      const result = await electron.testConnection(values);

      if (result.ok) {
        logger.log(
          `[Connection] Test succeeded for edited database "${values.name}". Checking password encryption and updating store...`,
        );
        const connection = connections.find(
          (c) => c.id === editingConnection.id,
        );
        if (connection) {
          let passwordToSave = values.password;
          if (
            !passwordToSave.startsWith("__safe_storage__:") &&
            electron?.encryptPassword
          ) {
            logger.log(
              `[Connection] Password changed. Re-encrypting password for "${values.name}"...`,
            );
            const encryptRes = await electron.encryptPassword(passwordToSave);
            if (encryptRes.ok && encryptRes.encrypted) {
              passwordToSave = encryptRes.encrypted;
            }
          }
          updateConnection({
            ...connection,
            name: values.name,
            dbType: values.dbType,
            host: values.host,
            port: values.port,
            database: values.database,
            username: values.username,
            password: passwordToSave,
            ssl: values.ssl,
            readOnly: values.readOnly,
          });
        }
        setEditingConnection(null);
        return { ok: true, message: "Connection updated." };
      }

      console.error(
        `[Connection] Test connection failed for edited database "${values.name}":`,
        result.message,
      );
      return { ok: false, message: result.message || "Connection failed." };
    },
    [editingConnection, connections, updateConnection],
  );
  return (
    <Sheet
      open={!!editingConnection}
      onOpenChange={(open) => !open && setEditingConnection(null)}
    >
      <SheetContent
        side="right"
        className="app-region-no-drag w-full sm:max-w-xl lg:max-w-2xl"
      >
        <SheetHeader>
          <SheetTitle>Edit Connection</SheetTitle>
          <SheetDescription>
            Update the connection details and test the connection.
          </SheetDescription>
        </SheetHeader>
        <div className="px-4 pb-4">
          {editingConnection && (
            <ConnectionForm
              onSubmit={handleUpdateConnection}
              defaultValues={editingConnection.config}
            />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
