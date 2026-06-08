"use client";

import * as React from "react";
import {
  Settings,
  Moon,
  Sun,
  AlignLeft,
  AlignRight,
  Palette,
  Type,
  Cpu,
} from "lucide-react";
import { useSidebar } from "@/components/ui/sidebar";
import { useTheme } from "@/hooks/use-theme";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { THEME_PRESETS } from "@/lib/themes";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

const fonts = [
  {
    value: '"CascadiaCode Nerd Font", "Cascadia Code", monospace',
    label: "Cascadia Code",
  },
];

const FlagIcon = ({ lang }: { lang: string }) => {
  switch (lang) {
    case "en":
      return (
        <svg
          viewBox="0 0 190 100"
          className="size-4 rounded-xs shadow-xs border border-border/20 shrink-0"
        >
          <rect width="190" height="100" fill="#B22234" />
          <path
            d="M0,7.7H190M0,23H190M0,38.5H190M0,53.8H190M0,69.2H190M0,84.6H190"
            stroke="#FFF"
            strokeWidth="7.7"
          />
          <rect width="76" height="53.8" fill="#3C3B6E" />
          <polygon
            points="12,10 14,16 9,12 15,12 10,16"
            fill="#FFF"
            transform="scale(0.8) translate(5, 5)"
          />
          <polygon
            points="12,10 14,16 9,12 15,12 10,16"
            fill="#FFF"
            transform="scale(0.8) translate(20, 5)"
          />
          <polygon
            points="12,10 14,16 9,12 15,12 10,16"
            fill="#FFF"
            transform="scale(0.8) translate(35, 5)"
          />
          <polygon
            points="12,10 14,16 9,12 15,12 10,16"
            fill="#FFF"
            transform="scale(0.8) translate(50, 5)"
          />
          <polygon
            points="12,10 14,16 9,12 15,12 10,16"
            fill="#FFF"
            transform="scale(0.8) translate(12.5, 17)"
          />
          <polygon
            points="12,10 14,16 9,12 15,12 10,16"
            fill="#FFF"
            transform="scale(0.8) translate(27.5, 17)"
          />
          <polygon
            points="12,10 14,16 9,12 15,12 10,16"
            fill="#FFF"
            transform="scale(0.8) translate(42.5, 17)"
          />
          <polygon
            points="12,10 14,16 9,12 15,12 10,16"
            fill="#FFF"
            transform="scale(0.8) translate(5, 29)"
          />
          <polygon
            points="12,10 14,16 9,12 15,12 10,16"
            fill="#FFF"
            transform="scale(0.8) translate(20, 29)"
          />
          <polygon
            points="12,10 14,16 9,12 15,12 10,16"
            fill="#FFF"
            transform="scale(0.8) translate(35, 29)"
          />
          <polygon
            points="12,10 14,16 9,12 15,12 10,16"
            fill="#FFF"
            transform="scale(0.8) translate(50, 29)"
          />
        </svg>
      );
    case "vi":
      return (
        <svg
          viewBox="0 0 3 2"
          className="size-4 rounded-xs shadow-xs border border-border/20 shrink-0"
        >
          <rect width="3" height="2" fill="#da251d" />
          <polygon
            points="1.5,0.6 1.62,0.97 2,0.97 1.69,1.2 1.81,1.57 1.5,1.34 1.19,1.57 1.31,1.2 1,0.97 1.38,0.97"
            fill="#ffff00"
          />
        </svg>
      );
    case "zh":
      return (
        <svg
          viewBox="0 0 30 20"
          className="size-4 rounded-xs shadow-xs border border-border/20 shrink-0"
        >
          <rect width="30" height="20" fill="#de2910" />
          <polygon
            points="5,2 5.6,3.8 7.5,3.8 6,5 6.5,6.8 5,5.6 3.5,6.8 4,5 2.5,3.8 4.4,3.8"
            fill="#ffde00"
            transform="translate(0, 1) scale(0.8)"
          />
          <circle cx="10" cy="3" r="0.4" fill="#ffde00" />
          <circle cx="12" cy="5" r="0.4" fill="#ffde00" />
          <circle cx="12" cy="8" r="0.4" fill="#ffde00" />
          <circle cx="10" cy="10" r="0.4" fill="#ffde00" />
        </svg>
      );
    case "ja":
      return (
        <svg
          viewBox="0 0 3 2"
          className="size-4 rounded-xs shadow-xs border border-border/20 shrink-0"
        >
          <rect width="3" height="2" fill="#fff" />
          <circle cx="1.5" cy="1" r="0.6" fill="#bc002d" />
        </svg>
      );
    case "ko":
      return (
        <svg
          viewBox="0 0 3 2"
          className="size-4 rounded-xs shadow-xs border border-border/20 shrink-0"
        >
          <rect width="3" height="2" fill="#fff" />
          <path
            d="M1.5,0.5 A0.5,0.5 0 0,0 1.5,1.5 A0.25,0.25 0 0,0 1.5,1 A0.25,0.25 0 0,1 1.5,0.5"
            fill="#cd2e3a"
          />
          <path
            d="M1.5,0.5 A0.5,0.5 0 0,1 1.5,1.5 A0.25,0.25 0 0,1 1.5,1 A0.25,0.25 0 0,0 1.5,0.5"
            fill="#0047a0"
          />
          <rect
            x="0.5"
            y="0.4"
            width="0.2"
            height="0.05"
            fill="#000"
            transform="rotate(33.7, 0.5, 0.4)"
          />
          <rect
            x="0.5"
            y="0.5"
            width="0.2"
            height="0.05"
            fill="#000"
            transform="rotate(33.7, 0.5, 0.5)"
          />
          <rect
            x="2.3"
            y="0.4"
            width="0.2"
            height="0.05"
            fill="#000"
            transform="rotate(-33.7, 2.3, 0.4)"
          />
          <rect
            x="2.3"
            y="1.4"
            width="0.2"
            height="0.05"
            fill="#000"
            transform="rotate(33.7, 2.3, 1.4)"
          />
          <rect
            x="0.5"
            y="1.4"
            width="0.2"
            height="0.05"
            fill="#000"
            transform="rotate(-33.7, 0.5, 1.4)"
          />
        </svg>
      );
    case "ru":
      return (
        <svg
          viewBox="0 0 3 2"
          className="size-4 rounded-xs shadow-xs border border-border/20 shrink-0"
        >
          <rect width="3" height="0.67" fill="#fff" />
          <rect y="0.67" width="3" height="0.67" fill="#0039a6" />
          <rect y="1.34" width="3" height="0.67" fill="#d52b1e" />
        </svg>
      );
    case "es":
      return (
        <svg
          viewBox="0 0 3 2"
          className="size-4 rounded-xs shadow-xs border border-border/20 shrink-0"
        >
          <rect width="3" height="0.5" fill="#c60b1e" />
          <rect y="0.5" width="3" height="1" fill="#fbe122" />
          <rect y="1.5" width="3" height="0.5" fill="#c60b1e" />
          <rect
            x="0.5"
            y="0.75"
            width="0.3"
            height="0.5"
            fill="#c60b1e"
            opacity="0.8"
          />
        </svg>
      );
    default:
      return null;
  }
};

