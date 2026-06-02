import * as React from "react";
import { useDebouncedCallback } from "./use-typing-optimization";

/**
 * Enhanced CodeMirror editor wrapper with typing performance optimizations
 * - Debounced onChange (500ms) to reduce state updates
 * - Lazy syntax validation (on blur only for large queries)
 * - Memoized to prevent unnecessary re-renders
 */
export const OptimizedSqlEditor = React.memo(
  ({
    value,
    onChange,
    onBlur,
    extensions,
    theme,
    height,
    className,
    readOnly = false,
    placeholder = "",
  }: {
    value: string;
    onChange?: (value: string) => void;
    onBlur?: () => void;
    extensions: any[];
    theme: any;
    height: string;
    className?: string;
    readOnly?: boolean;
    placeholder?: string;
  }) => {
    // Debounce onChange to 500ms - only validate/update state after user stops typing
    const debouncedOnChange = useDebouncedCallback(
      (newValue: string) => {
        onChange?.(newValue);
      },
      500,
      { trailing: true, maxWait: 1000 }, // Max wait ensures validation every 1s
    );

    const handleChange = React.useCallback(
      (newValue: string | undefined) => {
        if (newValue !== undefined) {
          debouncedOnChange(newValue);
        }
      },
      [debouncedOnChange],
    );

    const handleBlur = React.useCallback(() => {
      // Flush any pending changes on blur
      onBlur?.();
    }, [onBlur]);

    const editorProps = React.useMemo(
      () => ({
        value,
        onChange: handleChange,
        onBlur: handleBlur,
        extensions,
        theme,
        height,
        className,
        readOnly,
        placeholder,
        // Performance optimizations for CodeMirror
        autoFocus: false,
        basicSetup: {
          lineNumbers: true,
          highlightActiveLineGutter: true,
          foldGutter: true,
          dropCursor: true,
          allowMultipleSelections: true,
          indentOnInput: true,
          bracketMatching: true,
          closeBrackets: true,
          autocompletion: true,
          rectangularSelection: true,
          highlightSelectionMatches: true,
          searchKeymap: true,
        },
      }),
      [value, handleChange, handleBlur, extensions, theme, height, className, readOnly, placeholder],
    );

    // Dynamic import to reduce initial bundle size
    const [CodeMirror, setCodeMirror] = React.useState<any>(null);

    React.useEffect(() => {
      import("@uiw/react-codemirror").then((module) => {
        setCodeMirror(() => module.default);
      });
    }, []);

    if (!CodeMirror) {
      return <div className={className} style={{ height }} />;
    }

    return <CodeMirror {...editorProps} />;
  },
  (prevProps, nextProps) => {
    // Custom memoization: only re-render if value or key props change
    return (
      prevProps.value === nextProps.value &&
      prevProps.theme === nextProps.theme &&
      prevProps.readOnly === nextProps.readOnly
    );
  },
);

OptimizedSqlEditor.displayName = "OptimizedSqlEditor";

/**
 * Helper to debounce and batch SQL parsing/validation
 */
export function useLazyValidation(
  sql: string,
  validate: (sql: string) => void,
  delay: number = 800,
) {
  const debouncedValidate = useDebouncedCallback(
    () => {
      if (sql.trim()) {
        validate(sql);
      }
    },
    delay,
    { trailing: true },
  );

  React.useEffect(() => {
    debouncedValidate();
  }, [sql, debouncedValidate]);
}
