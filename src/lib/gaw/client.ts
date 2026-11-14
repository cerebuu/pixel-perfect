import {
  checkEmployeeQueueQuota,
  checkEmployerPostingQuota,
  calculateHaversineDistanceKm,
  estimateGigPrice,
  isWithinDavaoRegion,
  toDomainCategory,
  validateGigPrice,
  type PricingEstimateInput,
  type PricingEstimateResult,
  type QuotaCheckResult,
  type SubscriptionTier,
  type UrgencyLevel,
  type WageValidationResult,
} from "./domain";
import type { LatLng } from "./geo";

export type MarketplaceClientMode = "remote" | "local-demo";

export class GawDomainError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = "GawDomainError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export interface NearbyGigsQuery {
  lat: number;
  lng: number;
  radiusKm?: number;
  category?: string;
  minPayPhp?: number;
  limit?: number;
}

export interface GigValidationInput {
  estimatedHours: number;
  offeredPricePhp: number | null;
  coords: LatLng;
  employerTier: SubscriptionTier;
  activeOpenGigsCount: number;
}

export interface GigValidationOutcome {
  quota: QuotaCheckResult;
  wageCheck: WageValidationResult | null;
  pricing: PricingEstimateResult;
  coordsValid: boolean;
}

export interface GawMarketplaceClient {
  readonly mode: MarketplaceClientMode;
  estimatePricing(input: PricingEstimateInput): Promise<PricingEstimateResult>;
  validateGigBeforePublish(
    input: GigValidationInput & {
      category: string;
      urgency: UrgencyLevel;
      requiredSkills: string[];
    },
  ): GigValidationOutcome;
  checkWorkerSaveQuota(tier: SubscriptionTier, savedCount: number): QuotaCheckResult;
  distanceBetween(a: LatLng, b: LatLng): number;
}

function normalizeRemotePricing(raw: unknown): PricingEstimateResult | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const obj = raw as Record<string, unknown>;
  if (
    typeof obj["recommendedPhp"] !== "number" ||
    !Number.isFinite(obj["recommendedPhp"]) ||
    typeof obj["minimumWageFloorPhp"] !== "number" ||
    !Number.isFinite(obj["minimumWageFloorPhp"]) ||
    typeof obj["suggestedMinPhp"] !== "number" ||
    !Number.isFinite(obj["suggestedMinPhp"]) ||
    typeof obj["suggestedMaxPhp"] !== "number" ||
    !Number.isFinite(obj["suggestedMaxPhp"]) ||
    !obj["breakdown"] ||
    typeof obj["breakdown"] !== "object"
  ) {
    return null;
  }
  return raw as PricingEstimateResult;
}

function readConfiguredApiBaseUrl(): string | null {
  try {
    const raw = (import.meta as { env?: Record<string, string | undefined> }).env?.[
      "VITE_GAW_API_URL"
    ];
    const trimmed = raw?.trim();
    return trimmed ? trimmed.replace(/\/+$/, "") : null;
  } catch {
    return null;
  }
}

/**
 * Pure local marketplace adapter backed by GAW's client-safe domain modules.
 * Used standalone when no backend URL is configured, or automatically if remote fails.
 */
export class LocalDemoMarketplaceClient implements GawMarketplaceClient {
  readonly mode: MarketplaceClientMode = "local-demo";

  async estimatePricing(input: PricingEstimateInput): Promise<PricingEstimateResult> {
    return estimateGigPrice(input);
  }

  validateGigBeforePublish(
    input: GigValidationInput & {
      category: string;
      urgency: UrgencyLevel;
      requiredSkills: string[];
    },
  ): GigValidationOutcome {
    const quota = checkEmployerPostingQuota(input.employerTier, input.activeOpenGigsCount);
    const coordsValid = isWithinDavaoRegion(input.coords.lat, input.coords.lng);
    const wageCheck =
      input.offeredPricePhp !== null
        ? validateGigPrice(input.estimatedHours, input.offeredPricePhp)
        : null;
    const pricing = estimateGigPrice({
      category: toDomainCategory(input.category),
      estimatedHours: input.estimatedHours,
      urgency: input.urgency,
      requiredSkills: input.requiredSkills,
    });
    return { quota, wageCheck, pricing, coordsValid };
  }

  checkWorkerSaveQuota(tier: SubscriptionTier, savedCount: number): QuotaCheckResult {
    return checkEmployeeQueueQuota(tier, savedCount);
  }

  distanceBetween(a: LatLng, b: LatLng): number {
    return calculateHaversineDistanceKm(a, b);
  }
}

/**
 * Optional HTTP + local fallback adapter. Propagates genuine 4xx domain errors,
 * while degrading cleanly to local computation on network/5xx/non-JSON failure.
 */
export class RemoteWithFallbackMarketplaceClient extends LocalDemoMarketplaceClient {
  override readonly mode: MarketplaceClientMode = "remote";
  private readonly baseUrl: string;

  constructor(baseUrl: string) {
    super();
    this.baseUrl = baseUrl;
  }

  override async estimatePricing(input: PricingEstimateInput): Promise<PricingEstimateResult> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2500);
    try {
      const res = await fetch(`${this.baseUrl}/api/v1/pricing/estimate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          category: toDomainCategory(input.category),
          estimatedHours: input.estimatedHours,
          urgency: input.urgency,
          requiredSkills: input.requiredSkills,
          title: input.title,
          description: input.description,
          barangay: input.barangay,
        }),
      });

      const contentType = res.headers.get("content-type") ?? "";
      if (res.status >= 400 && res.status < 500 && contentType.includes("application/json")) {
        const errBody = (await res.json()) as {
          error?: { code?: string; message?: string; details?: unknown };
        };
        throw new GawDomainError(
          res.status,
          errBody.error?.code ?? "VALIDATION_ERROR",
          errBody.error?.message ?? "Pricing request rejected",
          errBody.error?.details,
        );
      }

      if (!res.ok || !contentType.includes("application/json")) {
        return super.estimatePricing(input);
      }

      const parsed = normalizeRemotePricing(await res.json());
      return parsed ?? super.estimatePricing(input);
    } catch (err) {
      if (err instanceof GawDomainError) throw err;
      return super.estimatePricing(input);
    } finally {
      clearTimeout(timer);
    }
  }
}

export function createGawMarketplaceClient(): GawMarketplaceClient {
  const baseUrl = readConfiguredApiBaseUrl();
  return baseUrl
    ? new RemoteWithFallbackMarketplaceClient(baseUrl)
    : new LocalDemoMarketplaceClient();
}

export const gawMarketplaceClient = createGawMarketplaceClient();
