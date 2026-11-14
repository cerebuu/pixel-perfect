import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BookingForm } from "@/components/gaw/BookingForm";
import { FairPayEstimateCard, SettlementPreviewCard } from "@/components/gaw/PricingGuide";
import {
  calculateHaversineDistanceKm,
  calculateMinimumWageFloor,
  calculateSettlementBreakdown,
  checkEmployeeQueueQuota,
  checkEmployerPostingQuota,
  CreateGigSchema,
  DAILY_WAGE_REFERENCE,
  DavaoCoordsSchema,
  DAVAO_DAILY_BENCHMARK_PHP,
  DAVAO_HOURLY_BENCHMARK_PHP,
  DAVAO_MARKETPLACE_CENTER,
  didFollowAiRecommendation,
  escapeHtml,
  estimateGigPrice,
  estimateGigPriceWithAdvisor,
  estimateTravelMinutes,
  formatDistanceBadge,
  FREE_OPEN_GIGS_LIMIT,
  FREE_WORKER_QUEUE_LIMIT,
  HOURLY_WAGE_REFERENCE,
  isWithinDavaoRegion,
  roundToCents,
  STANDARD_WORK_HOURS,
  toDomainCategory,
  toUiCategory,
  validateGigPrice,
} from "@/lib/gaw/domain";
import {
  GawDomainError,
  LocalDemoMarketplaceClient,
  RemoteWithFallbackMarketplaceClient,
} from "@/lib/gaw/client";
import { BARANGAYS, JOBS, WORKERS, buildEnrichedJob } from "@/lib/gaw/data";
import { filterAndSortJobs } from "@/lib/gaw/filter";
import { I18nProvider, useI18n } from "@/lib/gaw/i18n";
import {
  applyCreateJob,
  applyRemoveJob,
  applyToggleSaveJob,
  initialState,
  sanitizeLoadedState,
  type GawState,
} from "@/lib/gaw/store";

