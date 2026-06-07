import CodeMirror from "@uiw/react-codemirror";
import { sql, PostgreSQL } from "@codemirror/lang-sql";
import { linter, Diagnostic } from "@codemirror/lint";
import { createTheme } from "@uiw/codemirror-themes";
import { tags as t } from "@lezer/highlight";
import { Parser } from "node-sql-parser";
import * as React from "react";
import { logger } from "@/lib/logger";
import {
  parseConnectionCmSchema,
  getQueryAtCursorString,
  parseConnectionSchema,
  extractCtes,
  extractAliases,
} from "@/lib/suggestions";
import { EditorView, keymap } from "@codemirror/view";
import { Prec } from "@codemirror/state";
import { setDiagnostics } from "@/lib/decoration";
import {
  autocompletion,
  completeFromList,
  CompletionContext,
} from "@codemirror/autocomplete";
import { useQuerySnippetsStore } from "@/stores/query-snippets-store";
import { renderToStaticMarkup } from "react-dom/server";
import { Copy, Check, Type, Package, LayoutGrid, Table2 } from "lucide-react";
// Pre-render lucide icons to HTML strings (module-level, runs once)
const _copyIconHtml = renderToStaticMarkup(
  React.createElement(Copy, { size: 12, strokeWidth: 2 }),
);
const _checkIconHtml = renderToStaticMarkup(
  React.createElement(Check, { size: 12, strokeWidth: 2.5 }),
);
const keywordSvg = renderToStaticMarkup(
  React.createElement(Type, { size: 13, strokeWidth: 2 }),
);
const functionSvg = renderToStaticMarkup(
  React.createElement(Package, { size: 13, strokeWidth: 2 }),
);
const tableSvg = renderToStaticMarkup(
  React.createElement(LayoutGrid, { size: 13, strokeWidth: 2 }),
);
const columnSvg = renderToStaticMarkup(
  React.createElement(Table2, { size: 13, strokeWidth: 2 }),
);
const parser = new Parser();
function iconSvg(type: string): string {
  const icons: Record<string, string> = {
    keyword: keywordSvg,
    function: functionSvg,
    type: tableSvg,
    property: columnSvg,
    constant: functionSvg, // CTE uses function icon (purple)
    variable: columnSvg,  // alias uses column icon
  };
  return icons[type] ?? functionSvg;
}
const iconColors = {
  keyword: {
    bg: "var(--completion-keyword-bg)",
    fg: "var(--completion-keyword-fg)",
    border: "var(--completion-keyword-border)",
  },
  function: {
    bg: "var(--completion-function-bg)",
    fg: "var(--completion-function-fg)",
    border: "var(--completion-function-border)",
  },
  type: {
    bg: "var(--completion-type-bg)",
    fg: "var(--completion-type-fg)",
    border: "var(--completion-type-border)",
  },
  property: {
    bg: "var(--completion-property-bg)",
    fg: "var(--completion-property-fg)",
    border: "var(--completion-property-border)",
  },
  // CTE completions — use function (purple) color scheme
  constant: {
    bg: "var(--completion-function-bg)",
    fg: "var(--completion-function-fg)",
    border: "var(--completion-function-border)",
  },
  // Alias completions — use property (green) color scheme
  variable: {
    bg: "var(--completion-property-bg)",
    fg: "var(--completion-property-fg)",
    border: "var(--completion-property-border)",
  },
};
function formatParserError(e: any, sql: string): string {
  if (!e) return "Syntax error";
  if (e.message?.includes("end of input found")) {
    return "Incomplete query: expected table name, identifier, or keyword at the end of statement.";
  }
  if (e.location?.start) {
    const offset = e.location.start.offset;
    const rest = sql.slice(offset);
    const wordMatch = rest.match(/^(\w+)/);
    if (wordMatch) {
      return `Syntax error: unexpected "${wordMatch[1]}" found.`;
    }
  }
  if (e.found) {
    return `Syntax error: unexpected "${e.found}" found.`;
  }
  return e.message || "Syntax error";
}
const sqlLinter = linter(
  (view) => {
    const fullText = view.state.doc.toString();
    const query = fullText.trim();
    if (!query) {
      view.dispatch({ effects: setDiagnostics.of([]) });
      return [];
    }
    // Skip parser for large files/queries to prevent blocking the main thread while typing
    if (query.length > 20000) {
      view.dispatch({ effects: setDiagnostics.of([]) });
      return [];
    }
    try {
      parser.astify(query, { database: "PostgreSQL" });
      view.dispatch({ effects: setDiagnostics.of([]) });
      return [];
    } catch (e: any) {
      const docLength = view.state.doc.length;
      const from = e.location?.start?.offset ?? 0;
      const to = e.location?.end?.offset ?? docLength;
      const safeFrom = Math.max(0, Math.min(from, docLength));
      const safeTo = Math.max(0, Math.min(to, docLength));
      const finalFrom = safeFrom;
      const finalTo =
        safeFrom === safeTo && safeTo < docLength ? safeTo + 1 : safeTo;
      const diagnostics: Diagnostic[] = [
        {
          from: finalFrom,
          to: finalTo,
          severity: "error",
          message: formatParserError(e, fullText),
        },
      ];
      view.dispatch({ effects: setDiagnostics.of(diagnostics) });
      return diagnostics;
    }
  },
  { delay: 2000 },
);
// ── Badge labels per completion type ─────────────────────────────────────────
const TYPE_BADGE_LABEL: Record<string, string> = {
  keyword: "kw",
  function: "fn",
  type: "tbl",
  property: "col",
  variable: "alias",
  constant: "cte",
  class: "tbl",
  module: "cte",
};
const autocompleteTheme = autocompletion({
  defaultKeymap: true,
  addToOptions: [
    // ── Icon wrap (position 0 = leftmost) ─────────────────────────────────
    {
      render(completion) {
        const wrap = document.createElement("span");
        wrap.className = "cm-completion-icon-wrap";
        const type = completion.type ?? "";
        const colors = iconColors[type as keyof typeof iconColors] ?? {
          bg: "var(--muted)",
          fg: "var(--muted-foreground)",
          border: "var(--border)",
        };
        wrap.style.backgroundColor = colors.bg;
        wrap.style.border = `1px solid ${colors.border}`;
        wrap.innerHTML = iconSvg(type);
        const svg = wrap.querySelector("svg");
        if (svg) {
          svg.style.color = colors.fg;
          svg.style.stroke = colors.fg;
          svg.style.opacity = "1";
        }
        return wrap;
      },
      position: 0,
    },
    // ── Type badge (position 150 = right side, before detail) ────────────
    {
      render(completion) {
        const type = completion.type ?? "";
        const badgeLabel = TYPE_BADGE_LABEL[type] ?? type.slice(0, 3);
        if (!badgeLabel) return document.createElement("span");
        const colors = iconColors[type as keyof typeof iconColors] ?? {
          bg: "var(--muted)",
          fg: "var(--muted-foreground)",
          border: "var(--border)",
        };
        const badge = document.createElement("span");
        badge.className = "cm-completion-type-badge";
        badge.textContent = badgeLabel;
        badge.style.backgroundColor = colors.bg;
        badge.style.color = colors.fg;
        badge.style.border = `1px solid ${colors.border}`;
        return badge;
      },
      position: 150,
    },
  ],
});
// Dynamic CodeMirror theme bound to application CSS variables (shadcn light preset)
export const editorThemeLight = createTheme({
  theme: "light",
  settings: {
    background: "var(--editor-background)",
    foreground: "var(--editor-foreground)",
    caret: "var(--editor-caret)",
    selection: "var(--editor-selection)",
    selectionMatch: "var(--editor-selection-match)",
    lineHighlight: "var(--editor-line-highlight)",
    gutterBackground: "var(--editor-gutter-background)",
    gutterForeground: "var(--editor-gutter-foreground)",
  },
  styles: [
    { tag: t.keyword, color: "var(--editor-keyword)", fontWeight: "bold" },
    { tag: t.string, color: "var(--editor-string)" },
    { tag: t.number, color: "var(--editor-number)" },
    { tag: t.bool, color: "var(--editor-keyword)", fontWeight: "bold" },
    { tag: t.null, color: "var(--editor-keyword)", fontWeight: "bold" },
    { tag: t.comment, color: "var(--editor-comment)", fontStyle: "italic" },
    { tag: t.operator, color: "var(--editor-operator)" },
    { tag: t.punctuation, color: "var(--editor-operator)" },
    { tag: t.bracket, color: "var(--editor-foreground)" },
    { tag: t.variableName, color: "var(--editor-foreground)" },
    { tag: t.propertyName, color: "var(--editor-property)" },
    { tag: t.typeName, color: "var(--editor-type)" },
    { tag: t.className, color: "var(--editor-type)" },
    { tag: t.function(t.variableName), color: "var(--editor-function)" },
  ],
});
// Dynamic CodeMirror theme bound to application CSS variables (shadcn dark preset)
export const editorThemeDark = createTheme({
  theme: "dark",
  settings: {
    background: "var(--editor-background)",
    foreground: "var(--editor-foreground)",
    caret: "var(--editor-caret)",
    selection: "var(--editor-selection)",
    selectionMatch: "var(--editor-selection-match)",
    lineHighlight: "var(--editor-line-highlight)",
    gutterBackground: "var(--editor-gutter-background)",
    gutterForeground: "var(--editor-gutter-foreground)",
  },
  styles: [
    { tag: t.keyword, color: "var(--editor-keyword)", fontWeight: "bold" },
    { tag: t.string, color: "var(--editor-string)" },
    { tag: t.number, color: "var(--editor-number)" },
    { tag: t.bool, color: "var(--editor-keyword)", fontWeight: "bold" },
    { tag: t.null, color: "var(--editor-keyword)", fontWeight: "bold" },
    { tag: t.comment, color: "var(--editor-comment)", fontStyle: "italic" },
    { tag: t.operator, color: "var(--editor-operator)" },
    { tag: t.punctuation, color: "var(--editor-operator)" },
    { tag: t.bracket, color: "var(--editor-foreground)" },
    { tag: t.variableName, color: "var(--editor-foreground)" },
    { tag: t.propertyName, color: "var(--editor-property)" },
    { tag: t.typeName, color: "var(--editor-type)" },
    { tag: t.className, color: "var(--editor-type)" },
    { tag: t.function(t.variableName), color: "var(--editor-function)" },
  ],
});
export const fontTheme = EditorView.theme({
  ".cm-scroller": { overflow: "auto" },
  ".cm-content, .cm-gutter": {
    fontFamily:
      'var(--editor-font-family, "CascadiaCode Nerd Font", "Cascadia Code", monospace)',
    fontSize: "var(--editor-font-size, 14px)",
    minHeight: "100%",
  },
  ".cm-line": {
    whiteSpace: "pre", // giữ dòng không wrap
  },
  // selection
  "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection":
  {
    backgroundColor: "var(--editor-selection) !important",
  },
  // active line highlight
  ".cm-activeLine": {
    backgroundColor: "var(--editor-line-highlight) !important",
  },
  ".cm-activeLineGutter": {
    backgroundColor: "var(--editor-line-highlight) !important",
    color: "var(--editor-gutter-active-foreground) !important",
  },
  // borders
  ".cm-gutters": {
    borderRight: "1px solid var(--editor-border)",
  },
  // cursor
  ".cm-cursor, .cm-dropCursor": {
    borderLeftColor: "var(--editor-caret) !important",
  },
  // matching bracket
  ".cm-matchingBracket": {
    backgroundColor: "var(--editor-matching-bracket) !important",
  },
  // Base tooltip styling (overrides default CodeMirror gray borders & squares)
  ".cm-tooltip": {
    border: "1px solid var(--completion-border) !important",
    borderRadius: "var(--radius) !important",
    boxShadow: "var(--completion-shadow) !important",
    backgroundColor: "var(--completion-bg) !important",
    backdropFilter: "var(--completion-blur) !important",
    webkitBackdropFilter: "var(--completion-blur) !important",
    // NOTE: do NOT set overflow:hidden here — it clips the cm-completionInfo info panel
  },
  // suggestion box
  ".cm-tooltip.cm-tooltip-autocomplete": {
    padding: "6px 6px 0 6px",
    minWidth: "340px",
    fontFamily:
      'var(--editor-font-family, "CascadiaCode Nerd Font", "Cascadia Code", monospace) !important',
  },
  ".cm-tooltip-autocomplete > ul": {
    fontFamily:
      'var(--editor-font-family, "CascadiaCode Nerd Font", "Cascadia Code", monospace) !important',
    fontSize: "calc(var(--editor-font-size, 14px) - 1px)",
    maxHeight: "360px",
    padding: "0",
    margin: "0",
    listStyle: "none",
    overflowY: "auto",
    overflowX: "hidden",
    scrollbarWidth: "none",
  },
  // Completion info (preview) panel
  ".cm-completionInfo": {
    fontFamily:
      'var(--editor-font-family, "CascadiaCode Nerd Font", "Cascadia Code", monospace) !important',
    backgroundColor: "var(--completion-bg) !important",
    border: "1px solid var(--completion-border) !important",
    borderRadius: "var(--radius) !important",
    boxShadow: "var(--completion-shadow) !important",
    padding: "10px 14px !important",
    maxWidth: "280px !important",
    fontSize: "12px !important",
  },
  ".cm-tooltip-autocomplete > ul > li": {
    position: "relative",
    display: "flex",
    alignItems: "center",
    padding: "0",
    borderRadius: "6px",
    margin: "2px 0",
    color: "var(--popover-foreground)",
    overflow: "hidden",
    cursor: "pointer",
    minHeight: "34px",
    borderLeft: "3px solid transparent",
    transition: "all 0.15s ease",
  },
  ".cm-tooltip-autocomplete > ul > li[aria-selected]": {
    backgroundColor: "var(--completion-selected-bg) !important",
    color: "var(--completion-selected-fg) !important",
    borderLeft: "3px solid var(--completion-selected-border) !important",
    boxShadow: "inset 0 0 0 1px var(--completion-selected-inset) !important",
  },
  // ẩn icon mặc định
  ".cm-completionIcon": { display: "none" },
  // icon wrap sát lề trái
  ".cm-completion-icon-wrap": {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "26px",
    minWidth: "26px",
    height: "26px",
    alignSelf: "center",
    flexShrink: "0",
    marginLeft: "4px",
    borderRadius: "6px",
    boxSizing: "border-box",
  },
  ".cm-completionLabel": {
    flex: "1",
    padding: "0 8px 0 10px",
    fontWeight: "500",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  // Type badge (col / tbl / fn / kw)
  ".cm-completion-type-badge": {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "1px 5px",
    borderRadius: "4px",
    fontSize: "10px",
    fontWeight: "700",
    letterSpacing: "0.03em",
    flexShrink: "0",
    marginRight: "6px",
    lineHeight: "1.4",
    textTransform: "lowercase",
    border: "1px solid transparent",
    userSelect: "none",
    fontFamily: "ui-monospace, monospace",
  },
  // Hide old detail text (now replaced by badge)
  ".cm-completionDetail": {
    display: "none",
  },
  ".cm-completionMatchedText": {
    textDecoration: "none",
    color: "var(--completion-matched-color) !important",
    fontWeight: "800",
  },
  // Footer showing count + keyboard hints
  ".cm-completion-footer": {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "5px 8px",
    marginTop: "4px",
    borderTop: "1px solid var(--completion-border)",
    fontSize: "10px",
    color: "var(--muted-foreground)",
    userSelect: "none",
    gap: "8px",
    flexShrink: "0",
  },
  ".cm-completion-footer-count": {
    fontWeight: "600",
    color: "var(--completion-matched-color)",
    fontFamily: "ui-monospace, monospace",
    fontSize: "10px",
  },
  ".cm-completion-footer-hints": {
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },
  ".cm-completion-footer-key": {
    display: "inline-flex",
    alignItems: "center",
    padding: "1px 4px",
    borderRadius: "3px",
    border: "1px solid var(--completion-border)",
    backgroundColor: "var(--muted)",
    color: "var(--muted-foreground)",
    fontSize: "9px",
    fontFamily: "ui-monospace, monospace",
    lineHeight: "1.4",
  },
  // Lint tooltips (Hover error popover)
  ".cm-tooltip-lint": {
    padding: "8px 12px !important",
    minWidth: "280px !important",
  },
  ".cm-diagnostic": {
    display: "flex !important",
    alignItems: "flex-start !important",
    gap: "8px !important",
    padding: "2px 0 !important",
    borderBottom: "none !important",
    fontFamily: "var(--font-sans), system-ui, sans-serif !important",
    fontSize: "12px !important",
    color: "var(--popover-foreground) !important",
  },
  ".cm-diagnostic-error": {
    borderLeft: "3px solid var(--destructive) !important",
    paddingLeft: "8px !important",
  },
  ".cm-diagnosticText": {
    color: "var(--popover-foreground) !important",
    lineHeight: "1.5 !important",
    fontWeight: "500 !important",
  },
  ".cm-diagnosticAction": {
    backgroundColor: "var(--accent) !important",
    color: "var(--accent-foreground) !important",
    border: "none !important",
    borderRadius: "4px !important",
    padding: "2px 6px !important",
    fontSize: "10px !important",
    cursor: "pointer !important",
    marginLeft: "8px !important",
    fontWeight: "bold !important",
    textTransform: "uppercase !important",
  },
});
export const SqlEditor = React.memo(
  function SqlEditor({
    value,
    onChange,
    theme,
    getSelectedTextRef,
    activeTabId,
    connection,
  }: {
    value: string;
    onChange: (val: string) => void;
    theme: string;
    getSelectedTextRef: any;
    activeTabId?: string;
    connection?: any;
  }) {
    logger.log(
      `[SqlEditor] Rendered: value length = ${value?.length ?? 0}, activeTabId = ${activeTabId}`,
    );
    const snippets = useQuerySnippetsStore((state) => state.snippets);
    const schema = React.useMemo(() => {
      logger.log(
        `[SqlEditor] Recalculating schema useMemo (connection: ${connection?.name || "none"})`,
      );
      return parseConnectionCmSchema(connection);
    }, [connection]);
    // Pre-compute column metadata map: tableName.lc → colName.lc → colMeta
    // Built ONCE when connection changes — O(1) lookup vs O(n) scan in info panel
    // Handles both tree structures:
    //   App Sidebar:    connection → [schema]  → [table] → Columns
    //   Explorer Panel: connection → [db]       → [schema] → [table] → Columns
    const colMetaMap = React.useMemo(() => {
      const map = new Map<string, Map<string, any>>();
      const indexTable = (tbl: any) => {
        const colsNode = (tbl.children ?? []).find(
          (c: any) => c.name === "Columns",
        );
        if (!colsNode) return;
        const colMap = new Map<string, any>();
        for (const col of colsNode.children ?? []) {
          colMap.set((col.name as string).toLowerCase(), col);
        }
        map.set((tbl.name as string).toLowerCase(), colMap);
      };
      for (const level1 of connection?.children ?? []) {
        for (const level2 of level1?.children ?? []) {
          // level2 is a table (flat/App Sidebar): has a "Columns" child
          if ((level2?.children ?? []).some((c: any) => c.name === "Columns")) {
            indexTable(level2);
          } else {
            // level2 is a schema (nested/Explorer Panel): go one level deeper
            for (const level3 of level2?.children ?? []) {
              if (
                (level3?.children ?? []).some((c: any) => c.name === "Columns")
              ) {
                indexTable(level3);
              }
            }
          }
        }
      }
      logger.log(
        `[SqlEditor] colMetaMap rebuilt: ${map.size} tables indexed`,
      );
      return map;
    }, [connection]);
    const editorRef = React.useRef<EditorView | null>(null);
    const onChangeRef = React.useRef(onChange);
    React.useEffect(() => {
      logger.log(
        "[SqlEditor] Syncing onChange callback ref (due to onChange prop update)",
      );
      onChangeRef.current = onChange;
    }, [onChange]);
    const timeoutRef = React.useRef<any>(null);
    const flushChanges = React.useCallback(() => {
      if (timeoutRef.current) {
        logger.log(
          "[SqlEditor] flushChanges: Flushing pending keystrokes to store immediately",
        );
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
        if (editorRef.current) {
          onChangeRef.current(editorRef.current.state.doc.toString());
        }
      }
    }, []);
    const handleEditorChange = React.useCallback((val: string) => {
      logger.log(
        `[SqlEditor] handleEditorChange: Keystroke detected (val length = ${val.length}). Debouncing store update.`,
      );
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        logger.log(
          "[SqlEditor] Debounce timeout fired: Updating global store state.",
        );
        onChangeRef.current(val);
        timeoutRef.current = null;
      }, 150); // 150ms debounce batches rapid keystrokes to make editor ultra-responsive
    }, []);
    // Clean up timer on unmount and flush changes immediately
    React.useEffect(() => {
      return () => {
        logger.log(
          "[SqlEditor] Unmounting: Cleaning up debounce timer and flushing pending changes",
        );
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          if (editorRef.current) {
            onChangeRef.current(editorRef.current.state.doc.toString());
          }
        }
      };
    }, []);
    React.useEffect(() => {
      if (activeTabId && editorRef.current) {
        logger.log(
          `[SqlEditor] activeTabId changed/focused: Focusing editor instance (activeTabId = ${activeTabId})`,
        );
        editorRef.current.focus();
      }
    }, [activeTabId]);
    React.useEffect(() => {
      const handleHighlightText = (event: Event) => {
        const detail = (event as CustomEvent<{ text: string; tabId: string }>)
          .detail;
        if (!detail || !editorRef.current) return;
        // Match active tab
        if (detail.tabId !== activeTabId) return;
        const view = editorRef.current;
        const docText = view.state.doc.toString();
        const searchStr = detail.text;
        if (!searchStr || !searchStr.trim()) return;
        // Try exact match
        let index = docText.indexOf(searchStr);
        // Try case-insensitive exact match
        if (index === -1) {
          index = docText.toLowerCase().indexOf(searchStr.toLowerCase());
        }
        // Try matching first 10-15 characters if it is a long expression
        if (index === -1 && searchStr.length > 15) {
          const sample = searchStr.substring(0, 15);
          index = docText.toLowerCase().indexOf(sample.toLowerCase());
        }
        if (index !== -1) {
          const len = searchStr.length;
          view.dispatch({
            selection: { anchor: index, head: index + len },
            scrollIntoView: true,
          });
          view.focus();
        }
      };
      globalThis.addEventListener(
        "usql:highlight-editor-text",
        handleHighlightText,
      );
      return () => {
        globalThis.removeEventListener(
          "usql:highlight-editor-text",
          handleHighlightText,
        );
      };
    }, [activeTabId]);
    React.useEffect(() => {
      if (getSelectedTextRef && activeTabId) {
        getSelectedTextRef.current = () => {
          const view = editorRef.current;
          if (!view) return null;
          const state = view.state;
          const { from, to } = state.selection.main;
          // If text is selected, return the selected text
          if (from !== to) {
            const text = state.sliceDoc(from, to);
            return {
              text,
              range: { from, to },
            };
          }
          // If no text is selected, find the query closest to the cursor
          const fullText = state.doc.toString();
          const result = getQueryAtCursorString(fullText, from);
          if (result) {
            return {
              text: result.text,
              range: result.range,
            };
          }
          return null;
        };
      }
      return () => {
        if (getSelectedTextRef && activeTabId) {
          getSelectedTextRef.current = null;
        }
      };
    }, [getSelectedTextRef, activeTabId]);
    // ── Helper: build preview DOM for info panel ──────────────────────────────
    const buildInfoPanel = React.useCallback(
      (
        colName: string,
        tableName: string,
        type: "column" | "table",
      ): HTMLElement => {
        const el = document.createElement("div");
        el.style.cssText =
          "line-height:1.6;font-size:12px;color:var(--popover-foreground)";
        if (type === "column") {
          // O(1) lookup via pre-computed map
          const colMeta =
            colMetaMap
              .get(tableName.toLowerCase())
              ?.get(colName.toLowerCase()) ?? null;
          const header = document.createElement("div");
          header.style.cssText =
            "font-weight:700;font-size:13px;margin-bottom:6px;color:var(--completion-property-fg)";
          header.textContent = colName;
          el.appendChild(header);
          // comment (from pg_description) — shown first, prominently
          const comment: string | null = colMeta?.comment ?? null;
          if (comment) {
            const commentWrap = document.createElement("div");
            commentWrap.style.cssText =
              "display:flex;align-items:flex-start;gap:5px;margin-bottom:8px;";
            const commentEl = document.createElement("div");
            commentEl.style.cssText =
              "flex:1;color:var(--muted-foreground);font-size:11.5px;line-height:1.5;" +
              "border-left:2px solid var(--completion-property-border);padding-left:7px;font-style:italic;";
            commentEl.textContent = comment;
            // Copy button
            const copyBtn = document.createElement("button");
            copyBtn.title = "Copy comment";
            copyBtn.style.cssText =
              "flex-shrink:0;display:flex;align-items:center;justify-content:center;" +
              "width:18px;height:18px;margin-top:1px;border:none;border-radius:3px;cursor:pointer;" +
              "background:transparent;color:var(--muted-foreground);padding:0;transition:color 0.15s,background 0.15s;";
            const clipSvg = _copyIconHtml;
            const checkSvg = _checkIconHtml;
            copyBtn.innerHTML = clipSvg;
            copyBtn.addEventListener("mouseenter", () => {
              copyBtn.style.background = "var(--muted)";
              copyBtn.style.color = "var(--foreground)";
            });
            copyBtn.addEventListener("mouseleave", () => {
              copyBtn.style.background = "transparent";
              copyBtn.style.color = "var(--muted-foreground)";
            });
            copyBtn.addEventListener("click", (e) => {
              e.stopPropagation();
              navigator.clipboard.writeText(comment).then(() => {
                copyBtn.innerHTML = checkSvg;
                copyBtn.style.color = "var(--completion-property-fg)";
                setTimeout(() => {
                  copyBtn.innerHTML = clipSvg;
                  copyBtn.style.color = "var(--muted-foreground)";
                }, 1500);
              });
            });
            commentWrap.appendChild(commentEl);
            commentWrap.appendChild(copyBtn);
            el.appendChild(commentWrap);
          }
          const makeRow = (label: string, valueEl: HTMLElement) => {
            const row = document.createElement("div");
            row.style.cssText = "display:flex;gap:6px;align-items:center;margin-bottom:3px;";
            const lbl = document.createElement("span");
            lbl.style.cssText = "color:var(--muted-foreground);min-width:56px;font-size:11px;";
            lbl.textContent = label;
            row.appendChild(lbl);
            row.appendChild(valueEl);
            return row;
          };
          const code = (text: string, color: string) => {
            const c = document.createElement("code");
            c.style.cssText = `background:var(--muted);padding:1px 5px;border-radius:3px;font-size:11px;color:${color};`;
            c.textContent = text;
            return c;
          };
          // table
          el.appendChild(makeRow("table", code(tableName, "var(--completion-type-fg)")));
          if (colMeta) {
            // dataType (node stores as .dataType from tree)
            const dt: string | undefined = colMeta.dataType ?? colMeta.data_type ?? colMeta.type;
            if (dt) el.appendChild(makeRow("type", code(dt.toUpperCase(), "var(--editor-keyword)")));
            // isPrimary / isForeign badges
            if (colMeta.isPrimary || colMeta.isForeign) {
              const badgeWrap = document.createElement("div");
              badgeWrap.style.cssText = "display:flex;gap:4px;align-items:center;margin-bottom:3px;";
              const padLbl = document.createElement("span");
              padLbl.style.cssText = "min-width:56px;";
              badgeWrap.appendChild(padLbl);
              if (colMeta.isPrimary) {
                const b = document.createElement("span");
                b.style.cssText = "font-size:10px;background:var(--completion-function-bg);color:var(--completion-function-fg);border:1px solid var(--completion-function-border);border-radius:3px;padding:1px 5px;font-weight:700;";
                b.textContent = "PK";
                badgeWrap.appendChild(b);
              }
              if (colMeta.isForeign) {
                const b = document.createElement("span");
                b.style.cssText = "font-size:10px;background:var(--completion-type-bg);color:var(--completion-type-fg);border:1px solid var(--completion-type-border);border-radius:3px;padding:1px 5px;font-weight:700;";
                b.textContent = "FK";
                badgeWrap.appendChild(b);
              }
              el.appendChild(badgeWrap);
            }
            // references
            if (colMeta.references) {
              const refCode = document.createElement("code");
              refCode.style.cssText = "background:var(--muted);padding:1px 5px;border-radius:3px;font-size:11px;color:var(--muted-foreground);max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;display:inline-block;";
              refCode.textContent = `→ ${colMeta.references}`;
              el.appendChild(makeRow("ref", refCode));
            }
          }
        } else {
          // Table preview
          const cols = schema
            ? (schema[tableName] ??
              schema[
              Object.keys(schema).find(
                (k) => k.toLowerCase() === tableName.toLowerCase(),
              ) ?? ""
              ] ??
              [])
            : [];
          const header = document.createElement("div");
          header.style.cssText =
            "font-weight:700;font-size:13px;margin-bottom:6px;color:var(--completion-type-fg)";
          header.textContent = tableName;
          el.appendChild(header);
          const countRow = document.createElement("div");
          countRow.style.cssText = "color:var(--muted-foreground);margin-bottom:6px;font-size:11px;";
          countRow.textContent = `${cols.length} column${cols.length !== 1 ? "s" : ""}`;
          el.appendChild(countRow);
          if (cols.length > 0) {
            const preview = cols.slice(0, 8);
            const list = document.createElement("div");
            list.style.cssText = "display:flex;flex-direction:column;gap:2px;";
            for (const col of preview) {
              const item = document.createElement("code");
              item.style.cssText =
                "font-size:11px;background:var(--muted);padding:1px 5px;border-radius:3px;color:var(--completion-property-fg);display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;";
              item.textContent = col;
              list.appendChild(item);
            }
            el.appendChild(list);
            if (cols.length > 8) {
              const more = document.createElement("div");
              more.style.cssText = "color:var(--muted-foreground);font-size:10px;margin-top:4px;";
              more.textContent = `+${cols.length - 8} more…`;
              el.appendChild(more);
            }
          }
        }
        return el;
      },
      [colMetaMap, schema],
    );
    const extensions = React.useMemo(() => {
      logger.log(
        "[SqlEditor] Rebuilding CodeMirror extensions array (due to schema, flushChanges, or snippets updates)",
      );
      const snippetsCompletions = snippets.map((s) => ({
        label: s.trigger || s.name,
        type: "function", // Styled as function (violet badge)
        detail: `[Snippet] ${s.name}`,
        info: s.sql, // Shows full SQL preview in autocomplete side-panel
        apply: s.sql, // Inserts the full SQL template on select
      }));
      return [
        Prec.highest(
          keymap.of([
            {
              key: "Mod-Enter",
              run() {
                flushChanges();
                globalThis.dispatchEvent(
                  new CustomEvent("usql:command", {
                    detail: { type: "execute" },
                  }),
                );
                return true;
              },
            },
            {
              key: "Mod-Shift-Enter",
              run() {
                flushChanges();
                globalThis.dispatchEvent(
                  new CustomEvent("usql:command", {
                    detail: { type: "explain" },
                  }),
                );
                return true;
              },
            },
            {
              key: "Mod-s",
              run() {
                flushChanges();
                globalThis.dispatchEvent(
                  new CustomEvent("usql:command", { detail: { type: "save" } }),
                );
                return true;
              },
            },
            {
              key: "Mod-Shift-s",
              run() {
                flushChanges();
                globalThis.dispatchEvent(
                  new CustomEvent("usql:command", {
                    detail: { type: "save-as" },
                  }),
                );
                return true;
              },
            },
            {
              key: "Mod-l",
              run() {
                flushChanges();
                globalThis.dispatchEvent(
                  new CustomEvent("usql:command", {
                    detail: { type: "format" },
                  }),
                );
                return true;
              },
            },
          ]),
        ),
        sql({ dialect: PostgreSQL, schema: {} }),
        // Register custom snippets completions in PostgreSQL language facet
        PostgreSQL.language.data.of({
          autocomplete: completeFromList(snippetsCompletions),
        }),
        // Suggest columns and tables restricted to query scope, supporting dot-notation
        PostgreSQL.language.data.of({
          autocomplete: (context: CompletionContext) => {
            const doc = context.state.doc.toString();
            const pos = context.pos;
            const currentQuery = getQueryAtCursorString(doc, pos);
            if (!currentQuery) return null;
            const queryText = currentQuery.text;
            const queryStart = currentQuery.range.from;
            // cursor offset relative to the start of the current query
            const relPos = Math.max(0, pos - queryStart);
            const tablesList = parseConnectionSchema(connection);
            const ctes = extractCtes(queryText, tablesList);
            // ── Extract aliases from FULL query (not just text before cursor) ──
            // This is the core fix: even if FROM comes after the cursor (SELECT | FROM t),
            // we still want to know about t so we can suggest its columns.
            const aliases = extractAliases(queryText, ctes);
            // ── Determine which SQL clause the cursor is currently in ──────────
            const textBeforeCursor = queryText.slice(0, relPos);
            const upperBefore = textBeforeCursor.toUpperCase();
            // Keywords that indicate "we are in a column context"
            const COLUMN_KWS = [
              "SELECT",
              "WHERE",
              "HAVING",
              "SET",
              "RETURNING",
              "AND",
              "OR",
              "NOT",
              "ON",
              "WHEN",
              "THEN",
              "ELSE",
            ];
            // Keywords that indicate "we are in a table context"
            const TABLE_KWS = [
              "FROM",
              "JOIN",
              "INNER JOIN",
              "LEFT JOIN",
              "RIGHT JOIN",
              "FULL OUTER JOIN",
              "CROSS JOIN",
              "UPDATE",
              "INTO",
            ];
            // Find the last occurrence of any keyword before cursor
            let lastKwPos = -1;
            let lastKwType: "column" | "table" | null = null;
            for (const kw of COLUMN_KWS) {
              const re = new RegExp(`\\b${kw.replace(/\s+/, "\\s+")}\\b`, "g");
              let m;
              while ((m = re.exec(upperBefore)) !== null) {
                if (m.index > lastKwPos) {
                  lastKwPos = m.index;
                  lastKwType = "column";
                }
              }
            }
            for (const kw of TABLE_KWS) {
              const re = new RegExp(`\\b${kw.replace(/\s+/, "\\s+")}\\b`, "g");
              let m;
              while ((m = re.exec(upperBefore)) !== null) {
                if (m.index > lastKwPos) {
                  lastKwPos = m.index;
                  lastKwType = "table";
                }
              }
            }
            // ORDER BY / GROUP BY → column context
            const orderGroupMatch = upperBefore.match(
              /\b(ORDER|GROUP)\s+BY\s+[\w\s,]*$/,
            );
            if (orderGroupMatch) lastKwType = "column";
            // ── 1. Dot notation: alias.col or table.col ──────────────────────
            const dotBefore = context.matchBefore(/\w*\.\w*/);
            if (dotBefore) {
              const matchStr = dotBefore.text;
              const parts = matchStr.split(".");
              if (parts.length === 2) {
                const aliasOrTableName = parts[0].toLowerCase();
                const colPrefix = parts[1] || "";
                const fromPos = dotBefore.from + parts[0].length + 1;
                const realTableName =
                  aliases[aliasOrTableName] || aliasOrTableName;
                // Check CTE first
                const cte = ctes.find((c) => c.name === realTableName);
                if (cte) {
                  const options = cte.columns
                    .filter((col) =>
                      col.toLowerCase().startsWith(colPrefix.toLowerCase()),
                    )
                    .map((col) => ({
                      label: col,
                      type: "property",
                      detail: `column of CTE ${realTableName}`,
                      info: () => buildInfoPanel(col, realTableName, "column"),
                    }));
                  return { from: fromPos, options };
                }
                // Check real table
                if (schema) {
                  const actualKey = Object.keys(schema).find(
                    (k) => k.toLowerCase() === realTableName,
                  );
                  if (actualKey) {
                    const tableCols = schema[actualKey];
                    const options = tableCols
                      .filter((col) =>
                        col.toLowerCase().startsWith(colPrefix.toLowerCase()),
                      )
                      .map((col) => ({
                        label: col,
                        type: "property",
                        detail: `column of ${actualKey}`,
                        info: () => buildInfoPanel(col, actualKey, "column"),
                      }));
                    return { from: fromPos, options };
                  }
                }
              }
              return null;
            }
            // ── 2. Bare word completion ───────────────────────────────────────
            const word = context.matchBefore(/\w*/);
            if (!word) return null;
            if (word.from === word.to && !context.explicit) return null;
            const options: any[] = [];
            const seen = new Set<string>();
            if (lastKwType === "column") {
              // ── Column context: suggest columns from all referenced tables ──
              // Collect all referenced tables (via aliases map)
              const referencedTables = new Set<string>();
              const referencedCtes = new Set<string>();
              for (const tableName of Object.values(aliases)) {
                const lowerTbl = tableName.toLowerCase();
                const isCte = ctes.some((c) => c.name === lowerTbl);
                if (isCte) {
                  referencedCtes.add(lowerTbl);
                } else {
                  referencedTables.add(lowerTbl);
                }
              }
              // CTE columns
              for (const cteName of referencedCtes) {
                const cte = ctes.find((c) => c.name === cteName);
                if (cte) {
                  for (const col of cte.columns) {
                    const key = `cte:${cteName}:${col}`;
                    if (!seen.has(key)) {
                      seen.add(key);
                      const _cteName = cteName;
                      const _col = col;
                      options.push({
                        label: col,
                        type: "property",
                        detail: `column of CTE ${cteName}`,
                        boost: 10,
                        info: () => buildInfoPanel(_col, _cteName, "column"),
                      });
                    }
                  }
                }
              }
              // Real table columns
              for (const [tableName, cols] of Object.entries(schema || {})) {
                if (referencedTables.has(tableName.toLowerCase())) {
                  for (const col of cols) {
                    const key = `tbl:${tableName.toLowerCase()}:${col}`;
                    if (!seen.has(key)) {
                      seen.add(key);
                      const _tblName = tableName;
                      const _col = col;
                      options.push({
                        label: col,
                        type: "property",
                        detail: `column of ${tableName}`,
                        boost: 10,
                        info: () => buildInfoPanel(_col, _tblName, "column"),
                      });
                    }
                  }
                }
              }
              // Also suggest table/alias names themselves (for t.col disambiguation)
              for (const [alias, tableName] of Object.entries(aliases)) {
                if (!seen.has(`alias:${alias}`)) {
                  seen.add(`alias:${alias}`);
                  options.push({
                    label: alias,
                    type: "type",
                    detail:
                      alias !== tableName ? `alias → ${tableName}` : "table",
                    boost: 5,
                  });
                }
              }
            } else if (lastKwType === "table") {
              // ── Table context: suggest table names and CTE names ──
              if (schema) {
                for (const tableName of Object.keys(schema)) {
                  const _tblName = tableName;
                  options.push({
                    label: tableName,
                    type: "type",
                    detail: "table",
                    info: () => buildInfoPanel(_tblName, _tblName, "table"),
                  });
                }
              }
              for (const cte of ctes) {
                options.push({ label: cte.name, type: "constant", detail: "CTE" });
              }
            } else {
              // ── Fallback: suggest tables + columns from referenced tables ──
              if (schema) {
                for (const tableName of Object.keys(schema)) {
                  const _tblName = tableName;
                  options.push({
                    label: tableName,
                    type: "type",
                    detail: "table",
                    info: () => buildInfoPanel(_tblName, _tblName, "table"),
                  });
                }
              }
              for (const cte of ctes) {
                options.push({ label: cte.name, type: "constant", detail: "CTE" });
              }
            }
            return { from: word.from, options };
          },
        }),
        autocompleteTheme,
        // ── Footer injection: count results + keyboard hints ──────────────
        EditorView.updateListener.of((update) => {
          // Find the autocomplete tooltip DOM
          const tooltip = update.view.dom.ownerDocument.querySelector(
            ".cm-tooltip-autocomplete",
          ) as HTMLElement | null;
          if (!tooltip) return;
          const list = tooltip.querySelector("ul");
          if (!list) return;
          const items = list.querySelectorAll("li");
          const total = items.length;
          if (total === 0) return;
          // Find selected index
          let selectedIdx = 0;
          items.forEach((item, i) => {
            if (item.getAttribute("aria-selected")) selectedIdx = i + 1;
          });
          // Create or update footer
          let footer = tooltip.querySelector(
            ".cm-completion-footer",
          ) as HTMLElement | null;
          if (!footer) {
            footer = document.createElement("div");
            footer.className = "cm-completion-footer";
            const countSpan = document.createElement("span");
            countSpan.className = "cm-completion-footer-count";
            footer.appendChild(countSpan);
            const hints = document.createElement("span");
            hints.className = "cm-completion-footer-hints";
            const makeKey = (text: string) => {
              const k = document.createElement("span");
              k.className = "cm-completion-footer-key";
              k.textContent = text;
              return k;
            };
            const makeText = (text: string) => {
              const s = document.createElement("span");
              s.textContent = text;
              return s;
            };
            hints.appendChild(makeKey("↑↓"));
            hints.appendChild(makeText(" move "));
            hints.appendChild(makeKey("Tab"));
            hints.appendChild(makeText(" select "));
            hints.appendChild(makeKey("Esc"));
            hints.appendChild(makeText(" close"));
            footer.appendChild(hints);
            tooltip.appendChild(footer);
          }
          const countEl = footer.querySelector(
            ".cm-completion-footer-count",
          ) as HTMLElement;
          if (countEl)
            countEl.textContent = `${selectedIdx || 1} / ${total}`;
        }),
        sqlLinter,
        fontTheme,
      ];
    }, [schema, flushChanges, snippets, connection, buildInfoPanel]);
    return (
      <CodeMirror
        className="overflow-scroll h-full"
        value={value}
        theme={theme === "light" ? editorThemeLight : editorThemeDark}
        height="100%"
        onChange={handleEditorChange}
        onBlur={flushChanges}
        onCreateEditor={(view) => {
          editorRef.current = view;
          // Focus immediately on editor creation / new query
          setTimeout(() => view.focus(), 10);
        }}
        extensions={extensions}
      />
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.value === nextProps.value &&
      prevProps.theme === nextProps.theme &&
      prevProps.activeTabId === nextProps.activeTabId &&
      prevProps.connection === nextProps.connection
    );
  },
);
