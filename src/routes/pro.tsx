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
import { Button } from "@/components/ui/button";
import { hasPlan, useGaw, type ProPlan } from "@/lib/gaw/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/pro")({
  head: () => ({
    meta: [
      { title: "GAW Pro Membership (Demo) — GAW" },
      { name: "description", content: "Explore GAW Worker Pro and Employer Pro demo membership benefits." },
      { property: "og:title", content: "GAW Pro Membership (Demo) — GAW" },
      { property: "og:description", content: "Explore GAW Worker Pro and Employer Pro demo membership benefits." },
    ],
  }),
  component: ProPage,
});

function ProPage() {
  return (
    <AppLayout title="GAW Pro">
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

const PLAN_CONFIG: Record<ProPlan, PlanDetails> = {
  worker: {
    key: "worker",
    title: "GAW Worker Pro",
    subtitle: "Stand out to nearby Davao City households and track your local service growth.",
    dashboardLink: "/work",
    dashboardLabel: "Go to Worker Dashboard",
    freeBenefits: [
      "Create a public worker profile with primary & custom skills",
      "Receive and accept direct booking requests from residents",
      "Apply to open jobs on the Davao City Job Board",
      "Set your working service area and 1–10 km radius",
    ],
    proBenefits: [
      "Everything in the Free Worker Plan",
      "Highlighted Gold Pro Badge on your Worker Dashboard & Profile",
      "Monthly Earnings Insights & local demand analytics panel on Worker Home",
      "Priority placement in Employer nearby search results (demo preview)",
      "Expanded multi-skill portfolio showcase",
    ],
    unlockedFeatures: [
      "Worker Pro Crown Badge next to your name on Worker Home",
      "Sample Monthly Earnings & Insights widget unlocked on Worker Home",
      "Priority Worker Pro indicator in Account Menu",
    ],
  },
  employer: {
    key: "employer",
    title: "GAW Employer Pro",
    subtitle: "Faster household & small-business hiring with priority filters and saved search presets.",
    dashboardLink: "/hire",
    dashboardLabel: "Go to Employer Dashboard",
    freeBenefits: [
      "Search nearby workers by barangay, GPS pin, or custom service",
      "Interactive map & radar discovery within 1 to 10 km",
      "Send booking requests and quotes with no platform fee",
      "Track active and completed bookings in real time",
    ],
    proBenefits: [
      "Everything in the Free Employer Plan",
      "Highlighted Gold Pro Badge on your Employer Dashboard",
      "Exclusive “Top-Rated Only (4.8★+)” filter unlocked in Nearby Finder",
      "One-click Saved Search Presets & Priority Re-booking card on Employer Home",
      "Dedicated household project tracking tools (demo preview)",
    ],
    unlockedFeatures: [
      "Employer Pro Crown Badge on Employer Home",
      "“Top-Rated Only (4.8★+)” Pro filter unlocked in Nearby Finder (/find)",
      "Saved Searches & Recurring Bookings Pro panel unlocked on Employer Home (/hire)",
    ],
  },
};

type UpgradeStep = "browse" | "review" | "success";

function ProSubscriptionExperience() {
  const { mode, plans, setPlan } = useGaw();
  const [selectedPlan, setSelectedPlan] = useState<ProPlan>(mode === "work" ? "worker" : "employer");
  const [step, setStep] = useState<UpgradeStep>("browse");

  const details = PLAN_CONFIG[selectedPlan];
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
    toast.success(`${details.title} (Demo) activated!`);
  };

  const handleDowngradeToFree = (p: ProPlan) => {
    setPlan(p, false);
    setStep("browse");
    toast(`Returned ${PLAN_CONFIG[p].title} to the Free Plan`);
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
              Current Membership:{" "}
              {plans.length === 0
                ? "Free Community Plan"
                : plans.map((p) => (p === "worker" ? "Worker Pro (Demo)" : "Employer Pro (Demo)")).join(" + ")}
            </h2>
            <p className="mt-1.5 max-w-2xl text-sm text-deep-muted">
              Switch between <strong>Worker Pro</strong> and <strong>Employer Pro</strong> below to preview how GAW unlocks
              extra tools for workers and households. All upgrades are interactive demonstrations — no payment or billing is
              used.
            </p>
          </div>

          <div className="flex flex-col gap-2 rounded-2xl bg-deep-foreground/10 p-4 text-xs md:min-w-60">
            <p className="font-bold uppercase tracking-wide text-deep-muted">Your Entitlements</p>
            <div className="flex items-center justify-between">
              <span>Worker Plan:</span>
              <span className={cn("font-extrabold", workerActive ? "text-gold" : "text-deep-foreground")}>
                {workerActive ? "Worker Pro (Demo)" : "Free Plan"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Employer Plan:</span>
              <span className={cn("font-extrabold", employerActive ? "text-gold" : "text-deep-foreground")}>
                {employerActive ? "Employer Pro (Demo)" : "Free Plan"}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Plan Role Selector (Worker Pro vs Employer Pro) */}
      <div className="grid grid-cols-2 gap-3" role="tablist" aria-label="Choose Pro track">
        {(["worker", "employer"] as ProPlan[]).map((p) => {
          const cfg = PLAN_CONFIG[p];
          const active = selectedPlan === p;
          const enabled = hasPlan(plans, p);
          return (
            <button
              key={p}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => handleSelectPlan(p)}
              className={cn(
                "flex cursor-pointer flex-col items-start justify-between rounded-3xl border p-4 text-left transition-all md:p-5",
                active
                  ? "border-primary bg-card shadow-lift ring-2 ring-primary/25"
                  : "bg-card/70 text-muted-foreground hover:border-primary/50 hover:text-foreground",
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
                    enabled
                      ? "bg-gold text-gold-foreground"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  {enabled ? "Active (Demo)" : "Free Plan"}
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
                  Standard Access
                </span>
                {!isCurrentPlanActive && (
                  <span className="text-xs font-bold text-primary">Current Plan</span>
                )}
              </div>
              <h3 className="mt-3 text-xl font-extrabold">Free Plan</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Core local hiring and job discovery features for everyone in Davao City.
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
                  <RotateCcw className="size-4" /> Return to Free Plan
                </Button>
              ) : (
                <Button type="button" variant="secondary" className="w-full" disabled>
                  Currently on Free Plan
                </Button>
              )}
            </div>
          </section>

          {/* Pro Plan Card */}
          <section className="flex flex-col justify-between rounded-3xl border-2 border-gold bg-gold-sheen p-6 text-gold-foreground shadow-lift">
            <div>
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1 rounded-full bg-deep px-3 py-1 text-xs font-bold text-deep-foreground">
                  <Sparkles className="size-3.5 text-gold" aria-hidden /> Demonstration Plan
                </span>
                {isCurrentPlanActive && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-card px-2.5 py-0.5 text-xs font-extrabold text-primary">
                    <CheckCircle2 className="size-3.5" aria-hidden /> Active
                  </span>
                )}
              </div>
              <h3 className="mt-3 text-2xl font-extrabold text-foreground">{details.title}</h3>
              <p className="mt-1 text-sm text-foreground/80">
                Prototype preview — no payment required. Unlock enhanced {selectedPlan} tools immediately.
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
                    <RotateCcw className="size-3.5" /> Return to Free Plan
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  size="lg"
                  className="w-full"
                  onClick={() => setStep("review")}
                >
                  <Crown className="size-4" /> Select {details.title} (Demo)
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
            Step 2 of 2 · Review Demonstration Upgrade
          </span>
          <h3 className="mt-3 text-2xl font-extrabold">Confirm {details.title} Demo Activation</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Review the prototype features that will be unlocked in your {selectedPlan === "worker" ? "Worker" : "Employer"} experience:
          </p>

          <div className="mt-5 rounded-2xl bg-muted p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Demo UI Features Unlocked Immediately
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
              <strong>Demonstration Notice:</strong> This is a hackathon prototype. No payment details are collected or
              processed, and you can switch back to the Free Plan at any time with one click.
            </p>
          </div>

          <div className="mt-6 flex flex-wrap justify-end gap-3">
            <Button type="button" variant="outline" size="lg" onClick={() => setStep("browse")}>
              Back to Plans
            </Button>
            <Button type="button" variant="gold" size="lg" onClick={handleConfirmUpgrade}>
              <Crown className="size-4" /> Confirm Demo Upgrade
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
            Demonstration Upgrade Active
          </p>
          <h3 className="mt-1 text-2xl font-extrabold tracking-tight md:text-3xl">
            Welcome to {details.title}!
          </h3>
          <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">
            Your demo subscription state has been updated and saved. Your Pro badge and unlocked prototype features are now
            live on your dashboard.
          </p>

          <div className="mx-auto mt-6 max-w-md rounded-2xl bg-muted p-4 text-left text-xs">
            <p className="font-bold uppercase tracking-wide text-muted-foreground">Now Active on Your Account:</p>
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
              <RotateCcw className="size-4" /> Return to Free Plan
            </Button>
          </div>
        </section>
      )}

      <p className="flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
        <ShieldCheck className="size-4 text-primary" aria-hidden />
        Prototype demonstration only — no real billing, charges, or subscription fees exist.
      </p>
    </div>
  );
}
