// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

await vi.hoisted(async () => {
  // @ts-expect-error -- jsdom runtime dependency is present without @types/jsdom
  const { JSDOM } = await import("jsdom");
  const dom = new JSDOM("<!doctype html><html><body></body></html>", {
    url: "https://gaw.local/pro",
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
});

import { QueryClient } from "@tanstack/react-query";
import { createMemoryHistory, createRouter, RouterContextProvider } from "@tanstack/react-router";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { AppLayout } from "@/components/gaw/AppLayout";
import { I18nProvider, type Locale } from "@/lib/gaw/i18n";
import { GawProvider, initialState, type GawState, type ProPlan } from "@/lib/gaw/store";
import { ThemeProvider } from "@/lib/gaw/theme";
import { routeTree } from "@/routeTree.gen";
import { ProSubscriptionExperience } from "@/routes/pro";

function makeSignedInProState(plans: ProPlan[] = [], mode: "hire" | "work" = "hire"): GawState {
  return {
    ...initialState,
    account: {
      name: "Juan Dela Cruz",
      email: "juan@gaw.demo",
      mobile: "0917 555 0101",
      isDemo: true,
    },
    signedIn: true,
    mode,
    locationId: "bajada",
    plans,
  };
}

function renderProPage(opts: {
  plans?: ProPlan[];
  mode?: "hire" | "work";
  locale?: Locale;
  withLayout?: boolean;
}) {
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: ["/pro"] }),
    context: { queryClient: new QueryClient() },
  });
  const state = makeSignedInProState(opts.plans ?? [], opts.mode ?? "hire");
  if (opts.locale) {
    window.localStorage.setItem("gaw:locale", opts.locale);
  }

  return render(
    <ThemeProvider>
      <I18nProvider initialLocale={opts.locale ?? "en-PH"}>
        <GawProvider initialStateOverride={state}>
          <RouterContextProvider router={router}>
            {opts.withLayout ? (
              <AppLayout title="GAW Pro Subscription">
                <ProSubscriptionExperience />
              </AppLayout>
            ) : (
              <ProSubscriptionExperience />
            )}
          </RouterContextProvider>
        </GawProvider>
      </I18nProvider>
    </ThemeProvider>,
  );
}

afterEach(() => {
  cleanup();
  window.localStorage?.clear();
});

