import { TIER_CONFIG, type SubscriptionTier } from "./constants";
import { calculateMinimumWageFloor, roundToCents } from "./wage-policy";

export interface QuotaCheckResult {
  allowed: boolean;
  currentCount: number;
  limit: number | null;
  reason?: string | undefined;
}

export interface SettlementInput {
  grossAmountPhp: number;
  estimatedHours: number;
  employerTier: SubscriptionTier;
  employeeTier: SubscriptionTier;
}

export interface SettlementBreakdown {
  grossAmountPhp: number;
  minimumRequiredPhp: number;
  employerFeePhp: number;
  employerTotalChargePhp: number;
  employeeFeePhp: number;
  workerNetPayoutPhp: number;
  platformRevenuePhp: number;
  feeProtectedByMinimumWageFloor: boolean;
}

/** Checks Free (3) vs Pro (unlimited) active open gig posting quota. */
export function checkEmployerPostingQuota(
  tier: SubscriptionTier,
  currentOpenGigsCount: number,
): QuotaCheckResult {
  const maxAllowed = TIER_CONFIG[tier].maxActiveOpenGigs;
  if (!Number.isFinite(maxAllowed)) {
    return { allowed: true, currentCount: currentOpenGigsCount, limit: null };
  }
  const allowed = currentOpenGigsCount < maxAllowed;
  return {
    allowed,
    currentCount: currentOpenGigsCount,
    limit: maxAllowed,
    reason: allowed
      ? undefined
      : `Free tier is limited to ${maxAllowed} active open gigs. Upgrade to Employer Pro for unlimited listings.`,
  };
}

/** Checks Free (5) vs Pro (unlimited) saved/queued gig quota for workers. */
export function checkEmployeeQueueQuota(
  tier: SubscriptionTier,
  currentQueueCount: number,
): QuotaCheckResult {
  const maxAllowed = TIER_CONFIG[tier].maxSavedOrActiveEmployeeGigs;
  if (!Number.isFinite(maxAllowed)) {
    return { allowed: true, currentCount: currentQueueCount, limit: null };
  }
  const allowed = currentQueueCount < maxAllowed;
  return {
    allowed,
    currentCount: currentQueueCount,
    limit: maxAllowed,
    reason: allowed
      ? undefined
      : `Free tier is limited to ${maxAllowed} queued gigs. Upgrade to Worker Pro for unlimited slots.`,
  };
}

/**
 * Computes transparent employer surcharge and worker net payout preview.
 * Employee fee (5% Free / 0% Pro) is capped so worker net pay does not drop
 * below GAW's prorated benchmark floor when gross meets/exceeds floor.
 */
export function calculateSettlementBreakdown(input: SettlementInput): SettlementBreakdown {
  const floor = calculateMinimumWageFloor(input.estimatedHours);
  const grossAmountPhp = roundToCents(input.grossAmountPhp);
  if (!Number.isFinite(grossAmountPhp) || grossAmountPhp < floor.minimumRequiredPhp) {
    throw new RangeError(
      `Gross amount (₱${grossAmountPhp}) cannot be below benchmark floor (₱${floor.minimumRequiredPhp}).`,
    );
  }

  const employerConfig = TIER_CONFIG[input.employerTier];
  const employeeConfig = TIER_CONFIG[input.employeeTier];

  const employerFeePhp = roundToCents(grossAmountPhp * employerConfig.employerFeeRate);
  const employerTotalChargePhp = roundToCents(grossAmountPhp + employerFeePhp);

  const rawEmployeeFeePhp = roundToCents(grossAmountPhp * employeeConfig.employeeFeeRate);
  const maxAllowableEmployeeFeePhp = roundToCents(
    Math.max(0, grossAmountPhp - floor.minimumRequiredPhp),
  );
  const employeeFeePhp = Math.min(rawEmployeeFeePhp, maxAllowableEmployeeFeePhp);

  const workerNetPayoutPhp = roundToCents(grossAmountPhp - employeeFeePhp);
  const platformRevenuePhp = roundToCents(employerFeePhp + employeeFeePhp);

  return {
    grossAmountPhp,
    minimumRequiredPhp: floor.minimumRequiredPhp,
    employerFeePhp,
    employerTotalChargePhp,
    employeeFeePhp,
    workerNetPayoutPhp,
    platformRevenuePhp,
    feeProtectedByMinimumWageFloor: rawEmployeeFeePhp > employeeFeePhp,
  };
}
