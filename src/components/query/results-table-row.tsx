import * as React from "react";
import { Row, flexRender } from "@tanstack/react-table";
import { TableRow, TableCell } from "@/components/ui/table";

interface MemoizedRowProps {
  row: Row<Record<string, unknown>>;
  isSelected: boolean;
  columnVisibility: any;
  finalizedSelectionRef: React.RefObject<Set<string>>;
  onCellMouseDown: (
    e: React.MouseEvent,
    row: number,
    col: number,
    isSelectCol: boolean,
  ) => void;
  onCellMouseEnter: (row: number, col: number, isSelectCol: boolean) => void;
}

export const MemoizedTableRow = React.memo(
  function MemoizedTableRow({
    row,
    finalizedSelectionRef,
    onCellMouseDown,
    onCellMouseEnter,
  }: MemoizedRowProps) {
    return (
      <TableRow
        data-state={row.getIsSelected() && "selected"}
        className="hover:bg-muted/50"
      >
        {row.getVisibleCells().map((cell, cIndex) => {
          const isSelectCol = cell.column.id === "select";
          const isSelected = finalizedSelectionRef.current?.has(
            `${row.index},${cIndex}`,
          );

          const cellValue = cell.getValue();
          const rawValueString =
            cellValue === null || cellValue === undefined
              ? ""
              : typeof cellValue === "object"
                ? JSON.stringify(cellValue)
                : String(cellValue);

          const isJsonString = (() => {
            if (!rawValueString) return false;
            const trimmed = rawValueString.trim();
            if (
              (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
              (trimmed.startsWith("[") && trimmed.endsWith("]"))
            ) {
              try {
                JSON.parse(trimmed);
                return true;
              } catch {
                return false;
              }
            }
            return false;
          })();

          return (
            <TableCell
              key={cell.id}
              style={{ width: cell.column.getSize() }}
              data-row={row.index}
              data-col={cIndex}
              data-type={isSelectCol ? undefined : typeof cell.getValue()}
              data-selected={isSelected ? "true" : undefined}
              data-raw-value={rawValueString}
              className={`data-cell select-none whitespace-nowrap font-mono text-sm max-w-[400px] border-r bg-background data-[selected=true]:bg-brand/20 dark:data-[selected=true]:bg-brand/30 relative group ${isSelectCol ? "w-[40px] min-w-[40px] max-w-[40px] p-0" : "px-4 py-1.5 cursor-cell"}`}
              onContextMenu={(e) => {
                if (isSelectCol) e.stopPropagation();
              }}
              onMouseDown={(e) =>
                onCellMouseDown(e, row.index, cIndex, isSelectCol)
              }
              onMouseEnter={() =>
                onCellMouseEnter(row.index, cIndex, isSelectCol)
              }
            >
              {flexRender(cell.column.columnDef.cell, cell.getContext())}
              {isJsonString && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    window.dispatchEvent(
                      new CustomEvent("usql:view-json", {
                        detail: rawValueString,
                      }),
                    );
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 z-30 bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-[9px] px-1.5 py-0.5 rounded shadow-sm flex items-center gap-1 cursor-pointer select-none transition-all uppercase tracking-wider scale-90 active:scale-85 opacity-0 pointer-events-none group-data-[selected=true]:opacity-100 group-data-[selected=true]:pointer-events-auto"
                >
                  {"{}"} JSON
                </button>
              )}
            </TableCell>
          );
        })}
      </TableRow>
    );
  },
  (prev, next) =>
    prev.row.id === next.row.id &&
    prev.isSelected === next.isSelected &&
    prev.columnVisibility === next.columnVisibility &&
    prev.row.original === next.row.original,
);
