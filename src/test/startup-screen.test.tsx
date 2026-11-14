// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

const matchMediaState = vi.hoisted(() => ({
  dark: false,
  reducedMotion: false,
  listeners: new Map<string, Set<(e: MediaQueryListEvent) => void>>(),
}));

await vi.hoisted(async () => {
  // @ts-expect-error -- jsdom runtime dependency is present without @types/jsdom
  const { JSDOM } = await import("jsdom");
  const dom = new JSDOM("<!doctype html><html lang='en-PH'><body></body></html>", {
    url: "https://gaw.local/",
    pretendToBeVisual: true,
  });
  const win = dom.window as Record<string, unknown>;
  const keys = [
    "window",
    "document",
    "navigator",
    "location",
    "HTMLElement",
    "HTMLButtonElement",
    "HTMLFormElement",
    "HTMLInputElement",
    "SVGElement",
    "Element",
    "Node",
    "Text",
    "Event",
    "CustomEvent",
    "MouseEvent",
    "KeyboardEvent",
    "FocusEvent",
    "PointerEvent",
    "MutationObserver",
    "DocumentFragment",
    "DOMRect",
    "getComputedStyle",
    "requestAnimationFrame",
    "cancelAnimationFrame",
    "scrollTo",
    "localStorage",
    "sessionStorage",
  ];
  if (!win["PointerEvent"]) {
    win["PointerEvent"] = win["MouseEvent"];
  }
  win["scrollTo"] = () => {};
  win["matchMedia"] = (query: string) => {
    const getMatches = () => {
      if (query.includes("prefers-color-scheme: dark")) return matchMediaState.dark;
      if (query.includes("prefers-reduced-motion: reduce")) return matchMediaState.reducedMotion;
      return false;
    };
    return {
      get matches() {
        return getMatches();
      },
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: (_type: string, cb: (e: MediaQueryListEvent) => void) => {
        const set = matchMediaState.listeners.get(query) ?? new Set();
        set.add(cb);
        matchMediaState.listeners.set(query, set);
      },
      removeEventListener: (_type: string, cb: (e: MediaQueryListEvent) => void) => {
        matchMediaState.listeners.get(query)?.delete(cb);
      },
      dispatchEvent: () => false,
    };
  };
  Object.assign(globalThis, { window: dom.window, self: dom.window });
  for (const key of keys) {
    if (key in win && win[key] !== undefined && key !== "window") {
      Object.defineProperty(globalThis, key, {
        configurable: true,
        writable: true,
        value: win[key],
      });
    }
  }
  Object.defineProperty(globalThis, "matchMedia", {
    configurable: true,
    writable: true,
    value: win["matchMedia"],
  });
});

import { QueryClient } from "@tanstack/react-query";
import { createMemoryHistory, createRouter, RouterProvider } from "@tanstack/react-router";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { GAWConnectionMotif, GAWStartupScreen } from "@/components/gaw/GAWStartupScreen";
import { prefersReducedMotion } from "@/components/gaw/interactions";
import { I18nProvider, LOCALE_BOOT_SCRIPT, LOCALE_KEY } from "@/lib/gaw/i18n";
import { initialState, STORAGE_KEY, type GawState } from "@/lib/gaw/store";
import { THEME_BOOT_SCRIPT, THEME_KEY, ThemeProvider, useTheme } from "@/lib/gaw/theme";
import { Route as RootRoute } from "@/routes/__root";
import { routeTree } from "@/routeTree.gen";

function makeSessionState(overrides: Partial<GawState> = {}): GawState {
  return {
    ...initialState,
    account: {
      name: "Juan Dela Cruz",
      email: "juan@gaw.demo",
      mobile: "0917 555 0101",
      isDemo: true,
    },
    signedIn: true,
    mode: "hire",
    locationId: "bajada",
    ...overrides,
  };
}

