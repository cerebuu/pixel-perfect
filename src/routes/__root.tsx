import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { GAWBrand } from "../components/gaw/GAWBrand";
import { GawProvider } from "../lib/gaw/store";
import { ThemeProvider, THEME_BOOT_SCRIPT } from "../lib/gaw/theme";
import { I18nProvider, LOCALE_BOOT_SCRIPT, useI18n } from "../lib/gaw/i18n";
import { Toaster } from "../components/ui/sonner";
import { reportLovableError } from "../lib/lovable-error-reporting";

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
      { name: "viewport", content: "width=device-width, initial-scale=1" },
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
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT + LOCALE_BOOT_SCRIPT }} />
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
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
            <Outlet />
            <Toaster position="top-center" richColors closeButton />
          </GawProvider>
        </I18nProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
