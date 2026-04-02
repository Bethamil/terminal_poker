import { useTheme } from "../app/theme";

export const ThemeToggle = ({ size = "default" }: { size?: "default" | "menu" }) => {
  const { theme, toggleTheme } = useTheme();
  const isLightTheme = theme === "light";
  const isMenuSize = size === "menu";

  return (
    <button
      aria-label={`Switch to ${isLightTheme ? "dark" : "light"} mode`}
      aria-pressed={isLightTheme}
      className={[
        "theme-toggle",
        isLightTheme ? "theme-toggle--light" : "",
        isMenuSize ? "theme-toggle--menu" : ""
      ]
        .filter(Boolean)
        .join(" ")}
      onClick={toggleTheme}
      type="button"
    >
      <span aria-hidden="true" className="theme-toggle__switch">
        <span className="theme-toggle__knob" />
      </span>
      <span className="theme-toggle__mode">{isLightTheme ? "LIGHT" : "DARK"}</span>
    </button>
  );
};
