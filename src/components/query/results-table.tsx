import * as React from "react";
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  useReactTable,
  ColumnDef,
  RowSelectionState,
  SortingState,
  ColumnFiltersState,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  EyeOff,
  RotateCcw,
  Filter,
  X,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
} from "lucide-react";
import { Popover, PopoverTrigger } from "@/components/ui/popover";
import { MemoizedTableRow } from "./results-table-row";
import { ColumnFilterPopover } from "./column-filter-popover";
import { cn } from "@/lib/utils";
import { useTableResize } from "@/hooks/use-table-resize";

interface ResultsTableProps extends React.HTMLAttributes<HTMLDivElement> {
  data: Record<string, unknown>[];
  columns: ColumnDef<Record<string, unknown>>[];
  sorting: SortingState;
  onSortingChange: React.Dispatch<React.SetStateAction<SortingState>>;
  onSelectionChange: (count: number) => void;
  getSelectedRowsRef: React.MutableRefObject<() => Record<string, unknown>[]>;
  tableContainerRef: React.RefObject<HTMLDivElement | null>;
  finalizedSelectionRef: React.RefObject<Set<string>>;
  onCellMouseDown: (
    e: React.MouseEvent,
    row: number,
    col: number,
    isSelectCol: boolean,
  ) => void;
  onCellMouseEnter: (row: number, col: number, isSelectCol: boolean) => void;
  onCopy: () => void;
  onCopyInStatement: () => void;
  isPopulating?: boolean;
}

interface TableBodyContentProps {
  table: any;
  isPopulating?: boolean;
  columnVisibility: any;
  finalizedSelectionRef: React.RefObject<Set<string>>;
  onCellMouseDown: (
    e: React.MouseEvent,
    row: number,
    col: number,
    isSelectCol: boolean,
  ) => void;
  onCellMouseEnter: (row: number, col: number, isSelectCol: boolean) => void;
  pageIndex: number;
  pageSize: number;
  rowSelection: any;
  sorting: any;
  columnFilters: any;
  columnSizing: any;
  data: any[];
}

