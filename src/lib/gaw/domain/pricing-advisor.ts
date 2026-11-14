import {
  CATEGORY_HOURLY_MULTIPLIERS,
  DAILY_WAGE_REFERENCE,
  HOURLY_WAGE_REFERENCE,
  STANDARD_WORK_HOURS,
  MAX_OFFERED_PRICE_PHP,
  type GigCategory,
  type UrgencyLevel,
} from "./constants";
import { toDomainCategory } from "./categories";
import { calculateMinimumWageFloor, roundToCents } from "./wage-policy";

export const DAVAO_STANDARD_TRANSIT_ALLOWANCE_PHP = 75;

export interface PricingEstimateInput {
  category: GigCategory | string;
  estimatedHours: number;
  urgency: UrgencyLevel;
  requiredSkills: string[];
  title?: string;
  description?: string;
  barangay?: string;
}

export interface PricingBreakdown {
  baseWageFloorPhp: number;
  skillPremiumPhp: number;
  toolAllowancePhp: number;
  transportAllowancePhp: number;
  urgencyPremiumPhp: number;
}

export interface PricingEstimateResult {
  estimatedHours: number;
  category: GigCategory;
  urgency: UrgencyLevel;
  minimumWageFloorPhp: number;
  suggestedMinPhp: number;
  recommendedPhp: number;
  suggestedMaxPhp: number;
  hourlyRateRecommendedPhp: number;
  breakdown: PricingBreakdown;
  source: "heuristic" | "external_ai";
  legalBasis: string;
  logicalBasis: string;
  rationale?: string;
}

export interface ExternalPricingProvider {
  estimate(input: PricingEstimateInput & { minimumWageFloorPhp: number }): Promise<
    Omit<Partial<PricingEstimateResult>, "breakdown"> & {
      recommendedPhp: number;
      breakdown?: Partial<PricingBreakdown>;
    }
  >;
}

/** Typical tool wear-and-tear allowance heuristic by gig trade in Davao City. */
export function getCategoryToolAllowancePhp(category: GigCategory): number {
  switch (category) {
    case "plumbing":
    case "electrical":
    case "carpentry":
    case "construction":
      return 100;
    case "painting":
    case "handyman":
      return 75;
    default:
      return 50;
  }
}

/**
 * Computes a deterministic, non-binding local Davao fair-pay estimate
 * from hours, trade multiplier, urgency, and extra skill signals.
 */
export function estimateGigPrice(input: PricingEstimateInput): PricingEstimateResult {
  const domainCategory = toDomainCategory(input.category);
  const floor = calculateMinimumWageFloor(input.estimatedHours);
  const baseWageFloorPhp = floor.minimumRequiredPhp;

  const categoryMultiplier = CATEGORY_HOURLY_MULTIPLIERS[domainCategory] ?? 1.15;
  const urgencyMultiplier = input.urgency === "urgent" ? 1.2 : 1.0;
  const normalizedSkills = input.requiredSkills.map((s) => s.trim()).filter(Boolean);
  const skillPremiumRate = Math.min(0.25, normalizedSkills.length * 0.05);

  const baseMarketPhp =
    baseWageFloorPhp * categoryMultiplier * urgencyMultiplier * (1 + skillPremiumRate);
  const recommendedPhp = roundToCents(Math.max(baseWageFloorPhp, baseMarketPhp));
  const suggestedMinPhp = roundToCents(Math.max(baseWageFloorPhp, recommendedPhp * 0.9));
  const suggestedMaxPhp = roundToCents(Math.max(recommendedPhp, recommendedPhp * 1.25));
  const hourlyRateRecommendedPhp = roundToCents(recommendedPhp / input.estimatedHours);

  const urgencyPremiumPhp =
    input.urgency === "urgent" ? roundToCents(recommendedPhp - recommendedPhp / 1.2) : 0;
  const netMargin = Math.max(
    0,
    roundToCents(recommendedPhp - baseWageFloorPhp - urgencyPremiumPhp),
  );
  const toolAllowancePhp = roundToCents(
    Math.min(getCategoryToolAllowancePhp(domainCategory), netMargin * 0.35),
  );
  const transportAllowancePhp = roundToCents(
    Math.min(DAVAO_STANDARD_TRANSIT_ALLOWANCE_PHP, netMargin * 0.25),
  );
  const skillPremiumPhp = roundToCents(
    Math.max(0, netMargin - toolAllowancePhp - transportAllowancePhp),
  );

  const basisSummary = `Non-binding local Davao City fair-pay estimate anchored on GAW's Daily Reference ₱${DAILY_WAGE_REFERENCE.toFixed(2)}/${STANDARD_WORK_HOURS}h (Hourly Reference ₱${HOURLY_WAGE_REFERENCE.toFixed(2)}/hr) — indicative guide for independent gig quotes, not formal legal advice or a guaranteed statutory employee wage.`;

  const logicalParts = [
    `${categoryMultiplier.toFixed(2)}× trade complexity (${domainCategory})`,
    normalizedSkills.length > 0 ? `+${Math.round(skillPremiumRate * 100)}% skill signal` : null,
    input.urgency === "urgent" ? "+20% urgent dispatch" : null,
    `₱${toolAllowancePhp.toFixed(0)} tools & ₱${transportAllowancePhp.toFixed(0)} transit`,
  ].filter(Boolean);

  return {
    estimatedHours: input.estimatedHours,
    category: domainCategory,
    urgency: input.urgency,
    minimumWageFloorPhp: baseWageFloorPhp,
    suggestedMinPhp,
    recommendedPhp,
    suggestedMaxPhp,
    hourlyRateRecommendedPhp,
    breakdown: {
      baseWageFloorPhp,
      skillPremiumPhp,
      toolAllowancePhp,
      transportAllowancePhp,
      urgencyPremiumPhp,
    },
    source: "heuristic",
    legalBasis: basisSummary,
    logicalBasis: logicalParts.join(" · "),
  };
}

