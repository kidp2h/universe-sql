"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AlertTriangle, Info } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DMLConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  estimatedRows: number | null;
  sql: string;
  isNoWhereClause?: boolean;
}

export function DMLConfirmationDialog({
  open,
  onOpenChange,
  onConfirm,
  estimatedRows,
  sql,
  isNoWhereClause = false,
}: DMLConfirmationDialogProps) {
  const isDangerous =
    isNoWhereClause || estimatedRows === null || estimatedRows > 100;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            {isDangerous ? (
              <AlertTriangle className="size-6 text-destructive" />
            ) : (
              <Info className="size-6 text-blue-500" />
            )}
            Dangerous Query Warning
          </DialogTitle>
          <DialogDescription className="space-y-4 pt-2">
            <div className="flex flex-col gap-2 p-4 rounded-xl bg-muted/50 border">
              <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Estimated Affected Rows
              </span>
              <div className="flex items-baseline gap-2">
                <span
                  className={
                    isDangerous
                      ? "text-4xl font-bold text-destructive"
                      : "text-4xl font-bold text-foreground"
                  }
                >
                  {estimatedRows?.toLocaleString() ?? "Unknown"}
                </span>
                <span className="text-muted-foreground font-medium">rows</span>
              </div>
            </div>

            {isNoWhereClause && (
              <div className="p-3.5 rounded-xl border border-destructive/20 bg-destructive/5 text-destructive text-sm space-y-1 font-sans">
                <div className="font-bold flex items-center gap-1.5">
                  <AlertTriangle className="size-4 shrink-0" />
                  No WHERE Clause Detected!
                </div>
                <p className="opacity-90 leading-relaxed">
                  This UPDATE or DELETE statement is missing a WHERE clause.
                  Executing this will modify or delete every single row in the
                  target table.
                </p>
              </div>
            )}

            <div className="space-y-2">
              <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Statement
              </span>
              <div className="p-3 rounded-lg bg-black/5 dark:bg-white/5 font-mono text-sm overflow-hidden text-ellipsis line-clamp-3 border break-all">
                {sql}
              </div>
            </div>

            <p className="text-sm text-muted-foreground leading-relaxed">
              This query will modify data in your database. Are you sure you
              want to proceed?
            </p>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="rounded-xl flex-1 sm:flex-none"
          >
            Cancel
          </Button>
          <Button
            onClick={() => {
              onConfirm();
              onOpenChange(false);
            }}
            variant={isDangerous ? "destructive" : "default"}
            className="rounded-xl flex-1 sm:flex-none"
          >
            Execute anyway
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
