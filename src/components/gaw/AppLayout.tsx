import { useEffect, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  ArrowLeft,
  Briefcase,
  CalendarCheck,
  CheckCircle2,
  ClipboardList,
  Crown,
  Home,
  LogOut,
  Monitor,
  Moon,
  RotateCcw,
  Search,
  Settings,
  ShieldCheck,
  Sun,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { GAWBrand } from "./GAWBrand";
import { FOCUS_RING, REDUCED_MOTION_RESET, segmentedOptionClass } from "./interactions";
import { Avatar, HeaderBrand } from "./primitives";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuHighlightGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { LanguageSelector, SUPPORTED_LOCALES, useI18n } from "@/lib/gaw/i18n";
import { identityVerified, useGaw, type Mode } from "@/lib/gaw/store";
import { useTheme, type ThemePref } from "@/lib/gaw/theme";

type NavItem = {
  to: "/hire" | "/find" | "/bookings" | "/pro" | "/work" | "/jobs" | "/my-jobs";
  label: string;
  icon: LucideIcon;
};

function getNavItems(mode: Mode, tx: (en: string, fil: string, ceb: string) => string): NavItem[] {
  return mode === "hire"
    ? [
        { to: "/hire", label: tx("Home", "Home", "Home"), icon: Home },
        { to: "/find", label: tx("Find", "Malapit", "Pangita"), icon: Search },
        { to: "/bookings", label: tx("Bookings", "Booking", "Booking"), icon: CalendarCheck },
        { to: "/pro", label: "Pro", icon: Crown },
      ]
    : [
        { to: "/work", label: tx("Home", "Home", "Home"), icon: Home },
        { to: "/jobs", label: tx("Jobs", "Trabaho", "Trabaho"), icon: Briefcase },
        {
          to: "/my-jobs",
          label: tx("My Jobs", "Aking Trabaho", "Akong Trabaho"),
          icon: ClipboardList,
        },
        { to: "/pro", label: "Pro", icon: Crown },
      ];
}

/** Redirects to /login once demo state has loaded and nobody is signed in. */
export function useRequireSignIn() {
  const { hydrated, signedIn } = useGaw();
  const navigate = useNavigate();
  useEffect(() => {
    if (hydrated && !signedIn) navigate({ to: "/login" });
  }, [hydrated, signedIn, navigate]);
  return hydrated && signedIn;
}

export function ModeSwitcher({ className }: { className?: string }) {
  const { mode, setMode } = useGaw();
  const { tx } = useI18n();
  const navigate = useNavigate();
  const current: Mode = mode ?? "hire";
  const go = (m: Mode) => {
    if (m === current) return;
    setMode(m);
    navigate({ to: m === "hire" ? "/hire" : "/work" });
    toast.success(
      m === "hire"
        ? tx("Switched to Hiring mode", "Lumipat sa Mag-hire mode", "Nibalhin sa Mag-hire mode")
        : tx(
            "Switched to Working mode",
            "Lumipat sa Magtrabaho mode",
            "Nibalhin sa Magtrabaho mode",
          ),
    );
  };
  return (
    <div
      role="group"
      aria-label={tx("Switch mode", "Lumipat ng mode", "Pagbalhin og mode")}
      className={cn(
        "inline-flex rounded-full border bg-card p-1 text-xs font-semibold shadow-soft",
        className,
      )}
    >
      {(["hire", "work"] as Mode[]).map((m) => (
        <button
          key={m}
          type="button"
          aria-pressed={current === m}
          onClick={() => go(m)}
          className={segmentedOptionClass(
            current === m,
            "deep",
            "min-h-9 rounded-full px-3 sm:px-3.5",
          )}
        >
          {m === "hire"
            ? tx("Hiring", "Mag-hire", "Mag-hire")
            : tx("Working", "Magtrabaho", "Magtrabaho")}
        </button>
      ))}
    </div>
  );
}

export function ThemeSegmentedControl({ compact = false }: { compact?: boolean }) {
  const { pref, setPref } = useTheme();
  const { tx } = useI18n();
  const options: { key: ThemePref; label: string; icon: LucideIcon }[] = [
    { key: "light", label: tx("Light", "Maliwanag", "Hayag"), icon: Sun },
    { key: "dark", label: tx("Dark", "Madilim", "Ngitngit"), icon: Moon },
    { key: "system", label: tx("System", "System", "System"), icon: Monitor },
  ];
  return (
    <div
      role="group"
      aria-label={tx("Theme preference", "Hitsura ng app", "Hitsura sa app")}
      className={cn(
        "inline-flex items-center rounded-full border bg-card p-1 text-xs font-semibold shadow-soft",
        compact && "p-0.5",
      )}
    >
      {options.map((opt) => {
        const Icon = opt.icon;
        const active = pref === opt.key;
        return (
          <button
            key={opt.key}
            type="button"
            aria-pressed={active}
            aria-label={`${opt.label} theme`}
            title={`${opt.label} theme`}
            onClick={() => setPref(opt.key)}
            className={segmentedOptionClass(
              active,
              "primary",
              cn("inline-flex items-center gap-1 rounded-full", compact ? "h-8 px-2" : "h-8 px-3"),
            )}
          >
            <Icon className="size-3.5" aria-hidden />
            {!compact && <span>{opt.label}</span>}
          </button>
        );
      })}
    </div>
  );
}

export const ThemeToggle = ThemeSegmentedControl;

export function AccountMenu() {
  const { account, logOut, resetDemo, plans, verification } = useGaw();
  const { pref, setPref } = useTheme();
  const { locale, setLocale, tx } = useI18n();
  const navigate = useNavigate();
  if (!account) return null;
  const initials = account.name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const verified = identityVerified(verification);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            "group relative cursor-pointer rounded-2xl transition-[box-shadow,transform,filter] duration-180 ease-out hover:ring-2 hover:ring-primary/55 hover:ring-offset-2 hover:ring-offset-background hover:brightness-105 active:scale-[0.96] aria-[expanded=true]:ring-2 aria-[expanded=true]:ring-primary aria-[expanded=true]:ring-offset-2 aria-[expanded=true]:ring-offset-background",
            FOCUS_RING,
            REDUCED_MOTION_RESET,
          )}
          aria-label="Account menu"
        >
          <Avatar initials={initials} size="sm" />
          {verified && (
            <span
              title={tx(
                "Identity Verified",
                "Beripikado ang Pagkakakilanlan",
                "Beripikado ang Pagkatawo",
              )}
              className="absolute -bottom-0.5 -right-0.5 grid size-4 place-items-center rounded-full bg-primary text-primary-foreground ring-2 ring-background"
            >
              <CheckCircle2 className="size-3" aria-hidden />
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>
          <div className="flex items-center gap-1.5">
            <p className="font-bold">{account.name}</p>
            {verified && (
              <span className="inline-flex items-center gap-0.5 rounded-full bg-secondary px-1.5 py-0.5 text-[10px] font-bold text-primary">
                <CheckCircle2 className="size-3" aria-hidden />{" "}
                {tx("Verified", "Beripikado", "Beripikado")}
              </span>
            )}
          </div>
          <p className="text-xs font-normal text-muted-foreground">{account.email}</p>
          {account.isDemo && (
            <p className="mt-1 text-xs font-semibold text-gold-foreground dark:text-gold">
              {tx("Demo judge account", "Demo judge account", "Demo judge account")}
            </p>
          )}
          {plans.length > 0 && (
            <p className="mt-1 text-xs font-semibold text-primary">
              {tx(
                "GAW Pro (demo) active",
                "Aktibo ang GAW Pro (demo)",
                "Aktibo ang GAW Pro (demo)",
              )}
            </p>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        <div className="px-2.5 py-1.5">
          <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
            {tx("Appearance", "Hitsura", "Hitsura")}
          </p>
          <div className="grid grid-cols-3 gap-1 rounded-xl border border-border/50 bg-muted p-1">
            {(
              [
                ["light", tx("Light", "Maliwanag", "Hayag"), Sun],
                ["dark", tx("Dark", "Madilim", "Ngitngit"), Moon],
                ["system", tx("System", "System", "System"), Monitor],
              ] as const
            ).map(([k, l, Icon]) => (
              <button
                key={k}
                type="button"
                aria-pressed={pref === k}
                onClick={() => setPref(k)}
                className={segmentedOptionClass(
                  pref === k,
                  "card",
                  "inline-flex h-8 items-center justify-center gap-1 rounded-lg text-xs font-semibold",
                )}
              >
                <Icon className="size-3.5" aria-hidden />
                {l}
              </button>
            ))}
          </div>
        </div>

        <div className="px-2.5 py-1.5">
          <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
            {tx("Language", "Wika", "Pinulongan")}
          </p>
          <div className="grid grid-cols-3 gap-1 rounded-xl border border-border/50 bg-muted p-1">
            {SUPPORTED_LOCALES.map((opt) => (
              <button
                key={opt.code}
                type="button"
                aria-pressed={locale === opt.code}
                onClick={() => setLocale(opt.code)}
                className={segmentedOptionClass(
                  locale === opt.code,
                  "card",
                  "inline-flex h-8 items-center justify-center rounded-lg px-1 text-[11px] font-semibold",
                )}
              >
                {opt.code === "ceb-PH" ? "Bisaya" : opt.label}
              </button>
            ))}
          </div>
        </div>

        <DropdownMenuSeparator />
        <DropdownMenuHighlightGroup>
          <DropdownMenuItem onSelect={() => navigate({ to: "/verify" })}>
            <ShieldCheck />{" "}
            {tx("Verification Center", "Verification Center", "Verification Center")}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => navigate({ to: "/settings" })}>
            <Settings /> {tx("Account Settings", "Settings ng Account", "Settings sa Account")}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => navigate({ to: "/pro" })}>
            <Crown /> {tx("GAW Pro Subscription", "GAW Pro Subscription", "GAW Pro Subscription")}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            tone="warning"
            onSelect={() => {
              resetDemo();
              toast(tx("Demo data reset", "Na-reset ang demo data", "Na-reset ang demo data"));
              navigate({ to: "/" });
            }}
          >
            <RotateCcw /> {tx("Reset demo data", "I-reset ang demo data", "I-reset ang demo data")}
          </DropdownMenuItem>
          <DropdownMenuItem
            tone="destructive"
            onSelect={() => {
              logOut();
              navigate({ to: "/" });
            }}
          >
            <LogOut /> {tx("Log out", "Mag-log out", "Mag-log out")}
          </DropdownMenuItem>
        </DropdownMenuHighlightGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AppLayout({
  mode,
  title,
  back,
  children,
}: {
  /** Which side of GAW this page belongs to; omit for shared pages (e.g. Pro, Settings, Verify). */
  mode?: Mode;
  title?: string;
  back?: ReactNode;
  children: ReactNode;
}) {
  const ready = useRequireSignIn();
  const gaw = useGaw();
  const { tx, t } = useI18n();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (ready && mode && gaw.mode !== mode) gaw.setMode(mode);
  }, [ready, mode, gaw]);

  const navMode: Mode = mode ?? gaw.mode ?? "hire";
  const items = getNavItems(navMode, tx);
  const isActive = (to: string) =>
    pathname === to || (to !== "/hire" && to !== "/work" && pathname.startsWith(to));

  if (!ready) {
    return (
      <div className="grid min-h-screen place-items-center bg-background" aria-busy="true">
        <div className="flex flex-col items-center gap-3">
          <GAWBrand variant="icon" size="lg" className="animate-pulse" />
          <span className="text-xs font-semibold tracking-wide text-muted-foreground">
            {tx("Loading GAW…", "Naglo-load ang GAW…", "Nag-load ang GAW…")}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24 md:pb-10">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-xl focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-primary-foreground focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-ring"
      >
        {t("common.skipToContent")}
      </a>
      <header className="sticky top-0 z-30 border-b bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-2 px-4 sm:gap-3 md:gap-4 md:px-6">
          <Link
            to={navMode === "hire" ? "/hire" : "/work"}
            aria-label="GAW — Grab a Work home"
            className={cn(
              "inline-flex shrink-0 items-center rounded-xl transition-opacity duration-150 hover:opacity-90 active:scale-[0.98]",
              FOCUS_RING,
              REDUCED_MOTION_RESET,
            )}
          >
            <HeaderBrand size="sm" proBadge={gaw.plans.length > 0} />
          </Link>
          <nav aria-label="Main" className="ml-2 hidden items-center gap-1 lg:ml-4 md:flex">
            {items.map((it) => {
              const active = isActive(it.to);
              const isPro = it.to === "/pro";
              return (
                <Link
                  key={it.to}
                  to={it.to}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "group relative inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl px-3 text-sm font-semibold transition-[background-color,color,box-shadow,transform,filter] duration-160 ease-out active:scale-[0.97] lg:px-3.5 [&>svg]:size-4 [&>svg]:transition-[color,transform] [&>svg]:duration-160",
                    FOCUS_RING,
                    REDUCED_MOTION_RESET,
                    active
                      ? "bg-secondary text-secondary-foreground shadow-xs ring-1 ring-inset ring-primary/20 dark:ring-primary/35 [&>svg]:text-primary"
                      : isPro
                        ? "text-gold-foreground hover:bg-warning-hover-surface hover:brightness-105 hover:[&>svg]:scale-110 dark:text-gold"
                        : "text-muted-foreground hover:bg-hover-surface hover:text-foreground hover:[&>svg]:scale-110 hover:[&>svg]:text-primary",
                  )}
                >
                  <it.icon aria-hidden />
                  {it.label}
                </Link>
              );
            })}
          </nav>
          <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
            <LanguageSelector variant="compact" />
            <div className="hidden lg:block">
              <ThemeSegmentedControl compact />
            </div>
            <ModeSwitcher />
            <AccountMenu />
          </div>
        </div>
      </header>

      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto max-w-6xl px-4 pt-5 outline-none md:px-6 md:pt-8"
      >
        {(title || back) && (
          <div className="mb-5 flex items-center gap-3">
            {back}
            {title && (
              <h1 className="text-2xl font-extrabold tracking-tight md:text-3xl">{title}</h1>
            )}
          </div>
        )}
        {children}
      </main>

      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-30 border-t bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
      >
        <ul className="mx-auto grid max-w-md grid-cols-4">
          {items.map((it) => {
            const active = isActive(it.to);
            const isPro = it.to === "/pro";
            return (
              <li key={it.to}>
                <Link
                  to={it.to}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "group flex h-16 cursor-pointer flex-col items-center justify-center gap-1 px-1 text-center text-[0.68rem] font-semibold leading-tight transition-[color,transform] duration-150 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
                    REDUCED_MOTION_RESET,
                    active ? "text-primary" : "text-muted-foreground hover:text-foreground",
                    isPro && !active && "text-gold-foreground dark:text-gold",
                  )}
                >
                  <span
                    className={cn(
                      "grid h-7 w-12 place-items-center rounded-full transition-[background-color,color,transform] duration-150",
                      active
                        ? "bg-secondary ring-1 ring-inset ring-primary/20 dark:ring-primary/35"
                        : isPro
                          ? "group-hover:bg-warning-hover-surface"
                          : "group-hover:bg-hover-surface group-hover:text-primary",
                    )}
                  >
                    <it.icon className="size-5" aria-hidden />
                  </span>
                  <span className="max-w-full truncate">{it.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}

export function BackButton({
  to,
  label,
}: {
  to:
    | "/hire"
    | "/find"
    | "/work"
    | "/jobs"
    | "/bookings"
    | "/my-jobs"
    | "/verify"
    | "/settings"
    | "/pro";
  label?: string;
}) {
  const { tx } = useI18n();
  return (
    <Button asChild variant="outline" size="icon" className="shrink-0 rounded-full">
      <Link to={to} aria-label={label ?? tx("Back", "Bumalik", "Balik")}>
        <ArrowLeft />
      </Link>
    </Button>
  );
}
