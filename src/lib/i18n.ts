import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en";
import vi from "./locales/vi";
import zh from "./locales/zh";
import ja from "./locales/ja";
import ko from "./locales/ko";
import ru from "./locales/ru";
import es from "./locales/es";

export const LANGUAGE_STORAGE_KEY = "usql:language";

export const SUPPORTED_LANGUAGES = [
  "en",
  "vi",
  "zh",
  "ja",
  "ko",
  "ru",
  "es",
] as const;

const resources = {
  en: {
    translation: en,
  },
  vi: {
    translation: vi,
  },
  zh: {
    translation: zh,
  },
  ja: {
    translation: ja,
  },
  ko: {
    translation: ko,
  },
  ru: {
    translation: ru,
  },
  es: {
    translation: es,
  },
};

void i18n.use(initReactI18next).init({
  resources,
  // Always `en` on first render so SSR HTML matches the client (localStorage is restored in I18nProvider).
  lng: "en",
  fallbackLng: "en",
  interpolation: {
    escapeValue: false, // React already escapes values from XSS
  },
});

// Automatically save language changes to localStorage
i18n.on("languageChanged", (lng) => {
  if (typeof window !== "undefined") {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, lng);
    document.documentElement.lang = lng;
  }
});

export default i18n;
