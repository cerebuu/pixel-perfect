import {
  DAILY_WAGE_REFERENCE,
  HOURLY_WAGE_REFERENCE,
  STANDARD_WORK_HOURS,
  estimateGigPriceWithAdvisor,
  PricingEstimateRequestSchema,
  roundToCents,
  toDomainCategory,
  type ExternalPricingProvider,
  type PricingBreakdown,
  type PricingEstimateInput,
  type PricingEstimateResult,
} from "../domain";

const DEFAULT_GEMINI_MODEL = "gemini-3.5-flash";
const GEMINI_TIMEOUT_MS = 7000;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 30;
const MODEL_NAME_PATTERN = /^[A-Za-z0-9._-]+$/;

export type ServerEnvBindings = Record<string, unknown> | undefined;

export interface GeminiPricingProviderOptions {
  apiKey: string;
  model?: string;
  fetchFn?: typeof fetch;
  timeoutMs?: number;
}

export interface HandlePricingEstimateOptions {
  env?: ServerEnvBindings;
  fetchFn?: typeof fetch;
  now?: number;
  skipRateLimit?: boolean;
  clientKey?: string;
}

interface RawGeminiBreakdown {
  baseWageFloorPhp?: unknown;
  skillPremiumPhp?: unknown;
  toolAllowancePhp?: unknown;
  transportAllowancePhp?: unknown;
  urgencyPremiumPhp?: unknown;
}

interface RawGeminiResponse {
  recommendedPhp?: unknown;
  suggestedMinPhp?: unknown;
  suggestedMaxPhp?: unknown;
  rationale?: unknown;
  legalBasis?: unknown;
  logicalBasis?: unknown;
  breakdown?: RawGeminiBreakdown;
}

const rateLimitBuckets = new Map<string, number[]>();

/** Resets in-memory sliding-window rate-limit state (intended for unit/integration tests). */
export function resetPricingRateLimiter(): void {
  rateLimitBuckets.clear();
}

function readEnvValue(env: ServerEnvBindings, key: string): string | undefined {
  const fromBinding = env?.[key];
  if (typeof fromBinding === "string" && fromBinding.trim()) {
    return fromBinding.trim();
  }
  if (typeof process !== "undefined" && process.env) {
    const fromProcess = process.env[key];
    if (typeof fromProcess === "string" && fromProcess.trim()) {
      return fromProcess.trim();
    }
  }
  return undefined;
}

function isPlaceholderSecret(val: string | undefined): boolean {
  if (!val) return true;
  const upper = val.toUpperCase();
  return (
    upper === "YOUR_KEY" ||
    upper === "YOUR_API_KEY" ||
    upper === "REPLACE_ME" ||
    upper === "UNDEFINED" ||
    upper === "NULL"
  );
}

/** Resolves server-only Gemini API credentials without consulting client `VITE_*` variables. */
export function resolveGeminiConfig(env?: ServerEnvBindings): {
  apiKey: string | null;
  model: string;
} {
  const rawKey = readEnvValue(env, "GEMINI_API_KEY");
  const apiKey = isPlaceholderSecret(rawKey) ? null : (rawKey ?? null);

  const rawModel = readEnvValue(env, "GEMINI_MODEL");
  const model = rawModel && MODEL_NAME_PATTERN.test(rawModel) ? rawModel : DEFAULT_GEMINI_MODEL;

  return { apiKey, model };
}

/** Strips potential personal email/phone PII and bounds free text before sending prompts to Gemini. */
export function minimizePromptText(value: string | undefined, maxLen: number): string {
  if (!value) return "";
  return value
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[redacted-email]")
    .replace(/(?:\+?63|0)\s*9\d{2}[\s-]?\d{3}[\s-]?\d{4}/g, "[redacted-phone]")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLen);
}

function extractGeminiJsonText(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const candidates = (payload as { candidates?: unknown[] }).candidates;
  if (!Array.isArray(candidates) || candidates.length === 0) return null;
  const first = candidates[0] as { content?: { parts?: Array<{ text?: unknown }> } };
  const text = first?.content?.parts?.[0]?.text;
  if (typeof text !== "string" || !text.trim()) return null;

  // Strip optional markdown code fences if model wraps JSON anyway
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  return cleaned || null;
}

