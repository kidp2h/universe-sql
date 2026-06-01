import {
  THEME_PRESETS,
  STORAGE_KEY_THEME_PRESET,
  applyThemePreset,
  getStoredThemePreset,
} from "@/lib/themes";

export const THEME_STORAGE_KEY = "theme";

export type Theme = "dark" | "light" | "system";

export function getSystemPreference(): "dark" | "light" {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function getStoredTheme(): Theme {
  if (typeof window === "undefined") return "system";
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  if (stored === "dark" || stored === "light" || stored === "system") {
    return stored;
  }
  return "system";
}

export function resolveIsDark(theme: Theme): boolean {
  return theme === "system"
    ? getSystemPreference() === "dark"
    : theme === "dark";
}

/** Apply dark/light class and theme preset to <html>. Safe to call before paint. */
export function applyDocumentTheme(
  theme: Theme = getStoredTheme(),
  presetId: string = getStoredThemePreset(),
): void {
  if (typeof document === "undefined") return;

  const isDark = resolveIsDark(theme);
  document.documentElement.classList.toggle("dark", isDark);
  document.documentElement.style.colorScheme = isDark ? "dark" : "light";
  applyThemePreset(presetId);
}

/** Inline script for <head> — runs before React hydration to prevent theme flash. */
export const THEME_INIT_SCRIPT = `(function(){try{
  var s=localStorage.getItem('${THEME_STORAGE_KEY}')||'system';
  var isDark=s==='dark'||(s==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);
  var el=document.documentElement;
  if(isDark){el.classList.add('dark')}else{el.classList.remove('dark')};
  el.style.colorScheme=isDark?'dark':'light';
  var presetClasses=${JSON.stringify(
    THEME_PRESETS.map((p) => p.cssClass).filter(Boolean),
  )};
  for(var i=0;i<presetClasses.length;i++){el.classList.remove(presetClasses[i])}
  var p=localStorage.getItem('${STORAGE_KEY_THEME_PRESET}');
  if(p&&p!=='default'){
    var match=${JSON.stringify(
      Object.fromEntries(
        THEME_PRESETS.filter((p) => p.cssClass).map((p) => [p.id, p.cssClass]),
      ),
    )};
    if(match[p]){el.classList.add(match[p])}
  }
}catch(e){}})();`;
