// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

await vi.hoisted(async () => {
  // @ts-expect-error -- jsdom runtime dependency is present without @types/jsdom
  const { JSDOM } = await import("jsdom");
  const dom = new JSDOM("<!doctype html><html><body></body></html>", {
    url: "https://gaw.local/hire",
    pretendToBeVisual: true,
  });
  const win = dom.window as Record<string, unknown>;
  const keys = [
    "window",
    "document",
    "navigator",
    "location",
    "HTMLElement",
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
    "matchMedia",
    "scrollTo",
  ];
  // Provide PointerEvent fallback if JSDOM version omits it
  if (!win["PointerEvent"]) {
    win["PointerEvent"] = win["MouseEvent"];
  }
  if (!win["scrollTo"]) {
    win["scrollTo"] = () => {};
  }
  if (!win["matchMedia"]) {
    win["matchMedia"] = (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    });
  }
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
  if (typeof globalThis.ResizeObserver === "undefined") {
    globalThis.ResizeObserver = class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  }
});

import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import { QueryClient } from "@tanstack/react-query";
import { createMemoryHistory, createRouter, RouterContextProvider } from "@tanstack/react-router";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { AccountMenuContentBody } from "@/components/gaw/AppLayout";
import { I18nProvider, type Locale } from "@/lib/gaw/i18n";
import { GawProvider, initialState, type GawState } from "@/lib/gaw/store";
import { ThemeProvider } from "@/lib/gaw/theme";
import { routeTree } from "@/routeTree.gen";

interface MockRect {
  left: number;
  right: number;
  top: number;
  bottom: number;
  width: number;
  height: number;
}

function makeSignedInState(): GawState {
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
  };
}

let activeViewport = { width: 1920, height: 1080 };
let activeProItemRect: MockRect = {
  left: 1272,
  right: 1516,
  top: 410,
  bottom: 446,
  width: 244,
  height: 36,
};

function setViewportAndProRect(
  viewportWidth: number,
  viewportHeight: number,
  rect: { left: number; right: number; top: number; bottom: number },
) {
  activeViewport = { width: viewportWidth, height: viewportHeight };
  activeProItemRect = {
    ...rect,
    width: rect.right - rect.left,
    height: rect.bottom - rect.top,
  };
  Object.defineProperty(window, "innerWidth", {
    configurable: true,
    writable: true,
    value: viewportWidth,
  });
  Object.defineProperty(window, "innerHeight", {
    configurable: true,
    writable: true,
    value: viewportHeight,
  });
  Object.defineProperty(document.documentElement, "clientWidth", {
    configurable: true,
    value: viewportWidth,
  });
  Object.defineProperty(document.documentElement, "clientHeight", {
    configurable: true,
    value: viewportHeight,
  });
}

function createTestRouter(path = "/hire") {
  return createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [path] }),
    context: { queryClient: new QueryClient() },
  });
}

function renderAccountMenu(opts: { path?: string; locale?: Locale } = {}) {
  const router = createTestRouter(opts.path ?? "/hire");
  const utils = render(
    <ThemeProvider>
      <I18nProvider initialLocale={opts.locale ?? "en-PH"}>
        <GawProvider initialStateOverride={makeSignedInState()}>
          <RouterContextProvider router={router}>
            <DropdownMenuPrimitive.Root open modal={false}>
              <DropdownMenuPrimitive.Trigger asChild>
                <button type="button">Account</button>
              </DropdownMenuPrimitive.Trigger>
              <DropdownMenuPrimitive.Content>
                <AccountMenuContentBody />
              </DropdownMenuPrimitive.Content>
            </DropdownMenuPrimitive.Root>
          </RouterContextProvider>
        </GawProvider>
      </I18nProvider>
    </ThemeProvider>,
  );
  return { ...utils, router };
}

/** Finds the Radix TooltipContent element carrying `data-side` (excluding DropdownMenuContent). */
function getTooltipContentEl(): HTMLElement | null {
  const candidates = Array.from(
    document.body.querySelectorAll<HTMLElement>(
      '[data-radix-popper-content-wrapper] [data-side]:not([role="menu"])',
    ),
  );
  return (
    candidates.find((el) => Boolean(el.querySelector('[role="tooltip"]'))) ?? candidates[0] ?? null
  );
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (
    this: HTMLElement,
  ) {
    if (
      this.getAttribute("role") === "menuitem" &&
      this.textContent?.includes("GAW Pro Subscription")
    ) {
      return {
        ...activeProItemRect,
        x: activeProItemRect.left,
        y: activeProItemRect.top,
        toJSON: () => activeProItemRect,
      } as DOMRect;
    }

    const popperWrapper = this.hasAttribute("data-radix-popper-content-wrapper")
      ? this
      : this.closest<HTMLElement>("[data-radix-popper-content-wrapper]");
    if (popperWrapper && !popperWrapper.querySelector('[role="menu"]')) {
      const styledTooltip = this.matches("[data-side]")
        ? this
        : popperWrapper.querySelector<HTMLElement>("[data-side]");
      const maxWidthRaw = styledTooltip?.style?.maxWidth || this.style?.maxWidth;
      const maxWidth = maxWidthRaw ? parseFloat(maxWidthRaw) || 200 : 200;
      const width = Math.min(maxWidth, 210);
      const height = width < 175 ? 42 : 30;
      const rect = {
        left: 0,
        top: 0,
        right: width,
        bottom: height,
        width,
        height,
      };
      return { ...rect, x: 0, y: 0, toJSON: () => rect } as DOMRect;
    }

    const fallback = {
      left: 0,
      top: 0,
      right: activeViewport.width,
      bottom: activeViewport.height,
      width: 240,
      height: 36,
    };
    return { ...fallback, x: 0, y: 0, toJSON: () => fallback } as DOMRect;
  });
});