function finiteNumberOrUndefined(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function parseBreakdownOrUndefined(
  raw: RawGeminiBreakdown | undefined,
): Partial<PricingBreakdown> | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const baseWageFloorPhp = finiteNumberOrUndefined(raw.baseWageFloorPhp);
  const skillPremiumPhp = finiteNumberOrUndefined(raw.skillPremiumPhp);
  const toolAllowancePhp = finiteNumberOrUndefined(raw.toolAllowancePhp);
  const transportAllowancePhp = finiteNumberOrUndefined(raw.transportAllowancePhp);
  const urgencyPremiumPhp = finiteNumberOrUndefined(raw.urgencyPremiumPhp);

  if (
    baseWageFloorPhp === undefined &&
    skillPremiumPhp === undefined &&
    toolAllowancePhp === undefined &&
    transportAllowancePhp === undefined &&
    urgencyPremiumPhp === undefined
  ) {
    return undefined;
  }

  return {
    ...(baseWageFloorPhp !== undefined ? { baseWageFloorPhp } : {}),
    ...(skillPremiumPhp !== undefined ? { skillPremiumPhp } : {}),
    ...(toolAllowancePhp !== undefined ? { toolAllowancePhp } : {}),
    ...(transportAllowancePhp !== undefined ? { transportAllowancePhp } : {}),
    ...(urgencyPremiumPhp !== undefined ? { urgencyPremiumPhp } : {}),
  };
}

/**
 * Server-side Google Gemini pricing provider for Davao City gig labor estimates.
 * Enforces abort timeout, strict JSON parsing, PII minimization, and floor compliance.
 */