describe("GAW × Pixel Perfect Marketplace Integration Suite", () => {
  describe("1. Davao Fair-Pay Benchmark & Fee Engine", () => {
    it("computes ₱540/8h (₱67.50/hr) fair-pay reference floors, scaling, rounding, and validates offers accurately", () => {
      expect(DAILY_WAGE_REFERENCE).toBe(540);
      expect(STANDARD_WORK_HOURS).toBe(8);
      expect(HOURLY_WAGE_REFERENCE).toBe(67.5);
      expect(DAILY_WAGE_REFERENCE / STANDARD_WORK_HOURS).toBe(67.5);
      expect(DAVAO_DAILY_BENCHMARK_PHP).toBe(DAILY_WAGE_REFERENCE);
      expect(DAVAO_HOURLY_BENCHMARK_PHP).toBe(HOURLY_WAGE_REFERENCE);

      // Required prorated duration references
      expect(calculateMinimumWageFloor(1).minimumRequiredPhp).toBe(67.5);
      expect(calculateMinimumWageFloor(2).minimumRequiredPhp).toBe(135);
      expect(calculateMinimumWageFloor(4).minimumRequiredPhp).toBe(270);
      expect(calculateMinimumWageFloor(6).minimumRequiredPhp).toBe(405);
      expect(calculateMinimumWageFloor(8).minimumRequiredPhp).toBe(540);
      // IEEE-754 decimal durations round cleanly to exact cents
      expect(calculateMinimumWageFloor(2.5).minimumRequiredPhp).toBe(168.75);
      expect(calculateMinimumWageFloor(3).minimumRequiredPhp).toBe(202.5);
      expect(calculateMinimumWageFloor(0.3).minimumRequiredPhp).toBe(20.25);
      expect(roundToCents(0.1 + 0.2)).toBe(0.3);
      expect(() => calculateMinimumWageFloor(0)).toThrow(RangeError);
      expect(() => calculateMinimumWageFloor(Number.NaN)).toThrow(RangeError);

      const ok = validateGigPrice(4, 270);
      expect(ok.isValid).toBe(true);
      expect(ok.shortfallPhp).toBe(0);

      // Previous ₱254/₱260 levels for 4h now fall below the updated ₱270 reference
      const belowNewFloor = validateGigPrice(4, 260);
      expect(belowNewFloor.isValid).toBe(false);
      expect(belowNewFloor.shortfallPhp).toBe(10);

      const pennyShort = validateGigPrice(4, 269.99);
      expect(pennyShort.isValid).toBe(false);
      expect(pennyShort.shortfallPhp).toBe(0.01);
      expect(() => validateGigPrice(4, -10)).toThrow(RangeError);
    });

    it("enforces Free vs Pro quotas for employers (3) and workers (5)", () => {
      expect(checkEmployerPostingQuota("FREE", FREE_OPEN_GIGS_LIMIT - 1).allowed).toBe(true);
      expect(checkEmployerPostingQuota("FREE", FREE_OPEN_GIGS_LIMIT).allowed).toBe(false);
      expect(checkEmployerPostingQuota("PRO", 50)).toEqual({
        allowed: true,
        currentCount: 50,
        limit: null,
      });

      expect(checkEmployeeQueueQuota("FREE", FREE_WORKER_QUEUE_LIMIT - 1).allowed).toBe(true);
      expect(checkEmployeeQueueQuota("FREE", FREE_WORKER_QUEUE_LIMIT).allowed).toBe(false);
      expect(checkEmployeeQueueQuota("PRO", 50)).toEqual({
        allowed: true,
        currentCount: 50,
        limit: null,
      });
    });

    it("caps worker fee so net payout stays at or above the prorated Davao ₱67.50/hr reference floor", () => {
      // On 4h (floor ₱270), gross ₱276 gives ₱6 headroom; raw 5% fee (₱13.80) is capped to ₱6
      const protectedCase = calculateSettlementBreakdown({
        grossAmountPhp: 276,
        estimatedHours: 4,
        employerTier: "FREE",
        employeeTier: "FREE",
      });
      expect(protectedCase.minimumRequiredPhp).toBe(270);
      expect(protectedCase.feeProtectedByMinimumWageFloor).toBe(true);
      expect(protectedCase.employeeFeePhp).toBe(6);
      expect(protectedCase.workerNetPayoutPhp).toBe(270);
      expect(protectedCase.employerFeePhp).toBe(13.8);
      expect(protectedCase.employerTotalChargePhp).toBe(289.8);

      // Worker Pro pays 0% fee and Employer Pro pays 2% fee
      const proCase = calculateSettlementBreakdown({
        grossAmountPhp: 1000,
        estimatedHours: 4,
        employerTier: "PRO",
        employeeTier: "PRO",
      });
      expect(proCase.employerFeePhp).toBe(20);
      expect(proCase.employeeFeePhp).toBe(0);
      expect(proCase.workerNetPayoutPhp).toBe(1000);
      expect(proCase.feeProtectedByMinimumWageFloor).toBe(false);

      // Old 4h floor amounts (<= ₱269) must now fail settlement breakdown validation
      expect(() =>
        calculateSettlementBreakdown({
          grossAmountPhp: 260,
          estimatedHours: 4,
          employerTier: "FREE",
          employeeTier: "FREE",
        }),
      ).toThrow(RangeError);
    });

    it("produces deterministic heuristic quotes anchored on ₱540/8h (₱67.50/hr) and guards advisor outputs", async () => {
      const twoHour = estimateGigPrice({
        category: "Plumbing",
        estimatedHours: 2,
        urgency: "standard",
        requiredSkills: ["Pipe leak"],
      });
      const standard = estimateGigPrice({
        category: "Plumbing",
        estimatedHours: 4,
        urgency: "standard",
        requiredSkills: ["Pipe leak"],
      });
      const sixHour = estimateGigPrice({
        category: "Plumbing",
        estimatedHours: 6,
        urgency: "standard",
        requiredSkills: ["Pipe leak"],
      });
      const urgent = estimateGigPrice({
        category: "Plumbing",
        estimatedHours: 4,
        urgency: "urgent",
        requiredSkills: ["Pipe leak"],
      });

      expect(twoHour.minimumWageFloorPhp).toBe(135);
      expect(standard.minimumWageFloorPhp).toBe(270);
      expect(sixHour.minimumWageFloorPhp).toBe(405);
      expect(sixHour.recommendedPhp).toBeGreaterThan(standard.recommendedPhp);
      expect(standard.recommendedPhp).toBeGreaterThan(twoHour.recommendedPhp);
      expect(standard.recommendedPhp).toBeGreaterThanOrEqual(standard.minimumWageFloorPhp);
      expect(standard.legalBasis).toContain("Non-binding");
      expect(standard.legalBasis).toContain("540.00");
      expect(standard.legalBasis).toContain("67.50");
      expect(standard.legalBasis).not.toContain("508");
      expect(standard.legalBasis).not.toContain("63.50");
      expect(urgent.recommendedPhp).toBeGreaterThan(standard.recommendedPhp);

      // External provider returning NaN/Infinity for suggested bounds gets sanitized safely
      const clamped = await estimateGigPriceWithAdvisor(
        {
          category: "Electrical",
          estimatedHours: 4,
          urgency: "standard",
          requiredSkills: [],
        },
        {
          async estimate() {
            return {
              recommendedPhp: 600,
              suggestedMinPhp: Number.NaN,
              suggestedMaxPhp: Number.POSITIVE_INFINITY,
            };
          },
        },
      );
      expect(clamped.source).toBe("external_ai");
      expect(clamped.recommendedPhp).toBe(600);
      expect(Number.isFinite(clamped.suggestedMinPhp)).toBe(true);
      expect(Number.isFinite(clamped.suggestedMaxPhp)).toBe(true);
      expect(clamped.suggestedMinPhp).toBeGreaterThanOrEqual(clamped.minimumWageFloorPhp);
      expect(clamped.suggestedMaxPhp).toBeGreaterThanOrEqual(clamped.recommendedPhp);

      // External provider returning price below the new ₱270 (4h) floor falls back to heuristic
      const belowFloorFallback = await estimateGigPriceWithAdvisor(
        {
          category: "Cleaning",
          estimatedHours: 4,
          urgency: "standard",
          requiredSkills: [],
        },
        {
          async estimate() {
            return { recommendedPhp: 260 };
          },
        },
      );
      expect(belowFloorFallback.source).toBe("heuristic");
      expect(belowFloorFallback.minimumWageFloorPhp).toBe(270);
      expect(belowFloorFallback.recommendedPhp).toBeGreaterThanOrEqual(270);

      expect(didFollowAiRecommendation(500, Number.NaN, 700)).toBe(false);
      expect(didFollowAiRecommendation(550, 500, 700)).toBe(true);
    });

    it("ensures all seeded jobs satisfy the ₱67.50/hr fair-pay reference floor", () => {
      expect(JOBS.length).toBeGreaterThan(0);
      for (const job of JOBS) {
        const expectedFloor = roundToCents(job.estimatedHours * HOURLY_WAGE_REFERENCE);
        expect(job.minimumRequiredPhp).toBe(expectedFloor);
        if (job.budgetNum !== null) {
          expect(job.budgetNum).toBeGreaterThanOrEqual(job.minimumRequiredPhp);
        }
      }
    });

    it("maps Pixel Perfect UI categories & custom skills bidirectionally", () => {
      expect(toDomainCategory("Air Conditioning Services")).toBe("electrical");
      expect(toDomainCategory("Gardening")).toBe("agri_harvest");
      expect(toDomainCategory("Motorcycle Mechanic")).toBe("handyman");
      expect(toUiCategory("electrical", "Air Conditioning Services")).toBe(
        "Air Conditioning Services",
      );
      expect(toUiCategory("plumbing")).toBe("Plumbing");
    });
  });

  describe("2. Geo, Schemas, XSS Escaping & Discovery Filtering", () => {
    it("enforces Davao City bounds, Haversine metrics, travel ETA, and HTML escaping", () => {
      expect(isWithinDavaoRegion(DAVAO_MARKETPLACE_CENTER.lat, DAVAO_MARKETPLACE_CENTER.lng)).toBe(
        true,
      );
      expect(isWithinDavaoRegion(14.5995, 120.9842)).toBe(false); // Manila
      expect(isWithinDavaoRegion(Number.NaN, 125.6)).toBe(false);

      const km = calculateHaversineDistanceKm(
        { lat: 7.0644, lng: 125.6087 },
        { lat: 7.0566, lng: 125.595 },
      );
      expect(km).toBeGreaterThan(1.2);
      expect(km).toBeLessThan(2.5);

      expect(estimateTravelMinutes(0.6).mode).toBe("walk");
      expect(estimateTravelMinutes(3.2).mode).toBe("ride");
      expect(formatDistanceBadge(0.45)).toBe("450 m");
      expect(formatDistanceBadge(2.34)).toBe("2.3 km");

      const xssPayload = `<img src=x onerror="alert('xss')"> & "Juan's Pin"`;
      const escaped = escapeHtml(xssPayload);
      expect(escaped).not.toContain("<img");
      expect(escaped).not.toContain('"alert');
      expect(escaped).toContain("&lt;img");
      expect(escaped).toContain("&quot;");
      expect(escaped).toContain("&#39;");
      expect(escaped).toContain("&amp;");
    });

    it("validates Zod gig payloads cleanly", () => {
      const valid = CreateGigSchema.safeParse({
        title: "Repair leaking sink",
        description: "Under-sink P-trap replacement needed today",
        category: "plumbing",
        estimatedHours: 3,
        urgency: "urgent",
        barangayId: "matina",
        schedule: "Today, 3:00 PM",
        lat: DAVAO_MARKETPLACE_CENTER.lat,
        lng: DAVAO_MARKETPLACE_CENTER.lng,
        offeredPricePhp: 450,
      });
      expect(valid.success).toBe(true);

      const badCoords = DavaoCoordsSchema.safeParse({ lat: 14.6, lng: 121.0 });
      expect(badCoords.success).toBe(false);
    });

    it("filters and sorts enriched jobs by distance, urgency, landmark, and pay", () => {
      for (const job of JOBS) {
        expect(isWithinDavaoRegion(job.lat, job.lng)).toBe(true);
        expect(job.minimumRequiredPhp).toBeGreaterThan(0);
      }

      const poblacion = BARANGAYS[0]!;
      const nearest = filterAndSortJobs(JOBS, {
        origin: { lat: poblacion.lat, lng: poblacion.lng },
        category: "all",
        barangayId: "all",
        query: "",
        urgentOnly: false,
        sortBy: "nearest",
      });
      expect(nearest.length).toBe(JOBS.length);
      for (let i = 1; i < nearest.length; i++) {
        expect(nearest[i]!.distance).toBeGreaterThanOrEqual(nearest[i - 1]!.distance);
      }

      const byPay = filterAndSortJobs(JOBS, {
        origin: { lat: poblacion.lat, lng: poblacion.lng },
        category: "all",
        barangayId: "all",
        query: "",
        urgentOnly: true,
        sortBy: "pay",
      });
      expect(byPay.length).toBeGreaterThan(0);
      expect(byPay.every((j) => j.urgent)).toBe(true);

      const customJob = buildEnrichedJob({
        id: "j-custom-test",
        title: "Custom motorcycle tune-up",
        category: "Motorcycle Mechanic",
        barangayId: "buhangin",
        landmark: "Milan Overpass",
        lat: 7.1105,
        lng: 125.6126,
        poster: "Maria",
        budget: "₱800",
        budgetNum: 800,
        estimatedHours: 4,
        posted: "Just now",
        schedule: "Today",
        description: "Full carb tune-up",
        urgent: true,
        isCustom: true,
      });
      const landmarkSearch = filterAndSortJobs([customJob, ...JOBS], {
        origin: { lat: poblacion.lat, lng: poblacion.lng },
        category: "all",
        barangayId: "all",
        query: "milan overpass",
        urgentOnly: false,
        sortBy: "nearest",
      });
      expect(landmarkSearch.map((j) => j.id)).toEqual(["j-custom-test"]);
    });
  });

  describe("3. Marketplace Client Adapter & State Sanitization", () => {
    it("falls back automatically on network/5xx errors while preserving 4xx GawDomainError", async () => {
      const local = new LocalDemoMarketplaceClient();
      const validation = local.validateGigBeforePublish({
        category: "Plumbing",
        estimatedHours: 4,
        offeredPricePhp: 260,
        coords: DAVAO_MARKETPLACE_CENTER,
        employerTier: "FREE",
        activeOpenGigsCount: 3,
        urgency: "standard",
        requiredSkills: [],
      });
      expect(validation.quota.allowed).toBe(false);
      expect(validation.wageCheck?.isValid).toBe(false);
      expect(validation.wageCheck?.shortfallPhp).toBe(10);
      expect(validation.coordsValid).toBe(true);

      const origFetch = globalThis.fetch;
      try {
        // 4xx JSON error should throw GawDomainError instead of silently falling back
        globalThis.fetch = (async () =>
          new Response(
            JSON.stringify({
              error: { code: "WAGE_TOO_LOW", message: "Below Davao fair-pay floor" },
            }),
            { status: 422, headers: { "content-type": "application/json" } },
          )) as typeof fetch;

        const remote = new RemoteWithFallbackMarketplaceClient("https://api.gaw.example");
        await expect(
          remote.estimatePricing({
            category: "plumbing",
            estimatedHours: 4,
            urgency: "standard",
            requiredSkills: [],
          }),
        ).rejects.toBeInstanceOf(GawDomainError);

        // 503 or non-JSON degrades cleanly to local deterministic heuristic
        globalThis.fetch = (async () =>
          new Response("Service Unavailable", {
            status: 503,
            headers: { "content-type": "text/plain" },
          })) as typeof fetch;

        const fallback = await remote.estimatePricing({
          category: "plumbing",
          estimatedHours: 4,
          urgency: "standard",
          requiredSkills: [],
        });
        expect(fallback.source).toBe("heuristic");
        expect(fallback.minimumWageFloorPhp).toBe(270);
      } finally {
        globalThis.fetch = origFetch;
      }
    });

    it("sanitizes legacy or corrupted localStorage snapshots while preserving historical bookings & custom jobs", () => {
      const defaults = initialState;

      // Legacy v1-like payload: single custom job missing enriched pricing/lat/lng, both Pro plans,
      // plus a historical completed booking agreed under the earlier ₱254 reference
      const sanitized = sanitizeLoadedState(
        {
          signedIn: true,
          plans: ["worker", "employer", "invalid_plan"],
          savedJobIds: ["j-1", 42, "j-2"],
          userGps: { lat: Number.NaN, lng: 125.6, label: "bad" },
          bookings: [
            {
              id: "b-historical-254",
              side: "working",
              workerId: "w-1",
              client: { name: "Elena Ramos", initials: "ER" },
              service: "Plumbing",
              description: "Historical agreed faucet repair",
              date: "2026-09-12",
              time: "10:00",
              barangayId: "matina",
              location: null,
              budget: 254,
              rateText: "₱254",
              status: "completed",
              createdAt: 1700000000000,
            },
          ],
          customJobs: [
            {
              id: "j-legacy",
              title: "Fix gate hinge",
              category: "Welding",
              barangayId: "matina",
              poster: "Pedro",
              budget: "₱750",
              budgetNum: 750,
              posted: "Just now",
              schedule: "Tomorrow",
              description: "Reweld steel gate",
            },
            { bad: true },
          ],
        },
        defaults,
      );

      expect(sanitized.signedIn).toBe(true);
      expect(sanitized.plans).toEqual(["worker", "employer"]);
      expect(sanitized.savedJobIds).toEqual(["j-1", "j-2"]);
      expect(sanitized.userGps).toBeNull();
      expect(sanitized.bookings).toHaveLength(1);
      expect(sanitized.bookings[0]!.budget).toBe(254);
      expect(sanitized.bookings[0]!.rateText).toBe("₱254");
      expect(sanitized.customJobs).toHaveLength(1);
      expect(sanitized.customJobs[0]!.budgetNum).toBe(750);
      expect(sanitized.customJobs[0]!.estimatedHours).toBeGreaterThan(0);
      expect(sanitized.customJobs[0]!.minimumRequiredPhp).toBeGreaterThan(0);
      expect(sanitized.customJobs[0]!.aiRecommendedPhp).toBeGreaterThan(0);
      expect(sanitized.customJobs[0]!.isCustom).toBe(true);
      expect(isWithinDavaoRegion(sanitized.customJobs[0]!.lat, sanitized.customJobs[0]!.lng)).toBe(
        true,
      );

      // Corrupted primitives or arrays fall back cleanly
      expect(sanitizeLoadedState(["corrupted"], defaults)).toEqual(defaults);
      expect(sanitizeLoadedState(null, defaults)).toEqual(defaults);
    });

    it("enforces createJob verification, Davao bounds, fair-pay floor, Free vs Pro quotas, and save/remove state", () => {
      const unverified = initialState;
      const unverifiedRes = applyCreateJob(unverified, {
        title: "Paint bedroom wall",
        category: "Painting",
        barangayId: "poblacion",
        budgetNum: 500,
        estimatedHours: 4,
        schedule: "Tomorrow",
        description: "One coat refresh",
      });
      expect(unverifiedRes.result).toEqual({ ok: false, error: "unverified" });

      const verifiedBase: GawState = {
        ...unverified,
        verification: {
          ...unverified.verification,
          identity: {
            kind: "National ID",
            fileName: "id.jpg",
            fileType: "image/jpeg",
            fileSize: 1024,
            isSample: true,
            status: "verified",
            submittedAt: Date.now(),
          },
        },
      };

      // Reject outside Davao bounds
      const outside = applyCreateJob(verifiedBase, {
        title: "Repair roof",
        category: "Welding",
        barangayId: "poblacion",
        lat: 14.5995,
        lng: 120.9842,
        budgetNum: 600,
        estimatedHours: 4,
        schedule: "Today",
        description: "Fix steel truss",
      });
      expect(outside.result.ok).toBe(false);
      if (!outside.result.ok) expect(outside.result.error).toBe("outside_davao");

      // Reject below Davao fair-pay floor (4h * 67.50 = 270; old 260 is rejected)
      const belowFloor = applyCreateJob(verifiedBase, {
        title: "Repair sink",
        category: "Plumbing",
        barangayId: "matina",
        budgetNum: 260,
        estimatedHours: 4,
        schedule: "Today",
        description: "Fix leak",
      });
      expect(belowFloor.result.ok).toBe(false);
      if (!belowFloor.result.ok) {
        expect(belowFloor.result.error).toBe("below_benchmark");
        expect(belowFloor.result.message).toContain("₱270");
      }

      // Free tier allows up to FREE_OPEN_GIGS_LIMIT (3) custom gigs, then blocks 4th unless Employer Pro
      let curState: GawState = verifiedBase;
      const createdIds: string[] = [];
      for (let i = 0; i < FREE_OPEN_GIGS_LIMIT; i++) {
        const res = applyCreateJob(curState, {
          title: `Task #${i + 1}`,
          category: "Cleaning",
          barangayId: "buhangin",
          budgetNum: 400,
          estimatedHours: 4,
          schedule: "Flexible",
          description: "Standard cleaning task",
        });
        expect(res.result.ok).toBe(true);
        if (res.result.ok && res.result.job) createdIds.push(res.result.job.id);
        curState = res.nextState;
      }
      const fourthFree = applyCreateJob(curState, {
        title: "Task #4",
        category: "Cleaning",
        barangayId: "buhangin",
        budgetNum: 400,
        estimatedHours: 4,
        schedule: "Flexible",
        description: "Blocked on Free",
      });
      expect(fourthFree.result.ok).toBe(false);
      if (!fourthFree.result.ok) expect(fourthFree.result.error).toBe("quota_exceeded");

      const fourthPro = applyCreateJob(
        { ...curState, plans: ["employer"] },
        {
          title: "Task #4 Pro",
          category: "Cleaning",
          barangayId: "buhangin",
          budgetNum: null,
          estimatedHours: 4,
          schedule: "Flexible",
          description: "Quote allowed on Pro",
        },
      );
      expect(fourthPro.result.ok).toBe(true);

      // Save queue cap: Free 5-slot cap vs Worker Pro unlimited + cascade delete via applyRemoveJob
      let queueState: GawState = curState;
      for (let i = 1; i <= FREE_WORKER_QUEUE_LIMIT; i++) {
        const save = applyToggleSaveJob(queueState, `j-${i}`);
        expect(save.result.saved).toBe(true);
        queueState = save.nextState;
      }
      const sixthFree = applyToggleSaveJob(queueState, createdIds[0]!);
      expect(sixthFree.result).toEqual({
        saved: false,
        quotaExceeded: true,
        limit: FREE_WORKER_QUEUE_LIMIT,
      });

      const sixthPro = applyToggleSaveJob({ ...queueState, plans: ["worker"] }, createdIds[0]!);
      expect(sixthPro.result.saved).toBe(true);
      const afterRemove = applyRemoveJob(sixthPro.nextState, createdIds[0]!);
      expect(afterRemove.customJobs.some((j) => j.id === createdIds[0]!)).toBe(false);
      expect(afterRemove.savedJobIds.includes(createdIds[0]!)).toBe(false);
    });
  });

  describe("4. SSR-Safe PricingGuide, Hiring & Working UI Consistency", () => {
    it("renders I18nProvider, FairPayEstimateCard, BookingForm, and SettlementPreviewCard cleanly via SSR with ₱540/₱67.50", () => {
      const estimate = estimateGigPrice({
        category: "Electrical",
        estimatedHours: 4,
        urgency: "urgent",
        requiredSkills: ["Wiring"],
      });
      const worker = WORKERS[0]!;
      const unpricedWorker = { ...worker, rate: null };

      function Probe() {
        const { locale } = useI18n();
        return (
          <div data-locale={locale}>
            <FairPayEstimateCard estimate={estimate} offeredBudgetPhp={200} />
            <SettlementPreviewCard
              amountPhp={276}
              estimatedHours={4}
              employerTier="FREE"
              employeeTier="FREE"
              perspective="worker"
            />
            <SettlementPreviewCard
              amountPhp={276}
              estimatedHours={4}
              employerTier="FREE"
              employeeTier="FREE"
              perspective="employer"
            />
            <BookingForm
              worker={unpricedWorker}
              initial={{
                service: unpricedWorker.skill,
                description: "Electrical outlet inspection",
                date: "2026-12-01",
                time: "10:00",
                barangayId: "matina",
                budgetMode: "budget",
                budget: "270",
              }}
              onReview={() => {}}
            />
          </div>
        );
      }

      const html = renderToStaticMarkup(
        <I18nProvider>
          <Probe />
        </I18nProvider>,
      );

      expect(html).toContain('data-locale="en-PH"');
      expect(html).toContain("GAW Local Fair-Pay Estimate");
      expect(html).toContain('role="alert"');
      expect(html).toContain("₱540.00");
      expect(html).toContain("₱67.50/hr");
      expect(html).toContain("₱270");
      expect(html).toContain("₱135");
      expect(html).toContain("Estimated Take-Home Pay");
      expect(html).toContain("Demo Fee &amp; Payout Preview");
      expect(html).toContain("Estimated total");
      expect(html).toContain("Fee reduced so take-home pay stays at or above the Davao ₱67.50/hr");
      expect(html).not.toContain("508");
      expect(html).not.toContain("63.50");
      expect(html).not.toContain("₱127");
      expect(html).not.toContain("₱254");

      // Multilingual parity across Filipino and Bisaya
      for (const loc of ["fil-PH", "ceb-PH"] as const) {
        const locHtml = renderToStaticMarkup(
          <I18nProvider initialLocale={loc}>
            <Probe />
          </I18nProvider>,
        );
        expect(locHtml).toContain(`data-locale="${loc}"`);
        expect(locHtml).toContain("₱540.00");
        expect(locHtml).toContain("₱67.50/oras");
        expect(locHtml).toContain("₱270");
        expect(locHtml).toContain("₱135");
        expect(locHtml).not.toContain("508");
        expect(locHtml).not.toContain("63.50");
      }
    });
  });
});