afterEach(() => {
  cleanup();
  window.localStorage?.clear();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("GAW Pro Subscription mounted DOM tooltip positioning & UX", () => {
  it("opens on the RIGHT on 1920px and 1440px (and 1425px with scrollbar) without flipping left", async () => {
    const scenarios = [
      {
        label: "1920px desktop",
        vw: 1920,
        vh: 1080,
        rect: { left: 1272, right: 1516, top: 410, bottom: 446 },
        expectedMaxWidth: "224px",
      },
      {
        label: "1440px desktop",
        vw: 1440,
        vh: 900,
        rect: { left: 1016, right: 1260, top: 410, bottom: 446 },
        expectedMaxWidth: "158px",
      },
      {
        label: "1425px scrollbar desktop",
        vw: 1425,
        vh: 900,
        rect: { left: 1010, right: 1254, top: 410, bottom: 446 },
        expectedMaxWidth: "149px",
      },
    ];

    for (const s of scenarios) {
      setViewportAndProRect(s.vw, s.vh, s.rect);
      renderAccountMenu();

      const proItem = screen.getByRole("menuitem", { name: /GAW Pro Subscription/i });

      await act(async () => {
        fireEvent.pointerMove(proItem);
        await vi.advanceTimersByTimeAsync(350);
      });

      const tooltipContent = getTooltipContentEl();
      expect(tooltipContent, s.label).not.toBeNull();
      expect(tooltipContent?.getAttribute("data-side"), s.label).toBe("right");
      expect(tooltipContent?.getAttribute("data-side"), s.label).not.toBe("left");
      expect(tooltipContent?.style.maxWidth, s.label).toBe(s.expectedMaxWidth);
      expect(tooltipContent?.textContent, s.label).toContain("Explore exclusive GAW Pro benefits");
      expect(tooltipContent?.className, s.label).toContain("bg-deep");
      expect(tooltipContent?.className, s.label).toContain("dark:bg-[#132B23]");
      expect(tooltipContent?.className, s.label).toContain("border-gold/45");
      expect(tooltipContent?.className, s.label).toContain("text-balance");
      expect(tooltipContent?.className, s.label).toContain("z-[60]");
      expect(tooltipContent?.className, s.label).toContain("pointer-events-none");
      expect(tooltipContent?.className, s.label).toContain("motion-reduce:animate-none");

      await act(async () => {
        fireEvent.pointerLeave(proItem);
        await vi.advanceTimersByTimeAsync(50);
      });
      cleanup();
    }
  });

  it("falls back to BOTTOM (never left) on 1280px laptop, 768px tablet, and 390px/360px mobile", async () => {
    const scenarios = [
      {
        label: "1280px laptop",
        vw: 1280,
        vh: 720,
        rect: { left: 936, right: 1180, top: 410, bottom: 446 },
      },
      {
        label: "768px tablet",
        vw: 768,
        vh: 1024,
        rect: { left: 488, right: 732, top: 410, bottom: 446 },
      },
      {
        label: "390px mobile",
        vw: 390,
        vh: 844,
        rect: { left: 118, right: 374, top: 410, bottom: 446 },
      },
      {
        label: "360px compact mobile",
        vw: 360,
        vh: 640,
        rect: { left: 88, right: 344, top: 410, bottom: 446 },
      },
    ];

    for (const s of scenarios) {
      setViewportAndProRect(s.vw, s.vh, s.rect);
      renderAccountMenu();

      const proItem = screen.getByRole("menuitem", { name: /GAW Pro Subscription/i });
      await act(async () => {
        fireEvent.pointerMove(proItem);
        await vi.advanceTimersByTimeAsync(350);
      });

      const tooltipContent = getTooltipContentEl();
      expect(tooltipContent, s.label).not.toBeNull();
      expect(tooltipContent?.getAttribute("data-side"), s.label).toBe("bottom");
      expect(tooltipContent?.getAttribute("data-side"), s.label).not.toBe("left");

      cleanup();
    }
  });

  it("falls back to TOP (never left) when right and bottom space are constrained", async () => {
    setViewportAndProRect(1260, 420, { left: 980, right: 1220, top: 360, bottom: 396 });
    renderAccountMenu();

    const proItem = screen.getByRole("menuitem", { name: /GAW Pro Subscription/i });
    await act(async () => {
      fireEvent.pointerMove(proItem);
      await vi.advanceTimersByTimeAsync(350);
    });

    const tooltipContent = getTooltipContentEl();
    expect(tooltipContent).not.toBeNull();
    expect(tooltipContent?.getAttribute("data-side")).toBe("top");
    expect(tooltipContent?.getAttribute("data-side")).not.toBe("left");
  });

  it("supports keyboard focus activation, localized strings, and navigating to /pro without tooltip obstruction", async () => {
    setViewportAndProRect(1920, 1080, { left: 1272, right: 1516, top: 410, bottom: 446 });
    window.localStorage.setItem("gaw:locale", "fil-PH");
    const { router } = renderAccountMenu({ locale: "fil-PH" });

    const proItem = screen.getByRole("menuitem", { name: /GAW Pro Subscription/i });
    await act(async () => {
      fireEvent.focus(proItem);
      await vi.advanceTimersByTimeAsync(50);
    });

    const tooltipContent = getTooltipContentEl();
    expect(tooltipContent).not.toBeNull();
    expect(tooltipContent?.getAttribute("data-side")).toBe("right");
    expect(tooltipContent?.textContent).toContain("Tuklasin ang mga benepisyo ng GAW Pro");

    await act(async () => {
      fireEvent.click(proItem);
      await vi.advanceTimersByTimeAsync(50);
    });

    expect(router.state.location.pathname).toBe("/pro");
  });
});
