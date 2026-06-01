const isLogEnabled = false;

export const logger = {
  log: (...args: any[]) => {
    if (isLogEnabled) {
      console.log(...args);
    }
  },
  error: (...args: any[]) => {
    // We typically want to keep errors visible or configurable. Let's gate it with the flag as well.
    if (isLogEnabled) {
      console.error(...args);
    }
  },
  warn: (...args: any[]) => {
    if (isLogEnabled) {
      console.warn(...args);
    }
  },
  info: (...args: any[]) => {
    if (isLogEnabled) {
      console.info(...args);
    }
  },
  debug: (...args: any[]) => {
    if (isLogEnabled) {
      console.debug(...args);
    }
  },
};
