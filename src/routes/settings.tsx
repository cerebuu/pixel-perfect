import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  CheckCircle2,
  Crown,
  Globe,
  Monitor,
  Moon,
  RotateCcw,
  ShieldCheck,
  Sun,
  User,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { AppLayout, BackButton } from "@/components/gaw/AppLayout";
import { GAWBrand, GAWWordmark } from "@/components/gaw/GAWBrand";
import { selectableOptionCardClass } from "@/components/gaw/interactions";
import { Avatar } from "@/components/gaw/primitives";
import { Button } from "@/components/ui/button";
import { SUPPORTED_LOCALES, useI18n } from "@/lib/gaw/i18n";
import { identityVerified, useGaw } from "@/lib/gaw/store";
import { useTheme, type ThemePref } from "@/lib/gaw/theme";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Account Settings — GAW" },
      {
        name: "description",
        content:
          "Manage your GAW appearance theme, language, verification status, and account settings.",
      },
      { property: "og:title", content: "Account Settings — GAW" },
      {
        property: "og:description",
        content:
          "Manage your GAW appearance theme, language, verification status, and account settings.",
      },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { mode } = useGaw();
  const { t, tx } = useI18n();
  const backTo = mode === "work" ? "/work" : "/hire";
  return (
    <AppLayout
      back={
        <BackButton
          to={backTo}
          label={tx("Back to Dashboard", "Bumalik sa Dashboard", "Balik sa Dashboard")}
        />
      }
      title={t("settings.pageTitle")}
    >
      <SettingsBody />
    </AppLayout>
  );
}

