import { Table } from "@tanstack/react-table";
import * as React from "react";

export function useTableResize(table: Table<any>) {
  const getResizeHandlerProps = React.useCallback(
    (columnId: string) => {
      const header = table
        .getFlatHeaders()
        .find((h) => h.column.id === columnId);
      if (!header || !header.column.getCanResize()) {
        return {};
      }

      return {
        onMouseDown: header.getResizeHandler(),
        onTouchStart: header.getResizeHandler(),
        "data-resizing": header.column.getIsResizing() ? "true" : undefined,
      };
    },
    [table],
  );

  const resetColumnSize = React.useCallback(
    (columnId: string) => {
      table.getColumn(columnId)?.resetSize();
    },
    [table],
  );

  return {
    getResizeHandlerProps,
    resetColumnSize,
  };
}
