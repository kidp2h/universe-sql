import * as React from "react";

/**
 * Debounce hook for typing optimization
 * Delays callback execution while user is typing
 */
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number,
  options?: { leading?: boolean; trailing?: boolean; maxWait?: number },
) {
  const timeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const maxWaitTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const lastCallTimeRef = React.useRef(0);
  const callbackRef = React.useRef(callback);

  React.useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const debouncedCallback = React.useCallback(
    (...args: Parameters<T>) => {
      const now = Date.now();
      const timeSinceLastCall = now - lastCallTimeRef.current;
      const { leading = false, trailing = true, maxWait } = options || {};

      // Clear existing timeouts
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (maxWaitTimeoutRef.current) clearTimeout(maxWaitTimeoutRef.current);

      // Execute immediately on leading edge
      if (leading && timeSinceLastCall >= delay) {
        callbackRef.current(...args);
        lastCallTimeRef.current = now;
        return;
      }

      // Schedule execution on trailing edge
      if (trailing) {
        timeoutRef.current = setTimeout(() => {
          callbackRef.current(...args);
          lastCallTimeRef.current = Date.now();
          timeoutRef.current = null;
        }, delay);
      }

      // Force execution after maxWait time
      if (maxWait && timeSinceLastCall >= maxWait) {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        callbackRef.current(...args);
        lastCallTimeRef.current = now;
      } else if (maxWait && !maxWaitTimeoutRef.current) {
        maxWaitTimeoutRef.current = setTimeout(() => {
          callbackRef.current(...args);
          lastCallTimeRef.current = Date.now();
          maxWaitTimeoutRef.current = null;
        }, maxWait);
      }
    },
    [delay, options],
  );

  // Cleanup
  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (maxWaitTimeoutRef.current) clearTimeout(maxWaitTimeoutRef.current);
    };
  }, []);

  return debouncedCallback;
}

/**
 * Throttle hook for high-frequency events
 * Ensures callback runs at most once per interval
 */
export function useThrottledCallback<T extends (...args: any[]) => any>(
  callback: T,
  interval: number,
) {
  const lastCallTimeRef = React.useRef(0);
  const callbackRef = React.useRef(callback);

  React.useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  return React.useCallback(
    (...args: Parameters<T>) => {
      const now = Date.now();
      if (now - lastCallTimeRef.current >= interval) {
        callbackRef.current(...args);
        lastCallTimeRef.current = now;
      }
    },
    [interval],
  );
}

/**
 * Batch state updates to reduce re-renders
 */
export function useBatchedState<T>(initialValue: T) {
  const [value, setValue] = React.useState<T>(initialValue);
  const batchRef = React.useRef<T | null>(null);
  const timeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  const setBatchedValue = React.useCallback((newValue: T) => {
    batchRef.current = newValue;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      setValue(batchRef.current as T);
      batchRef.current = null;
      timeoutRef.current = null;
    }, 0); // Batch in next tick
  }, []);

  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return [value, setBatchedValue] as const;
}

/**
 * Request idle callback with fallback
 */
export function useIdleCallback(callback: () => void, timeout: number = 2000) {
  React.useEffect(() => {
    if (typeof requestIdleCallback !== "undefined") {
      const id = requestIdleCallback(callback, { timeout });
      return () => cancelIdleCallback(id);
    } else {
      const id = setTimeout(callback, timeout);
      return () => clearTimeout(id);
    }
  }, [callback, timeout]);
}
