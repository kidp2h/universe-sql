import { PanelLeft, Sun, Moon } from "lucide-react";
import { CommandGroup } from "@/components/ui/command";
import { AppCommandItem as CommandItem } from "./app-command-item";
import { useTheme } from "@/hooks/use-theme";
import { useSidebar } from "@/components/ui/sidebar";
import { Shortcut } from "../ui/kbd";

interface ViewCommandGroupProps {
  setOpen: (open: boolean) => void;
}

export function ViewCommandGroup({ setOpen }: ViewCommandGroupProps) {
  const { toggleSidebar } = useSidebar();
  const { theme, toggleTheme } = useTheme();

  return (
    <CommandGroup heading="View">
      <CommandItem
        setOpen={setOpen}
        onSelect={() => {
          toggleSidebar();
        }}
      >
        <PanelLeft className="size-4 text-sky-500 mr-2" />
        Toggle Sidebar
        <Shortcut shortcut="⌘ + B" />
      </CommandItem>
      <CommandItem
        setOpen={setOpen}
        onSelect={() => {
          toggleTheme();
        }}
      >
        {theme === "dark" ? (
          <Sun className="size-4 text-amber-500 mr-2" />
        ) : (
          <Moon className="size-4 text-indigo-400 mr-2" />
        )}
        {theme === "dark" ? "Light Mode" : "Dark Mode"}
        <Shortcut shortcut="⌘ + ⇧ + D" />
      </CommandItem>
    </CommandGroup>
  );
}
