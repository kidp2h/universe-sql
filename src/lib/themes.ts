/**
 * Theme preset definitions for Universe SQL.
 */

export type ThemePreset = {
  id: string;
  name: string;
  description: string;
  /** Swatch color for the preview circle */
  accent: string;
  /** Additional CSS class applied to <html> element */
  cssClass: string;
};

export const THEME_PRESETS: ThemePreset[] = [
  // ── Greens ──────────────────────────────────────────────────────────────
  {
    id: "default",
    name: "Emerald",
    description: "Fresh green — default Universe SQL theme",
    accent: "#10b981",
    cssClass: "",
  },
  {
    id: "forest",
    name: "Forest",
    description: "Deep woodland green palette",
    accent: "#22c55e",
    cssClass: "theme-forest",
  },
  {
    id: "mint",
    name: "Mint",
    description: "Cool, crisp mint green",
    accent: "#6ee7b7",
    cssClass: "theme-mint",
  },
  // ── Blues ────────────────────────────────────────────────────────────────
  {
    id: "ocean",
    name: "Ocean Blue",
    description: "Cool ocean-inspired blue palette",
    accent: "#3b82f6",
    cssClass: "theme-ocean",
  },
  {
    id: "sky",
    name: "Sky",
    description: "Light cerulean sky blue",
    accent: "#38bdf8",
    cssClass: "theme-sky",
  },
  {
    id: "nord",
    name: "Nord",
    description: "Arctic, north-blue color palette",
    accent: "#88c0d0",
    cssClass: "theme-nord",
  },
  {
    id: "solarized",
    name: "Solarized",
    description: "Precision colors for readability",
    accent: "#268bd2",
    cssClass: "theme-solarized",
  },
  // ── Purples ──────────────────────────────────────────────────────────────
  {
    id: "dracula",
    name: "Dracula",
    description: "Classic dark purple vampire aesthetic",
    accent: "#bd93f9",
    cssClass: "theme-dracula",
  },
  {
    id: "catppuccin",
    name: "Catppuccin",
    description: "Warm pastel tones inspired by Catppuccin Mocha",
    accent: "#cba6f7",
    cssClass: "theme-catppuccin",
  },
  {
    id: "violet",
    name: "Violet",
    description: "Deep violet with electric accents",
    accent: "#7c3aed",
    cssClass: "theme-violet",
  },
  {
    id: "grape",
    name: "Grape",
    description: "Rich burgundy-grape tones",
    accent: "#a855f7",
    cssClass: "theme-grape",
  },
  // ── Pinks & Reds ─────────────────────────────────────────────────────────
  {
    id: "rose-pine",
    name: "Rosé Pine",
    description: "Soho vibes with warm rose and gold",
    accent: "#eb6f92",
    cssClass: "theme-rose-pine",
  },
  {
    id: "pink",
    name: "Sakura",
    description: "Soft cherry blossom pink",
    accent: "#f472b6",
    cssClass: "theme-pink",
  },
  {
    id: "crimson",
    name: "Crimson",
    description: "Bold, deep red accent",
    accent: "#ef4444",
    cssClass: "theme-crimson",
  },
  // ── Warm Tones ───────────────────────────────────────────────────────────
  {
    id: "midnight",
    name: "Midnight",
    description: "Deep black with amber/gold accents",
    accent: "#f59e0b",
    cssClass: "theme-midnight",
  },
  {
    id: "amber",
    name: "Amber",
    description: "Warm golden amber warmth",
    accent: "#fbbf24",
    cssClass: "theme-amber",
  },
  {
    id: "copper",
    name: "Copper",
    description: "Warm metallic copper-orange",
    accent: "#f97316",
    cssClass: "theme-copper",
  },
  // ── Neutrals ─────────────────────────────────────────────────────────────
  {
    id: "slate",
    name: "Slate",
    description: "Cool blue-gray professional tone",
    accent: "#94a3b8",
    cssClass: "theme-slate",
  },
  {
    id: "mono",
    name: "Monochrome",
    description: "Minimal pure black and white",
    accent: "#71717a",
    cssClass: "theme-mono",
  },
  // ── Special ──────────────────────────────────────────────────────────────
  {
    id: "synthwave",
    name: "Synthwave",
    description: "Retro 80s neon pink & cyan",
    accent: "#f0abfc",
    cssClass: "theme-synthwave",
  },
  {
    id: "aurora",
    name: "Aurora",
    description: "Northern lights teal & green glow",
    accent: "#2dd4bf",
    cssClass: "theme-aurora",
  },
];

export const STORAGE_KEY_THEME_PRESET = "usql:theme-preset";

export function getStoredThemePreset(): string {
  if (typeof window === "undefined") return "default";
  return localStorage.getItem(STORAGE_KEY_THEME_PRESET) ?? "default";
}

export function applyThemePreset(presetId: string): void {
  const preset = THEME_PRESETS.find((p) => p.id === presetId);
  const html = document.documentElement;

  // Remove all existing preset classes
  for (const p of THEME_PRESETS) {
    if (p.cssClass) html.classList.remove(p.cssClass);
  }

  // Apply new preset class if any
  if (preset?.cssClass) {
    html.classList.add(preset.cssClass);
  }
}
