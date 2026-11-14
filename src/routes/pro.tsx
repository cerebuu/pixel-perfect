import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Crown,
  Info,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { AppLayout } from "@/components/gaw/AppLayout";
import { GAWBrand } from "@/components/gaw/GAWBrand";
import { selectableOptionCardClass } from "@/components/gaw/interactions";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/gaw/i18n";
import { hasPlan, useGaw, type ProPlan } from "@/lib/gaw/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/pro")({
  head: () => ({
    meta: [
      { title: "GAW Pro Membership (Demo) — GAW" },
      {
        name: "description",
        content: "Explore GAW Worker Pro and Employer Pro demo membership benefits.",
      },
      { property: "og:title", content: "GAW Pro Membership (Demo) — GAW" },
      {
        property: "og:description",
        content: "Explore GAW Worker Pro and Employer Pro demo membership benefits.",
      },
    ],
  }),
  component: ProPage,
});

function ProPage() {
  const { t } = useI18n();
  return (
    <AppLayout title={t("pro.pageTitle")}>
      <ProSubscriptionExperience />
    </AppLayout>
  );
}

interface PlanDetails {
  key: ProPlan;
  title: string;
  subtitle: string;
  dashboardLink: "/work" | "/hire";
  dashboardLabel: string;
  freeBenefits: string[];
  proBenefits: string[];
  unlockedFeatures: string[];
}

type UpgradeStep = "browse" | "review" | "success";

