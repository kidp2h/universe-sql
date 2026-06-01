import { useReactFlow } from "@xyflow/react";
import { useTranslation } from "react-i18next";
import {
  Maximize,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  ListFilter,
  KeyRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface ERDToolbarProps {
  onAutoLayout: () => void;
  onToggleTablesPanel: () => void;
  isTablesPanelOpen: boolean;
  totalTablesCount: number;
  visibleTablesCount: number;
  showOnlyKeys: boolean;
  onToggleOnlyKeys: () => void;
}

export function ERDToolbar({
  onAutoLayout,
  onToggleTablesPanel,
  isTablesPanelOpen,
  totalTablesCount,
  visibleTablesCount,
  showOnlyKeys,
  onToggleOnlyKeys,
}: ERDToolbarProps) {
  const { t } = useTranslation();
  const { zoomIn, zoomOut, fitView } = useReactFlow();

  return (
    <div className="flex items-center gap-1.5 bg-card/90 backdrop-blur-md border border-border/80 p-1.5 rounded-xl shadow-lg select-none">
      <Button
        variant={isTablesPanelOpen ? "secondary" : "ghost"}
        className="h-8 px-2.5 text-sm font-bold text-muted-foreground hover:text-foreground flex items-center gap-1.5 rounded-lg transition-all"
        onClick={onToggleTablesPanel}
        title={t("erdTablesList")}
      >
        <ListFilter className="h-3.5 w-3.5 shrink-0" />
        <span>
          {t("erdTableCount")} ({visibleTablesCount}/{totalTablesCount})
        </span>
      </Button>

      <Button
        variant={showOnlyKeys ? "secondary" : "ghost"}
        className="h-8 px-2.5 text-sm font-bold text-muted-foreground hover:text-foreground flex items-center gap-1.5 rounded-lg transition-all"
        onClick={onToggleOnlyKeys}
        title={t("erdOnlyKeysTooltip")}
      >
        <KeyRound
          className={`h-3.5 w-3.5 shrink-0 ${showOnlyKeys ? "text-yellow-500 animate-pulse" : "text-muted-foreground"}`}
        />
        <span>{t("erdOnlyKeys")}</span>
      </Button>

      <div className="w-px bg-border h-5 mx-1" />

      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-lg"
        onClick={() => zoomIn()}
        title={t("erdZoomIn")}
      >
        <ZoomIn className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-lg"
        onClick={() => zoomOut()}
        title={t("erdZoomOut")}
      >
        <ZoomOut className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-lg"
        onClick={() => fitView({ duration: 800, padding: 0.2 })}
        title={t("erdFitView")}
      >
        <Maximize className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-lg"
        onClick={onAutoLayout}
        title={t("erdAutoLayout")}
      >
        <RotateCcw className="h-4 w-4" />
      </Button>
    </div>
  );
}
