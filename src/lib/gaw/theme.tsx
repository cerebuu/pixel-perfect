import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

export type ThemePref = "light" | "dark" | "system";
export const THEME_KEY = "gaw:theme";

export function resolveTheme(pref: ThemePref, systemDark: boolean): "light" | "dark" {
  return pref === "system" ? (systemDark ? "dark" : "light") : pref;
}

/** Runs before first paint (inlined in <head>) so the page never flashes the wrong theme. */
export const THEME_BOOT_SCRIPT = `(function(){try{var p=localStorage.getItem("${THEME_KEY}")||"system";var d=p==="dark"||(p==="system"&&matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",d);document.documentElement.style.colorScheme=d?"dark":"light";}catch(e){}})();`;

interface ThemeCtx {
  pref: ThemePref;
  resolved: "light" | "dark";
  ready: boolean;
  setPref: (p: ThemePref) => void;
}

const Ctx = createContext<ThemeCtx | null>(null);

function readStoredThemePref(): ThemePref {
  if (typeof window === "undefined") return "system";
  try {
    const stored = window.localStorage.getItem(THEME_KEY);
    if (stored === "light" || stored === "dark" || stored === "system") return stored;
  } catch {
    /* ignore storage errors */
  }
  return "system";
}

function apply(resolved: "light" | "dark") {
  const el = document.documentElement;
  el.classList.toggle("dark", resolved === "dark");
  el.style.colorScheme = resolved;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [pref, setPrefState] = useState<ThemePref>("system");
  const [resolved, setResolved] = useState<"light" | "dark">("light");
  const [ready, setReady] = useState(false);

  // Restore saved preference synchronously inside the first mount commit before evaluating
  // fallback system preference, preventing a transient light/dark flash on opposing OS themes.
  useEffect(() => {
    const storedPref = readStoredThemePref();
    setPrefState(storedPref);
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const initialResolved = resolveTheme(storedPref, mq.matches);
    setResolved(initialResolved);
    apply(initialResolved);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const update = () => {
      const r = resolveTheme(pref, mq.matches);
      setResolved(r);
      apply(r);
    };
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [pref, ready]);

  const setPref = useCallback((p: ThemePref) => {
    setPrefState(p);
    try {
      window.localStorage.setItem(THEME_KEY, p);
    } catch {
      /* ignore storage errors */
    }
  }, []);

  return <Ctx.Provider value={{ pref, resolved, ready, setPref }}>{children}</Ctx.Provider>;
}

export function useTheme() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useTheme must be used inside ThemeProvider");
  return c;
}
