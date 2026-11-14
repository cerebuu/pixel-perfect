import { useState } from "react";
import { ChevronDown, ChevronUp, Info, Scale, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  calculateSettlementBreakdown,
  DAVAO_HOURLY_BENCHMARK_PHP,
  type PricingEstimateResult,
  type SubscriptionTier,
} from "@/lib/gaw/domain";
import { useI18n } from "@/lib/gaw/i18n";
import { formatPeso } from "@/lib/gaw/store";
import { cn } from "@/lib/utils";

interface FairPayEstimateCardProps {
  estimate: PricingEstimateResult;
  offeredBudgetPhp: number | null;
  onApplyRecommended?: (amountPhp: number) => void;
  compact?: boolean;
  className?: string;
}

/**
 * Displays GAW's Davao City fair-pay estimate, non-binding benchmark floor,
 * and itemized heuristic breakdown cleanly across Hiring & Working screens.
 */
export function FairPayEstimateCard({
  estimate,
  offeredBudgetPhp,
  onApplyRecommended,
  compact = false,
  className,
}: FairPayEstimateCardProps) {
  const { tx } = useI18n();
  const [expanded, setExpanded] = useState(false);

  const isBelowBenchmark =
    offeredBudgetPhp !== null && offeredBudgetPhp < estimate.minimumWageFloorPhp;

  return (
    <div
      className={cn(
        "rounded-2xl border bg-muted/45 p-3.5 text-sm transition-colors",
        isBelowBenchmark && "border-destructive/60 bg-destructive/5",
        className,
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="space-y-0.5">
          <p className="inline-flex items-center gap-1.5 text-xs font-bold text-primary">
            <Sparkles className="size-3.5" aria-hidden />
            {tx(
              "GAW Local Fair-Pay Estimate",
              "GAW Gabay sa Patas na Presyo",
              "GAW Giya sa Patas nga Presyo",
            )}
          </p>
          <p className="text-base font-extrabold text-foreground">
            {formatPeso(Math.round(estimate.suggestedMinPhp))} –{" "}
            {formatPeso(Math.round(estimate.suggestedMaxPhp))}{" "}
            <span className="text-xs font-semibold text-muted-foreground">
              ({tx("suggested:", "mungkahi:", "gisugyot:")}{" "}
              {formatPeso(Math.round(estimate.recommendedPhp))})
            </span>
          </p>
          <p className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Scale className="size-3.5 shrink-0 text-primary/80" aria-hidden />
            {tx(
              `Benchmark floor: ${formatPeso(estimate.minimumWageFloorPhp)} (${estimate.estimatedHours}h × ₱${DAVAO_HOURLY_BENCHMARK_PHP.toFixed(2)}/hr)`,
              `Batayang gabay: ${formatPeso(estimate.minimumWageFloorPhp)} (${estimate.estimatedHours} oras × ₱${DAVAO_HOURLY_BENCHMARK_PHP.toFixed(2)}/oras)`,
              `Base nga giya: ${formatPeso(estimate.minimumWageFloorPhp)} (${estimate.estimatedHours} ka oras × ₱${DAVAO_HOURLY_BENCHMARK_PHP.toFixed(2)}/oras)`,
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {onApplyRecommended && (
            <Button
              type="button"
              size="sm"
              variant="soft"
              onClick={() => onApplyRecommended(Math.round(estimate.recommendedPhp))}
            >
              {tx("Use Estimate", "Gamitin ito", "Gamita kini")}
            </Button>
          )}
          <Button
            type="button"
            size="sm"
            variant="ghost"
            aria-expanded={expanded}
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded
              ? tx("Hide details", "Itago", "Tagoa")
              : tx("Breakdown", "Detalye", "Detalye")}
            {expanded ? (
              <ChevronUp className="size-3.5" aria-hidden />
            ) : (
              <ChevronDown className="size-3.5" aria-hidden />
            )}
          </Button>
        </div>
      </div>

      {isBelowBenchmark && (
        <p role="alert" className="mt-2 text-xs font-semibold text-destructive">
          {tx(
            `Entered amount (${formatPeso(offeredBudgetPhp)}) is below GAW's ${formatPeso(estimate.minimumWageFloorPhp)} fair-pay benchmark for ${estimate.estimatedHours}h.`,
            `Ang halagang ${formatPeso(offeredBudgetPhp)} ay mas mababa sa ${formatPeso(estimate.minimumWageFloorPhp)} na gabay ng GAW para sa ${estimate.estimatedHours} oras.`,
            `Ang kantidad nga ${formatPeso(offeredBudgetPhp)} ubos sa ${formatPeso(estimate.minimumWageFloorPhp)} nga giya sa GAW alang sa ${estimate.estimatedHours} ka oras.`,
          )}
        </p>
      )}

      {expanded && (
        <div className="mt-3 space-y-2.5 border-t border-border/70 pt-3 text-xs">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-3">
            <div>
              <dt className="text-muted-foreground">
                {tx("Base benchmark", "Batayang oras", "Base nga oras")}
              </dt>
              <dd className="font-bold text-foreground">
                {formatPeso(estimate.breakdown.baseWageFloorPhp)}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">
                {tx("Trade & skill factor", "Kasanayan", "Abilidad")}
              </dt>
              <dd className="font-bold text-foreground">
                +{formatPeso(estimate.breakdown.skillPremiumPhp)}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">
                {tx("Tools allowance", "Gamit / Tools", "Gamit / Tools")}
              </dt>
              <dd className="font-bold text-foreground">
                +{formatPeso(estimate.breakdown.toolAllowancePhp)}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">
                {tx("Transit allowance", "Pamasahe", "Pletehan")}
              </dt>
              <dd className="font-bold text-foreground">
                +{formatPeso(estimate.breakdown.transportAllowancePhp)}
              </dd>
            </div>
            {estimate.breakdown.urgencyPremiumPhp > 0 && (
              <div>
                <dt className="text-muted-foreground">
                  {tx("Urgency buffer", "Apurahan", "Dinalian")}
                </dt>
                <dd className="font-bold text-foreground">
                  +{formatPeso(estimate.breakdown.urgencyPremiumPhp)}
                </dd>
              </div>
            )}
          </dl>

          {!compact && (
            <p className="text-muted-foreground">
              <strong className="text-foreground">{tx("Factors:", "Batayan:", "Basehan:")}</strong>{" "}
              {estimate.logicalBasis}
            </p>
          )}

          <p className="flex items-start gap-1.5 rounded-xl bg-background/70 p-2.5 text-[11px] leading-relaxed text-muted-foreground">
            <Info className="mt-0.5 size-3.5 shrink-0 text-primary" aria-hidden />
            <span>
              {tx(
                "Indicative local Davao estimate based on GAW's ₱508/8h (₱63.50/hr) fair-pay benchmark — guidance for independent gig quotes, not formal legal advice or a statutory employee wage mandate.",
                "Gabay na lokal na tantya sa Davao batay sa ₱508/8h (₱63.50/oras) na fair-pay benchmark ng GAW — mungkahi lamang para sa gig quotes at hindi pormal na legal na payo o statutory wage mandate.",
                "Lokal nga banabana sa Davao base sa ₱508/8h (₱63.50/oras) nga fair-pay benchmark sa GAW — giya lang sa gig quotes ug dili pormal nga legal nga tambag o statutory wage mandate.",
              )}
            </span>
          </p>
        </div>
      )}
    </div>
  );
}

interface SettlementPreviewCardProps {
  amountPhp: number;
  estimatedHours: number;
  employerTier: SubscriptionTier;
  employeeTier: SubscriptionTier;
  perspective: "employer" | "worker";
  className?: string;
}

/**
 * Previews transparent Free vs Pro fee split & minimum-benchmark floor protection.
 * No real payment is processed in the hackathon demo prototype.
 */
export function SettlementPreviewCard({
  amountPhp,
  estimatedHours,
  employerTier,
  employeeTier,
  perspective,
  className,
}: SettlementPreviewCardProps) {
  const { tx } = useI18n();
  if (!Number.isFinite(amountPhp) || amountPhp <= 0 || estimatedHours <= 0) return null;

  let breakdown: ReturnType<typeof calculateSettlementBreakdown> | null = null;
  try {
    breakdown = calculateSettlementBreakdown({
      grossAmountPhp: amountPhp,
      estimatedHours,
      employerTier,
      employeeTier,
    });
  } catch {
    return null;
  }

  return (
    <div className={cn("rounded-2xl border bg-muted/45 p-3.5 text-xs", className)}>
      <p className="flex items-center gap-1.5 font-bold text-foreground">
        <ShieldCheck className="size-4 text-primary" aria-hidden />
        {perspective === "worker"
          ? tx(
              "Estimated Take-Home Pay",
              "Tinatayang Maiuuwing Kita",
              "Banabana nga Limpyo nga Kita",
            )
          : tx("Demo Fee & Payout Preview", "Buod ng Bayarin (Demo)", "Preview sa Bayranan (Demo)")}
      </p>
      <dl className="mt-2 space-y-1">
        <div className="flex justify-between gap-2">
          <dt className="text-muted-foreground">
            {tx("Agreed gig rate", "Napagkasunduang bayad", "Gikasabotan nga suhol")}
          </dt>
          <dd className="font-semibold text-foreground">{formatPeso(breakdown.grossAmountPhp)}</dd>
        </div>
        {perspective === "employer" ? (
          <>
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">
                {tx(
                  `Platform demo fee (${employerTier === "PRO" ? "2% Pro" : "5% Free"})`,
                  `Demo platform fee (${employerTier === "PRO" ? "2% Pro" : "5% Free"})`,
                  `Demo platform fee (${employerTier === "PRO" ? "2% Pro" : "5% Free"})`,
                )}
              </dt>
              <dd className="font-semibold text-foreground">
                +{formatPeso(breakdown.employerFeePhp)}
              </dd>
            </div>
            <div className="flex justify-between gap-2 border-t border-border/70 pt-1.5 font-bold text-foreground">
              <dt>{tx("Estimated total", "Tinatayang kabuuan", "Banabana nga total")}</dt>
              <dd>{formatPeso(breakdown.employerTotalChargePhp)}</dd>
            </div>
          </>
        ) : (
          <>
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">
                {tx(
                  `Worker service fee (${employeeTier === "PRO" ? "0% Pro" : "5% Free"})`,
                  `Service fee (${employeeTier === "PRO" ? "0% Pro" : "5% Free"})`,
                  `Service fee (${employeeTier === "PRO" ? "0% Pro" : "5% Free"})`,
                )}
              </dt>
              <dd className="font-semibold text-foreground">
                -{formatPeso(breakdown.employeeFeePhp)}
              </dd>
            </div>
            <div className="flex justify-between gap-2 border-t border-border/70 pt-1.5 font-bold text-primary">
              <dt>{tx("Estimated net payout", "Tinatayang maiuuwi", "Banabana nga net payout")}</dt>
              <dd>{formatPeso(breakdown.workerNetPayoutPhp)}</dd>
            </div>
          </>
        )}
      </dl>
      {perspective === "worker" && breakdown.feeProtectedByMinimumWageFloor && (
        <p className="mt-2 rounded-lg bg-status-confirmed-bg px-2.5 py-1.5 font-medium text-status-confirmed">
          {tx(
            "Fee reduced so take-home pay stays at or above the Davao ₱63.50/hr benchmark.",
            "Binawasan ang fee para hindi bumaba ang kita sa ₱63.50/oras na gabay.",
            "Gikamenosan ang fee aron dili moubos ang kita sa ₱63.50/oras nga giya.",
          )}
        </p>
      )}
    </div>
  );
}