function ProSubscriptionExperience() {
  const { mode, plans, setPlan } = useGaw();
  const { t, tx } = useI18n();
  const [selectedPlan, setSelectedPlan] = useState<ProPlan>(
    mode === "work" ? "worker" : "employer",
  );
  const [step, setStep] = useState<UpgradeStep>("browse");

  const planConfig: Record<ProPlan, PlanDetails> = {
    worker: {
      key: "worker",
      title: "GAW Worker Pro",
      subtitle: tx(
        "Stand out to nearby Davao City households and track your local service growth.",
        "Mas mapansin ng mga kalapit na sambahayan sa Davao City at subaybayan ang iyong kita.",
        "Mas mailhan sa mga duol nga panimalay sa Davao City ug bantayi ang imong lokal nga serbisyo.",
      ),
      dashboardLink: "/work",
      dashboardLabel: tx(
        "Go to Worker Dashboard",
        "Pumunta sa Worker Dashboard",
        "Adto sa Worker Dashboard",
      ),
      freeBenefits: [
        tx(
          "Create a public worker profile with primary & custom skills",
          "Gumawa ng public worker profile na may pangunahin at custom na kasanayan",
          "Paghimo og public worker profile nga naay panguna ug custom nga kahanas",
        ),
        tx(
          "Receive and accept direct booking requests from residents",
          "Tumanggap ng direktang booking request mula sa mga residente",
          "Modawat ug modawat sa direktang booking request gikan sa mga residente",
        ),
        tx(
          "Apply to open jobs on the Davao City Job Board",
          "Mag-apply sa mga bukas na trabaho sa Davao City Job Board",
          "Pag-apply sa mga bakanteng trabaho sa Davao City Job Board",
        ),
        tx(
          "Set your working service area and 1–10 km radius",
          "Itakda ang lugar ng serbisyo at 1–10 km na sakop",
          "I-set ang lugar sa serbisyo ug 1–10 km nga sakop",
        ),
      ],
      proBenefits: [
        tx(
          "Everything in the Free Worker Plan",
          "Lahat ng nasa Free Worker Plan",
          "Tanan nga naa sa Free Worker Plan",
        ),
        tx(
          "Highlighted Gold Pro Badge on your Worker Dashboard & Profile",
          "Gold Pro Badge sa iyong Worker Dashboard at Profile",
          "Gold Pro Badge sa imong Worker Dashboard ug Profile",
        ),
        tx(
          "Monthly Earnings Insights & local demand analytics panel on Worker Home",
          "Monthly Earnings Insights at lokal na demand analytics sa Worker Home",
          "Monthly Earnings Insights ug lokal nga demand analytics sa Worker Home",
        ),
        tx(
          "Priority placement in Employer nearby search results (demo preview)",
          "Mas mataas na puwesto sa paghahanap ng mga Employer (demo preview)",
          "Mas taas nga puwesto sa pagpangita sa mga Employer (demo preview)",
        ),
        tx(
          "Expanded multi-skill portfolio showcase",
          "Mas pinalawak na showcase ng mga kasanayan",
          "Mas gipalapdan nga showcase sa mga kahanas",
        ),
      ],
      unlockedFeatures: [
        tx(
          "Worker Pro Crown Badge next to your name on Worker Home",
          "Worker Pro Crown Badge sa tabi ng iyong pangalan sa Worker Home",
          "Worker Pro Crown Badge tapad sa imong ngalan sa Worker Home",
        ),
        tx(
          "Sample Monthly Earnings & Insights widget unlocked on Worker Home",
          "Buksan ang Sample Monthly Earnings & Insights widget sa Worker Home",
          "Abli ang Sample Monthly Earnings & Insights widget sa Worker Home",
        ),
        tx(
          "Priority Worker Pro indicator in Account Menu",
          "Priority Worker Pro indicator sa Account Menu",
          "Priority Worker Pro indicator sa Account Menu",
        ),
      ],
    },
    employer: {
      key: "employer",
      title: "GAW Employer Pro",
      subtitle: tx(
        "Faster household & small-business hiring with priority filters and saved search presets.",
        "Mas mabilis na pag-hire para sa bahay at negosyo gamit ang priority filter at saved searches.",
        "Mas paspas nga pag-hire alang sa balay ug negosyo gamit ang priority filter ug saved searches.",
      ),
      dashboardLink: "/hire",
      dashboardLabel: tx(
        "Go to Employer Dashboard",
        "Pumunta sa Employer Dashboard",
        "Adto sa Employer Dashboard",
      ),
      freeBenefits: [
        tx(
          "Search nearby workers by barangay, GPS pin, or custom service",
          "Maghanap ng malapit na worker gamit ang barangay, GPS pin, o custom service",
          "Pangita og duol nga worker gamit ang barangay, GPS pin, o custom service",
        ),
        tx(
          "Interactive map & radar discovery within 1 to 10 km",
          "Interaktibong mapa at paghahanap sa loob ng 1 hanggang 10 km",
          "Interaktibong mapa ug pagpangita sulod sa 1 hangtod 10 km",
        ),
        tx(
          "Send booking requests and quotes with no platform fee",
          "Magpadala ng booking request nang walang bayad sa platform",
          "Pagpadala og booking request nga walay bayad sa platform",
        ),
        tx(
          "Track active and completed bookings in real time",
          "Subaybayan ang mga aktibo at natapos na booking nang real time",
          "Bantayi ang mga aktibo ug nahuman nga booking sa tinuod nga oras",
        ),
      ],
      proBenefits: [
        tx(
          "Everything in the Free Employer Plan",
          "Lahat ng nasa Free Employer Plan",
          "Tanan nga naa sa Free Employer Plan",
        ),
        tx(
          "Highlighted Gold Pro Badge on your Employer Dashboard",
          "Gold Pro Badge sa iyong Employer Dashboard",
          "Gold Pro Badge sa imong Employer Dashboard",
        ),
        tx(
          "Exclusive “Top-Rated Only (4.8★+)” filter unlocked in Nearby Finder",
          "Eksklusibong filter na “Top-Rated Only (4.8★+)” sa Nearby Finder",
          "Eksklusibo nga filter nga “Top-Rated Only (4.8★+)” sa Nearby Finder",
        ),
        tx(
          "One-click Saved Search Presets & Priority Re-booking card on Employer Home",
          "Isang pindot na Saved Search Presets at Priority Re-booking card sa Employer Home",
          "Usa ka pindot nga Saved Search Presets ug Priority Re-booking card sa Employer Home",
        ),
        tx(
          "Dedicated household project tracking tools (demo preview)",
          "Mga tool sa pagsubaybay ng proyekto sa bahay (demo preview)",
          "Mga himan sa pagbantay sa proyekto sa balay (demo preview)",
        ),
      ],
      unlockedFeatures: [
        tx(
          "Employer Pro Crown Badge on Employer Home",
          "Employer Pro Crown Badge sa Employer Home",
          "Employer Pro Crown Badge sa Employer Home",
        ),
        tx(
          "“Top-Rated Only (4.8★+)” Pro filter unlocked in Nearby Finder (/find)",
          "Buksan ang “Top-Rated Only (4.8★+)” Pro filter sa Nearby Finder (/find)",
          "Abli ang “Top-Rated Only (4.8★+)” Pro filter sa Nearby Finder (/find)",
        ),
        tx(
          "Saved Searches & Recurring Bookings Pro panel unlocked on Employer Home (/hire)",
          "Buksan ang Saved Searches & Recurring Bookings Pro panel sa Employer Home (/hire)",
          "Abli ang Saved Searches & Recurring Bookings Pro panel sa Employer Home (/hire)",
        ),
      ],
    },
  };

  const details = planConfig[selectedPlan];
  const isCurrentPlanActive = hasPlan(plans, selectedPlan);
  const workerActive = hasPlan(plans, "worker");
  const employerActive = hasPlan(plans, "employer");

  const handleSelectPlan = (p: ProPlan) => {
    setSelectedPlan(p);
    setStep("browse");
  };

  const handleConfirmUpgrade = () => {
    setPlan(selectedPlan, true);
    setStep("success");
    toast.success(
      tx(
        `${details.title} (Demo) activated!`,
        `Na-activate ang ${details.title} (Demo)!`,
        `Na-activate na ang ${details.title} (Demo)!`,
      ),
    );
  };

  const handleDowngradeToFree = (p: ProPlan) => {
    setPlan(p, false);
    setStep("browse");
    toast(
      tx(
        `Returned ${planConfig[p].title} to the Free Plan`,
        `Ibinalik ang ${planConfig[p].title} sa Free Plan`,
        `Gibalk ang ${planConfig[p].title} sa Free Plan`,
      ),
    );
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Current Membership Banner */}
      <section className="rounded-3xl bg-contour p-6 text-deep-foreground shadow-lift md:p-8">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <GAWBrand variant="expanded" size="md" onDeep proBadge />
            </div>
            <h2 className="mt-4 text-2xl font-extrabold tracking-tight md:text-3xl">
              {tx("Current Membership:", "Kasalukuyang Plan:", "Kasamtangang Plan:")}{" "}
              {plans.length === 0
                ? tx("Free Community Plan", "Free Community Plan", "Free Community Plan")
                : plans
                    .map((p) => (p === "worker" ? "Worker Pro (Demo)" : "Employer Pro (Demo)"))
                    .join(" + ")}
            </h2>
            <p className="mt-1.5 max-w-2xl text-sm text-deep-muted">
              {tx(
                "Switch between Worker Pro and Employer Pro below to preview how GAW unlocks extra tools for workers and households. All upgrades are interactive demonstrations — no payment or billing is used.",
                "Lumipat sa pagitan ng Worker Pro at Employer Pro sa ibaba para makita kung paano binubuksan ng GAW ang dagdag na tools. Demo lang ang lahat ng upgrade — walang bayad.",
                "Pagbalhin tali sa Worker Pro ug Employer Pro sa ubos aron makita unsaon pag-abli sa GAW sa dugang nga tools. Demo lang tanang upgrade — walay bayad.",
              )}
            </p>
          </div>

          <div className="flex flex-col gap-2 rounded-2xl bg-deep-foreground/10 p-4 text-xs md:min-w-60">
            <p className="font-bold uppercase tracking-wide text-deep-muted">
              {tx("Your Entitlements", "Mga Aktibong Plan", "Imong Mga Plan")}
            </p>
            <div className="flex items-center justify-between">
              <span>{tx("Worker Plan:", "Worker Plan:", "Worker Plan:")}</span>
              <span
                className={cn(
                  "font-extrabold",
                  workerActive ? "text-gold" : "text-deep-foreground",
                )}
              >
                {workerActive
                  ? "Worker Pro (Demo)"
                  : tx("Free Plan", "Libreng Plan", "Libreng Plan")}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>{tx("Employer Plan:", "Employer Plan:", "Employer Plan:")}</span>
              <span
                className={cn(
                  "font-extrabold",
                  employerActive ? "text-gold" : "text-deep-foreground",
                )}
              >
                {employerActive
                  ? "Employer Pro (Demo)"
                  : tx("Free Plan", "Libreng Plan", "Libreng Plan")}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Plan Role Selector (Worker Pro vs Employer Pro) */}
      <div
        className="grid grid-cols-2 gap-3"
        role="tablist"
        aria-label={tx("Choose Pro track", "Piliin ang Pro track", "Pilia ang Pro track")}
      >
        {(["worker", "employer"] as ProPlan[]).map((p) => {
          const cfg = planConfig[p];
          const active = selectedPlan === p;
          const enabled = hasPlan(plans, p);
          return (
            <button
              key={p}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => handleSelectPlan(p)}
              className={selectableOptionCardClass(
                active,
                "flex flex-col items-start justify-between rounded-3xl border p-4 text-left md:p-5",
              )}
            >
              <div className="flex w-full items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 text-sm font-extrabold text-foreground md:text-base">
                  <Crown className="size-4 text-gold" aria-hidden />
                  {cfg.title}
                </span>
                <span
                  className={cn(
                    "rounded-full px-2.5 py-0.5 text-[11px] font-bold",
                    enabled ? "bg-gold text-gold-foreground" : "bg-muted text-muted-foreground",
                  )}
                >
                  {enabled
                    ? tx("Active (Demo)", "Aktibo (Demo)", "Aktibo (Demo)")
                    : tx("Free Plan", "Libreng Plan", "Libreng Plan")}
                </span>
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">{cfg.subtitle}</p>
            </button>
          );
        })}
      </div>

      {/* Step 1: Browse & Compare Free vs Pro Benefits */}
      {step === "browse" && (
        <div className="grid gap-5 md:grid-cols-2">
          {/* Free Plan Card */}
          <section className="flex flex-col justify-between rounded-3xl border bg-card p-6 shadow-soft">
            <div>
              <div className="flex items-center justify-between">
                <span className="rounded-full bg-secondary px-3 py-1 text-xs font-bold text-secondary-foreground">
                  {tx("Standard Access", "Karaniwang Access", "Kasagarang Access")}
                </span>
                {!isCurrentPlanActive && (
                  <span className="text-xs font-bold text-primary">{t("pro.currentPlan")}</span>
                )}
              </div>
              <h3 className="mt-3 text-xl font-extrabold">
                {tx("Free Plan", "Libreng Plan", "Libreng Plan")}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {tx(
                  "Core local hiring and job discovery features for everyone in Davao City.",
                  "Pangunahing pag-hire at paghahanap ng trabaho para sa lahat sa Davao City.",
                  "Panguna nga pag-hire ug pagpangita og trabaho alang sa tanan sa Davao City.",
                )}
              </p>

              <ul className="mt-5 space-y-2.5 text-sm">
                {details.freeBenefits.map((b) => (
                  <li key={b} className="flex items-start gap-2.5">
                    <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-6 border-t pt-4">
              {isCurrentPlanActive ? (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => handleDowngradeToFree(selectedPlan)}
                >
                  <RotateCcw className="size-4" />{" "}
                  {tx("Return to Free Plan", "Bumalik sa Free Plan", "Balik sa Free Plan")}
                </Button>
              ) : (
                <Button type="button" variant="secondary" className="w-full" disabled>
                  {tx(
                    "Currently on Free Plan",
                    "Kasalukuyang nasa Free Plan",
                    "Kasamtangang naa sa Free Plan",
                  )}
                </Button>
              )}
            </div>
          </section>

          {/* Pro Plan Card */}
          <section className="flex flex-col justify-between rounded-3xl border-2 border-gold bg-gold-sheen p-6 text-gold-foreground shadow-lift">
            <div>
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1 rounded-full bg-deep px-3 py-1 text-xs font-bold text-deep-foreground">
                  <Sparkles className="size-3.5 text-gold" aria-hidden />{" "}
                  {tx("Demonstration Plan", "Planong Demo", "Demo nga Plan")}
                </span>
                {isCurrentPlanActive && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-card px-2.5 py-0.5 text-xs font-extrabold text-primary">
                    <CheckCircle2 className="size-3.5" aria-hidden />{" "}
                    {tx("Active", "Aktibo", "Aktibo")}
                  </span>
                )}
              </div>
              <h3 className="mt-3 text-2xl font-extrabold text-foreground">{details.title}</h3>
              <p className="mt-1 text-sm text-foreground/80">
                {selectedPlan === "worker"
                  ? tx(
                      "Prototype preview — no payment required. Unlock enhanced worker tools immediately.",
                      "Prototype preview — walang bayad. Buksan agad ang dagdag na tools para sa worker.",
                      "Prototype preview — walay bayad. Ablihi dayon ang dugang nga tools alang sa worker.",
                    )
                  : tx(
                      "Prototype preview — no payment required. Unlock enhanced employer tools immediately.",
                      "Prototype preview — walang bayad. Buksan agad ang dagdag na tools para sa nag-book.",
                      "Prototype preview — walay bayad. Ablihi dayon ang dugang nga tools alang sa nag-book.",
                    )}
              </p>

              <ul className="mt-5 space-y-2.5 text-sm text-foreground">
                {details.proBenefits.map((b) => (
                  <li key={b} className="flex items-start gap-2.5">
                    <Zap className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                    <span className="font-medium">{b}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-6 space-y-2 border-t border-gold-foreground/15 pt-4">
              {isCurrentPlanActive ? (
                <div className="space-y-2">
                  <Button asChild size="lg" className="w-full">
                    <Link to={details.dashboardLink}>
                      {details.dashboardLabel} <ArrowRight className="size-4" />
                    </Link>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full bg-card/90"
                    onClick={() => handleDowngradeToFree(selectedPlan)}
                  >
                    <RotateCcw className="size-3.5" />{" "}
                    {tx("Return to Free Plan", "Bumalik sa Free Plan", "Balik sa Free Plan")}
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  size="lg"
                  className="w-full"
                  onClick={() => setStep("review")}
                >
                  <Crown className="size-4" /> {t("pro.upgradeBtn", { plan: details.title })}
                </Button>
              )}
            </div>
          </section>
        </div>
      )}

      {/* Step 2: Review Demo Upgrade */}
      {step === "review" && (
        <section className="animate-fade-up rounded-3xl border bg-card p-6 shadow-lift md:p-8">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-gold-soft px-3 py-1 text-xs font-bold text-gold-foreground">
            {tx(
              "Step 2 of 2 · Review Demonstration Upgrade",
              "Hakbang 2 ng 2 · Suriin ang Demo Upgrade",
              "Lakang 2 sa 2 · Susiha ang Demo Upgrade",
            )}
          </span>
          <h3 className="mt-3 text-2xl font-extrabold">
            {tx(
              `Confirm ${details.title} Demo Activation`,
              `Kumpirmahin ang Pag-activate ng ${details.title}`,
              `Kumpirmaha ang Pag-activate sa ${details.title}`,
            )}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {selectedPlan === "worker"
              ? tx(
                  "Review the prototype features that will be unlocked in your Worker experience:",
                  "Suriin ang mga feature na mabubuksan sa iyong Worker mode:",
                  "Susiha ang mga feature nga maablihan sa imong Worker mode:",
                )
              : tx(
                  "Review the prototype features that will be unlocked in your Employer experience:",
                  "Suriin ang mga feature na mabubuksan sa iyong Hiring mode:",
                  "Susiha ang mga feature nga maablihan sa imong Hiring mode:",
                )}
          </p>

          <div className="mt-5 rounded-2xl bg-muted p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              {tx(
                "Demo UI Features Unlocked Immediately",
                "Mga Feature na Agad Mabubuksan",
                "Mga Feature nga Dali Maablihan",
              )}
            </p>
            <ul className="mt-2.5 space-y-2 text-sm">
              {details.unlockedFeatures.map((f) => (
                <li key={f} className="flex items-center gap-2 font-medium">
                  <CheckCircle2 className="size-4 shrink-0 text-primary" aria-hidden />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-4 flex items-start gap-2.5 rounded-2xl border bg-secondary/50 p-3.5 text-xs text-secondary-foreground">
            <Info className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
            <p>
              <strong>
                {tx("Demonstration Notice:", "Paalala sa Demo:", "Pahinumdom sa Demo:")}
              </strong>{" "}
              {tx(
                "This is a hackathon prototype. No payment details are collected or processed, and you can switch back to the Free Plan at any time with one click.",
                "Hackathon prototype lang ito. Walang kinokolektang bayad at maaari kang bumalik sa Free Plan anumang oras.",
                "Hackathon prototype ra kini. Walay ginakolekta nga bayad ug mahimo kang mobalik sa Free Plan bisan unsang orasa.",
              )}
            </p>
          </div>

          <div className="mt-6 flex flex-wrap justify-end gap-3">
            <Button type="button" variant="outline" size="lg" onClick={() => setStep("browse")}>
              {tx("Back to Plans", "Bumalik sa mga Plan", "Balik sa mga Plan")}
            </Button>
            <Button type="button" variant="gold" size="lg" onClick={handleConfirmUpgrade}>
              <Crown className="size-4" />{" "}
              {tx(
                "Confirm Demo Upgrade",
                "Kumpirmahin ang Demo Upgrade",
                "Kumpirmaha ang Demo Upgrade",
              )}
            </Button>
          </div>
        </section>
      )}

      {/* Step 3: Upgrade Success State */}
      {step === "success" && (
        <section
          role="status"
          className="animate-fade-up rounded-3xl border bg-card p-6 text-center shadow-lift md:p-10"
        >
          <span className="mx-auto grid size-16 place-items-center rounded-full bg-gold text-gold-foreground shadow-soft">
            <Crown className="size-8" aria-hidden />
          </span>
          <p className="mt-4 text-xs font-bold uppercase tracking-wide text-primary">
            {tx(
              "Demonstration Upgrade Active",
              "Aktibo na ang Demo Upgrade",
              "Aktibo na ang Demo Upgrade",
            )}
          </p>
          <h3 className="mt-1 text-2xl font-extrabold tracking-tight md:text-3xl">
            {tx(
              `Welcome to ${details.title}!`,
              `Maligayang pagdating sa ${details.title}!`,
              `Maayong pag-abot sa ${details.title}!`,
            )}
          </h3>
          <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">
            {tx(
              "Your demo subscription state has been updated and saved. Your Pro badge and unlocked prototype features are now live on your dashboard.",
              "Na-save na ang iyong demo subscription. Makikita na sa dashboard mo ang Pro badge at mga bagong feature.",
              "Na-save na ang imong demo subscription. Makita na sa imong dashboard ang Pro badge ug mga bag-ong feature.",
            )}
          </p>

          <div className="mx-auto mt-6 max-w-md rounded-2xl bg-muted p-4 text-left text-xs">
            <p className="font-bold uppercase tracking-wide text-muted-foreground">
              {tx(
                "Now Active on Your Account:",
                "Aktibo na sa Iyong Account:",
                "Aktibo na sa Imong Account:",
              )}
            </p>
            <ul className="mt-2 space-y-1.5">
              {details.unlockedFeatures.map((f) => (
                <li key={f} className="flex items-center gap-2 font-semibold text-foreground">
                  <TrendingUp className="size-3.5 text-primary" aria-hidden /> {f}
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link to={details.dashboardLink}>
                {details.dashboardLabel} <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={() => handleDowngradeToFree(selectedPlan)}
            >
              <RotateCcw className="size-4" />{" "}
              {tx("Return to Free Plan", "Bumalik sa Free Plan", "Balik sa Free Plan")}
            </Button>
          </div>
        </section>
      )}

      <p className="flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
        <ShieldCheck className="size-4 text-primary" aria-hidden />
        {tx(
          "Prototype demonstration only — no real billing, charges, or subscription fees exist.",
          "Demo prototype lamang — walang totoong singil o bayad.",
          "Demo prototype lamang — walay tinuod nga bayad o singil.",
        )}
      </p>
    </div>
  );
}
