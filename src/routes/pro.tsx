import { useEffect, useState, type KeyboardEvent } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Crown,
  Info,
  RotateCcw,
  ShieldCheck,
  TrendingUp,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { AppLayout } from "@/components/gaw/AppLayout";
import { FOCUS_RING, selectableOptionCardClass } from "@/components/gaw/interactions";
import { Button } from "@/components/ui/button";
import {
  FREE_OPEN_GIGS_LIMIT,
  FREE_WORKER_QUEUE_LIMIT,
  HOURLY_WAGE_REFERENCE,
  TIER_CONFIG,
} from "@/lib/gaw/domain";
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
  tabLabel: string;
  title: string;
  subtitle: string;
  monthlyPricePhp: number;
  dashboardLink: "/work" | "/hire";
  dashboardLabel: string;
  freeBenefits: string[];
  proBenefits: string[];
  unlockedFeatures: string[];
}

type UpgradeStep = "browse" | "review" | "success";

const PLAN_TABS: readonly ProPlan[] = ["worker", "employer"];

/** Compact Durian Gold GAW PRO eyebrow badge without repeating the primary GAW logo. */
function GawProBadge({ label = "GAW PRO" }: { label?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.09em]",
        "border-[#D99416]/35 bg-[#FDF3D7] text-[#6E4903]",
        "dark:border-[#F4B544]/35 dark:bg-[#F4B544]/12 dark:text-[#F4B544]",
      )}
    >
      <Crown className="size-3.5 shrink-0 text-[#B87409] dark:text-[#F4B544]" aria-hidden />
      <span>{label}</span>
    </span>
  );
}

