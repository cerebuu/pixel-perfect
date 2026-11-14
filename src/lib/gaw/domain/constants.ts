/**
 * Pure domain constants for GAW's Davao City marketplace pricing benchmark,
 * geographic bounds, categories, and freemium tier rules.
 */

/** Non-binding local daily reference benchmark used by GAW Davao fair-pay heuristics (PHP). */
export const DAVAO_DAILY_BENCHMARK_PHP = 508;
export const DAVAO_DAILY_MIN_WAGE_PHP = DAVAO_DAILY_BENCHMARK_PHP;
export const STANDARD_WORKDAY_HOURS = 8;
export const DAVAO_HOURLY_BENCHMARK_PHP = DAVAO_DAILY_BENCHMARK_PHP / STANDARD_WORKDAY_HOURS;
export const DAVAO_HOURLY_MIN_WAGE_PHP = DAVAO_HOURLY_BENCHMARK_PHP;

export const DAVAO_MARKETPLACE_CENTER = {
  lat: 7.0707,
  lng: 125.6087,
} as const;

export const DAVAO_BOUNDS = {
  minLat: 6.85,
  maxLat: 7.6,
  minLng: 125.2,
  maxLng: 125.75,
} as const;

export const FREE_OPEN_GIGS_LIMIT = 3;
export const FREE_WORKER_QUEUE_LIMIT = 5;
export const MAX_OFFERED_PRICE_PHP = 500_000;

export const GIG_CATEGORIES = [
  "plumbing",
  "electrical",
  "carpentry",
  "cleaning",
  "painting",
  "handyman",
  "delivery",
  "construction",
  "tutoring",
  "errands",
  "caregiving",
  "agri_harvest",
  "event_staff",
  "other",
] as const;

export type GigCategory = (typeof GIG_CATEGORIES)[number];
export type UrgencyLevel = "standard" | "urgent";
export type SubscriptionTier = "FREE" | "PRO";

export const CATEGORY_HOURLY_MULTIPLIERS: Record<GigCategory, number> = {
  plumbing: 1.45,
  electrical: 1.5,
  carpentry: 1.4,
  cleaning: 1.15,
  painting: 1.3,
  handyman: 1.25,
  delivery: 1.2,
  construction: 1.45,
  tutoring: 1.5,
  errands: 1.1,
  caregiving: 1.3,
  agri_harvest: 1.1,
  event_staff: 1.2,
  other: 1.15,
};

export interface TierPolicy {
  maxActiveOpenGigs: number;
  maxSavedOrActiveEmployeeGigs: number;
  employerFeeRate: number;
  employeeFeeRate: number;
  monthlyPricePhpEmployer: number;
  /** Demo showcase price (workers use core job matching free of charge; Pro unlocks fee relief & unlimited queue). */
  monthlyPricePhpEmployee: number;
}

export const TIER_CONFIG: Record<SubscriptionTier, TierPolicy> = {
  FREE: {
    maxActiveOpenGigs: FREE_OPEN_GIGS_LIMIT,
    maxSavedOrActiveEmployeeGigs: FREE_WORKER_QUEUE_LIMIT,
    employerFeeRate: 0.05,
    employeeFeeRate: 0.05,
    monthlyPricePhpEmployer: 0,
    monthlyPricePhpEmployee: 0,
  },
  PRO: {
    maxActiveOpenGigs: Infinity,
    maxSavedOrActiveEmployeeGigs: Infinity,
    employerFeeRate: 0.02,
    employeeFeeRate: 0.0,
    monthlyPricePhpEmployer: 69,
    monthlyPricePhpEmployee: 69,
  },
};