function resetDomAndStorage() {
  cleanup();
  vi.useRealTimers();
  matchMediaState.dark = false;
  matchMediaState.reducedMotion = false;
  matchMediaState.listeners.clear();
  window.localStorage.clear();
  window.sessionStorage.clear();
  document.documentElement.className = "";
  document.documentElement.lang = "en-PH";
  delete document.documentElement.dataset["gawBooted"];
  document.documentElement.style.colorScheme = "";
}

async function mountAppAt(path: string, reducedMotion = true) {
  matchMediaState.reducedMotion = reducedMotion;
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [path] }),
    context: { queryClient: new QueryClient() },
  });
  await router.load();
  const utils = render(<RouterProvider router={router} />);
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 25));
  });
  return { router, ...utils };
}

describe("GAWStartupScreen & Root Startup Lifecycle", () => {
  afterEach(() => {
    resetDomAndStorage();
  });

  it("renders THE GAW CONNECTION visual identity with untouched logo, GAW title, tagline, and no Grab a Work duplication", () => {
    render(
      <I18nProvider>
        <GAWStartupScreen essentialReady={false} onComplete={() => {}} reducedMotion={false} />
      </I18nProvider>,
    );

    const screenEl = screen.getByTestId("gaw-startup-screen");
    expect(screenEl.textContent).toContain("GAW");
    expect(screenEl.textContent).toContain("Local Work. Nearby Opportunities.");
    expect(screenEl.textContent).not.toContain("Grab a Work");

    const logo = screenEl.querySelector("img") as HTMLImageElement | null;
    expect(logo).not.toBeNull();
    expect(logo?.getAttribute("alt")).toBe("GAW");
    expect(logo?.className).toContain("object-contain");

    // Live region announcement without fake loading percentages
    const status = screen.getByRole("status");
    expect(status.getAttribute("aria-live")).toBe("polite");
    expect(screenEl.textContent).not.toMatch(/\d+%/);

    // Dual-node connection motif arcs present
    const arcs = screenEl.querySelectorAll(".gaw-startup-arc");
    expect(arcs.length).toBe(2);

    // Responsive 360px+ safety classes
    expect(screenEl.className).toContain("overflow-hidden");
    expect(screenEl.className).toContain("min-h-dvh");
  });

  it("dismisses cleanly via brief entrance floor + immediate pointer-events release on exit", () => {
    vi.useFakeTimers();
    const onComplete = vi.fn();

    render(
      <I18nProvider>
        <GAWStartupScreen
          essentialReady
          minEntranceMs={640}
          exitDurationMs={280}
          reducedMotion={false}
          onComplete={onComplete}
        />
      </I18nProvider>,
    );

    const overlay = screen.getByTestId("gaw-startup-screen");
    expect(overlay.getAttribute("data-phase")).toBe("entering");
    expect(onComplete).not.toHaveBeenCalled();

    // Wait just before hold floor -> still entering
    act(() => {
      vi.advanceTimersByTime(600);
    });
    expect(overlay.getAttribute("data-phase")).toBe("entering");
    expect(overlay.className).not.toContain("pointer-events-none");

    // Cross hold floor -> enters exiting phase immediately releasing clicks & ARIA
    act(() => {
      vi.advanceTimersByTime(50);
    });
    expect(overlay.getAttribute("data-phase")).toBe("exiting");
    expect(overlay.className).toContain("pointer-events-none");
    expect(overlay.getAttribute("aria-hidden")).toBe("true");
    expect(onComplete).not.toHaveBeenCalled();

    // Exit transition finishes -> invokes permanent unmount callback
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("bypasses hold & exit delays when prefers-reduced-motion is enabled", () => {
    vi.useFakeTimers();
    matchMediaState.reducedMotion = true;
    expect(prefersReducedMotion()).toBe(true);

    const onComplete = vi.fn();
    render(
      <I18nProvider>
        <GAWStartupScreen
          essentialReady
          minEntranceMs={640}
          exitDurationMs={280}
          onComplete={onComplete}
        />
      </I18nProvider>,
    );

    act(() => {
      vi.advanceTimersByTime(5);
    });
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("applies pre-hydration light/dark themes without FOUC or transient opposing-OS flip", async () => {
    // Saved light preference while OS dark mode is active: must stay light cleanly on mount
    matchMediaState.dark = true;
    window.localStorage.setItem(THEME_KEY, "light");

    const observedDarkFrames: boolean[] = [];
    function Probe() {
      const { resolved, ready } = useTheme();
      observedDarkFrames.push(document.documentElement.classList.contains("dark"));
      return <span data-testid="probe">{`${ready}:${resolved}`}</span>;
    }

    // Run head bootstrap script before React mounts
    new Function(THEME_BOOT_SCRIPT)();
    expect(document.documentElement.classList.contains("dark")).toBe(false);

    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );

    await act(async () => {});
    expect(screen.getByTestId("probe").textContent).toBe("true:light");
    expect(observedDarkFrames.every((isDark) => isDark === false)).toBe(true);
    expect(document.documentElement.classList.contains("dark")).toBe(false);

    // Saved dark preference activates dark immediately before hydration
    cleanup();
    window.localStorage.setItem(THEME_KEY, "dark");
    new Function(THEME_BOOT_SCRIPT)();
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(document.documentElement.style.colorScheme).toBe("dark");
  });

  it("restores en-PH, fil-PH, ceb-PH locales safely and rejects invalid stored locales", async () => {
    for (const [stored, expected] of [
      ["en-PH", "en-PH"],
      ["fil-PH", "fil-PH"],
      ["ceb-PH", "ceb-PH"],
      ["es-ES", "en-PH"],
    ] as const) {
      window.localStorage.setItem(LOCALE_KEY, stored);
      new Function(LOCALE_BOOT_SCRIPT)();
      expect(document.documentElement.lang).toBe(expected);

      render(
        <I18nProvider>
          <GAWStartupScreen essentialReady={false} maxTimeoutMs={1000} onComplete={() => {}} />
        </I18nProvider>,
      );
      await act(async () => {});
      expect(document.documentElement.lang).toBe(expected);

      const status = screen.getByRole("status");
      if (expected === "fil-PH") {
        expect(status.textContent).toContain("Kumokonekta");
      } else if (expected === "ceb-PH") {
        expect(status.textContent).toContain("Nagkonekta");
      } else {
        expect(status.textContent).toContain("Connecting local work");
      }
      cleanup();
    }
  });

  it("recovers cleanly from missing logo images, failed asset loads, slow timeouts, and Retry/Reset actions", () => {
    vi.useFakeTimers();
    const onComplete = vi.fn();
    const onRetry = vi.fn();
    const onRecoveryReset = vi.fn();

    render(
      <I18nProvider>
        <GAWStartupScreen
          essentialReady={false}
          maxTimeoutMs={2000}
          onComplete={onComplete}
          onRetry={onRetry}
          onRecoveryReset={onRecoveryReset}
        />
      </I18nProvider>,
    );

    // 1. Missing logo asset falls back to inline SVG vector emblem without trapping the app
    const screenEl = screen.getByTestId("gaw-startup-screen");
    const img = screenEl.querySelector("img") as HTMLImageElement;
    fireEvent.error(img);
    expect(screenEl.querySelector("[data-logo-fallback='true']")).not.toBeNull();
    expect(screenEl.querySelector("img")).toBeNull();

    // 2. Slow startup timeout triggers recovery dialog with keyboard-focused Retry & Continue escape hatch
    act(() => {
      vi.advanceTimersByTime(2050);
    });
    expect(screenEl.getAttribute("data-phase")).toBe("timeout");
    const dialog = screen.getByRole("alertdialog");
    expect(dialog.textContent).toContain("Taking longer than expected");
    const retryBtn = screen.getByRole("button", { name: /Try Again/i });
    expect(document.activeElement).toBe(retryBtn);

    fireEvent.click(retryBtn);
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(screenEl.getAttribute("data-phase")).toBe("entering");

    // 3. Critical vite:preloadError immediately surfaces error recovery + working Reset & Go Home
    act(() => {
      window.dispatchEvent(new Event("vite:preloadError"));
    });
    expect(screenEl.getAttribute("data-phase")).toBe("error");
    expect(screen.getByRole("alertdialog").textContent).toContain("Unable to finish starting GAW");

    window.localStorage.setItem(STORAGE_KEY, "{corrupt-json");
    const resetBtn = screen.getByRole("button", { name: /Reset local cache/i });
    fireEvent.click(resetBtn);
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(onRecoveryReset).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("handles first visit, saved session deep links, protected auth redirects, and internal navigation without re-mounting", async () => {
    // 1. First visit on '/': reveals Get Started & Log In cleanly with zero duplicate loaders
    const first = await mountAppAt("/", true);
    expect(screen.queryByTestId("gaw-startup-screen")).toBeNull();
    expect(screen.getByRole("link", { name: /Get Started/i })).toBeTruthy();
    expect(screen.queryByText("Loading GAW…")).toBeNull();
    first.unmount();

    // 2. Returning user with saved session on '/': skips Get Started directly to Continue to GAW -> /work
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(makeSessionState({ mode: "work" })));
    const returning = await mountAppAt("/", true);
    const contLink = screen.getByRole("link", { name: /Continue to GAW/i });
    expect(contLink.getAttribute("href")).toBe("/work");
    returning.unmount();

    // 3. Returning user deep-linking directly to /pro preserves destination & internal navigations never re-show startup overlay
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(makeSessionState({ mode: "hire" })));
    const deep = await mountAppAt("/pro", true);
    expect(deep.router.state.location.pathname).toBe("/pro");
    expect(screen.getByRole("heading", { name: /GAW Pro Subscription/i })).toBeTruthy();
    expect(screen.queryByTestId("gaw-startup-screen")).toBeNull();
    expect(screen.queryByText("Loading GAW…")).toBeNull();

    // Navigate internally across /bookings -> /settings -> /mode: startup overlay must never remount!
    await act(async () => {
      await deep.router.navigate({ to: "/bookings" });
    });
    expect(deep.router.state.location.pathname).toBe("/bookings");
    expect(screen.queryByTestId("gaw-startup-screen")).toBeNull();

    await act(async () => {
      await deep.router.navigate({ to: "/settings" });
    });
    expect(deep.router.state.location.pathname).toBe("/settings");
    expect(screen.queryByTestId("gaw-startup-screen")).toBeNull();

    await act(async () => {
      await deep.router.navigate({ to: "/mode" });
    });
    expect(deep.router.state.location.pathname).toBe("/mode");
    expect(screen.queryByTestId("gaw-startup-screen")).toBeNull();
    deep.unmount();

    // 4. Signed-out deep link to /hire redirects cleanly to /login without flashing Loading GAW… duplicate
    window.localStorage.clear();
    const unauth = await mountAppAt("/hire", true);
    await act(async () => {
      await Promise.resolve();
    });
    expect(unauth.router.state.location.pathname).toBe("/login");
    expect(screen.queryByText("Loading GAW…")).toBeNull();
    unauth.unmount();
  });

  it("supports optional compact GAWConnectionMotif reuse & safe-area mobile viewport metadata", () => {
    const { container } = render(<GAWConnectionMotif size="md" />);
    expect(container.querySelectorAll(".gaw-startup-arc").length).toBe(2);
    expect(container.querySelector("img")?.getAttribute("alt")).toBe("GAW");

    const head = RootRoute.options.head?.({} as never) as
      { meta?: Array<{ name?: string; content?: string }> } | undefined;
    const viewportMeta = head?.meta?.find((m) => m.name === "viewport");
    expect(viewportMeta?.content).toContain("viewport-fit=cover");
  });

  it("recovers cleanly when saved session JSON is corrupted", async () => {
    window.localStorage.setItem(STORAGE_KEY, "{{not valid json");
    const mounted = await mountAppAt("/", true);
    expect(screen.queryByTestId("gaw-startup-screen")).toBeNull();
    expect(screen.getByRole("link", { name: /Get Started/i })).toBeTruthy();
    mounted.unmount();
  });
});
