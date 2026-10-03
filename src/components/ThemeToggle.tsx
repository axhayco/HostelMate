import React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ className = "", showLabel = false }) => {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      onClick={toggleTheme}
      type="button"
      aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
      title={`Switch to ${isDark ? "light" : "dark"} mode`}
      className={`group relative flex items-center justify-center gap-2 rounded-full p-2.5 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-primary/50 shadow-sm border ${
        isDark
          ? "bg-slate-800/90 text-amber-400 border-slate-700/80 hover:bg-slate-700/90 hover:border-amber-400/40 hover:shadow-amber-500/10 hover:shadow-lg"
          : "bg-white/90 text-amber-600 border-slate-200/80 hover:bg-slate-100/90 hover:border-amber-500/40 hover:shadow-amber-500/10 hover:shadow-md"
      } ${className}`}
    >
      <div className="relative h-5 w-5 flex items-center justify-center overflow-hidden">
        <Sun
          className={`h-5 w-5 transition-transform duration-500 ease-spring ${
            isDark ? "rotate-[90deg] scale-0 opacity-0 absolute" : "rotate-0 scale-100 opacity-100"
          }`}
        />
        <Moon
          className={`h-5 w-5 transition-transform duration-500 ease-spring ${
            isDark ? "rotate-0 scale-100 opacity-100 text-blue-300" : "-rotate-[90deg] scale-0 opacity-0 absolute"
          }`}
        />
      </div>

      {showLabel && (
        <span className="text-xs font-semibold tracking-wide capitalize select-none">
          {isDark ? "Dark" : "Light"}
        </span>
      )}
    </button>
  );
};

export default ThemeToggle;