export function ProSubscriptionExperience() {
  const { mode, plans, setPlan } = useGaw();
  const { t, tx } = useI18n();
  const defaultPlanForMode: ProPlan = mode === "work" ? "worker" : "employer";
  const [selectedPlan, setSelectedPlan] = useState<ProPlan>(defaultPlanForMode);
  const [hasPickedTab, setHasPickedTab] = useState(false);
  const [step, setStep] = useState<UpgradeStep>("browse");

  useEffect(() => {
    if (!hasPickedTab) {
      setSelectedPlan(defaultPlanForMode);
    }
  }, [defaultPlanForMode, hasPickedTab]);

  const planConfig: Record<ProPlan, PlanDetails> = {
    worker: {
      key: "worker",
      tabLabel: t("pro.workerProTab"),
      title: "GAW Worker Pro",
      subtitle: tx(
        "Stand out to nearby Davao City households and track your local service growth.",
        "Mas mapansin ng mga kalapit na sambahayan sa Davao City at subaybayan ang iyong kita.",
        "Mas mailhan sa mga duol nga panimalay sa Davao City ug bantayi ang imong lokal nga serbisyo.",
      ),
      monthlyPricePhp: TIER_CONFIG.PRO.monthlyPricePhpEmployee,
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
          "Modawat og direktang booking request gikan sa mga residente",
        ),
        tx(
          `Save up to ${FREE_WORKER_QUEUE_LIMIT} jobs in My Jobs & browse Davao openings`,
          `Mag-save ng hanggang ${FREE_WORKER_QUEUE_LIMIT} trabaho sa Aking Trabaho at mag-browse sa Davao`,
          `Pag-save og hangtod ${FREE_WORKER_QUEUE_LIMIT} ka trabaho sa Akong Trabaho ug pangita sa Davao`,
        ),
        tx(
          `Standard ${(TIER_CONFIG.FREE.employeeFeeRate * 100).toFixed(0)}% worker fee preview (protected by Davao ₱${HOURLY_WAGE_REFERENCE.toFixed(2)}/hr reference)`,
          `Karaniwang ${(TIER_CONFIG.FREE.employeeFeeRate * 100).toFixed(0)}% fee preview (protektado ng ₱${HOURLY_WAGE_REFERENCE.toFixed(2)}/oras na gabay)`,
          `Kasagarang ${(TIER_CONFIG.FREE.employeeFeeRate * 100).toFixed(0)}% fee preview (protektado sa ₱${HOURLY_WAGE_REFERENCE.toFixed(2)}/oras nga giya)`,
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
          `0% Worker Service Fee in payout previews (vs ${(TIER_CONFIG.FREE.employeeFeeRate * 100).toFixed(0)}% Free)`,
          `0% Worker Service Fee sa payout preview (vs ${(TIER_CONFIG.FREE.employeeFeeRate * 100).toFixed(0)}% Free)`,
          `0% Worker Service Fee sa payout preview (vs ${(TIER_CONFIG.FREE.employeeFeeRate * 100).toFixed(0)}% Free)`,
        ),
        tx(
          `Unlimited Saved Jobs queue in My Jobs (vs ${FREE_WORKER_QUEUE_LIMIT} slots on Free)`,
          `Walang limit na Saved Jobs sa Aking Trabaho (vs ${FREE_WORKER_QUEUE_LIMIT} sa Free)`,
          `Walay limit nga Saved Jobs sa Akong Trabaho (vs ${FREE_WORKER_QUEUE_LIMIT} sa Free)`,
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
      ],
      unlockedFeatures: [
        tx(
          "0% worker fee preview + Unlimited Saved Jobs queue in /my-jobs",
          "0% worker fee preview + Walang limit na Saved Jobs sa /my-jobs",
          "0% worker fee preview + Walay limit nga Saved Jobs sa /my-jobs",
        ),
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
      ],
    },
    employer: {
      key: "employer",
      tabLabel: t("pro.employerProTab"),
      title: "GAW Employer Pro",
      subtitle: tx(
        "Faster household & small-business hiring with unlimited requests, lower fee previews, and priority filters.",
        "Mas mabilis na pag-hire na may walang limit na request, mas mababang fee preview, at priority filter.",
        "Mas paspas nga pag-hire nga may walay limit nga request, ubos nga fee preview, ug priority filter.",
      ),
      monthlyPricePhp: TIER_CONFIG.PRO.monthlyPricePhpEmployer,
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
          `Post up to ${FREE_OPEN_GIGS_LIMIT} active open service requests at a time`,
          `Mag-post ng hanggang ${FREE_OPEN_GIGS_LIMIT} aktibong bukas na service requests`,
          `Pag-post og hangtod ${FREE_OPEN_GIGS_LIMIT} ka aktibo nga abli nga service requests`,
        ),
        tx(
          `Standard ${(TIER_CONFIG.FREE.employerFeeRate * 100).toFixed(0)}% demo fee preview & live booking tracker`,
          `Karaniwang ${(TIER_CONFIG.FREE.employerFeeRate * 100).toFixed(0)}% demo fee preview at live booking tracker`,
          `Kasagarang ${(TIER_CONFIG.FREE.employerFeeRate * 100).toFixed(0)}% demo fee preview ug live booking tracker`,
        ),
        tx(
          "Interactive map & radar discovery within 1 to 10 km",
          "Interaktibong mapa at paghahanap sa loob ng 1 hanggang 10 km",
          "Interaktibong mapa ug pagpangita sulod sa 1 hangtod 10 km",
        ),
      ],
      proBenefits: [
        tx(
          "Everything in the Free Employer Plan",
          "Lahat ng nasa Free Employer Plan",
          "Tanan nga naa sa Free Employer Plan",
        ),
        tx(
          `Unlimited open service requests (vs ${FREE_OPEN_GIGS_LIMIT} on Free)`,
          `Walang limit na bukas na service requests (vs ${FREE_OPEN_GIGS_LIMIT} sa Free)`,
          `Walay limit nga abli nga service requests (vs ${FREE_OPEN_GIGS_LIMIT} sa Free)`,
        ),
        tx(
          `Reduced ${(TIER_CONFIG.PRO.employerFeeRate * 100).toFixed(0)}% employer fee preview (vs ${(TIER_CONFIG.FREE.employerFeeRate * 100).toFixed(0)}% Free)`,
          `Mas mababang ${(TIER_CONFIG.PRO.employerFeeRate * 100).toFixed(0)}% employer fee preview (vs ${(TIER_CONFIG.FREE.employerFeeRate * 100).toFixed(0)}% Free)`,
          `Mas ubos nga ${(TIER_CONFIG.PRO.employerFeeRate * 100).toFixed(0)}% employer fee preview (vs ${(TIER_CONFIG.FREE.employerFeeRate * 100).toFixed(0)}% Free)`,
        ),
        tx(
          "Exclusive “Top-Rated Only (4.8★+)” filter unlocked in Nearby Finder",
          "Eksklusibong filter na “Top-Rated Only (4.8★+)” sa Nearby Finder",
          "Eksklusibo nga filter nga “Top-Rated Only (4.8★+)” sa Nearby Finder",
        ),
        tx(
          "Highlighted Gold Pro Badge & Saved Search Presets on Employer Home",
          "Gold Pro Badge at Saved Search Presets sa Employer Home",
          "Gold Pro Badge ug Saved Search Presets sa Employer Home",
        ),
      ],
      unlockedFeatures: [
        tx(
          `Unlimited open requests + ${(TIER_CONFIG.PRO.employerFeeRate * 100).toFixed(0)}% fee preview across /hire and /book`,
          `Walang limit na open requests + ${(TIER_CONFIG.PRO.employerFeeRate * 100).toFixed(0)}% fee preview`,
          `Walay limit nga open requests + ${(TIER_CONFIG.PRO.employerFeeRate * 100).toFixed(0)}% fee preview`,
        ),
        tx(
          "“Top-Rated Only (4.8★+)” Pro filter unlocked in Nearby Finder (/find)",
          "Buksan ang “Top-Rated Only (4.8★+)” Pro filter sa Nearby Finder (/find)",
          "Abli ang “Top-Rated Only (4.8★+)” Pro filter sa Nearby Finder (/find)",
        ),
        tx(
          "Saved Searches & Employer Pro Crown Badge unlocked on Employer Home (/hire)",
          "Buksan ang Saved Searches at Pro Crown Badge sa Employer Home (/hire)",
          "Abli ang Saved Searches ug Pro Crown Badge sa Employer Home (/hire)",
        ),
      ],
    },
  };

  const details = planConfig[selectedPlan];
  const isCurrentPlanActive = hasPlan(plans, selectedPlan);
  const workerActive = hasPlan(plans, "worker");
  const employerActive = hasPlan(plans, "employer");
  const hasAnyPro = workerActive || employerActive;

  // Canonical plan label independent of activation order, localized across en-PH / fil-PH / ceb-PH
  const membershipStatusLabel =
    workerActive && employerActive
      ? tx(
          "Worker Pro + Employer Pro (Demo)",
          "Worker Pro + Employer Pro (Demo)",
          "Worker Pro + Employer Pro (Demo)",
        )
      : workerActive
        ? tx("Worker Pro (Demo)", "Worker Pro (Demo)", "Worker Pro (Demo)")
        : employerActive
          ? tx("Employer Pro (Demo)", "Employer Pro (Demo)", "Employer Pro (Demo)")
          : tx("Free Community Plan", "Free Community Plan", "Free Community Plan");

  const handleSelectPlan = (p: ProPlan) => {
    setHasPickedTab(true);
    setSelectedPlan(p);
    setStep("browse");
  };

  const handleTabKeyDown = (e: KeyboardEvent<HTMLButtonElement>, currentIdx: number) => {
    let targetIdx: number | null = null;
    if (e.key === "ArrowRight") targetIdx = (currentIdx + 1) % PLAN_TABS.length;
    else if (e.key === "ArrowLeft")
      targetIdx = (currentIdx - 1 + PLAN_TABS.length) % PLAN_TABS.length;
    else if (e.key === "Home") targetIdx = 0;
    else if (e.key === "End") targetIdx = PLAN_TABS.length - 1;

    if (targetIdx !== null) {
      e.preventDefault();
      const nextPlan = PLAN_TABS[targetIdx]!;
      handleSelectPlan(nextPlan);
      document.getElementById(`pro-tab-${nextPlan}`)?.focus();
    }
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
        `Gibalik ang ${planConfig[p].title} sa Free Plan`,
      ),
    );
  };

  const entitlementRows: { key: ProPlan; label: string; active: boolean }[] = [
    {
      key: "worker",
      label: tx("Worker Plan", "Worker Plan", "Worker Plan"),
      active: workerActive,
    },
    {
      key: "employer",
      label: tx("Employer Plan", "Employer Plan", "Employer Plan"),
      active: employerActive,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Section A — Membership Overview */}
      <section
        aria-labelledby="pro-membership-heading"
        className={cn(
          "rounded-3xl border p-5 shadow-soft sm:p-6 md:p-7",
          "border-border/90 bg-card bg-[radial-gradient(ellipse_at_top_right,rgba(14,112,72,0.06),transparent_62%)]",
          "dark:border-[#34483A] dark:bg-[#192820] dark:bg-[radial-gradient(ellipse_at_top_right,rgba(67,196,134,0.075),transparent_58%)] dark:shadow-[0_12px_32px_-16px_rgba(0,0,0,0.6)]",
        )}
      >
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between md:gap-8">
          <div className="min-w-0 flex-1 space-y-2.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <GawProBadge label="GAW PRO" />
            </div>

            <div className="space-y-1.5">
              <h2
                id="pro-membership-heading"
                className="text-xl font-extrabold tracking-tight text-foreground dark:text-[#F3F7F4] sm:text-2xl"
              >
                {tx("Your Membership", "Iyong Membership", "Imong Membership")}
              </h2>

              <div className="flex flex-wrap items-center gap-2">
                <span
                  data-testid="pro-membership-status"
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-bold",
                    hasAnyPro
                      ? "border-[#D99416]/40 bg-[#FDF3D7] text-[#6E4903] dark:border-[#F4B544]/40 dark:bg-[#F4B544]/14 dark:text-[#F4B544]"
                      : "border-primary/25 bg-secondary text-secondary-foreground dark:border-[#43C486]/30 dark:bg-[#22352A] dark:text-[#F3F7F4]",
                  )}
                >
                  {hasAnyPro ? (
                    <Crown
                      className="size-3.5 shrink-0 text-[#B87409] dark:text-[#F4B544]"
                      aria-hidden
                    />
                  ) : (
                    <span
                      className="size-2 shrink-0 rounded-full bg-primary dark:bg-[#43C486]"
                      aria-hidden
                    />
                  )}
                  <span>{membershipStatusLabel}</span>
                </span>
              </div>
            </div>

            <p className="max-w-xl text-sm leading-relaxed text-muted-foreground dark:text-[#B5C8BC]">
              {tx(
                "Manage your membership and explore benefits designed for workers and employers.",
                "Pamahalaan ang iyong membership at tuklasin ang mga benepisyo para sa mga worker at employer.",
                "Pagdumala sa imong membership ug susiha ang mga benepisyo alang sa mga worker ug employer.",
              )}
            </p>
          </div>

          {/* Compact Entitlement Summary */}
          <aside
            aria-label={tx("Entitlement summary", "Buod ng mga plan", "Sumada sa mga plan")}
            className={cn(
              "w-full shrink-0 rounded-2xl border p-4 md:w-72 lg:w-80",
              "border-border/85 bg-[#F4F8F5]",
              "dark:border-[#34483A] dark:bg-[#22352A]",
            )}
          >
            <p className="text-[11px] font-bold uppercase tracking-[0.09em] text-muted-foreground dark:text-[#B5C8BC]">
              {tx("Entitlements Summary", "Buod ng mga Plan", "Sumada sa mga Plan")}
            </p>
            <dl className="mt-3 space-y-2.5 text-sm">
              {entitlementRows.map((row) => (
                <div key={row.key} className="flex items-center justify-between gap-3">
                  <dt className="font-medium text-muted-foreground dark:text-[#B5C8BC]">
                    {row.label}:
                  </dt>
                  <dd>
                    <span
                      data-testid={`entitlement-${row.key}`}
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold",
                        row.active
                          ? "border border-[#D99416]/40 bg-[#FDF3D7] text-[#6E4903] dark:border-[#F4B544]/40 dark:bg-[#F4B544]/15 dark:text-[#F4B544]"
                          : "border border-border bg-card text-foreground dark:border-[#34483A] dark:bg-[#192820] dark:text-[#F3F7F4]",
                      )}
                    >
                      {row.active && <Crown className="size-3 shrink-0" aria-hidden />}
                      {row.active ? "Pro" : tx("Free", "Free", "Free")}
                    </span>
                  </dd>
                </div>
              ))}
            </dl>
          </aside>
        </div>
      </section>

      {/* Section B — Choose Your Pro Experience */}
      <section aria-labelledby="pro-track-heading" className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2
            id="pro-track-heading"
            className="text-base font-extrabold tracking-tight text-foreground dark:text-[#F3F7F4]"
          >
            {tx(
              "Choose Your Pro Experience",
              "Piliin ang Iyong Pro Experience",
              "Pilia ang Imong Pro Experience",
            )}
          </h2>
          <p className="text-xs text-muted-foreground dark:text-[#B5C8BC]">
            {tx(
              "Interactive demo preview — switch tracks anytime.",
              "Interactive demo preview — lumipat anumang oras.",
              "Interactive demo preview — balhin bisan unsang orasa.",
            )}
          </p>
        </div>

        <div
          className="grid grid-cols-1 gap-3 sm:grid-cols-2"
          role="tablist"
          aria-label={tx(
            "Choose Your Pro Experience",
            "Piliin ang Iyong Pro Experience",
            "Pilia ang Imong Pro Experience",
          )}
        >
          {PLAN_TABS.map((p, idx) => {
            const cfg = planConfig[p];
            const active = selectedPlan === p;
            const enabled = hasPlan(plans, p);
            return (
              <button
                key={p}
                id={`pro-tab-${p}`}
                type="button"
                role="tab"
                aria-selected={active}
                aria-controls="pro-tabpanel"
                aria-labelledby={`pro-tab-${p}-title`}
                aria-describedby={`pro-tab-${p}-desc`}
                tabIndex={active ? 0 : -1}
                onClick={() => handleSelectPlan(p)}
                onKeyDown={(e) => handleTabKeyDown(e, idx)}
                className={selectableOptionCardClass(
                  active,
                  "flex min-h-[84px] flex-col items-start justify-between rounded-2xl border p-4 text-left sm:p-5 dark:border-[#34483A]",
                )}
              >
                <div className="flex w-full flex-wrap items-center justify-between gap-2">
                  <span
                    id={`pro-tab-${p}-title`}
                    className="inline-flex items-center gap-2 text-sm font-extrabold text-foreground dark:text-[#F3F7F4] sm:text-base"
                  >
                    <Crown
                      className="size-4 shrink-0 text-[#B87409] dark:text-[#F4B544]"
                      aria-hidden
                    />
                    <span>{cfg.tabLabel}</span>
                  </span>
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-0.5 text-[11px] font-bold",
                      enabled
                        ? "border border-[#D99416]/40 bg-[#FDF3D7] text-[#6E4903] dark:border-[#F4B544]/40 dark:bg-[#F4B544]/16 dark:text-[#F4B544]"
                        : "bg-muted text-muted-foreground dark:bg-[#22352A] dark:text-[#B5C8BC]",
                    )}
                  >
                    {enabled
                      ? tx("Active (Demo)", "Aktibo (Demo)", "Aktibo (Demo)")
                      : tx("Free", "Free", "Free")}
                  </span>
                </div>
                <p
                  id={`pro-tab-${p}-desc`}
                  className="mt-2 text-xs leading-relaxed text-muted-foreground dark:text-[#B5C8BC]"
                >
                  {cfg.subtitle}
                </p>
              </button>
            );
          })}
        </div>
      </section>

      {/* Section C — Plan Benefits (tabpanel) */}
      <div id="pro-tabpanel" role="tabpanel" aria-labelledby={`pro-tab-${selectedPlan}`}>
        {step === "browse" && (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {/* Free Plan Card */}
            <section className="flex flex-col justify-between rounded-3xl border border-border/90 bg-card p-5 shadow-soft sm:p-6 dark:border-[#34483A] dark:bg-[#192820]">
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="rounded-full bg-secondary px-3 py-1 text-xs font-bold text-secondary-foreground dark:bg-[#22352A] dark:text-[#B5C8BC]">
                    {tx("Standard Access", "Karaniwang Access", "Kasagarang Access")}
                  </span>
                  {!isCurrentPlanActive && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-secondary px-2.5 py-0.5 text-xs font-bold text-primary dark:border-[#43C486]/35 dark:bg-[#43C486]/12 dark:text-[#43C486]">
                      <CheckCircle2 className="size-3.5 shrink-0" aria-hidden />
                      {t("pro.currentPlan")}
                    </span>
                  )}
                </div>

                <div className="mt-4">
                  <h3 className="text-xl font-extrabold tracking-tight text-foreground dark:text-[#F3F7F4]">
                    {tx("Free Plan", "Libreng Plan", "Libreng Plan")}
                  </h3>
                  <div className="mt-1.5 flex items-baseline gap-1.5">
                    <span className="text-2xl font-extrabold tracking-tight text-foreground dark:text-[#F3F7F4]">
                      ₱0
                    </span>
                    <span className="text-xs font-semibold text-muted-foreground dark:text-[#B5C8BC]">
                      / {tx("forever", "walang bayad", "walay bayad")}
                    </span>
                  </div>
                </div>

                <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground dark:text-[#B5C8BC]">
                  {tx(
                    "Core local hiring and job discovery features for everyone in Davao City.",
                    "Pangunahing pag-hire at paghahanap ng trabaho para sa lahat sa Davao City.",
                    "Panguna nga pag-hire ug pagpangita og trabaho alang sa tanan sa Davao City.",
                  )}
                </p>

                <ul className="mt-5 space-y-2.5 text-sm text-foreground dark:text-[#F3F7F4]">
                  {details.freeBenefits.map((b) => (
                    <li key={b} className="flex items-start gap-2.5">
                      <Check
                        className="mt-0.5 size-4 shrink-0 text-primary dark:text-[#43C486]"
                        aria-hidden
                      />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-6 border-t border-border/80 pt-4 dark:border-[#34483A]">
                {isCurrentPlanActive ? (
                  <p className="text-center text-xs font-semibold text-muted-foreground dark:text-[#B5C8BC]">
                    {tx(
                      "All Free Plan features remain active with your Pro tier.",
                      "Nananatiling aktibo ang lahat ng Free Plan features sa Pro tier.",
                      "Nagpabiling aktibo tanang Free Plan features sa imong Pro tier.",
                    )}
                  </p>
                ) : (
                  <Button
                    type="button"
                    variant="secondary"
                    size="lg"
                    className="h-auto min-h-12 w-full whitespace-normal px-4 py-2.5 text-center leading-snug"
                    disabled
                  >
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
            <section
              className={cn(
                "flex flex-col justify-between rounded-3xl border p-5 shadow-soft sm:p-6",
                "border-[#D99416]/50 bg-gradient-to-b from-[#FFFDF7] to-card",
                "dark:border-[#F4B544]/45 dark:bg-[#192820] dark:bg-[radial-gradient(ellipse_at_top_right,rgba(244,181,68,0.08),transparent_58%)] dark:from-transparent dark:to-transparent",
              )}
            >
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <GawProBadge label="PRO" />
                  {isCurrentPlanActive ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-secondary px-2.5 py-0.5 text-xs font-bold text-primary dark:border-[#43C486]/35 dark:bg-[#43C486]/12 dark:text-[#43C486]">
                      <CheckCircle2 className="size-3.5 shrink-0" aria-hidden />
                      {t("pro.currentPlan")}
                    </span>
                  ) : (
                    <span className="rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-semibold text-muted-foreground dark:bg-[#22352A] dark:text-[#B5C8BC]">
                      {tx("Demonstration Plan", "Planong Demo", "Demo nga Plan")}
                    </span>
                  )}
                </div>

                <div className="mt-4">
                  <h3 className="text-xl font-extrabold tracking-tight text-foreground dark:text-[#F3F7F4]">
                    {details.title}
                  </h3>
                  <div className="mt-1.5 flex flex-wrap items-baseline gap-2">
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-extrabold tracking-tight text-foreground dark:text-[#F3F7F4]">
                        ₱{details.monthlyPricePhp}
                      </span>
                      <span className="text-xs font-semibold text-muted-foreground dark:text-[#B5C8BC]">
                        / {tx("month", "buwan", "bulan")}
                      </span>
                    </div>
                    <span className="rounded-full bg-[#FDF3D7] px-2 py-0.5 text-[11px] font-semibold text-[#6E4903] dark:bg-[#F4B544]/12 dark:text-[#F4B544]">
                      {tx("demo · ₱0 billed", "demo · ₱0 bayad", "demo · ₱0 bayad")}
                    </span>
                  </div>
                </div>

                <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground dark:text-[#B5C8BC]">
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

                <ul className="mt-5 space-y-2.5 text-sm text-foreground dark:text-[#F3F7F4]">
                  {details.proBenefits.map((b) => (
                    <li key={b} className="flex items-start gap-2.5">
                      <Zap
                        className="mt-0.5 size-4 shrink-0 text-[#B87409] dark:text-[#F4B544]"
                        aria-hidden
                      />
                      <span className="font-medium">{b}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-6 border-t border-[#D99416]/20 pt-4 dark:border-[#34483A]">
                {isCurrentPlanActive ? (
                  <Button
                    asChild
                    size="lg"
                    className="h-auto min-h-12 w-full whitespace-normal px-4 py-2.5 text-center leading-snug"
                  >
                    <Link to={details.dashboardLink}>
                      {details.dashboardLabel} <ArrowRight className="size-4 shrink-0" />
                    </Link>
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="gold"
                    size="lg"
                    className="h-auto min-h-12 w-full whitespace-normal px-4 py-2.5 text-center leading-snug"
                    onClick={() => setStep("review")}
                  >
                    <Crown className="size-4 shrink-0" />{" "}
                    {t("pro.upgradeBtn", { plan: details.title })}
                  </Button>
                )}
              </div>
            </section>
          </div>
        )}

        {/* Step 2: Review Demo Upgrade */}
        {step === "review" && (
          <section className="animate-fade-up rounded-3xl border border-border/90 bg-card p-5 shadow-lift sm:p-6 md:p-8 dark:border-[#34483A] dark:bg-[#192820]">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#D99416]/35 bg-[#FDF3D7] px-3 py-1 text-xs font-bold text-[#6E4903] dark:border-[#F4B544]/35 dark:bg-[#F4B544]/12 dark:text-[#F4B544]">
              {tx(
                "Step 2 of 2 · Review Demonstration Upgrade",
                "Hakbang 2 ng 2 · Suriin ang Demo Upgrade",
                "Lakang 2 sa 2 · Susiha ang Demo Upgrade",
              )}
            </span>
            <h3 className="mt-3 text-xl font-extrabold tracking-tight text-foreground dark:text-[#F3F7F4] sm:text-2xl">
              {tx(
                `Confirm ${details.title} Demo Activation`,
                `Kumpirmahin ang Pag-activate ng ${details.title}`,
                `Kumpirmaha ang Pag-activate sa ${details.title}`,
              )}
            </h3>
            <p className="mt-1.5 text-sm text-muted-foreground dark:text-[#B5C8BC]">
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

            <div className="mt-5 rounded-2xl border border-border/80 bg-[#F4F8F5] p-4 dark:border-[#34483A] dark:bg-[#22352A]">
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground dark:text-[#B5C8BC]">
                {tx(
                  "Demo UI Features Unlocked Immediately",
                  "Mga Feature na Agad Mabubuksan",
                  "Mga Feature nga Dali Maablihan",
                )}
              </p>
              <ul className="mt-2.5 space-y-2 text-sm text-foreground dark:text-[#F3F7F4]">
                {details.unlockedFeatures.map((f) => (
                  <li key={f} className="flex items-start gap-2 font-medium">
                    <CheckCircle2
                      className="mt-0.5 size-4 shrink-0 text-primary dark:text-[#43C486]"
                      aria-hidden
                    />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-4 flex items-start gap-2.5 rounded-2xl border border-border bg-secondary/50 p-3.5 text-xs text-secondary-foreground dark:border-[#34483A] dark:bg-[#22352A]/70 dark:text-[#B5C8BC]">
              <Info
                className="mt-0.5 size-4 shrink-0 text-primary dark:text-[#43C486]"
                aria-hidden
              />
              <p>
                <strong className="text-foreground dark:text-[#F3F7F4]">
                  {tx("Demonstration Notice:", "Paalala sa Demo:", "Pahinumdom sa Demo:")}
                </strong>{" "}
                {tx(
                  "This is a hackathon prototype. No payment details are collected or processed, and you can switch back to the Free Plan at any time with one click.",
                  "Hackathon prototype lang ito. Walang kinokolektang bayad at maaari kang bumalik sa Free Plan anumang oras.",
                  "Hackathon prototype ra kini. Walay ginakolekta nga bayad ug mahimo kang mobalik sa Free Plan bisan unsang orasa.",
                )}
              </p>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="h-auto min-h-12 w-full whitespace-normal px-4 py-2.5 text-center sm:w-auto sm:px-6"
                onClick={() => setStep("browse")}
              >
                {tx("Back to Plans", "Bumalik sa mga Plan", "Balik sa mga Plan")}
              </Button>
              <Button
                type="button"
                variant="gold"
                size="lg"
                className="h-auto min-h-12 w-full whitespace-normal px-4 py-2.5 text-center sm:w-auto sm:px-6"
                onClick={handleConfirmUpgrade}
              >
                <Crown className="size-4 shrink-0" />{" "}
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
            className="animate-fade-up rounded-3xl border border-border/90 bg-card p-6 text-center shadow-lift md:p-10 dark:border-[#34483A] dark:bg-[#192820]"
          >
            <span className="mx-auto grid size-14 place-items-center rounded-full border border-[#D99416]/40 bg-[#FDF3D7] text-[#B87409] shadow-soft dark:border-[#F4B544]/40 dark:bg-[#F4B544]/14 dark:text-[#F4B544]">
              <Crown className="size-7" aria-hidden />
            </span>
            <p className="mt-4 text-xs font-bold uppercase tracking-wide text-primary dark:text-[#43C486]">
              {tx(
                "Demonstration Upgrade Active",
                "Aktibo na ang Demo Upgrade",
                "Aktibo na ang Demo Upgrade",
              )}
            </p>
            <h3 className="mt-1 text-2xl font-extrabold tracking-tight text-foreground dark:text-[#F3F7F4] md:text-3xl">
              {tx(
                `Welcome to ${details.title}!`,
                `Maligayang pagdating sa ${details.title}!`,
                `Maayong pag-abot sa ${details.title}!`,
              )}
            </h3>
            <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground dark:text-[#B5C8BC]">
              {tx(
                "Your demo subscription state has been updated and saved. Your Pro badge and unlocked prototype features are now live on your dashboard.",
                "Na-save na ang iyong demo subscription. Makikita na sa dashboard mo ang Pro badge at mga bagong feature.",
                "Na-save na ang imong demo subscription. Makita na sa imong dashboard ang Pro badge ug mga bag-ong feature.",
              )}
            </p>

            <div className="mx-auto mt-6 max-w-md rounded-2xl border border-border/80 bg-[#F4F8F5] p-4 text-left text-xs dark:border-[#34483A] dark:bg-[#22352A]">
              <p className="font-bold uppercase tracking-wide text-muted-foreground dark:text-[#B5C8BC]">
                {tx(
                  "Now Active on Your Account:",
                  "Aktibo na sa Iyong Account:",
                  "Aktibo na sa Imong Account:",
                )}
              </p>
              <ul className="mt-2.5 space-y-2">
                {details.unlockedFeatures.map((f) => (
                  <li
                    key={f}
                    className="flex items-start gap-2 font-semibold text-foreground dark:text-[#F3F7F4]"
                  >
                    <TrendingUp
                      className="mt-0.5 size-3.5 shrink-0 text-primary dark:text-[#43C486]"
                      aria-hidden
                    />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
              <Button
                asChild
                size="lg"
                className="h-auto min-h-12 w-full whitespace-normal px-4 py-2.5 text-center sm:w-auto sm:px-6"
              >
                <Link to={details.dashboardLink}>
                  {details.dashboardLabel} <ArrowRight className="size-4 shrink-0" />
                </Link>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="h-auto min-h-12 w-full whitespace-normal px-4 py-2.5 text-center sm:w-auto sm:px-6"
                onClick={() => handleDowngradeToFree(selectedPlan)}
              >
                <RotateCcw className="size-4 shrink-0" />{" "}
                {tx("Return to Free Plan", "Bumalik sa Free Plan", "Balik sa Free Plan")}
              </Button>
            </div>
          </section>
        )}
      </div>

      {/* Section D — Subscription Management */}
      <section
        aria-labelledby="pro-management-heading"
        className={cn(
          "rounded-2xl border p-4 shadow-soft sm:p-5",
          "border-border/90 bg-card",
          "dark:border-[#34483A] dark:bg-[#192820]",
        )}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 space-y-1">
            <h2
              id="pro-management-heading"
              className="text-sm font-extrabold tracking-tight text-foreground dark:text-[#F3F7F4]"
            >
              {tx(
                "Subscription Management",
                "Pamamahala ng Subscription",
                "Pagdumala sa Subscription",
              )}
            </h2>
            <p className="text-xs leading-relaxed text-muted-foreground dark:text-[#B5C8BC]">
              {isCurrentPlanActive
                ? tx(
                    `${details.title} (Demo) is active on your account. Switch back to the Free Plan anytime with one click.`,
                    `Aktibo ang ${details.title} (Demo) sa iyong account. Bumalik sa Free Plan anumang oras sa isang click.`,
                    `Aktibo ang ${details.title} (Demo) sa imong account. Balik sa Free Plan bisan unsang orasa sa usa ka click.`,
                  )
                : tx(
                    `You are previewing ${details.title} on the Free Plan (₱0 billed). Try a demo upgrade above or revert anytime.`,
                    `Nasa Free Plan (₱0 bayad) ka habang sinusuri ang ${details.title}. Subukan ang demo upgrade o bumalik anumang oras.`,
                    `Anaa ka sa Free Plan (₱0 bayad) samtang nagsusi sa ${details.title}. Sulayi ang demo upgrade o balik bisan unsang orasa.`,
                  )}
            </p>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2.5">
            {isCurrentPlanActive ? (
              <Button
                type="button"
                variant="outline"
                size="default"
                className={cn(
                  "h-auto min-h-11 w-full whitespace-normal px-4 py-2 text-center sm:w-auto",
                  FOCUS_RING,
                )}
                onClick={() => handleDowngradeToFree(selectedPlan)}
              >
                <RotateCcw className="size-4 shrink-0" />{" "}
                {tx("Return to Free Plan", "Bumalik sa Free Plan", "Balik sa Free Plan")}
              </Button>
            ) : (
              step === "browse" && (
                <Button
                  type="button"
                  variant="gold"
                  size="default"
                  className={cn(
                    "h-auto min-h-11 w-full whitespace-normal px-4 py-2 text-center sm:w-auto",
                    FOCUS_RING,
                  )}
                  onClick={() => setStep("review")}
                >
                  <Crown className="size-4 shrink-0" />{" "}
                  {tx(
                    `Try ${details.tabLabel} Demo`,
                    `Subukan ang ${details.tabLabel} Demo`,
                    `Sulayi ang ${details.tabLabel} Demo`,
                  )}
                </Button>
              )
            )}
          </div>
        </div>
      </section>

      <p className="flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground dark:text-[#B5C8BC]">
        <ShieldCheck className="size-4 shrink-0 text-primary dark:text-[#43C486]" aria-hidden />
        <span>
          {tx(
            "Prototype demonstration only — no real billing, charges, or subscription fees exist.",
            "Demo prototype lamang — walang totoong singil o bayad.",
            "Demo prototype lamang — walay tinuod nga bayad o singil.",
          )}
        </span>
      </p>
    </div>
  );
}
