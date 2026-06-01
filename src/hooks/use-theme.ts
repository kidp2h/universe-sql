import * as React from "react";
import { ThemeContext } from "@/providers/theme-provider";
import { getStoredTheme, type Theme } from "@/lib/theme-init";

export type { Theme };

/** @deprecated Use getStoredTheme from @/lib/theme-init */
export const getPreferredTheme = getStoredTheme;

export function useTheme() {
  const ctx = React.useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
  return ctx;
}
