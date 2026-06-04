"use client";

import * as React from "react";
import {
  Settings,
  Moon,
  Sun,
  AlignLeft,
  AlignRight,
  Palette,
  Languages,
  Laptop,
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

    // Silently check and load fonts on mount if permission was already granted
    scanFonts(false);
  }, [scanFonts]);

  const handleSaveFont = (val: string) => {
    setEditorFont(val);
    window.localStorage.setItem("usql:editor-font", val);
    document.documentElement.style.setProperty("--editor-font-family", val);
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
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* ===== APPEARANCE SECTION ===== */}
        <div className="space-y-4 select-none">
          {/* Section label */}
          <div className="flex items-center gap-2">
            <Palette className="size-3.5 text-ring" />
            <span className="text-sm font-bold uppercase tracking-wider text-foreground">
              {t("appearance")}
            </span>
          </div>

          {/* Light / Dark / System toggle */}
          <div className="space-y-1.5">
            <span className="text-sm font-semibold text-muted-foreground">
              {t("colorMode")}
            </span>
            <div className="relative grid grid-cols-3 bg-muted/30 border p-1 rounded-xl overflow-hidden select-none">
              <div
                className={cn(
                  "absolute top-1 bottom-1 w-[calc(33.333%-6px)] bg-background border border-border shadow-sm rounded-lg transition-all duration-300 ease-out",
                  theme === "light" && "left-1",
                  theme === "dark" && "left-[calc(33.333%+2px)]",
                  theme === "system" && "left-[calc(66.666%+4px)]",
                )}
              />
              <button
                type="button"
                onClick={() => setThemeMode("light")}
                className={cn(
                  "relative z-10 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-sm font-semibold transition-colors duration-200",
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
                  "relative z-10 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-sm font-semibold transition-colors duration-200",
                  theme === "dark"
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Moon className="size-3.5" />
                {t("dark")}
              </button>
              <button
                type="button"
                onClick={() => setThemeMode("system")}
                className={cn(
                  "relative z-10 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-sm font-semibold transition-colors duration-200",
                  theme === "system"
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Laptop className="size-3.5" />
                {t("system")}
              </button>
            </div>
          </div>

          {/* Theme preset selectbox */}
          <div className="space-y-1.5">
            <span className="text-sm font-semibold text-muted-foreground">
              {t("colorPreset")}
            </span>
            <Select
              value={themePreset}
              onValueChange={(val) => {
                setThemePreset(val);
              }}
            >
              <SelectTrigger className="h-9 text-sm w-full">
                <span className="flex items-center gap-2">
                  <SelectValue placeholder={t("selectThemePlaceholder")} />
                </span>
              </SelectTrigger>
              <SelectContent position="popper" className="max-h-72">
                {/* Greens */}
                <SelectGroup>
                  <SelectLabel className="text-sm text-muted-foreground/70 uppercase tracking-wider px-2 py-1">
                    {t("groupGreens")}
                  </SelectLabel>
                  {THEME_PRESETS.filter((p) =>
                    ["default", "forest", "mint"].includes(p.id),
                  ).map((preset) => (
                    <SelectItem
                      key={preset.id}
                      value={preset.id}
                      className="text-sm"
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
                  <SelectLabel className="text-sm text-muted-foreground/70 uppercase tracking-wider px-2 py-1">
                    {t("groupBlues")}
                  </SelectLabel>
                  {THEME_PRESETS.filter((p) =>
                    ["ocean", "sky", "nord", "solarized"].includes(p.id),
                  ).map((preset) => (
                    <SelectItem
                      key={preset.id}
                      value={preset.id}
                      className="text-sm"
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
                  <SelectLabel className="text-sm text-muted-foreground/70 uppercase tracking-wider px-2 py-1">
                    {t("groupPurples")}
                  </SelectLabel>
                  {THEME_PRESETS.filter((p) =>
                    ["dracula", "catppuccin", "violet", "grape"].includes(p.id),
                  ).map((preset) => (
                    <SelectItem
                      key={preset.id}
                      value={preset.id}
                      className="text-sm"
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
                  <SelectLabel className="text-sm text-muted-foreground/70 uppercase tracking-wider px-2 py-1">
                    {t("groupPinksReds")}
                  </SelectLabel>
                  {THEME_PRESETS.filter((p) =>
                    ["rose-pine", "pink", "crimson"].includes(p.id),
                  ).map((preset) => (
                    <SelectItem
                      key={preset.id}
                      value={preset.id}
                      className="text-sm"
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
                  <SelectLabel className="text-sm text-muted-foreground/70 uppercase tracking-wider px-2 py-1">
                    {t("groupWarmTones")}
                  </SelectLabel>
                  {THEME_PRESETS.filter((p) =>
                    ["midnight", "amber", "copper"].includes(p.id),
                  ).map((preset) => (
                    <SelectItem
                      key={preset.id}
                      value={preset.id}
                      className="text-sm"
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
                  <SelectLabel className="text-sm text-muted-foreground/70 uppercase tracking-wider px-2 py-1">
                    {t("groupNeutrals")}
                  </SelectLabel>
                  {THEME_PRESETS.filter((p) =>
                    ["slate", "mono"].includes(p.id),
                  ).map((preset) => (
                    <SelectItem
                      key={preset.id}
                      value={preset.id}
                      className="text-sm"
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
                  <SelectLabel className="text-sm text-muted-foreground/70 uppercase tracking-wider px-2 py-1">
                    {t("groupSpecial")}
                  </SelectLabel>
                  {THEME_PRESETS.filter((p) =>
                    ["synthwave", "aurora"].includes(p.id),
                  ).map((preset) => (
                    <SelectItem
                      key={preset.id}
                      value={preset.id}
                      className="text-sm"
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

          {/* Editor Font selectbox */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between select-none">
              <span className="text-sm font-semibold text-muted-foreground flex items-center gap-1">
                <Type className="size-3.5 text-muted-foreground" />
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
                    className="text-[11px] text-brand hover:underline font-medium focus:outline-none"
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
            <p className="text-[11px] text-muted-foreground leading-normal select-none">
              {t("editorFontDesc")}
            </p>
          </div>

          {/* Language selectbox */}
          <div className="space-y-1.5">
            <span className="text-sm font-semibold text-muted-foreground flex items-center gap-1">
              <Languages className="size-3.5 text-muted-foreground" />
              {t("language")}
            </span>
            <Select
              value={currentLanguage}
              onValueChange={(val) => {
                i18n.changeLanguage(val);
              }}
            >
              <SelectTrigger className="h-9 text-sm w-full">
                <SelectValue placeholder={t("selectLanguagePlaceholder")} />
              </SelectTrigger>
              <SelectContent position="popper">
                <SelectItem value="en" className="text-sm">
                  English (US)
                </SelectItem>
                <SelectItem value="vi" className="text-sm">
                  Tiếng Việt
                </SelectItem>
                <SelectItem value="zh" className="text-sm">
                  中文 (简体)
                </SelectItem>
                <SelectItem value="ja" className="text-sm">
                  日本語
                </SelectItem>
                <SelectItem value="ko" className="text-sm">
                  한국어
                </SelectItem>
                <SelectItem value="ru" className="text-sm">
                  Русский
                </SelectItem>
                <SelectItem value="es" className="text-sm">
                  Español
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-border/60" />

        {/* ===== LAYOUT SECTION ===== */}
        <div className="space-y-2 select-none">
          <span className="text-sm font-semibold text-foreground">
            {t("sidebarLocation")}
          </span>
          <p className="text-sm text-muted-foreground">{t("sidebarDesc")}</p>
          <div className="grid grid-cols-2 gap-2 bg-muted/30 border p-1 rounded-lg">
            <button
              type="button"
              onClick={() => {
                setSidebarPosition("left");
              }}
              className={cn(
                "flex items-center justify-center gap-1.5 py-1.5 rounded-md text-sm font-medium transition-all",
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
              onClick={() => {
                setSidebarPosition("right");
              }}
              className={cn(
                "flex items-center justify-center gap-1.5 py-1.5 rounded-md text-sm font-medium transition-all",
                sidebarPosition === "right"
                  ? "bg-brand text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
              )}
            >
              <AlignRight className="size-3.5" />
              {t("right")}
            </button>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-border/60" />

        {/* ===== QUERY SECTION ===== */}
        <div className="space-y-4">
          {/* Limit page size */}
          <div className="space-y-2">
            <label
              htmlFor="limit-input"
              className="text-sm font-semibold text-foreground select-none"
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
            <p className="text-sm text-muted-foreground leading-normal select-none">
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
              <p className="text-sm text-muted-foreground leading-normal">
                {t("querySafetyDesc")}
              </p>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-border/60" />

        {/* ===== SYSTEM SECTION ===== */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 select-none">
            <Cpu className="size-3.5 text-ring" />
            <span className="text-sm font-bold uppercase tracking-wider text-foreground">
              {t("systemPerformance")}
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
              <p className="text-sm text-muted-foreground leading-normal">
                {t("disableGpuDesc")}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