function sanitizeNonNegativeCents(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? roundToCents(value)
    : fallback;
}

function sanitizeOptionalText(value: unknown, maxLen = 600): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim().slice(0, maxLen);
  return trimmed.length > 0 ? trimmed : undefined;
}

function sanitizeBreakdown(
  rawBreakdown: Partial<PricingBreakdown> | undefined,
  fallback: PricingBreakdown,
  minimumWageFloorPhp: number,
): PricingBreakdown {
  if (!rawBreakdown || typeof rawBreakdown !== "object") {
    return fallback;
  }
  const baseWageFloorPhp = Math.max(
    minimumWageFloorPhp,
    sanitizeNonNegativeCents(rawBreakdown.baseWageFloorPhp, fallback.baseWageFloorPhp),
  );
  return {
    baseWageFloorPhp,
    skillPremiumPhp: sanitizeNonNegativeCents(
      rawBreakdown.skillPremiumPhp,
      fallback.skillPremiumPhp,
    ),
    toolAllowancePhp: sanitizeNonNegativeCents(
      rawBreakdown.toolAllowancePhp,
      fallback.toolAllowancePhp,
    ),
    transportAllowancePhp: sanitizeNonNegativeCents(
      rawBreakdown.transportAllowancePhp,
      fallback.transportAllowancePhp,
    ),
    urgencyPremiumPhp: sanitizeNonNegativeCents(
      rawBreakdown.urgencyPremiumPhp,
      fallback.urgencyPremiumPhp,
    ),
  };
}

/**
 * Runs an optional external pricing provider (must live on a secure backend)
 * and safely clamps or falls back to the local heuristic without propagating NaN/Infinity.
 */
export async function estimateGigPriceWithAdvisor(
  input: PricingEstimateInput,
  provider?: ExternalPricingProvider,
): Promise<PricingEstimateResult> {
  const heuristic = estimateGigPrice(input);
  if (!provider) {
    return heuristic;
  }

  try {
    const raw = await provider.estimate({
      ...input,
      minimumWageFloorPhp: heuristic.minimumWageFloorPhp,
    });
    if (
      !raw ||
      !Number.isFinite(raw.recommendedPhp) ||
      raw.recommendedPhp < heuristic.minimumWageFloorPhp ||
      raw.recommendedPhp > MAX_OFFERED_PRICE_PHP
    ) {
      return heuristic;
    }

    const recommendedPhp = roundToCents(raw.recommendedPhp);
    const suggestedMinRaw = raw.suggestedMinPhp;
    const suggestedMaxRaw = raw.suggestedMaxPhp;

    const suggestedMinPhp =
      typeof suggestedMinRaw === "number" && Number.isFinite(suggestedMinRaw)
        ? roundToCents(
            Math.max(heuristic.minimumWageFloorPhp, Math.min(recommendedPhp, suggestedMinRaw)),
          )
        : roundToCents(Math.max(heuristic.minimumWageFloorPhp, recommendedPhp * 0.9));

    const suggestedMaxPhp =
      typeof suggestedMaxRaw === "number" && Number.isFinite(suggestedMaxRaw)
        ? roundToCents(Math.min(MAX_OFFERED_PRICE_PHP, Math.max(recommendedPhp, suggestedMaxRaw)))
        : roundToCents(Math.min(MAX_OFFERED_PRICE_PHP, recommendedPhp * 1.25));

    const rationale = sanitizeOptionalText(raw.rationale);
    const legalBasis = sanitizeOptionalText(raw.legalBasis) ?? heuristic.legalBasis;
    const logicalBasis =
      sanitizeOptionalText(raw.logicalBasis) ?? rationale ?? heuristic.logicalBasis;
    const breakdown = sanitizeBreakdown(
      raw.breakdown,
      heuristic.breakdown,
      heuristic.minimumWageFloorPhp,
    );

    return {
      ...heuristic,
      recommendedPhp,
      suggestedMinPhp,
      suggestedMaxPhp,
      hourlyRateRecommendedPhp: roundToCents(recommendedPhp / input.estimatedHours),
      breakdown,
      legalBasis,
      logicalBasis,
      ...(rationale ? { rationale } : {}),
      source: "external_ai",
    };
  } catch {
    return heuristic;
  }
}

/** Checks whether an entered budget falls inside the suggested fair-pay estimate range. */
export function didFollowAiRecommendation(
  offeredPricePhp: number,
  suggestedMinPhp: number,
  suggestedMaxPhp: number,
): boolean {
  if (
    !Number.isFinite(offeredPricePhp) ||
    !Number.isFinite(suggestedMinPhp) ||
    !Number.isFinite(suggestedMaxPhp)
  ) {
    return false;
  }
  return offeredPricePhp >= suggestedMinPhp && offeredPricePhp <= suggestedMaxPhp;
}
