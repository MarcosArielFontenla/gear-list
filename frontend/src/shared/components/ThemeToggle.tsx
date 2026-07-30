import { Moon, Sun } from "lucide-react";
import type { Theme } from "../types/theme";

type ThemeToggleProps = {
  theme: Theme;
  onToggle: () => void;
};

export function ThemeToggle({ theme, onToggle }: ThemeToggleProps) {
  return (
    <button
      className="icon-button"
      type="button"
      onClick={onToggle}
      aria-label={`Cambiar al tema ${theme === "dark" ? "claro" : "oscuro"}`}
    >
      {theme === "dark"
        ? <Sun aria-hidden="true" />
        : <Moon aria-hidden="true" />}
    </button>
  );
}
