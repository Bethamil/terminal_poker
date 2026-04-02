import { useTheme } from "../app/theme";

export const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme();
  const isLightTheme = theme === "light";

  return (
    <button
      aria-label={`Switch to ${isLightTheme ? "dark" : "light"} mode`}
      aria-pressed={isLightTheme}
      className={`theme-toggle ${isLightTheme ? "theme-toggle--light" : ""}`}
      onClick={toggleTheme}
      type="button"
    >
      <span className="theme-toggle__switch" aria-hidden="true">
        <span className="theme-toggle__knob" />
      </span>
      <span className="theme-toggle__mode">{isLightTheme ? "LIGHT" : "DARK"}</span>
    </button>
  );
};