describe("GAW Pro Subscription page redesign & brand hierarchy", () => {
  it("preserves GAW brand in the primary header while removing duplicated logo/tagline from the membership banner", () => {
    renderProPage({ withLayout: true, plans: [] });

    const banner = screen.getByRole("region", { name: /Your Membership/i });
    expect(banner.textContent).toContain("GAW PRO");
    expect(banner.textContent).toContain("Your Membership");
    expect(banner.textContent).toContain("Free Community Plan");
    expect(banner.textContent).toContain(
      "Manage your membership and explore benefits designed for workers and employers.",
    );
    // Must not duplicate company logo or "Grab a Work" tagline inside banner
    expect(banner.querySelector("img")).toBeNull();
    expect(banner.textContent).not.toContain("Grab a Work");

    // Primary header retains the official GAW logo and "Grab a Work"
    const header = document.querySelector("header");
    expect(header).not.toBeNull();
    expect(header?.querySelector("img")?.getAttribute("alt")).toBe("GAW");
    expect(header?.textContent).toContain("Grab a Work");

    // Dark-mode forest palette & crisp light-mode tokens present
    expect(banner.className).toContain("dark:bg-[#192820]");
    expect(banner.className).toContain("dark:border-[#34483A]");
  });

  it("dynamically reflects Free, Worker Pro, Employer Pro, and Both Pro plans accurately", () => {
    const scenarios: {
      plans: ProPlan[];
      expectedStatus: string;
      workerLabel: string;
      employerLabel: string;
    }[] = [
      {
        plans: [],
        expectedStatus: "Free Community Plan",
        workerLabel: "Free",
        employerLabel: "Free",
      },
      {
        plans: ["worker"],
        expectedStatus: "Worker Pro (Demo)",
        workerLabel: "Pro",
        employerLabel: "Free",
      },
      {
        plans: ["employer"],
        expectedStatus: "Employer Pro (Demo)",
        workerLabel: "Free",
        employerLabel: "Pro",
      },
      {
        plans: ["worker", "employer"],
        expectedStatus: "Worker Pro + Employer Pro (Demo)",
        workerLabel: "Pro",
        employerLabel: "Pro",
      },
    ];

    for (const s of scenarios) {
      const router = createRouter({
        routeTree,
        history: createMemoryHistory({ initialEntries: ["/pro"] }),
        context: { queryClient: new QueryClient() },
      });
      const html = renderToStaticMarkup(
        <ThemeProvider>
          <I18nProvider initialLocale="en-PH">
            <GawProvider initialStateOverride={makeSignedInProState(s.plans)}>
              <RouterContextProvider router={router}>
                <ProSubscriptionExperience />
              </RouterContextProvider>
            </GawProvider>
          </I18nProvider>
        </ThemeProvider>,
      );

      expect(html).toContain(s.expectedStatus);
      expect(html).not.toContain("Grab a Work");

      window.localStorage?.clear();
      renderProPage({ plans: s.plans });
      expect(screen.getByTestId("pro-membership-status").textContent).toContain(s.expectedStatus);
      expect(screen.getByTestId("entitlement-worker").textContent).toBe(s.workerLabel);
      expect(screen.getByTestId("entitlement-employer").textContent).toBe(s.employerLabel);
      cleanup();
      window.localStorage?.clear();
    }
  });

  it("supports keyboard tab switching, upgrade to Demo Pro, live status updates, and returning to Free Plan", async () => {
    renderProPage({ plans: [], mode: "hire" });

    const workerTab = screen.getByRole("tab", { name: /Worker Pro/i });
    const employerTab = screen.getByRole("tab", { name: /Employer Pro/i });
    expect(employerTab.getAttribute("aria-selected")).toBe("true");
    expect(workerTab.getAttribute("aria-selected")).toBe("false");

    // Keyboard ArrowLeft switches focus & selection cleanly to Worker Pro
    await act(async () => {
      fireEvent.keyDown(employerTab, { key: "ArrowLeft" });
    });
    expect(workerTab.getAttribute("aria-selected")).toBe("true");
    expect(screen.getByRole("heading", { name: "GAW Worker Pro" })).toBeTruthy();

    // Switch back to Employer Pro via click and run full upgrade flow
    await act(async () => {
      fireEvent.click(employerTab);
    });
    const activateBtn = screen.getByRole("button", { name: /Activate GAW Employer Pro/i });
    expect(activateBtn.className).toContain("whitespace-normal");

    await act(async () => {
      fireEvent.click(activateBtn);
    });
    expect(screen.getByText(/Confirm GAW Employer Pro Demo Activation/i)).toBeTruthy();

    const confirmBtn = screen.getByRole("button", { name: /Confirm Demo Upgrade/i });
    await act(async () => {
      fireEvent.click(confirmBtn);
    });

    // Live banner status & entitlements immediately synchronize
    expect(screen.getByRole("status").textContent).toContain("Welcome to GAW Employer Pro!");
    expect(screen.getByTestId("pro-membership-status").textContent).toContain(
      "Employer Pro (Demo)",
    );
    expect(screen.getByTestId("entitlement-employer").textContent).toBe("Pro");
    expect(screen.getByTestId("entitlement-worker").textContent).toBe("Free");

    // Return to Free Plan button restores Free Community Plan
    const downgradeBtns = screen.getAllByRole("button", { name: /Return to Free Plan/i });
    await act(async () => {
      fireEvent.click(downgradeBtns[0]!);
    });
    expect(screen.getByTestId("pro-membership-status").textContent).toContain(
      "Free Community Plan",
    );
    expect(screen.getByTestId("entitlement-employer").textContent).toBe("Free");
  });

  it("renders cleanly across en-PH, fil-PH, and ceb-PH locales without brand duplication", async () => {
    for (const loc of ["en-PH", "fil-PH", "ceb-PH"] as const) {
      window.localStorage?.clear();
      renderProPage({ locale: loc, plans: [] });
      await act(async () => {});
      const banner = screen.getByRole("region", { name: /Membership/i });
      expect(banner.textContent).toContain("Free Community Plan");
      expect(banner.textContent).not.toContain("Grab a Work");
      expect(banner.querySelector("img")).toBeNull();
      cleanup();
      window.localStorage?.clear();
    }
  });
});
