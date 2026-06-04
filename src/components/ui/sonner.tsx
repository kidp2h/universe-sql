"use client";

import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react";
import { useTheme } from "next-themes";
import { Toaster as Sonner, type ToasterProps } from "sonner";

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group pointer-events-auto"
      style={
        {
          zIndex: 99999,
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      icons={{
        success: (
          <CircleCheckIcon className="size-5 text-emerald-500 shrink-0" />
        ),
        info: <InfoIcon className="size-5 text-blue-500 shrink-0" />,
        warning: (
          <TriangleAlertIcon className="size-5 text-amber-500 shrink-0" />
        ),
        error: <OctagonXIcon className="size-5 text-rose-500 shrink-0" />,
        loading: (
          <Loader2Icon className="size-5 text-brand animate-spin shrink-0" />
        ),
      }}
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background/80 group-[.toaster]:backdrop-blur-md group-[.toaster]:text-foreground group-[.toaster]:border-border/50 group-[.toaster]:shadow-xl group-[.toaster]:rounded-2xl group-[.toaster]:p-4 group-[.toaster]:gap-3 group-[.toaster]:border group-[.toaster]:transition-all group-[.toaster]:duration-300 font-sans",
          title:
            "group-[.toast]:font-bold group-[.toast]:text-sm group-[.toast]:text-foreground",
          description:
            "group-[.toast]:text-muted-foreground group-[.toast]:text-xs group-[.toast]:leading-relaxed",
          actionButton:
            "group-[.toast]:bg-brand group-[.toast]:text-brand-foreground group-[.toast]:hover:bg-brand/90 group-[.toast]:font-bold group-[.toast]:rounded-xl group-[.toast]:text-xs group-[.toast]:px-3 group-[.toast]:py-1.5 group-[.toast]:transition-all",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground group-[.toast]:hover:bg-muted/80 group-[.toast]:font-bold group-[.toast]:rounded-xl group-[.toast]:text-xs group-[.toast]:px-3 group-[.toast]:py-1.5 group-[.toast]:transition-all",
          success:
            "group-[.toaster]:border-emerald-500/20 group-[.toaster]:bg-emerald-500/5 group-[.toaster]:shadow-emerald-500/5",
          error:
            "group-[.toaster]:border-rose-500/20 group-[.toaster]:bg-rose-500/5 group-[.toaster]:shadow-rose-500/5",
          warning:
            "group-[.toaster]:border-amber-500/20 group-[.toaster]:bg-amber-500/5 group-[.toaster]:shadow-amber-500/5",
          info: "group-[.toaster]:border-blue-500/20 group-[.toaster]:bg-blue-500/5 group-[.toaster]:shadow-blue-500/5",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
