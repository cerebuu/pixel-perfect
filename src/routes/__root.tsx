import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { GAWBrand } from "../components/gaw/GAWBrand";
import { GAWStartupScreen, StartupOverlayContext } from "../components/gaw/GAWStartupScreen";
import { GawProvider, useGaw } from "../lib/gaw/store";
import { ThemeProvider, THEME_BOOT_SCRIPT, useTheme } from "../lib/gaw/theme";
import { I18nProvider, LOCALE_BOOT_SCRIPT, useI18n } from "../lib/gaw/i18n";
import { Toaster } from "../components/ui/sonner";
import { reportLovableError } from "../lib/lovable-error-reporting";

const PROTECTED_PATH_PREFIXES = [
  "/mode",
  "/hire",
  "/find",
  "/gigs",
  "/bookings",
  "/work",
  "/jobs",
  "/my-jobs",
  "/pro",
  "/verify",
  "/settings",
  "/requests",
  "/workers",
  "/book",
] as const;

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/**
 * Lightweight pre-hydration watchdog running before client bundles mount:
 * if a core JS/CSS startup asset fails or React never hydrates within 7.5s,
 * presents a theme-accurate Reload recovery prompt instead of leaving a stuck page.
 */
const BOOT_WATCHDOG_SCRIPT = `(function(){try{var shown=false;function cleanup(){window.removeEventListener("error",onErr,true);if(timer)clearTimeout(timer);}function showFallback(){if(shown||window.__GAW_MOUNTED__)return;shown=true;cleanup();if(!document.body)return;var d=document.documentElement.classList.contains("dark");var card=document.createElement("div");card.id="gaw-preboot-recovery";card.setAttribute("role","alert");card.style.cssText="position:fixed;inset:0;z-index:9999;display:grid;place-items:center;padding:20px;font-family:'Plus Jakarta Sans',system-ui,sans-serif;background:"+(d?"#0D1512":"#F7F9F5")+";color:"+(d?"#F3F7F4":"#172B27");card.innerHTML='<div style="max-width:360px;width:100%;border-radius:20px;padding:24px;text-align:center;border:1px solid '+(d?"#34483A":"rgba(18,60,57,0.16)")+';background:'+(d?"#192820":"#FFFFFF")+';"><p style="margin:0 0 8px;font-size:18px;font-weight:800;">Unable to load GAW</p><p style="margin:0 0 18px;font-size:13px;line-height:1.5;color:'+(d?"#B5C8BC":"#61736C")+';">A required startup file could not finish loading. Check your connection and try again.</p><button type="button" style="cursor:pointer;border:0;border-radius:12px;padding:10px 18px;font-size:14px;font-weight:700;background:#0E7048;color:#FFFFFF;" onclick="window.location.reload()">Try Again</button></div>';document.body.appendChild(card);}function onErr(e){if(window.__GAW_MOUNTED__)return;var t=e&&e.target;if(t&&(t.tagName==="SCRIPT"||(t.tagName==="LINK"&&t.getAttribute("rel")==="stylesheet"))){showFallback();}}window.addEventListener("error",onErr,true);var timer=setTimeout(showFallback,7500);window.__GAW_BOOT_WATCHDOG_CANCEL__=cleanup;}catch(e){}})();`;

