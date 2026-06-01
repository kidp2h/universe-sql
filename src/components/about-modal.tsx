import { useTranslation } from "react-i18next";
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { WindowControls } from "./window-controls";
import { Github, Target, User } from "lucide-react";

type AboutModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function AboutModal({ open, onOpenChange }: AboutModalProps) {
  const { t } = useTranslation();
  const [version, setVersion] = useState("0.1.0");

  useEffect(() => {
    if (typeof window !== "undefined" && window.electron?.getAppVersion) {
      window.electron.getAppVersion().then(setVersion);
    }
  }, []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm" showCloseButton={false}>
        <WindowControls
          onClose={() => {
            onOpenChange(false);
          }}
          bgColor="bg-none"
          className="py-3"
        />
        <DialogHeader>
          <DialogTitle>{t("aboutUSQL")}</DialogTitle>
          <DialogDescription>{t("aboutUSQLDesc")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 px-4 text-sm">
          <div className="flex items-center justify-between">
            <div className="text-muted-foreground flex flex-row items-center">
              <Target size={15} />
              <span className="ml-2">{t("version")}</span>
            </div>
            <span className="font-medium">v{version}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="text-muted-foreground flex flex-row items-center">
              <User size={15} />
              <span className="ml-2">{t("author")}</span>
            </div>
            <span className="font-medium">Nguyen Phuc Thinh</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="text-muted-foreground flex flex-row items-center">
              <Github size={15} />
              <span className="ml-2">GitHub</span>
            </div>
            <a
              className="font-medium text-sky-600 hover:text-sky-700"
              href="https://github.com/kidp2h"
              target="_blank"
              rel="noreferrer"
            >
              https://github.com/kidp2h
            </a>
          </div>
        </div>
        <DialogFooter>
          <span className="text-muted-foreground text-sm">
            {t("thanksForTrying")}
          </span>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
