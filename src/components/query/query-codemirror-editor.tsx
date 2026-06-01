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
} from "@/lib/suggestions";

import { EditorView, keymap } from "@codemirror/view";
import { Prec } from "@codemirror/state";
import { setDiagnostics } from "@/lib/decoration";
import { autocompletion, completeFromList } from "@codemirror/autocomplete";
import { useQuerySnippetsStore } from "@/stores/query-snippets-store";
const keywordSvg =
  '<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 7 4 4 20 4 20 7"></polyline><line x1="9" y1="20" x2="15" y2="20"></line><line x1="12" y1="4" x2="12" y2="20"></line></svg>';
const functionSvg =
  '<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>';
const tableSvg =
  '<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3H5a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2z"></path><path d="M19 3h-4a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2z"></path><path d="M9 13H5a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2v-4a2 2 0 0 0-2-2z"></path><path d="M19 13h-4a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2v-4a2 2 0 0 0-2-2z"></path></svg>';
const columnSvg =
  '<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"></rect><path d="M9 3v18"></path><path d="M15 3v18"></path></svg>';

const parser = new Parser();
function iconSvg(type: string): string {
  const icons: Record<string, string> = {
    keyword: keywordSvg,
    function: functionSvg,
    type: tableSvg,
    property: columnSvg,
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

const autocompleteTheme = autocompletion({
  addToOptions: [
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
      position: 0, // trước label
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
    fontSize: "14px",
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
    overflow: "hidden !important",
  },

  // suggestion box
  ".cm-tooltip.cm-tooltip-autocomplete": {
    padding: "6px",
    minWidth: "320px",
    fontFamily:
      'var(--editor-font-family, "CascadiaCode Nerd Font", "Cascadia Code", monospace) !important',
  },
  ".cm-tooltip-autocomplete > ul": {
    fontFamily:
      'var(--editor-font-family, "CascadiaCode Nerd Font", "Cascadia Code", monospace) !important',
    fontSize: "13px",
    maxHeight: "400px",
    padding: "0",
    margin: "0",
    listStyle: "none",
  },
  ".cm-completionInfo": {
    fontFamily:
      'var(--editor-font-family, "CascadiaCode Nerd Font", "Cascadia Code", monospace) !important',
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
    padding: "0 10px 0 10px",
    fontWeight: "500",
  },
  ".cm-completionDetail": {
    fontSize: "11px",
    color: "var(--muted-foreground)",
    paddingRight: "8px",
    fontStyle: "normal",
  },
  ".cm-completionMatchedText": {
    textDecoration: "none",
    color: "var(--completion-matched-color) !important",
    fontWeight: "800",
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
        sql({ dialect: PostgreSQL, schema }),
        // Register custom snippets completions in PostgreSQL language facet
        PostgreSQL.language.data.of({
          autocomplete: completeFromList(snippetsCompletions),
        }),
        autocompleteTheme,
        sqlLinter,
        fontTheme,
      ];
    }, [schema, flushChanges, snippets]);

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