function NotFoundComponent() {
  const { tx } = useI18n();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <div className="mb-6 flex justify-center">
          <GAWBrand variant="expanded" size="md" />
        </div>
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">
          {tx("Page not found", "Hindi nahanap ang pahina", "Wala makit-i ang pahina")}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {tx(
            "The page you're looking for doesn't exist or has been moved.",
            "Ang pahinang hinahanap mo ay wala o inilipat na.",
            "Ang pahina nga imong gipangita wala dinhi o gibalhin na.",
          )}
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex cursor-pointer items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors duration-150 hover:bg-primary/90 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none"
          >
            {tx("Go home", "Bumalik sa home", "Balik sa home")}
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();
  const { tx } = useI18n();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          {tx("This page didn't load", "Hindi nag-load ang pahina", "Wala mo-load ang pahina")}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {tx(
            "Something went wrong on our end. You can try refreshing or head back home.",
            "May nagkaproblema sa aming panig. Subukang i-refresh o bumalik sa home.",
            "Naay problema sa among bahin. Sulayi pag-refresh o balik sa home.",
          )}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            type="button"
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex cursor-pointer items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors duration-150 hover:bg-primary/90 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none"
          >
            {tx("Try again", "Subukan muli", "Sulayi pag-usab")}
          </button>
          <a
            href="/"
            className="inline-flex cursor-pointer items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors duration-150 hover:border-hover-border hover:bg-hover-surface active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none"
          >
            {tx("Go home", "Bumalik sa home", "Balik sa home")}
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    // Replace these placeholders with the app's name and description when first building the app.
    // Each content route, / included, must still set its own head(). Never add og:image or
    // twitter:image here: every page without its own would inherit the root's preview image.
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: "GAW — Grab a Work | Local Work. Nearby Opportunities." },
      {
        name: "description",
        content: "GAW (Grab a Work) connects Davao City residents with nearby skilled workers.",
      },
      { name: "theme-color", content: "#0E7048" },
      { property: "og:title", content: "GAW — Grab a Work | Local Work. Nearby Opportunities." },
      {
        property: "og:description",
        content: "GAW (Grab a Work) connects Davao City residents with nearby skilled workers.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "icon", href: "/favicon.png", type: "image/png", sizes: "64x64" },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png", sizes: "180x180" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en-PH" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: THEME_BOOT_SCRIPT + LOCALE_BOOT_SCRIPT + BOOT_WATCHDOG_SCRIPT,
          }}
        />
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootStartupShell({ children }: { children: ReactNode }) {
  const theme = useTheme();
  const i18n = useI18n();
  const gaw = useGaw();
  const router = useRouter();
  const { status: routerStatus, pathname } = useRouterState({
    select: (s) => ({ status: s.status, pathname: s.location.pathname }),
  });

  // One-way per page session: once startup screen completes dismissal, never re-show on
  // internal client navigations.
  const dismissedRef = useRef(false);
  const [bootDismissed, setBootDismissed] = useState(false);
  const [redirectTimedOut, setRedirectTimedOut] = useState(false);

  useEffect(() => {
    const win = window as Window & {
      __GAW_MOUNTED__?: boolean;
      __GAW_BOOT_WATCHDOG_CANCEL__?: () => void;
    };
    win.__GAW_MOUNTED__ = true;
    win.__GAW_BOOT_WATCHDOG_CANCEL__?.();
    document.getElementById("gaw-preboot-recovery")?.remove();
  }, []);

  const awaitingAuthRedirect =
    !bootDismissed && gaw.hydrated && !gaw.signedIn && isProtectedPath(pathname);

  // Brief cap so interrupted/non-redirecting auth navigations still dismiss cleanly.
  useEffect(() => {
    if (!awaitingAuthRedirect || redirectTimedOut) return;
    const t = window.setTimeout(() => setRedirectTimedOut(true), 350);
    return () => window.clearTimeout(t);
  }, [awaitingAuthRedirect, redirectTimedOut]);

  const essentialReady =
    theme.ready &&
    i18n.ready &&
    gaw.hydrated &&
    routerStatus !== "pending" &&
    (!awaitingAuthRedirect || redirectTimedOut);

  const handleBootComplete = useCallback(() => {
    if (dismissedRef.current) return;
    dismissedRef.current = true;
    setBootDismissed(true);
    if (typeof document !== "undefined") {
      document.documentElement.dataset["gawBooted"] = "true";
    }
  }, []);

  const handleRetry = useCallback(() => {
    setRedirectTimedOut(false);
    void router.invalidate();
  }, [router]);

  const handleRecoveryReset = useCallback(() => {
    gaw.resetDemo();
    void router.navigate({ to: "/" });
  }, [gaw, router]);

  return (
    <StartupOverlayContext.Provider value={!bootDismissed}>
      {children}
      {!bootDismissed && (
        <GAWStartupScreen
          essentialReady={essentialReady}
          onComplete={handleBootComplete}
          onRetry={handleRetry}
          onRecoveryReset={handleRecoveryReset}
        />
      )}
    </StartupOverlayContext.Provider>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <ThemeProvider>
        <I18nProvider>
          <GawProvider>
            <RootStartupShell>
              <Outlet />
              <Toaster position="top-center" richColors closeButton />
            </RootStartupShell>
          </GawProvider>
        </I18nProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
