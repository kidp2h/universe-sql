// components/UpdateBanner.tsx
"use client";

import { useUpdater } from "@/hooks/use-updater";
import {
  Sparkles,
  Download,
  RefreshCw,
  X,
  CheckCircle2,
  AlertCircle,
  ArrowUpRight,
} from "lucide-react";
import { useState, useEffect } from "react";

export function UpdateBanner() {
  const {
    status,
    progress,
    version,
    error,
    startDownload,
    installUpdate,
    resetStatus,
  } = useUpdater();
  const [dismissed, setDismissed] = useState(false);

  // Reset dismissed state when status changes to show progress/downloaded/not-available states
  useEffect(() => {
    if (status !== "idle") {
      setDismissed(false);
    }
  }, [status]);

  // Auto-dismiss the "not-available" banner after 4 seconds
  useEffect(() => {
    if (status === "not-available") {
      const timer = setTimeout(() => {
        resetStatus();
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [status, resetStatus]);

  if (status === "idle" || dismissed) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[9999] w-96 overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-950/85 p-5 text-zinc-100 shadow-[0_8px_32px_rgba(0,0,0,0.5)] backdrop-blur-xl transition-all duration-300 ease-out animate-in slide-in-from-bottom-5">
      {/* Background glowing sphere decoration */}
      <div className="absolute -right-10 -top-10 -z-10 h-28 w-28 rounded-full bg-violet-600/20 blur-2xl" />

      {/* Close button */}
      <button
        onClick={() => {
          setDismissed(true);
          resetStatus();
        }}
        className="absolute right-3 top-3 rounded-lg p-1 text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-100 transition-colors cursor-pointer"
        aria-label="Close"
      >
        <X size={16} />
      </button>

      {/* Main Content */}
      <div className="flex gap-4">
        {/* Status Icon */}
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-900 border border-zinc-800">
          {status === "available" && (
            <Sparkles size={20} className="text-violet-400 animate-pulse" />
          )}
          {status === "downloading" && (
            <RefreshCw size={20} className="text-indigo-400 animate-spin" />
          )}
          {(status === "downloaded" || status === "not-available") && (
            <CheckCircle2 size={20} className="text-brand/80" />
          )}
          {status === "error" && (
            <AlertCircle size={20} className="text-rose-400" />
          )}
        </div>

        {/* Text and Actions */}
        <div className="flex-1 space-y-3">
          {/* Header */}
          <div>
            <h3 className="font-semibold text-sm tracking-wide text-zinc-100 flex items-center gap-1.5">
              {status === "available" && "New update available!"}
              {status === "downloading" && "Downloading update..."}
              {status === "downloaded" && "Update downloaded!"}
              {status === "not-available" && "You are up to date!"}
              {status === "error" && "Update error"}
            </h3>
            <p className="text-sm text-zinc-400 mt-1">
              {status === "available" &&
                `Version v${version} is ready to download.`}
              {status === "downloading" && `Downloading version v${version}...`}
              {status === "downloaded" &&
                `Version v${version} is ready to install.`}
              {status === "not-available" &&
                "Universe SQL is already using the latest version."}
              {status === "error" && "Could not download the latest update."}
            </p>
          </div>

          {/* Details / Progress bar */}
          {status === "downloading" && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-zinc-500 font-mono">
                <span>PROGRESS</span>
                <span className="text-indigo-400 font-bold">{progress}%</span>
              </div>
              <div className="relative h-2 w-full rounded-full bg-zinc-900 overflow-hidden border border-zinc-800/40">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 transition-all duration-300 ease-out shadow-[0_0_8px_rgba(99,102,241,0.5)]"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {status === "error" && (
            <div className="rounded-lg bg-rose-955/20 border border-rose-900/30 p-2.5 text-[11px] text-rose-300 font-mono break-words leading-normal max-h-20 overflow-y-auto">
              {error}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5 pt-1">
            {status === "available" && (
              <>
                <button
                  onClick={startDownload}
                  className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-[0_2px_10px_rgba(99,102,241,0.3)] transition-all hover:from-violet-500 hover:to-indigo-500 hover:shadow-[0_4px_15px_rgba(99,102,241,0.5)] active:scale-95 cursor-pointer"
                >
                  <Download size={14} />
                  Download now
                </button>
                <button
                  onClick={() => {
                    setDismissed(true);
                    resetStatus();
                  }}
                  className="rounded-xl border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-900 hover:text-zinc-100 px-4 py-2 text-sm font-semibold text-zinc-400 transition-colors cursor-pointer"
                >
                  Skip
                </button>
              </>
            )}

            {status === "downloaded" && (
              <>
                <button
                  onClick={installUpdate}
                  className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-[0_2px_10px_rgba(16,185,129,0.3)] transition-all hover:from-emerald-500 hover:to-teal-500 hover:shadow-[0_4px_15px_rgba(16,185,129,0.5)] active:scale-95 cursor-pointer"
                >
                  <ArrowUpRight size={14} />
                  Install & Restart
                </button>
                <button
                  onClick={() => {
                    setDismissed(true);
                    resetStatus();
                  }}
                  className="rounded-xl border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-900 hover:text-zinc-100 px-4 py-2 text-sm font-semibold text-zinc-400 transition-colors cursor-pointer"
                >
                  Later
                </button>
              </>
            )}

            {status === "not-available" && (
              <button
                onClick={resetStatus}
                className="rounded-xl border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-900 hover:text-zinc-100 px-4 py-2 text-sm font-semibold text-zinc-400 transition-colors cursor-pointer"
              >
                Close
              </button>
            )}

            {status === "error" && (
              <>
                <button
                  onClick={() => {
                    setDismissed(false);
                    window.updater.checkForUpdates();
                  }}
                  className="flex items-center gap-1.5 rounded-xl bg-zinc-900 border border-zinc-800 px-4 py-2 text-sm font-semibold text-zinc-200 transition-colors hover:bg-zinc-800 hover:text-white cursor-pointer"
                >
                  <RefreshCw size={14} />
                  Retry
                </button>
                <button
                  onClick={() => {
                    setDismissed(true);
                    resetStatus();
                  }}
                  className="rounded-xl border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-900 px-4 py-2 text-sm font-semibold text-zinc-400 transition-colors cursor-pointer"
                >
                  Close
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
