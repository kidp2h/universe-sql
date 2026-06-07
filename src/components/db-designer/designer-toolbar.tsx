import { useReactFlow } from "@xyflow/react";
import { useTranslation } from "react-i18next";
import { Maximize, ZoomIn, ZoomOut, Plus, Trash2, Code2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DesignerToolbarProps {
  onAddTable: () => void;
  onClearCanvas: () => void;
  isSqlPanelOpen: boolean;
  onToggleSqlPanel: () => void;
}

export function DesignerToolbar({
  onAddTable,
  onClearCanvas,
  isSqlPanelOpen,
  onToggleSqlPanel,
}: DesignerToolbarProps) {
  const { t } = useTranslation();
  const { zoomIn, zoomOut, fitView } = useReactFlow();

  return (
    <div className="flex items-center gap-1.5 bg-card/90 backdrop-blur-md border border-border/80 p-1.5 rounded-xl shadow-lg select-none">
      <Button
        variant="ghost"
        className="h-8 px-2.5 text-sm font-bold text-muted-foreground hover:text-foreground flex items-center gap-1.5 rounded-lg transition-all bg-brand/5 hover:bg-brand/10 border border-brand/20 text-brand"
        onClick={onAddTable}
      >
        <Plus className="h-3.5 w-3.5 shrink-0" />
        <span>{t("addTable") || "Add Table"}</span>
      </Button>

      <Button
        variant="ghost"
        className="h-8 px-2.5 text-sm font-bold text-muted-foreground hover:text-foreground flex items-center gap-1.5 rounded-lg transition-all"
        onClick={onClearCanvas}
      >
        <Trash2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <span>{t("clearAll") || "Clear All"}</span>
      </Button>

      <div className="w-px bg-border h-5 mx-1" />

      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-lg"
        onClick={() => zoomIn()}
        title={t("erdZoomIn") || "Zoom In"}
      >
        <ZoomIn className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-lg"
        onClick={() => zoomOut()}
        title={t("erdZoomOut") || "Zoom Out"}
      >
        <ZoomOut className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-lg"
        onClick={() => fitView({ duration: 800, padding: 0.2 })}
        title={t("erdFitView") || "Fit View"}
      >
        <Maximize className="h-4 w-4" />
      </Button>

      <div className="w-px bg-border h-5 mx-1" />

      <Button
        variant={isSqlPanelOpen ? "secondary" : "ghost"}
        className="h-8 px-2.5 text-sm font-bold text-muted-foreground hover:text-foreground flex items-center gap-1.5 rounded-lg transition-all"
        onClick={onToggleSqlPanel}
      >
        <Code2 className="h-3.5 w-3.5 shrink-0" />
        <span>{t("generatedSql") || "SQL DDL"}</span>
      </Button>
    </div>
  );
}