const TableBodyContent = React.memo(
  function TableBodyContent({
    table,
    isPopulating,
    columnVisibility,
    finalizedSelectionRef,
    onCellMouseDown,
    onCellMouseEnter,
    data,
    pageIndex,
    pageSize,
  }: TableBodyContentProps) {
    // We use getSortedRowModel() to get the rows after filtering and sorting, but BEFORE pagination
    const sortedFilteredRows = table.getSortedRowModel().rows;
    const start = pageIndex * pageSize;
    const end = start + pageSize;
    const rows = sortedFilteredRows.slice(start, end);
    console.log(rows, data);
    return (
      <TableBody>
        {rows?.length ? (
          rows.map((row: any) => (
            <MemoizedTableRow
              key={row.id}
              row={row}
              isSelected={row.getIsSelected()}
              columnVisibility={columnVisibility}
              finalizedSelectionRef={finalizedSelectionRef}
              onCellMouseDown={onCellMouseDown}
              onCellMouseEnter={onCellMouseEnter}
            />
          ))
        ) : isPopulating ? (
          <TableRow>
            <TableCell
              colSpan={table.getVisibleLeafColumns().length}
              className="h-24 text-center"
            >
              <div className="flex items-center justify-center gap-2 text-muted-foreground text-sm select-none">
                <Loader2 className="size-4 animate-spin" />
                <span>Loading rows...</span>
              </div>
            </TableCell>
          </TableRow>
        ) : (
          <TableRow>
            <TableCell
              colSpan={table.getVisibleLeafColumns().length}
              className="h-24 text-center"
            >
              No results.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    );
  },
  (prev, next) => {
    return (
      prev.pageIndex === next.pageIndex &&
      prev.pageSize === next.pageSize &&
      prev.rowSelection === next.rowSelection &&
      prev.sorting === next.sorting &&
      prev.columnFilters === next.columnFilters &&
      prev.columnSizing === next.columnSizing &&
      prev.isPopulating === next.isPopulating &&
      prev.columnVisibility === next.columnVisibility &&
      prev.finalizedSelectionRef === next.finalizedSelectionRef &&
      prev.onCellMouseDown === next.onCellMouseDown &&
      prev.onCellMouseEnter === next.onCellMouseEnter &&
      prev.data === next.data
    );
  },
);

export const ResultsTable = React.memo(function ResultsTable({
  data,
  columns,
  sorting,
  isPopulating,
  onSortingChange,
  onSelectionChange,
  getSelectedRowsRef,
  tableContainerRef,
  finalizedSelectionRef,
  onCellMouseDown,
  onCellMouseEnter,
  onCopy,
  onCopyInStatement,
  className,
  ...props
}: ResultsTableProps) {
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({});
  const [columnVisibility, setColumnVisibility] = React.useState({});
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  );
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 100,
  });

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange,
    onRowSelectionChange: setRowSelection,
    onColumnVisibilityChange: setColumnVisibility,
    onColumnFiltersChange: setColumnFilters,
    onPaginationChange: setPagination,
    getFilteredRowModel: getFilteredRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    filterFns: {
      arrIncludes: (row, columnId, filterValue: string[]) => {
        const val = row.getValue(columnId);
        const strVal =
          val === null || val === undefined ? "(Blanks)" : String(val);
        return filterValue.includes(strVal);
      },
    },
    defaultColumn: {
      filterFn: "arrIncludes",
    },
    enableRowSelection: true,
    columnResizeMode: "onEnd",
    enableColumnResizing: true,
    state: {
      sorting,
      rowSelection,
      columnVisibility,
      columnFilters,
      pagination,
    },
    autoResetPageIndex: false,
    initialState: { pagination: { pageSize: 100 } },
  });

  const { getResizeHandlerProps } = useTableResize(table);

  const resizingColumnId = table.getState().columnSizingInfo.isResizingColumn;
  const resizingHeader = resizingColumnId
    ? table.getFlatHeaders().find((h) => h.column.id === resizingColumnId)
    : null;
  const leftOffset = resizingHeader
    ? resizingHeader.column.getStart() +
      resizingHeader.column.getSize() +
      (table.getState().columnSizingInfo.deltaOffset ?? 0)
    : 0;

  React.useEffect(() => {
    onSelectionChange(Object.keys(rowSelection).length);
  }, [rowSelection, onSelectionChange]);

  React.useEffect(() => {
    getSelectedRowsRef.current = () =>
      table.getSelectedRowModel().rows.map((r) => r.original);
  });

  return (
    <div
      className={cn("flex flex-col h-full min-h-0 overflow-hidden", className)}
      {...props}
    >
      {/* Table Header/Pagination */}
      <div className="flex items-center justify-between border-b px-4 py-1 text-sm bg-muted/30 shrink-0 min-h-[34px]">
        <div className="flex items-center gap-2">
          {!table.getIsAllColumnsVisible() && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20 gap-1 font-bold uppercase tracking-tighter"
              onClick={() => table.resetColumnVisibility()}
            >
              <RotateCcw className="size-3" />
              Reset Columns
            </Button>
          )}
          {columnFilters.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-900/20 gap-1 font-bold uppercase tracking-tighter"
              onClick={() => table.resetColumnFilters()}
            >
              <X className="size-3" />
              Clear Filters
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground font-medium">
            Page {table.getState().pagination.pageIndex + 1} of{" "}
            {table.getPageCount() || 1}
          </span>
          <div className="flex gap-1 ml-2">
            <Button
              variant="outline"
              size="icon"
              className="h-6 w-6"
              onClick={() => {
                table.previousPage();
              }}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronLeft className="size-3" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-6 w-6"
              onClick={() => {
                table.nextPage();
              }}
              disabled={!table.getCanNextPage()}
            >
              <ChevronRight className="size-3" />
            </Button>
          </div>
        </div>
      </div>

      <div
        className="flex-1 overflow-auto relative focus:outline-none"
        ref={tableContainerRef}
        tabIndex={-1}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "c") {
            e.preventDefault();
            onCopy();
          }
          if (
            (e.metaKey || e.ctrlKey) &&
            e.shiftKey &&
            e.key.toLowerCase() === "i"
          ) {
            e.preventDefault();
            onCopyInStatement();
          }
        }}
      >
        <Table
          className="border-collapse border-spacing-0 table-fixed"
          style={{ width: table.getCenterTotalSize() }}
        >
          <TableHeader
            className="sticky top-0 bg-background z-10 shadow-sm"
            onContextMenu={(e) => e.stopPropagation()}
          >
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header, _index) => (
                  <TableHead
                    key={header.id}
                    style={{ width: header.getSize() }}
                    className={`group whitespace-nowrap py-2 font-semibold select-none sticky top-0 z-20 bg-background border-b border-r relative ${header.id === "select" ? "w-[40px] min-w-[40px] max-w-[40px] px-0" : "px-4"}`}
                  >
                    {header.isPlaceholder ? null : header.id === "select" ? (
                      <div className="flex items-center justify-center w-full">
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center w-full group/header">
                        <div className="flex items-center min-w-0 shrink">
                          <span className="truncate">
                            {flexRender(
                              header.column.columnDef.header,
                              header.getContext(),
                            )}
                          </span>
                        </div>
                        <div
                          className={cn(
                            "flex items-center gap-0.5 ml-1 opacity-0 group-hover/header:opacity-100 transition-opacity shrink-0",
                            (header.column.getFilterValue() ||
                              header.column.getIsSorted()) &&
                              "opacity-100",
                          )}
                        >
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className={`h-5 w-5 text-muted-foreground hover:text-foreground shrink-0 ${header.column.getFilterValue() ? "text-blue-500 opacity-100" : ""}`}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Filter className="size-3" />
                              </Button>
                            </PopoverTrigger>
                            <ColumnFilterPopover
                              column={header.column}
                              filterValue={
                                (header.column.getFilterValue() as string[]) ??
                                []
                              }
                            />
                          </Popover>
                          {header.column.getCanSort() && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className={`h-5 w-5 hover:text-foreground transition-opacity shrink-0 ${header.column.getIsSorted() ? "opacity-100 text-foreground" : "text-muted-foreground/50"}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                const handler =
                                  header.column.getToggleSortingHandler();
                                if (handler) handler(e);
                              }}
                            >
                              {header.column.getIsSorted() === "asc" ? (
                                <ArrowUp className="size-3.5" />
                              ) : header.column.getIsSorted() === "desc" ? (
                                <ArrowDown className="size-3.5" />
                              ) : (
                                <ArrowUpDown className="size-3.5" />
                              )}
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 transition-opacity text-muted-foreground hover:text-foreground shrink-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              header.column.toggleVisibility(false);
                            }}
                            title="Hide column"
                          >
                            <EyeOff className="size-3" />
                          </Button>
                        </div>
                      </div>
                    )}
                    {header.column.getCanResize() && header.id !== "select" && (
                      <div
                        onDoubleClick={() => header.column.resetSize()}
                        {...getResizeHandlerProps(header.column.id)}
                        className={cn(
                          "absolute right-0 top-0 h-full w-1 cursor-col-resize select-none touch-none hover:bg-brand bg-border/40 group-hover:bg-muted-foreground/30 z-30 transition-colors",
                          header.column.getIsResizing() && "bg-brand w-1.5",
                        )}
                      />
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBodyContent
            table={table}
            pageIndex={pagination.pageIndex}
            pageSize={pagination.pageSize}
            rowSelection={rowSelection}
            sorting={sorting}
            columnFilters={columnFilters}
            columnSizing={table.getState().columnSizing}
            isPopulating={isPopulating}
            columnVisibility={columnVisibility}
            finalizedSelectionRef={finalizedSelectionRef}
            onCellMouseDown={onCellMouseDown}
            onCellMouseEnter={onCellMouseEnter}
            data={data}
          />
        </Table>
        {resizingHeader && (
          <div
            style={{
              transform: `translate3d(${leftOffset}px, 0, 0)`,
              willChange: "transform",
            }}
            className="absolute left-0 top-0 bottom-0 w-0.5 bg-brand z-30 pointer-events-none shadow-sm"
          />
        )}
      </div>
    </div>
  );
});
