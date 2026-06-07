"use client";

import React from "react";
import { flushSync } from "react-dom";
import {
  THEME_PRESETS,
  STORAGE_KEY_THEME_PRESET,
  applyThemePreset,
  getStoredThemePreset,
} from "@/lib/themes";
import {
  type Theme,
  THEME_STORAGE_KEY,
  applyDocumentTheme,
  getStoredTheme,
} from "@/lib/theme-init";
import "@/lib/i18n";

export type { Theme };

type ThemeContextType = {
  theme: Theme;
  setThemeMode: (theme: Theme) => void;
  toggleTheme: () => void;
  themePreset: string;
  setThemePreset: (presetId: string) => void;
};

export const ThemeContext = React.createContext<ThemeContextType | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = React.useState<Theme>(() => getStoredTheme());
  const [themePreset, setThemePresetState] = React.useState<string>(() =>
    typeof window === "undefined" ? "default" : getStoredThemePreset(),
  );

  // Re-apply after hydration in case React reset <html> classes (before paint)
  React.useLayoutEffect(() => {
    const storedTheme = getStoredTheme();
    const storedPreset = getStoredThemePreset();
    setThemePresetState(storedPreset);
    applyDocumentTheme(storedTheme, storedPreset);

    const storedFont =
      localStorage.getItem("usql:editor-font") ||
      '"CascadiaCode Nerd Font", "Cascadia Code", monospace';
    document.documentElement.style.setProperty(
      "--editor-font-family",
      storedFont,
    );

    const storedFontSize =
      localStorage.getItem("usql:editor-font-size") || "14px";
    document.documentElement.style.setProperty(
      "--editor-font-size",
      storedFontSize,
    );
  }, []);

  const runTransition = (cb: () => void) => {
    if (
      typeof document !== "undefined" &&
      (document as any).startViewTransition
    ) {
      // Determine the ripple origin based on active sidebar position from localStorage
      const sidebarPos =
        window.localStorage.getItem("usql:sidebar-position") || "left";
      const origin = sidebarPos === "left" ? "0% 100%" : "100% 100%";
      document.documentElement.style.setProperty(
        "--theme-sweep-center",
        origin,
      );

      (document as any).startViewTransition(() => {
        flushSync(() => {
          cb();
        });
      });
    } else {
      cb();
    }
  };

  const toggleTheme = React.useCallback(() => {
    const next = theme === "dark" ? "light" : "dark";

    runTransition(() => {
      applyDocumentTheme(next, getStoredThemePreset());
      setTheme(next);
    });
    localStorage.setItem(THEME_STORAGE_KEY, next);
  }, [theme]);

  const setThemeMode = React.useCallback((mode: Theme) => {
    runTransition(() => {
      applyDocumentTheme(mode, getStoredThemePreset());
      setTheme(mode);
    });
    localStorage.setItem(THEME_STORAGE_KEY, mode);
  }, []);

  const setThemePreset = React.useCallback((presetId: string) => {
    const preset = THEME_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    runTransition(() => {
      setThemePresetState(presetId);
      applyThemePreset(presetId);
    });
    localStorage.setItem(STORAGE_KEY_THEME_PRESET, presetId);
  }, []);

  return (
    <ThemeContext.Provider
      value={{ theme, toggleTheme, setThemeMode, themePreset, setThemePreset }}
    >
      {children}
    </ThemeContext.Provider>
  );
}
