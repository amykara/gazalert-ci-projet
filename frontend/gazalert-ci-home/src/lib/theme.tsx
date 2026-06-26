import { createContext, useContext, useEffect, useState } from "react";

type Theme = "dark" | "light";

const ThemeContext = createContext<{ theme: Theme; toggle: () => void }>({
  theme: "dark",
  toggle: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("dark");

  // Lire localStorage uniquement côté client (pas SSR)
  useEffect(() => {
    const saved = typeof window !== "undefined"
      ? (localStorage.getItem("gazalert-theme") as Theme)
      : null;
    if (saved === "light" || saved === "dark") {
      setTheme(saved);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const root = document.documentElement;
    if (theme === "light") {
      root.classList.add("light");
    } else {
      root.classList.remove("light");
    }
    localStorage.setItem("gazalert-theme", theme);
  }, [theme]);

  const toggle = () => setTheme((t) => (t === "dark" ? "light" : "dark"));

  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
