import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";
import * as React from "react";
import { useTranslation } from "react-i18next";

type DrawerViewJsonProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  json: string;
};

function highlightJson(json: string) {
  if (!json) return "";

  // Escape HTML tags to prevent HTML injection/XSS
  const safeJson = json
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Regex to match JSON keys, strings, numbers, booleans, and nulls
  return safeJson.replace(
    /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)/g,
    (match) => {
      let cls = "text-amber-600 dark:text-amber-400"; // Default: numbers
      if (/^"/.test(match)) {
        if (/:$/.test(match)) {
          // JSON Key
          cls = "text-sky-600 dark:text-sky-400 font-semibold";
        } else {
          // JSON String value
          cls = "text-emerald-600 dark:text-emerald-400";
        }
      } else if (/true|false/.test(match)) {
        // Boolean
        cls = "text-purple-600 dark:text-purple-400 font-semibold";
      } else if (/null/.test(match)) {
        // Null
        cls = "text-rose-600 dark:text-rose-400 font-semibold italic";
      }
      return `<span class="${cls}">${match}</span>`;
    },
  );
}

export function DrawerViewJson({
  open,
  onOpenChange,
  json,
}: DrawerViewJsonProps) {
  const { t } = useTranslation();
  const [copied, setCopied] = React.useState(false);

  const handleCopy = React.useCallback(() => {
    void navigator.clipboard.writeText(json);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [json]);

  const highlightedHtml = React.useMemo(() => {
    return highlightJson(json);
  }, [json]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-[90vw] h-[80vh] rounded-xl p-0 flex flex-col gap-0 border overflow-hidden shadow-2xl bg-background">
        <DialogHeader className="px-6 py-4 border-b shrink-0 bg-muted/20 flex flex-row items-center justify-between">
          <DialogTitle className="text-sm font-bold uppercase tracking-wider text-foreground">
            {t("viewJsonTitle") || "View JSON"}
          </DialogTitle>
          <Button
            variant="outline"
            size="sm"
            className="h-7 px-3 text-xs font-bold uppercase gap-1.5 cursor-pointer mr-8"
            onClick={handleCopy}
          >
            {copied ? (
              <>
                <Check className="size-3.5 text-emerald-500" />
                Copied
              </>
            ) : (
              <>
                <Copy className="size-3.5" />
                Copy
              </>
            )}
          </Button>
        </DialogHeader>

        <div className="flex-1 min-h-0 p-6 bg-muted/5 overflow-auto select-text font-mono text-sm leading-relaxed">
          <pre
            className="w-full h-full bg-transparent font-mono text-sm text-foreground overflow-auto select-text whitespace-pre-wrap break-all"
            // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON highlighting is safe as raw strings are escaped
            dangerouslySetInnerHTML={{ __html: highlightedHtml }}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
