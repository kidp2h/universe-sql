"use client";

import * as React from "react";
import i18n, { LANGUAGE_STORAGE_KEY, SUPPORTED_LANGUAGES } from "@/lib/i18n";

function getStoredLanguage(): string {
  const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY) as typeof SUPPORTED_LANGUAGES[number];
  if (stored && SUPPORTED_LANGUAGES.includes(stored)) {
    return stored;
  }
  return "en";
}

/** Restores persisted locale after hydration so SSR (always `en`) matches the first client render. */
export function I18nProvider({ children }: { children: React.ReactNode }) {
  React.useLayoutEffect(() => {
    const lng = getStoredLanguage();
    document.documentElement.lang = lng;
    if (i18n.language !== lng) {
      void i18n.changeLanguage(lng);
    }
  }, []);

  return children;
}
