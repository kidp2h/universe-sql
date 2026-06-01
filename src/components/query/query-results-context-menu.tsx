import * as React from "react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuShortcut,
} from "@/components/ui/context-menu";
import { Copy, FileJson } from "lucide-react";
import { Shortcut } from "@/components/ui/kbd";
import { useTranslation } from "react-i18next";

interface QueryResultsContextMenuProps {
  children: React.ReactNode;
  onCopy: () => void;
  onCopyInStatement: () => void;
}

export function QueryResultsContextMenu({
  children,
  onCopy,
  onCopyInStatement,
}: QueryResultsContextMenuProps) {
  const { t } = useTranslation();
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-80">
        <ContextMenuItem onClick={onCopy}>
          <Copy className="mr-2 size-4" />
          <span>{t("copyLabel")}</span>
          <ContextMenuShortcut>
            <Shortcut shortcut="⌘C" />
          </ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuItem onClick={onCopyInStatement}>
          <FileJson className="mr-2 size-4" />
          <span>{t("copyInStatement")}</span>
          <ContextMenuShortcut>
            <Shortcut shortcut="⌘ + ⇧ + I" />
          </ContextMenuShortcut>
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