function SettingsBody() {
  const { account, verification, plans, resetDemo } = useGaw();
  const { pref, resolved, setPref } = useTheme();
  const { locale, localeOption, setLocale, t, tx, verifLabel } = useI18n();
  const navigate = useNavigate();

  if (!account) return null;
  const initials = account.name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const idStatus = verification.identity?.status ?? "not_submitted";
  const verified = identityVerified(verification);

  const themeOptions: { key: ThemePref; title: string; subtitle: string; icon: LucideIcon }[] = [
    {
      key: "light",
      title: tx("Light Mode", "Light Mode", "Light Mode"),
      subtitle: tx(
        "Bright Davao daylight palette with crisp cards and forest-green accents.",
        "Maliwanag na kulay na madaling basahin sa araw at may forest-green accents.",
        "Hayag nga hitsura alang sa adlaw nga naay malinaw nga cards ug forest-green accents.",
      ),
      icon: Sun,
    },
    {
      key: "dark",
      title: tx("Dark Mode", "Dark Mode", "Dark Mode"),
      subtitle: tx(
        "High-contrast deep emerald dark surfaces designed for low-glare reading.",
        "Madilim at malinaw na emerald theme na magaan sa mata sa gabi.",
        "Ngitngit ug tin-aw nga emerald surfaces alang sa komportableng pagbasa.",
      ),
      icon: Moon,
    },
    {
      key: "system",
      title: tx("System Default", "Gaya ng System", "Default sa System"),
      subtitle: tx(
        "Automatically matches your device or OS light/dark appearance preference.",
        "Awtomatikong sumusunod sa light o dark mode ng iyong device.",
        "Awtomatikong mosunod sa light o dark mode sa imong device.",
      ),
      icon: Monitor,
    },
  ];

  const resolvedThemeText = resolved === "dark" ? t("nav.dark") : t("nav.light");
  const activePrefText =
    pref === "system"
      ? `${t("nav.system")} (${resolvedThemeText})`
      : pref === "dark"
        ? t("nav.dark")
        : t("nav.light");

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Language & Region Preference */}
      <section
        className="rounded-3xl border bg-card p-5 shadow-soft md:p-7"
        aria-labelledby="language-heading"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-primary">
              {t("common.language")}
            </p>
            <h2 id="language-heading" className="text-xl font-extrabold tracking-tight">
              {t("settings.languageSection")}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("settings.languageDesc")}</p>
          </div>
          <span className="rounded-full bg-secondary px-3 py-1 text-xs font-bold text-secondary-foreground">
            {t("common.activeLanguage", { language: localeOption.label })}
          </span>
        </div>

        <div
          className="mt-5 grid gap-3 sm:grid-cols-3"
          role="radiogroup"
          aria-label={t("common.selectLanguage")}
        >
          {SUPPORTED_LOCALES.map((opt) => {
            const active = locale === opt.code;
            return (
              <button
                key={opt.code}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => {
                  setLocale(opt.code);
                  toast.success(
                    opt.code === "fil-PH"
                      ? `Itinakda ang wika sa ${opt.label}`
                      : opt.code === "ceb-PH"
                        ? `Gi-set ang pinulongan sa ${opt.label}`
                        : `Language set to ${opt.label}`,
                  );
                }}
                className={selectableOptionCardClass(
                  active,
                  "flex flex-col items-start justify-between rounded-2xl border p-4 text-left",
                )}
              >
                <div className="flex w-full items-center justify-between">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-extrabold transition-[background-color,color,transform] duration-150",
                      active
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground group-hover:bg-hover-surface group-hover:text-primary",
                    )}
                  >
                    <Globe className="size-3.5" aria-hidden />
                    {opt.shortLabel}
                  </span>
                  {active && <CheckCircle2 className="size-4 text-primary" aria-hidden />}
                </div>
                <div className="mt-3">
                  <p className="font-bold">{opt.label}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{opt.regionNote}</p>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Theme & Appearance Section */}
      <section
        className="rounded-3xl border bg-card p-5 shadow-soft md:p-7"
        aria-labelledby="theme-heading"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-primary">
              {t("nav.appearance")}
            </p>
            <h2 id="theme-heading" className="text-xl font-extrabold tracking-tight">
              {tx("Theme Preference", "Tema ng Display", "Tema sa Display")}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {tx(
                "Updates the entire application immediately and persists across page refreshes.",
                "Agad na ina-update ang buong app at nananatiling naka-save kahit i-refresh.",
                "Dali dayon mo-update sa tibuok app ug magpabiling naka-save bisan og i-refresh.",
              )}
            </p>
          </div>
          <span className="rounded-full bg-secondary px-3 py-1 text-xs font-bold text-secondary-foreground">
            {tx("Active:", "Aktibo:", "Aktibo:")} {activePrefText}
          </span>
        </div>

        <div
          className="mt-5 grid gap-3 sm:grid-cols-3"
          role="radiogroup"
          aria-label={tx("Select theme", "Pumili ng tema", "Pagpili og tema")}
        >
          {themeOptions.map((opt) => {
            const Icon = opt.icon;
            const active = pref === opt.key;
            return (
              <button
                key={opt.key}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => {
                  setPref(opt.key);
                  toast.success(
                    tx(
                      `Theme set to ${opt.title}`,
                      `Itinakda ang tema sa ${opt.title}`,
                      `Gi-set ang tema sa ${opt.title}`,
                    ),
                  );
                }}
                className={selectableOptionCardClass(
                  active,
                  "flex flex-col items-start justify-between rounded-2xl border p-4 text-left",
                )}
              >
                <div className="flex w-full items-center justify-between">
                  <span
                    className={cn(
                      "grid size-10 place-items-center rounded-xl transition-[background-color,color,transform] duration-150",
                      active
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground group-hover:scale-105 group-hover:bg-hover-surface group-hover:text-primary motion-reduce:group-hover:scale-100",
                    )}
                  >
                    <Icon className="size-5" aria-hidden />
                  </span>
                  {active && <CheckCircle2 className="size-4 text-primary" aria-hidden />}
                </div>
                <div className="mt-3">
                  <p className="font-bold">{opt.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{opt.subtitle}</p>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Account Overview */}
      <section className="rounded-3xl border bg-card p-5 shadow-soft md:p-7">
        <div className="flex items-center gap-4">
          <Avatar initials={initials} size="lg" />
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-extrabold">{account.name}</h2>
              {verified && (
                <span className="inline-flex items-center gap-1 rounded-full bg-status-confirmed-bg px-2.5 py-0.5 text-xs font-bold text-status-confirmed">
                  <CheckCircle2 className="size-3.5" aria-hidden /> {t("common.verified")}
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {account.email} · {account.mobile}
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="flex items-center justify-between gap-2 rounded-2xl border p-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                {tx("Identity Verification", "Pag-verify ng Identity", "Pag-verify sa Identity")}
              </p>
              <p className="mt-0.5 font-bold">{verifLabel(idStatus)}</p>
            </div>
            <Button asChild size="sm" variant="outline">
              <Link to="/verify">
                <ShieldCheck className="size-4" /> {tx("Open Verification", "Buksan", "Ablihi")}
              </Link>
            </Button>
          </div>

          <div className="flex items-center justify-between gap-2 rounded-2xl border p-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                {tx("GAW Pro Membership", "GAW Pro Membership", "GAW Pro Membership")}
              </p>
              <p className="mt-0.5 font-bold">
                {plans.length === 0
                  ? tx("Free Plan", "Libreng Plan", "Libreng Plan")
                  : plans.map((p) => (p === "worker" ? "Worker Pro" : "Employer Pro")).join(" + ")}
              </p>
            </div>
            <Button asChild size="sm" variant="gold">
              <Link to="/pro">
                <Crown className="size-4" /> {tx("Manage Pro", "Pamahalaan", "Dumala")}
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Prototype Reset Section */}
      <section className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border bg-card p-5 shadow-soft">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-muted text-muted-foreground">
            <User className="size-5" aria-hidden />
          </span>
          <div>
            <p className="font-bold">
              {tx("Reset Prototype Data", "I-reset ang Demo Data", "I-reset ang Demo Data")}
            </p>
            <p className="text-xs text-muted-foreground">
              {tx(
                "Clear local demo bookings, skills, verification state, and return to the welcome screen.",
                "Burahin ang mga demo booking, kasanayan, verification, at bumalik sa welcome screen.",
                "Papasa ang mga demo booking, kahanas, verification, ug balik sa welcome screen.",
              )}
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            resetDemo();
            toast(tx("Demo data reset", "Na-reset ang demo data", "Na-reset na ang demo data"));
            navigate({ to: "/" });
          }}
        >
          <RotateCcw className="size-4" />{" "}
          {tx("Reset Demo State", "I-reset ang Demo", "I-reset ang Demo")}
        </Button>
      </section>

      {/* Official GAW Brand Identity Footer Card */}
      <section className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border bg-card p-5 shadow-soft">
        <GAWBrand
          variant="expanded"
          size="md"
          tagline={tx(
            "Grab a Work · Local Work. Nearby Opportunities.",
            "Grab a Work · Lokal na Trabaho. Malapit na Oportunidad.",
            "Grab a Work · Lokal nga Trabaho. Duol nga Oportunidad.",
          )}
        />
        <GAWWordmark framed size="sm" />
      </section>
    </div>
  );
}
