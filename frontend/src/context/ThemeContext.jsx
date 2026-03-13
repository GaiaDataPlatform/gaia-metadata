import { createContext, useContext, useState, useEffect } from "react";

const THEMES = ["blue", "light", "green", "impact"];

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() =>
    localStorage.getItem("gaia_theme") || "blue"
  );

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("gaia_theme", theme);
  }, [theme]);

  const cycleTheme = () =>
    setTheme(t => THEMES[(THEMES.indexOf(t) + 1) % THEMES.length]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, cycleTheme, themes: THEMES }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
