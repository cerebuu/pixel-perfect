import { DAVAO_DAILY_BENCHMARK_PHP, DAVAO_HOURLY_BENCHMARK_PHP } from "./constants";

export interface WageFloorResult {
  estimatedHours: number;
  hourlyFloorPhp: number;
  dailyMinimumWagePhp: number;
  minimumRequiredPhp: number;
}

export interface WageValidationResult extends WageFloorResult {
  isValid: boolean;
  offeredPricePhp: number;
  shortfallPhp: number;
}

/** Rounds currency values to two decimal places safely. */
export function roundToCents(amount: number): number {
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

/**
 * Computes GAW's prorated fair-pay reference floor for a gig duration
 * using the ₱508/8h (₱63.50/hr) Davao local benchmark.
 */
export function calculateMinimumWageFloor(estimatedHours: number): WageFloorResult {
  if (!Number.isFinite(estimatedHours) || estimatedHours <= 0) {
    throw new RangeError("estimatedHours must be a positive finite number");
  }
  const minimumRequiredPhp = roundToCents(estimatedHours * DAVAO_HOURLY_BENCHMARK_PHP);
  return {
    estimatedHours,
    hourlyFloorPhp: DAVAO_HOURLY_BENCHMARK_PHP,
    dailyMinimumWagePhp: DAVAO_DAILY_BENCHMARK_PHP,
    minimumRequiredPhp,
  };
}

/** Validates an offered price against GAW's prorated fair-pay benchmark floor. */
export function validateGigPrice(
  estimatedHours: number,
  offeredPricePhp: number,
): WageValidationResult {
  if (!Number.isFinite(offeredPricePhp) || offeredPricePhp < 0) {
    throw new RangeError("offeredPricePhp must be a non-negative finite number");
  }
  const floor = calculateMinimumWageFloor(estimatedHours);
  const roundedOffer = roundToCents(offeredPricePhp);
  const isValid = roundedOffer >= floor.minimumRequiredPhp;
  const shortfallPhp = isValid ? 0 : roundToCents(floor.minimumRequiredPhp - roundedOffer);
  return {
    ...floor,
    isValid,
    offeredPricePhp: roundedOffer,
    shortfallPhp,
  };
}