const getLanguageText = (lang: string) => {
  switch (lang) {
    case "en":
      return "English (US)";
    case "vi":
      return "Tiếng Việt";
    case "zh":
      return "中文 (简体)";
    case "ja":
      return "日本語";
    case "ko":
      return "한국어";
    case "ru":
      return "Русский";
    case "es":
      return "Español";
    default:
      return "English (US)";
  }
};

export function SettingsPanel() {
  const { sidebarPosition, setSidebarPosition } = useSidebar();
  const { theme, setThemeMode, themePreset, setThemePreset } = useTheme();
  const { t, i18n } = useTranslation();
  const currentLanguage = i18n.language || "en";

  const [limit, setLimit] = React.useState("1000");
  const [dangerousQueryCheck, setDangerousQueryCheck] = React.useState(true);
  const [editorFont, setEditorFont] = React.useState(
    '"CascadiaCode Nerd Font", "Cascadia Code", monospace',
  );
  const [, setEditorFontSize] = React.useState("14px");
  const [fontSizeInput, setFontSizeInput] = React.useState("14");
  const [localFonts, setLocalFonts] = React.useState<
    { value: string; label: string }[]
  >([]);
  const [loadingFonts, setLoadingFonts] = React.useState(false);
  const [hasScanned, setHasScanned] = React.useState(false);

  const scanFonts = React.useCallback(async (forceRequest = false) => {
    if (!("queryLocalFonts" in window)) return;
    try {
      if (!forceRequest) {
        const status = await navigator.permissions.query({
          name: "local-fonts" as any,
        });
        if (status.state !== "granted") {
          return;
        }
      }

      setLoadingFonts(true);
      const availableFonts = await (window as any).queryLocalFonts();
      const uniqueFamilies = Array.from(
        new Set(availableFonts.map((f: any) => f.family)),
      ) as string[];
      uniqueFamilies.sort();
      const formatted = uniqueFamilies.map((family) => ({
        value: `"${family}", monospace`,
        label: family,
      }));
      setLocalFonts(formatted);
      setHasScanned(true);
    } catch (err) {
      console.warn("Failed to query local fonts:", err);
    } finally {
      setLoadingFonts(false);
    }
  }, []);

  React.useEffect(() => {
    const savedLimit =
      window.localStorage.getItem("usql:query-limit") ?? "1000";
    setLimit(savedLimit);
    const savedCheck =
      window.localStorage.getItem("usql:dangerous-query-check") !== "false";
    setDangerousQueryCheck(savedCheck);
    const savedFont =
      window.localStorage.getItem("usql:editor-font") ??
      '"CascadiaCode Nerd Font", "Cascadia Code", monospace';
    setEditorFont(savedFont);

    const savedFontSize =
      window.localStorage.getItem("usql:editor-font-size") ?? "14px";
    setEditorFontSize(savedFontSize);
    setFontSizeInput(parseInt(savedFontSize, 10).toString() || "14");

    // Silently check and load fonts on mount if permission was already granted
    scanFonts(false);
  }, [scanFonts]);

  const handleSaveFont = (val: string) => {
    setEditorFont(val);
    window.localStorage.setItem("usql:editor-font", val);
    document.documentElement.style.setProperty("--editor-font-family", val);
  };

  const handleSaveFontSize = (val: string) => {
    setFontSizeInput(val);
    const num = parseInt(val, 10);
    if (Number.isNaN(num) || num <= 0) {
      return;
    }
    const pxVal = `${num}px`;
    setEditorFontSize(pxVal);
    window.localStorage.setItem("usql:editor-font-size", pxVal);
    document.documentElement.style.setProperty("--editor-font-size", pxVal);
  };

  const handleFontSizeBlur = () => {
    let num = parseInt(fontSizeInput, 10);
    if (Number.isNaN(num)) {
      num = 14;
    } else if (num < 8) {
      num = 8;
    } else if (num > 32) {
      num = 32;
    }
    const pxVal = `${num}px`;
    setFontSizeInput(num.toString());
    setEditorFontSize(pxVal);
    window.localStorage.setItem("usql:editor-font-size", pxVal);
    document.documentElement.style.setProperty("--editor-font-size", pxVal);
  };

  const handleSavePageSize = (val: string) => {
    setLimit(val);
    window.localStorage.setItem("usql:query-limit", val);
  };

  const handleToggleDangerousCheck = (checked: boolean) => {
    setDangerousQueryCheck(checked);
    window.localStorage.setItem("usql:dangerous-query-check", String(checked));
  };

  const [disableGpu, setDisableGpu] = React.useState(false);

  React.useEffect(() => {
    const loadAppConfig = async () => {
      if (window.electron?.getAppConfig) {
        const res = await window.electron.getAppConfig();
        if (res.ok && res.config) {
          setDisableGpu(!!res.config.disableGpu);
        }
      }
    };
    void loadAppConfig();
  }, []);

  const handleToggleGpu = async (checked: boolean) => {
    setDisableGpu(checked);
    if (window.electron?.getAppConfig && window.electron?.saveAppConfig) {
      try {
        const res = await window.electron.getAppConfig();
        const currentConfig = res.ok && res.config ? res.config : {};
        const newConfig = { ...currentConfig, disableGpu: checked };
        const saveRes = await window.electron.saveAppConfig(newConfig);
        if (saveRes.ok) {
          toast.info(t("gpuSettingsRestartToast"));
        } else {
          toast.error(saveRes.message || "Failed to save configuration");
        }
      } catch (err) {
        console.error("Failed to save GPU config:", err);
        toast.error("Failed to save configuration");
      }
    }
  };

  return (
    <div className="flex flex-col h-full bg-card overflow-hidden">
      {/* Header */}
      <div className="p-4 flex items-center justify-between border-b shrink-0 select-none">
        <span className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
          {t("settingsTitle")}
        </span>
        <Settings className="size-3.5 text-muted-foreground" />
      </div>

      {/* Settings Form */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Card 1: Appearance */}
        <div className="p-4 rounded-xl border bg-card/50 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-1 border-b select-none">
            <div className="flex items-center justify-center size-6 rounded bg-indigo-500/10 text-indigo-500 shrink-0">
              <Palette className="size-4" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-foreground">
              {t("appearance")}
            </span>
          </div>

          {/* Light / Dark toggle */}
          <div className="space-y-1.5">
            <span className="text-xs font-semibold text-muted-foreground">
              {t("colorMode")}
            </span>
            <div className="relative grid grid-cols-2 bg-muted/30 border p-1 rounded-xl overflow-hidden select-none">
              <div
                className={cn(
                  "absolute top-1 bottom-1 w-[calc(50%-6px)] bg-background border border-border shadow-sm rounded-lg transition-all duration-300 ease-out",
                  theme === "light" && "left-1",
                  theme === "dark" && "left-[calc(50%+2px)]",
                )}
              />
              <button
                type="button"
                onClick={() => setThemeMode("light")}
                className={cn(
                  "relative z-10 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-sm font-semibold transition-colors duration-200 cursor-pointer",
                  theme === "light"
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Sun className="size-3.5" />
                {t("light")}
              </button>
              <button
                type="button"
                onClick={() => setThemeMode("dark")}
                className={cn(
                  "relative z-10 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-sm font-semibold transition-colors duration-200 cursor-pointer",
                  theme === "dark"
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Moon className="size-3.5" />
                {t("dark")}
              </button>
            </div>
          </div>

          {/* Theme preset selectbox */}
          <div className="space-y-1.5">
            <span className="text-xs font-semibold text-muted-foreground">
              {t("colorPreset")}
            </span>
            <Select
              value={themePreset}
              onValueChange={(val) => setThemePreset(val)}
            >
              <SelectTrigger className="h-9 text-sm w-full">
                <SelectValue placeholder={t("selectThemePlaceholder")} />
              </SelectTrigger>
              <SelectContent position="popper" className="max-h-72">
                {/* Greens */}
                <SelectGroup>
                  <SelectLabel className="text-[10px] text-muted-foreground/70 uppercase tracking-wider px-2 py-1">
                    {t("groupGreens")}
                  </SelectLabel>
                  {THEME_PRESETS.filter((p) =>
                    ["default", "forest", "mint"].includes(p.id),
                  ).map((preset) => (
                    <SelectItem
                      key={preset.id}
                      value={preset.id}
                      className="text-sm cursor-pointer"
                    >
                      <span className="flex items-center gap-2">
                        <span
                          className="size-3 rounded-full shrink-0 border border-black/10"
                          style={{ backgroundColor: preset.accent }}
                        />
                        {preset.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectGroup>
                {/* Blues */}
                <SelectGroup>
                  <SelectLabel className="text-[10px] text-muted-foreground/70 uppercase tracking-wider px-2 py-1">
                    {t("groupBlues")}
                  </SelectLabel>
                  {THEME_PRESETS.filter((p) =>
                    ["ocean", "sky", "nord", "solarized"].includes(p.id),
                  ).map((preset) => (
                    <SelectItem
                      key={preset.id}
                      value={preset.id}
                      className="text-sm cursor-pointer"
                    >
                      <span className="flex items-center gap-2">
                        <span
                          className="size-3 rounded-full shrink-0 border border-black/10"
                          style={{ backgroundColor: preset.accent }}
                        />
                        {preset.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectGroup>
                {/* Purples */}
                <SelectGroup>
                  <SelectLabel className="text-[10px] text-muted-foreground/70 uppercase tracking-wider px-2 py-1">
                    {t("groupPurples")}
                  </SelectLabel>
                  {THEME_PRESETS.filter((p) =>
                    ["dracula", "catppuccin", "violet", "grape"].includes(p.id),
                  ).map((preset) => (
                    <SelectItem
                      key={preset.id}
                      value={preset.id}
                      className="text-sm cursor-pointer"
                    >
                      <span className="flex items-center gap-2">
                        <span
                          className="size-3 rounded-full shrink-0 border border-black/10"
                          style={{ backgroundColor: preset.accent }}
                        />
                        {preset.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectGroup>
                {/* Pinks & Reds */}
                <SelectGroup>
                  <SelectLabel className="text-[10px] text-muted-foreground/70 uppercase tracking-wider px-2 py-1">
                    {t("groupPinksReds")}
                  </SelectLabel>
                  {THEME_PRESETS.filter((p) =>
                    ["rose-pine", "pink", "crimson"].includes(p.id),
                  ).map((preset) => (
                    <SelectItem
                      key={preset.id}
                      value={preset.id}
                      className="text-sm cursor-pointer"
                    >
                      <span className="flex items-center gap-2">
                        <span
                          className="size-3 rounded-full shrink-0 border border-black/10"
                          style={{ backgroundColor: preset.accent }}
                        />
                        {preset.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectGroup>
                {/* Warm */}
                <SelectGroup>
                  <SelectLabel className="text-[10px] text-muted-foreground/70 uppercase tracking-wider px-2 py-1">
                    {t("groupWarmTones")}
                  </SelectLabel>
                  {THEME_PRESETS.filter((p) =>
                    ["midnight", "amber", "copper"].includes(p.id),
                  ).map((preset) => (
                    <SelectItem
                      key={preset.id}
                      value={preset.id}
                      className="text-sm cursor-pointer"
                    >
                      <span className="flex items-center gap-2">
                        <span
                          className="size-3 rounded-full shrink-0 border border-black/10"
                          style={{ backgroundColor: preset.accent }}
                        />
                        {preset.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectGroup>
                {/* Neutrals */}
                <SelectGroup>
                  <SelectLabel className="text-[10px] text-muted-foreground/70 uppercase tracking-wider px-2 py-1">
                    {t("groupNeutrals")}
                  </SelectLabel>
                  {THEME_PRESETS.filter((p) =>
                    ["slate", "mono"].includes(p.id),
                  ).map((preset) => (
                    <SelectItem
                      key={preset.id}
                      value={preset.id}
                      className="text-sm cursor-pointer"
                    >
                      <span className="flex items-center gap-2">
                        <span
                          className="size-3 rounded-full shrink-0 border border-black/10"
                          style={{ backgroundColor: preset.accent }}
                        />
                        {preset.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectGroup>
                {/* Special */}
                <SelectGroup>
                  <SelectLabel className="text-[10px] text-muted-foreground/70 uppercase tracking-wider px-2 py-1">
                    {t("groupSpecial")}
                  </SelectLabel>
                  {THEME_PRESETS.filter((p) =>
                    ["synthwave", "aurora"].includes(p.id),
                  ).map((preset) => (
                    <SelectItem
                      key={preset.id}
                      value={preset.id}
                      className="text-sm cursor-pointer"
                    >
                      <span className="flex items-center gap-2">
                        <span
                          className="size-3 rounded-full shrink-0 border border-black/10"
                          style={{ backgroundColor: preset.accent }}
                        />
                        {preset.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          {/* Language selectbox */}
          <div className="space-y-1.5">
            <span className="text-xs font-semibold text-muted-foreground">
              {t("language")}
            </span>
            <Select
              value={currentLanguage}
              onValueChange={(val) => i18n.changeLanguage(val)}
            >
              <SelectTrigger className="h-9 text-sm w-full">
                <span className="flex items-center gap-2 select-none">
                  <FlagIcon lang={currentLanguage} />
                  <span>{getLanguageText(currentLanguage)}</span>
                </span>
              </SelectTrigger>
              <SelectContent position="popper">
                <SelectItem value="en" className="text-sm cursor-pointer">
                  <span className="flex items-center gap-2">
                    <FlagIcon lang="en" />
                    <span>English (US)</span>
                  </span>
                </SelectItem>
                <SelectItem value="vi" className="text-sm cursor-pointer">
                  <span className="flex items-center gap-2">
                    <FlagIcon lang="vi" />
                    <span>Tiếng Việt</span>
                  </span>
                </SelectItem>
                <SelectItem value="zh" className="text-sm cursor-pointer">
                  <span className="flex items-center gap-2">
                    <FlagIcon lang="zh" />
                    <span>中文 (简体)</span>
                  </span>
                </SelectItem>
                <SelectItem value="ja" className="text-sm cursor-pointer">
                  <span className="flex items-center gap-2">
                    <FlagIcon lang="ja" />
                    <span>日本語</span>
                  </span>
                </SelectItem>
                <SelectItem value="ko" className="text-sm cursor-pointer">
                  <span className="flex items-center gap-2">
                    <FlagIcon lang="ko" />
                    <span>한국어</span>
                  </span>
                </SelectItem>
                <SelectItem value="ru" className="text-sm cursor-pointer">
                  <span className="flex items-center gap-2">
                    <FlagIcon lang="ru" />
                    <span>Русский</span>
                  </span>
                </SelectItem>
                <SelectItem value="es" className="text-sm cursor-pointer">
                  <span className="flex items-center gap-2">
                    <FlagIcon lang="es" />
                    <span>Español</span>
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Card 2: Editor */}
        <div className="p-4 rounded-xl border bg-card/50 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-1 border-b select-none">
            <div className="flex items-center justify-center size-6 rounded bg-sky-500/10 text-sky-500 shrink-0">
              <Type className="size-4" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-foreground">
              {t("editor") || "Editor"}
            </span>
          </div>

          {/* Editor Font selectbox */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between select-none">
              <span className="text-xs font-semibold text-muted-foreground">
                {t("editorFont")}
              </span>
              {typeof window !== "undefined" &&
                "queryLocalFonts" in window &&
                (loadingFonts ? (
                  <span className="text-[11px] text-muted-foreground animate-pulse">
                    {t("loadingFonts")}
                  </span>
                ) : !hasScanned ? (
                  <button
                    type="button"
                    onClick={() => scanFonts(true)}
                    className="text-[11px] text-brand hover:underline font-semibold focus:outline-none cursor-pointer"
                  >
                    {t("scanSystemFonts")}
                  </button>
                ) : null)}
            </div>
            <Select value={editorFont} onValueChange={handleSaveFont}>
              <SelectTrigger className="h-9 text-sm w-full">
                <SelectValue placeholder={t("editorFont")} />
              </SelectTrigger>
              <SelectContent position="popper" className="max-h-72">
                <SelectGroup>
                  <SelectLabel className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-wider px-2 py-1">
                    {t("curatedFonts")}
                  </SelectLabel>
                  {fonts.map((item) => (
                    <SelectItem
                      key={item.value}
                      value={item.value}
                      className="text-sm cursor-pointer"
                    >
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
                {hasScanned && localFonts.length > 0 && (
                  <SelectGroup className="border-t border-border/40 mt-1 pt-1">
                    <SelectLabel className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-wider px-2 py-1">
                      {t("systemFonts")}
                    </SelectLabel>
                    {localFonts.map((item) => (
                      <SelectItem
                        key={item.value}
                        value={item.value}
                        className="text-sm cursor-pointer"
                      >
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                )}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground/80 leading-normal select-none">
              {t("editorFontDesc")}
            </p>
          </div>

          {/* Editor Font Size input */}
          <div className="space-y-1.5">
            <span className="text-xs font-semibold text-muted-foreground">
              {t("editorFontSize") || "Editor Font Size"}
            </span>
            <Input
              type="number"
              value={fontSizeInput}
              onChange={(e) => handleSaveFontSize(e.target.value)}
              onBlur={handleFontSizeBlur}
              className="h-9 text-sm"
              min={8}
              max={32}
            />
            <p className="text-[11px] text-muted-foreground/80 leading-normal select-none">
              {t("editorFontSizeDesc") ||
                "Adjust the font size of the query editor."}
            </p>
          </div>

          {/* Query Row Limit */}
          <div className="space-y-1.5">
            <label
              htmlFor="limit-input"
              className="text-xs font-semibold text-muted-foreground select-none"
            >
              {t("queryRowLimit")}
            </label>
            <Input
              id="limit-input"
              type="number"
              value={limit}
              onChange={(e) => handleSavePageSize(e.target.value)}
              placeholder={t("queryLimitPlaceholder")}
              className="h-9 text-sm"
            />
            <p className="text-[11px] text-muted-foreground/80 leading-normal select-none">
              {t("queryLimitDesc")}
            </p>
          </div>

          {/* Warn on dangerous queries */}
          <div className="flex items-start gap-2.5 rounded-lg border p-3 bg-muted/10 select-none">
            <Checkbox
              id="dangerous-query-check"
              checked={dangerousQueryCheck}
              onCheckedChange={(checked) =>
                handleToggleDangerousCheck(!!checked)
              }
              className="mt-0.5"
            />
            <div className="grid gap-1 leading-none cursor-pointer">
              <label
                htmlFor="dangerous-query-check"
                className="text-sm font-semibold text-foreground select-none cursor-pointer flex items-center gap-1"
              >
                {t("querySafetyWarn")}
              </label>
              <p className="text-[11px] text-muted-foreground/80 leading-normal">
                {t("querySafetyDesc")}
              </p>
            </div>
          </div>
        </div>

        {/* Card 3: Layout */}
        <div className="p-4 rounded-xl border bg-card/50 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-1 border-b select-none">
            <div className="flex items-center justify-center size-6 rounded bg-emerald-500/10 text-emerald-500 shrink-0">
              <AlignLeft className="size-4" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-foreground">
              {t("layout") || "Layout"}
            </span>
          </div>

          <div className="space-y-1.5">
            <span className="text-xs font-semibold text-muted-foreground">
              {t("sidebarLocation")}
            </span>
            <div className="grid grid-cols-2 gap-2 bg-muted/30 border p-1 rounded-lg">
              <button
                type="button"
                onClick={() => setSidebarPosition("left")}
                className={cn(
                  "flex items-center justify-center gap-1.5 py-1.5 rounded-md text-sm font-medium transition-all cursor-pointer",
                  sidebarPosition === "left"
                    ? "bg-brand text-white shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                )}
              >
                <AlignLeft className="size-3.5" />
                {t("left")}
              </button>
              <button
                type="button"
                onClick={() => setSidebarPosition("right")}
                className={cn(
                  "flex items-center justify-center gap-1.5 py-1.5 rounded-md text-sm font-medium transition-all cursor-pointer",
                  sidebarPosition === "right"
                    ? "bg-brand text-white shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                )}
              >
                <AlignRight className="size-3.5" />
                {t("right")}
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground/80 leading-normal select-none">
              {t("sidebarDesc")}
            </p>
          </div>
        </div>

        {/* Card 4: System */}
        <div className="p-4 rounded-xl border bg-card/50 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-1 border-b select-none">
            <div className="flex items-center justify-center size-6 rounded bg-amber-500/10 text-amber-500 shrink-0">
              <Cpu className="size-4" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-foreground">
              {t("systemPerformance") || "System Performance"}
            </span>
          </div>

          <div className="flex items-start gap-2.5 rounded-lg border p-3 bg-muted/10 select-none">
            <Checkbox
              id="disable-gpu-check"
              checked={disableGpu}
              onCheckedChange={(checked) => handleToggleGpu(!!checked)}
              className="mt-0.5"
            />
            <div className="grid gap-1 leading-none cursor-pointer">
              <label
                htmlFor="disable-gpu-check"
                className="text-sm font-semibold text-foreground select-none cursor-pointer flex items-center gap-1"
              >
                {t("disableGpuLabel")}
              </label>
              <p className="text-[11px] text-muted-foreground/80 leading-normal">
                {t("disableGpuDesc")}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
