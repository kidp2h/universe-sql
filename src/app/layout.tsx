import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { type Tour, TourProvider } from "@/components/ui/tour";
import { UpdateBanner } from "@/components/update-banner";
import { ThemeProvider } from "@/providers/theme-provider";
import { I18nProvider } from "@/providers/i18n-provider";
import { THEME_INIT_SCRIPT } from "@/lib/theme-init";
import React from "react";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin", "latin-ext"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin", "latin-ext"],
  adjustFontFallback: false,
});

export const metadata: Metadata = {
  title: "Universe SQL",
  description: "A SQL client for managing your databases",
};

const tours = [
  {
    id: "main",
    steps: [
      {
        id: "welcome",
        title: "Welcome",
        content: "Let's take a quick tour of the main features.",
      },
      {
        id: "feature-1",
        title: "Feature One",
        content: "This is an important feature.",
      },
    ],
  },
] satisfies Tour[];

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: required for early theme init to prevent FOUC */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider>
          <I18nProvider>
            <TourProvider tours={tours}>
              {children}
              <Toaster />
              <UpdateBanner />
            </TourProvider>
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
