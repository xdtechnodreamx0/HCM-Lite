"use client";

import { createContext, useContext, useEffect, useSyncExternalStore, type ReactNode } from "react";
import { Moon, Music2, Palette, Sun, Waves } from "lucide-react";

export type ThemeName = "day" | "night" | "peaceful" | "disco";

const THEME_KEY = "people.works.theme";
const THEME_CHANGE = "people-theme-change";
const ThemeContext = createContext<{ theme: ThemeName; setTheme: (theme: ThemeName) => void } | null>(null);

function getThemeSnapshot(): ThemeName {
  const saved = window.localStorage.getItem(THEME_KEY);
  if (saved === "day" || saved === "night" || saved === "peaceful" || saved === "disco") return saved;
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "night" : "day";
}

function subscribeToTheme(listener: () => void) {
  window.addEventListener("storage", listener);
  window.addEventListener(THEME_CHANGE, listener);
  return () => {
    window.removeEventListener("storage", listener);
    window.removeEventListener(THEME_CHANGE, listener);
  };
}

function getServerThemeSnapshot(): ThemeName { return "day"; }

export function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = useSyncExternalStore(subscribeToTheme, getThemeSnapshot, getServerThemeSnapshot);
  const setTheme = (next: ThemeName) => {
    window.localStorage.setItem(THEME_KEY, next);
    window.dispatchEvent(new Event(THEME_CHANGE));
  };

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}

export function ThemePicker({ compact = false }: { compact?: boolean }) {
  const value = useContext(ThemeContext);
  if (!value) throw new Error("ThemePicker must be rendered inside ThemeProvider.");
  const ThemeIcon = value.theme === "day" ? Sun : value.theme === "night" ? Moon : value.theme === "peaceful" ? Waves : Music2;

  return (
    <label className={`theme-picker ${compact ? "theme-picker-compact" : ""}`}>
      <Palette size={15} aria-hidden="true" />
      <span className="sr-only">Display theme</span>
      <select aria-label="Display theme" title={themeDescription[value.theme]} value={value.theme} onChange={(event) => value.setTheme(event.target.value as ThemeName)}>
        <option value="day">Day mode</option>
        <option value="night">Night mode</option>
        <option value="peaceful">Peaceful mode</option>
        <option value="disco">Disco mode</option>
      </select>
      <ThemeIcon size={14} aria-hidden="true" />
    </label>
  );
}

const themeDescription: Record<ThemeName, string> = {
  day: "Balanced light colors for daytime work.",
  night: "Dark surfaces for a dimmer workspace.",
  peaceful: "Softer greens and slow ambient color movement. Some people may find this calmer; comfort varies.",
  disco: "Bright gradients and slow glow effects for a more playful workspace.",
};

export function ThemeDescription() {
  const value = useContext(ThemeContext);
  if (!value) throw new Error("ThemeDescription must be rendered inside ThemeProvider.");
  return <p className="theme-description" aria-live="polite">{themeDescription[value.theme]} Animations respect your device’s reduced-motion setting.</p>;
}