export function createGeminiPricingProvider(
  options: GeminiPricingProviderOptions,
): ExternalPricingProvider {
  const {
    apiKey,
    model = DEFAULT_GEMINI_MODEL,
    fetchFn = fetch,
    timeoutMs = GEMINI_TIMEOUT_MS,
  } = options;

  const safeModel = MODEL_NAME_PATTERN.test(model) ? model : DEFAULT_GEMINI_MODEL;

  return {
    async estimate(input: PricingEstimateInput & { minimumWageFloorPhp: number }) {
      const domainCategory = toDomainCategory(input.category);
      const safeTitle = minimizePromptText(input.title, 120) || "Local household service request";
      const safeDescription = minimizePromptText(input.description, 400) || "Standard on-site task";
      const safeBarangay = minimizePromptText(input.barangay, 60) || "Davao City";
      const safeSkills = input.requiredSkills
        .map((s) => minimizePromptText(s, 40))
        .filter(Boolean)
        .slice(0, 8);

      const prompt = [
        "You are an AI Labor Pricing Advisor for Grab A Work (GAW), a Davao City, Philippines local services marketplace.",
        `Estimate a fair Philippine Peso (PHP) quote for ${input.estimatedHours} hour(s) of '${domainCategory}' labor in Barangay '${safeBarangay}', Davao City.`,
        `Daily Wage Reference: ₱${DAILY_WAGE_REFERENCE.toFixed(2)} (${STANDARD_WORK_HOURS}h) · Hourly Wage Reference: ₱${HOURLY_WAGE_REFERENCE.toFixed(2)}/hr (non-binding local gig pricing reference).`,
        `Prorated Benchmark Floor for this gig: PHP ${input.minimumWageFloorPhp.toFixed(2)}.`,
        `Urgency: ${input.urgency}.`,
        `Required Skills: ${safeSkills.join(", ") || "standard trade skill"}.`,
        `Job Summary: "${safeTitle}" - "${safeDescription}".`,
        "Return strict JSON matching:",
        "{",
        '  "recommendedPhp": number,',
        '  "suggestedMinPhp": number,',
        '  "suggestedMaxPhp": number,',
        '  "rationale": string,',
        '  "legalBasis": string,',
        '  "logicalBasis": string,',
        '  "breakdown": {',
        '    "baseWageFloorPhp": number,',
        '    "skillPremiumPhp": number,',
        '    "toolAllowancePhp": number,',
        '    "transportAllowancePhp": number,',
        '    "urgencyPremiumPhp": number',
        "  }",
        "}",
        "All amounts must be in PHP and recommendedPhp MUST be >= minimumWageFloorPhp.",
        "Explain briefly in plain language citing the Davao local benchmark (non-binding guidance, not legal advice), trade skill, tools, Davao transit, and urgency.",
      ].join("\n");

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(safeModel)}:generateContent`;
        const response = await fetchFn(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": apiKey,
          },
          signal: controller.signal,
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.1,
              responseMimeType: "application/json",
            },
          }),
        });

        if (!response.ok) {
          throw new Error(`Gemini pricing provider HTTP ${response.status}`);
        }

        const payload = (await response.json()) as unknown;
        const jsonText = extractGeminiJsonText(payload);
        if (!jsonText) {
          throw new Error("Gemini pricing provider returned empty text candidate");
        }

        const parsed = JSON.parse(jsonText) as RawGeminiResponse;
        if (
          !parsed ||
          typeof parsed !== "object" ||
          typeof parsed.recommendedPhp !== "number" ||
          !Number.isFinite(parsed.recommendedPhp)
        ) {
          throw new Error("Gemini pricing provider returned invalid recommendedPhp");
        }

        const recommendedPhp = roundToCents(parsed.recommendedPhp);
        const suggestedMinPhp = finiteNumberOrUndefined(parsed.suggestedMinPhp);
        const suggestedMaxPhp = finiteNumberOrUndefined(parsed.suggestedMaxPhp);
        const rationale =
          typeof parsed.rationale === "string" ? parsed.rationale.trim() : undefined;
        const legalBasis =
          typeof parsed.legalBasis === "string" ? parsed.legalBasis.trim() : undefined;
        const logicalBasis =
          typeof parsed.logicalBasis === "string" ? parsed.logicalBasis.trim() : undefined;
        const breakdown = parseBreakdownOrUndefined(parsed.breakdown);

        return {
          recommendedPhp,
          ...(suggestedMinPhp !== undefined ? { suggestedMinPhp } : {}),
          ...(suggestedMaxPhp !== undefined ? { suggestedMaxPhp } : {}),
          ...(rationale ? { rationale } : {}),
          ...(legalBasis ? { legalBasis } : {}),
          ...(logicalBasis ? { logicalBasis } : {}),
          ...(breakdown ? { breakdown } : {}),
        };
      } finally {
        clearTimeout(timeout);
      }
    },
  };
}

function checkRateLimit(
  clientKey: string,
  nowMs: number,
): { allowed: true } | { allowed: false; retryAfterSec: number } {
  const cutoff = nowMs - RATE_LIMIT_WINDOW_MS;
  const existing = (rateLimitBuckets.get(clientKey) ?? []).filter((ts) => ts > cutoff);

  if (existing.length >= RATE_LIMIT_MAX_REQUESTS) {
    const oldest = existing[0] ?? nowMs;
    const retryAfterSec = Math.max(1, Math.ceil((oldest + RATE_LIMIT_WINDOW_MS - nowMs) / 1000));
    rateLimitBuckets.set(clientKey, existing);
    return { allowed: false, retryAfterSec };
  }

  existing.push(nowMs);
  rateLimitBuckets.set(clientKey, existing);

  // Bound memory if many unique keys accumulate
  if (rateLimitBuckets.size > 1000) {
    for (const [k, stamps] of rateLimitBuckets) {
      if (stamps.every((ts) => ts <= cutoff)) {
        rateLimitBuckets.delete(k);
      }
    }
  }
  return { allowed: true };
}

function extractClientIpKey(request: Request, explicit?: string): string {
  if (explicit) return explicit;
  const cfIp = request.headers.get("cf-connecting-ip")?.trim();
  if (cfIp) return cfIp;
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (forwardedFor) return forwardedFor;
  const realIp = request.headers.get("x-real-ip")?.trim();
  return realIp || "local-client";
}

function jsonResponse(
  body: unknown,
  status = 200,
  extraHeaders?: Record<string, string>,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...extraHeaders,
    },
  });
}

/**
 * Handles `POST /api/v1/pricing/estimate` cleanly across Node/Vite dev and Cloudflare Workers.
 * Validates request payloads via Zod, enforces per-client rate limits, calls Google Gemini
 * when server `GEMINI_API_KEY` is configured, and falls back deterministically otherwise.
 */
export async function handlePricingEstimateRequest(
  request: Request,
  options: HandlePricingEstimateOptions = {},
): Promise<Response> {
  if (!options.skipRateLimit) {
    const rate = checkRateLimit(
      extractClientIpKey(request, options.clientKey),
      options.now ?? Date.now(),
    );
    if (!rate.allowed) {
      return jsonResponse(
        {
          error: {
            code: "RATE_LIMITED",
            message: "Too many pricing requests. Please wait a moment before retrying.",
          },
        },
        429,
        { "Retry-After": String(rate.retryAfterSec) },
      );
    }
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return jsonResponse(
      {
        error: {
          code: "INVALID_JSON",
          message: "Malformed JSON request body",
        },
      },
      400,
    );
  }

  const parsed = PricingEstimateRequestSchema.safeParse(rawBody);
  if (!parsed.success) {
    return jsonResponse(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid pricing estimate parameters",
          details: parsed.error.issues.map((issue) => ({
            path: issue.path.join("."),
            message: issue.message,
          })),
        },
      },
      422,
    );
  }

  const data = parsed.data;
  const domainInput: PricingEstimateInput = {
    category: data.category,
    estimatedHours: data.estimatedHours,
    urgency: data.urgency,
    requiredSkills: data.requiredSkills,
    ...(data.title !== undefined ? { title: data.title } : {}),
    ...(data.description !== undefined ? { description: data.description } : {}),
    ...(data.barangay !== undefined ? { barangay: data.barangay } : {}),
  };

  const { apiKey, model } = resolveGeminiConfig(options.env);
  const provider = apiKey
    ? createGeminiPricingProvider({
        apiKey,
        model,
        ...(options.fetchFn ? { fetchFn: options.fetchFn } : {}),
      })
    : undefined;

  const estimate: PricingEstimateResult = await estimateGigPriceWithAdvisor(domainInput, provider);
  return jsonResponse(estimate, 200);
}
