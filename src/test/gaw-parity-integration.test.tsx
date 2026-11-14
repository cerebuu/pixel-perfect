// @vitest-environment node
import { QueryClient } from "@tanstack/react-query";
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import { createMemoryHistory, createRouter, RouterContextProvider } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  AccountMenu,
  AccountMenuContentBody,
  BackButton,
  MainNavigation,
} from "@/components/gaw/AppLayout";
import { PostGigCard } from "@/components/gaw/PostGigCard";
import { resolveProTooltipPlacement } from "@/components/gaw/interactions";
import { FairPayEstimateCard } from "@/components/gaw/PricingGuide";
import { VerificationStatusBanner } from "@/components/gaw/VerificationStatusBanner";
import {
  GawDomainError,
  LocalDemoMarketplaceClient,
  RemoteWithFallbackMarketplaceClient,
} from "@/lib/gaw/client";
import { buildEnrichedJob, DAVAO_CENTER } from "@/lib/gaw/data";
import {
  calculateMinimumWageFloor,
  estimateGigPrice,
  estimateGigPriceWithAdvisor,
  FREE_OPEN_GIGS_LIMIT,
  type PricingEstimateResult,
} from "@/lib/gaw/domain";
import {
  createGeminiPricingProvider,
  handlePricingEstimateRequest,
  minimizePromptText,
  resetPricingRateLimiter,
  resolveGeminiConfig,
} from "@/lib/gaw/server/gemini-pricing";
import serverEntry from "@/server";
import { I18nProvider, type Locale } from "@/lib/gaw/i18n";
import {
  applyCreateJob,
  applyRemoveJob,
  applyToggleSaveJob,
  bookingsFor,
  canPerformProtectedAction,
  GawProvider,
  initialState,
  type GawState,
  type VerifDoc,
} from "@/lib/gaw/store";
import { ThemeProvider } from "@/lib/gaw/theme";
import type { VerifStatus } from "@/lib/gaw/verification";
import { routeTree } from "@/routeTree.gen";
import { PostedGigsBody } from "@/routes/gigs";
import { DashboardBody } from "@/routes/hire";
import { WorkerHome } from "@/routes/work";

function makeVerifDoc(status: VerifStatus, reason?: string): VerifDoc {
  return {
    kind: "Philippine National ID (PhilSys)",
    fileName: "philsys-demo.jpg",
    fileSize: 120_000,
    fileType: "image/jpeg",
    isSample: true,
    status,
    submittedAt: 1_735_000_000_000,
    ...(reason ? { reason } : {}),
  };
}

function makeSignedInState(overrides: Partial<GawState> = {}): GawState {
  return {
    ...initialState,
    account: {
      name: "Juan Dela Cruz",
      email: "juan@gaw.demo",
      mobile: "0917 555 0101",
      isDemo: true,
    },
    signedIn: true,
    mode: "hire",
    locationId: "bajada",
    bookings: [
      {
        id: "r-1",
        side: "working",
        workerId: "me",
        client: { name: "Ana Reyes", initials: "AR" },
        service: "Leaking kitchen sink",
        description: "Sink trap drips",
        date: "2026-11-16",
        time: "09:00",
        barangayId: "bajada",
        location: null,
        budget: 900,
        status: "pending",
        createdAt: 1_735_000_000_000,
      },
      {
        id: "r-2",
        side: "working",
        workerId: "me",
        client: { name: "Pedro Bautista", initials: "PB" },
        service: "Install shelves",
        description: "Two garage wall shelves",
        date: "2026-11-17",
        time: "13:00",
        barangayId: "buhangin",
        location: null,
        budget: null,
        status: "pending",
        createdAt: 1_735_000_000_000,
      },
      {
        id: "b-seed",
        side: "hiring",
        workerId: "w-joy",
        client: { name: "Juan Dela Cruz", initials: "JD" },
        service: "Cleaning",
        description: "Deep clean before family visit.",
        date: "2026-11-01",
        time: "09:00",
        barangayId: "bajada",
        location: null,
        budget: 1500,
        status: "completed",
        createdAt: 1_735_000_000_000,
      },
    ],
    ...overrides,
  };
}

function renderWithProviders(
  node: ReactNode,
  opts: { state?: GawState; path?: string; locale?: Locale } = {},
) {
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [opts.path ?? "/hire"] }),
    context: { queryClient: new QueryClient() },
  });

  return renderToStaticMarkup(
    <ThemeProvider>
      <I18nProvider initialLocale={opts.locale ?? "en-PH"}>
        <GawProvider initialStateOverride={opts.state ?? makeSignedInState()}>
          <RouterContextProvider router={router}>{node}</RouterContextProvider>
        </GawProvider>
      </I18nProvider>
    </ThemeProvider>,
  );
}

describe("VerificationStatusBanner parity across states, roles, and locales", () => {
  it("renders yellow warning banner for unverified / not_submitted / pending / resubmission_required on hire & work", () => {
    const cases: { status: VerifStatus | null; expectedTestId: string; expectedPhrase: string }[] =
      [
        {
          status: null,
          expectedTestId: "verification-banner-unverified",
          expectedPhrase: "Verify your ID",
        },
        {
          status: "not_submitted",
          expectedTestId: "verification-banner-not_submitted",
          expectedPhrase: "Verify your ID",
        },
        {
          status: "pending",
          expectedTestId: "verification-banner-pending",
          expectedPhrase: "pending review",
        },
        {
          status: "resubmission_required",
          expectedTestId: "verification-banner-resubmission_required",
          expectedPhrase: "Blurry corners on ID upload",
        },
      ];

    for (const role of ["hire", "work"] as const) {
      for (const c of cases) {
        const html = renderWithProviders(<VerificationStatusBanner role={role} />, {
          state: makeSignedInState({
            verification: {
              identity: c.status
                ? makeVerifDoc(
                    c.status,
                    c.status === "resubmission_required"
                      ? "Blurry corners on ID upload"
                      : undefined,
                  )
                : null,
              credentials: {},
            },
          }),
        });

        expect(html).toContain(`data-testid="${c.expectedTestId}"`);
        expect(html).toContain("bg-gold-soft");
        expect(html).toContain("dark:text-gold");
        expect(html).toContain('href="/verify"');
        expect(html).toContain(c.expectedPhrase);
      }
    }
  });

  it("renders rejected alert with reason and verified confirmation bar", () => {
    const rejectedHtml = renderWithProviders(<VerificationStatusBanner role="hire" />, {
      state: makeSignedInState({
        verification: {
          identity: makeVerifDoc("rejected", "Name on ID did not match profile"),
          credentials: {},
        },
      }),
    });
    expect(rejectedHtml).toContain('data-testid="verification-banner-rejected"');
    expect(rejectedHtml).toContain("bg-status-declined-bg");
    expect(rejectedHtml).toContain("Name on ID did not match profile");
    expect(rejectedHtml).toContain('href="/verify"');

    const verifiedHtml = renderWithProviders(<VerificationStatusBanner role="work" />, {
      state: makeSignedInState({
        verification: { identity: makeVerifDoc("verified"), credentials: {} },
      }),
    });
    expect(verifiedHtml).toContain('data-testid="verification-banner-verified"');
    expect(verifiedHtml).toContain("bg-status-confirmed-bg");
    expect(verifiedHtml).toContain("Identity Verified");
    expect(verifiedHtml).toContain('href="/verify"');
  });

  it("localizes VerificationStatusBanner in en-PH, fil-PH, and ceb-PH", () => {
    const filHtml = renderWithProviders(<VerificationStatusBanner role="hire" />, {
      locale: "fil-PH",
    });
    expect(filHtml).toContain("I-verify ang iyong ID");

    const cebHtml = renderWithProviders(<VerificationStatusBanner role="work" />, {
      locale: "ceb-PH",
    });
    expect(cebHtml).toContain("I-verify ang imong ID");
  });
});

describe("Dashboards show single top verification notice and clean hiring bookings separation", () => {
  it("renders yellow verification banner at top of /hire without duplicate sidebar verification card", () => {
    const html = renderWithProviders(<DashboardBody />, {
      path: "/hire",
      state: makeSignedInState({
        verification: { identity: null, credentials: {} },
      }),
    });

    expect(html).toContain('data-testid="verification-banner-unverified"');
    expect(html).not.toContain("Employer Verification");
    // Ensure hiring dashboard counts ONLY hiring-side bookings (b-seed: 1 Completed, 0 Pending)
    // and is NOT inflated by working-side incoming requests r-1..r-2!
    expect(html).toContain("Joy Villanueva");
    expect(html).not.toContain("Leaking kitchen sink");
    // Shared PostGigCard links manage actions to /gigs
    expect(html).toContain('href="/gigs"');
  });

  it("renders verification banner at top of /work both before and after workerProfile creation", () => {
    const preProfileHtml = renderWithProviders(<WorkerHome />, {
      path: "/work",
      state: makeSignedInState({ mode: "work", workerProfile: null }),
    });
    expect(preProfileHtml).toContain('data-testid="verification-banner-unverified"');
    expect(preProfileHtml).toContain("Save &amp; Start Working");

    const postProfileHtml = renderWithProviders(<WorkerHome />, {
      path: "/work",
      state: makeSignedInState({
        mode: "work",
        verification: { identity: makeVerifDoc("verified"), credentials: {} },
        workerProfile: {
          skill: "Plumbing",
          skills: ["Plumbing"],
          barangayId: "bajada",
          area: null,
          radiusKm: 5,
          experience: "5 years",
          description: "Licensed household plumber across Davao City.",
        },
      }),
    });
    expect(postProfileHtml).toContain('data-testid="verification-banner-verified"');
    expect(postProfileHtml).not.toContain("Worker Verification");
  });
});

describe("My Gigs navigation, AccountMenu, and /gigs workspace", () => {
  it("exposes My Gigs (/gigs) in both desktop and mobile hiring navigation with accurate badges", () => {
    const customGig = buildEnrichedJob({
      id: "j-custom-1",
      title: "Install Split-Type Aircon",
      category: "Aircon",
      barangayId: "bajada",
      landmark: "Near Abreeza",
      lat: DAVAO_CENTER.lat,
      lng: DAVAO_CENTER.lng,
      poster: "Juan Dela Cruz",
      budget: "₱1,200",
      budgetNum: 1200,
      estimatedHours: 4,
      posted: "Just now",
      schedule: "Tomorrow 10:00 AM",
      description: "Full bracket mount and copper line vacuum.",
      isCustom: true,
    });

    const state = makeSignedInState({
      customJobs: [customGig],
      bookings: [
        ...makeSignedInState().bookings,
        {
          id: "h-pending-1",
          side: "hiring",
          workerId: "w-ramon",
          client: { name: "Juan Dela Cruz", initials: "JD" },
          service: "Plumbing",
          description: "Kitchen sink pipe check",
          date: "2026-11-18",
          time: "10:00",
          barangayId: "bajada",
          location: null,
          budget: 800,
          status: "pending",
          createdAt: 1_735_000_000_000,
        },
      ],
    });

    const desktopHireNav = renderWithProviders(
      <MainNavigation mode="hire" pathname="/gigs" variant="desktop" />,
      { state, path: "/gigs" },
    );
    expect(desktopHireNav).toContain("My Gigs");
    expect(desktopHireNav).toContain('href="/gigs"');
    expect(desktopHireNav).toContain('aria-current="page"');
    expect(desktopHireNav).toContain(">1<");
    expect(desktopHireNav).not.toContain('href="/pro"');
    expect(desktopHireNav).not.toContain(">Pro<");

    const mobileHireNav = renderWithProviders(
      <MainNavigation mode="hire" pathname="/gigs" variant="mobile" />,
      { state, path: "/gigs" },
    );
    expect(mobileHireNav).toContain("grid-cols-4");
    expect(mobileHireNav).toContain('href="/gigs"');
    expect(mobileHireNav).not.toContain('href="/pro"');
    expect(mobileHireNav).not.toContain(">Pro<");

    const desktopWorkNav = renderWithProviders(
      <MainNavigation mode="work" pathname="/work" variant="desktop" />,
      { state: { ...state, mode: "work" }, path: "/work" },
    );
    expect(desktopWorkNav).toContain('href="/jobs"');
    expect(desktopWorkNav).toContain('href="/my-jobs"');
    expect(desktopWorkNav).not.toContain('href="/gigs"');
    expect(desktopWorkNav).not.toContain('href="/pro"');
    expect(desktopWorkNav).not.toContain(">Pro<");
    expect(desktopWorkNav).toContain(">2<"); // 2 pending working bookings

    const mobileWorkNav = renderWithProviders(
      <MainNavigation mode="work" pathname="/work" variant="mobile" />,
      { state: { ...state, mode: "work" }, path: "/work" },
    );
    expect(mobileWorkNav).toContain("grid-cols-3");
    expect(mobileWorkNav).not.toContain('href="/pro"');
    expect(mobileWorkNav).not.toContain(">Pro<");

    const accountTrigger = renderWithProviders(<AccountMenu />, { state });
    expect(accountTrigger).toContain('aria-label="Account menu"');

    const backBtn = renderWithProviders(<BackButton to="/gigs" />);
    expect(backBtn).toContain('href="/gigs"');
    const proBackBtn = renderWithProviders(<BackButton to="/pro" />);
    expect(proBackBtn).toContain('href="/pro"');
  });

  it("renders PostedGigsBody with empty state and populated proposals + map preview + shared PostGigCard", () => {
    const emptyHtml = renderWithProviders(<PostedGigsBody />, {
      path: "/gigs",
      state: makeSignedInState({ customJobs: [] }),
    });
    expect(emptyHtml).toContain('data-testid="verification-banner-unverified"');
    expect(emptyHtml).toContain("No posted gigs yet");
    expect(emptyHtml).toContain('id="post-request-form"');

    const gig = buildEnrichedJob({
      id: "j-custom-prop",
      title: "Fix Kitchen Pipe Leak",
      category: "Plumbing",
      barangayId: "matina",
      landmark: "Matina Crossing",
      lat: DAVAO_CENTER.lat,
      lng: DAVAO_CENTER.lng,
      poster: "Juan Dela Cruz",
      budget: "₱900",
      budgetNum: 900,
      estimatedHours: 3,
      posted: "Just now",
      schedule: "Today 2:00 PM",
      description: "Under-sink PVC elbow dripping steadily.",
      urgent: true,
      isCustom: true,
    });

    const populatedHtml = renderWithProviders(<PostedGigsBody />, {
      path: "/gigs",
      state: makeSignedInState({
        customJobs: [gig],
        verification: { identity: makeVerifDoc("verified"), credentials: {} },
        applications: [
          {
            id: "app-1",
            jobId: "j-custom-prop",
            message: "Available today with wrench set and Teflon tape.",
            rate: "₱850",
            status: "submitted",
            createdAt: 1_735_000_000_000,
          },
          {
            id: "app-2",
            jobId: "j-custom-prop",
            message: "Ready to assist immediately.",
            rate: "₱900",
            status: "hired",
            createdAt: 1_735_000_000_000,
          },
        ],
      }),
    });

    expect(populatedHtml).toContain('data-testid="verification-banner-verified"');
    expect(populatedHtml).toContain("Fix Kitchen Pipe Leak");
    expect(populatedHtml).toContain("Applicant Proposals (2)");
    expect(populatedHtml).toContain("Available today with wrench set and Teflon tape.");
    expect(populatedHtml).toContain("₱850");
    expect(populatedHtml).toContain("Hire Applicant");
    expect(populatedHtml).toContain("View Booking");
    expect(populatedHtml).toContain("Pin on Map");
    expect(populatedHtml).toContain("Close Gig");
    expect(populatedHtml).toContain('id="gigs-map"');
  });

  it("renders PostGigCard in collapsed or expanded states safely", () => {
    const expanded = renderWithProviders(<PostGigCard defaultOpen showMyGigsLink />);
    expect(expanded).toContain('id="post-request-form"');
    expect(expanded).toContain('id="req-title"');
    expect(expanded).toContain('id="req-budget"');
    expect(expanded).toContain("GAW Local Fair-Pay Estimate");
    expect(expanded).toContain("Demo Fee &amp; Payout Preview");
  });
});

describe("My Gigs store lifecycle & progressive verification guardrails", () => {
  const validInput = {
    title: "Repair Main Breaker Box",
    category: "Electrical",
    barangayId: "bajada",
    landmark: "Near Victoria Plaza",
    lat: DAVAO_CENTER.lat,
    lng: DAVAO_CENTER.lng,
    budgetNum: 900,
    estimatedHours: 4,
    schedule: "Tomorrow morning",
    description: "Inspect loose main lug and replace burnt 30A breaker.",
    urgent: true,
  };

  it("blocks job posting for unverified / pending / resubmission / rejected users without locking out browsing", () => {
    for (const status of [
      null,
      "not_submitted",
      "unverified",
      "pending",
      "resubmission_required",
      "rejected",
    ] as const) {
      const state = makeSignedInState({
        verification: {
          identity: status ? makeVerifDoc(status) : null,
          credentials: {},
        },
      });
      const guard = canPerformProtectedAction(state.verification);
      expect(guard.allowed).toBe(false);

      const outcome = applyCreateJob(state, validInput);
      expect(outcome.result.ok).toBe(false);
      expect(outcome.result.error).toBe("unverified");
      expect(outcome.nextState.customJobs).toHaveLength(0);
    }
  });

  it("enforces Davao bounds, fair-pay benchmark, Free vs Pro quota, and cascading removal cleanup", () => {
    let state = makeSignedInState({
      verification: { identity: makeVerifDoc("verified"), credentials: {} },
    });

    const outside = applyCreateJob(state, { ...validInput, lat: 14.5995, lng: 120.9842 });
    expect(outside.result.ok).toBe(false);
    expect(outside.result.error).toBe("outside_davao");

    const lowPay = applyCreateJob(state, { ...validInput, budgetNum: 100 });
    expect(lowPay.result.ok).toBe(false);
    expect(lowPay.result.error).toBe("below_benchmark");

    for (let i = 0; i < FREE_OPEN_GIGS_LIMIT; i++) {
      const created = applyCreateJob(state, { ...validInput, title: `Valid Gig ${i + 1}` });
      expect(created.result.ok).toBe(true);
      state = created.nextState;
    }
    expect(state.customJobs).toHaveLength(FREE_OPEN_GIGS_LIMIT);

    const quotaBlocked = applyCreateJob(state, { ...validInput, title: "4th Free Gig" });
    expect(quotaBlocked.result.ok).toBe(false);
    expect(quotaBlocked.result.error).toBe("quota_exceeded");

    // Upgrading to Employer Pro lifts the quota
    const proOutcome = applyCreateJob({ ...state, plans: ["employer"] }, validInput);
    expect(proOutcome.result.ok).toBe(true);
    expect(proOutcome.nextState.customJobs).toHaveLength(FREE_OPEN_GIGS_LIMIT + 1);

    // Saving & removing a custom job cleans up savedJobIds
    const createdId = state.customJobs[0]!.id;
    const saved = applyToggleSaveJob(state, createdId).nextState;
    expect(saved.savedJobIds).toContain(createdId);

    const removed = applyRemoveJob(saved, createdId);
    expect(removed.customJobs.some((j) => j.id === createdId)).toBe(false);
    expect(removed.savedJobIds).not.toContain(createdId);

    // Confirm side separation helper works for Hiring vs Working bookings
    expect(bookingsFor(state.bookings, "hiring").every((b) => b.side === "hiring")).toBe(true);
    expect(bookingsFor(state.bookings, "working").every((b) => b.side === "working")).toBe(true);
  });
});

describe("Gemini AI Labor Pricing Advisor — Server API, Fallback & UI Parity", () => {
  it("minimizes PII in prompts and resolves server-only Gemini configuration safely", () => {
    const cleaned = minimizePromptText(
      "Call me at 0917 555 1234 or email juan.delacruz@example.com for kitchen pipe repair",
      120,
    );
    expect(cleaned).not.toContain("0917");
    expect(cleaned).not.toContain("juan.delacruz@example.com");
    expect(cleaned).toContain("[redacted-phone]");
    expect(cleaned).toContain("[redacted-email]");

    expect(resolveGeminiConfig({ GEMINI_API_KEY: "YOUR_KEY" })).toEqual({
      apiKey: null,
      model: "gemini-3.5-flash",
    });
    expect(
      resolveGeminiConfig({
        GEMINI_API_KEY: "test-server-secret",
        GEMINI_MODEL: "gemini-3.5-flash",
      }),
    ).toEqual({
      apiKey: "test-server-secret",
      model: "gemini-3.5-flash",
    });
  });

  it("calls Gemini REST endpoint with server key header, parses structured JSON, and clamps invalid AI outputs", async () => {
    let capturedUrl = "";
    let capturedApiKeyHeader: string | null = null;
    let capturedPrompt = "";

    const validProvider = createGeminiPricingProvider({
      apiKey: "test-gemini-key",
      model: "gemini-3.5-flash",
      fetchFn: async (input, init) => {
        capturedUrl = String(input);
        const headers = new Headers(init?.headers);
        capturedApiKeyHeader = headers.get("x-goog-api-key");
        capturedPrompt = String(init?.body ?? "");
        return new Response(
          JSON.stringify({
            candidates: [
              {
                content: {
                  parts: [
                    {
                      text: JSON.stringify({
                        recommendedPhp: 620,
                        suggestedMinPhp: 540,
                        suggestedMaxPhp: 720,
                        rationale: "Skilled pipe diagnosis and sealant kit allowance in Bajada.",
                        legalBasis: "Anchored above Davao ₱540.00/8h (₱67.50/hr) benchmark.",
                        logicalBasis: "4h skilled plumbing labor + tools + Bajada transit.",
                        breakdown: {
                          baseWageFloorPhp: 270,
                          skillPremiumPhp: 175,
                          toolAllowancePhp: 100,
                          transportAllowancePhp: 75,
                          urgencyPremiumPhp: 0,
                        },
                      }),
                    },
                  ],
                },
              },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      },
    });

    const aiResult = await estimateGigPriceWithAdvisor(
      {
        category: "Plumbing",
        estimatedHours: 4,
        urgency: "standard",
        requiredSkills: ["Leak detection"],
        title: "Fix kitchen P-trap · contact 0917 555 0101",
        description: "Email updates to juan@gaw.demo",
        barangay: "bajada",
      },
      validProvider,
    );

    expect(capturedUrl).toContain("/models/gemini-3.5-flash:generateContent");
    expect(capturedUrl).not.toContain("test-gemini-key");
    expect(capturedApiKeyHeader).toBe("test-gemini-key");
    expect(capturedPrompt).not.toContain("juan@gaw.demo");
    expect(capturedPrompt).not.toContain("0917");

    expect(capturedPrompt).toContain("540.00");
    expect(capturedPrompt).toContain("67.50");
    expect(capturedPrompt).not.toContain("508");
    expect(capturedPrompt).not.toContain("63.50");

    expect(aiResult.source).toBe("external_ai");
    expect(aiResult.recommendedPhp).toBe(620);
    expect(aiResult.suggestedMinPhp).toBe(540);
    expect(aiResult.suggestedMaxPhp).toBe(720);
    expect(aiResult.rationale).toContain("Bajada");
    expect(aiResult.breakdown.skillPremiumPhp).toBe(175);

    // Below-floor Gemini recommendation (including old ₱260) must fall back safely to deterministic heuristic
    const lowProvider = createGeminiPricingProvider({
      apiKey: "test-gemini-key",
      fetchFn: async () =>
        new Response(
          JSON.stringify({
            candidates: [
              { content: { parts: [{ text: JSON.stringify({ recommendedPhp: 260 }) }] } },
            ],
          }),
          { status: 200 },
        ),
    });
    const clampedFallback = await estimateGigPriceWithAdvisor(
      {
        category: "Plumbing",
        estimatedHours: 4,
        urgency: "standard",
        requiredSkills: [],
      },
      lowProvider,
    );
    expect(clampedFallback.source).toBe("heuristic");
    expect(clampedFallback.recommendedPhp).toBeGreaterThanOrEqual(
      calculateMinimumWageFloor(4).minimumRequiredPhp,
    );

    // Malformed non-JSON upstream output must also fall back cleanly
    const brokenProvider = createGeminiPricingProvider({
      apiKey: "test-gemini-key",
      fetchFn: async () => new Response("Internal upstream error", { status: 503 }),
    });
    const brokenFallback = await estimateGigPriceWithAdvisor(
      {
        category: "Electrical",
        estimatedHours: 4,
        urgency: "urgent",
        requiredSkills: [],
      },
      brokenProvider,
    );
    expect(brokenFallback.source).toBe("heuristic");
  });

  it("handles POST /api/v1/pricing/estimate validation, fallback, Gemini success, and rate limiting", async () => {
    resetPricingRateLimiter();

    const makeReq = (body: unknown, rawText?: string) =>
      new Request("https://gaw.local/api/v1/pricing/estimate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-forwarded-for": "203.0.113.10",
        },
        body: rawText ?? JSON.stringify(body),
      });

    // 1. Malformed JSON -> 400 INVALID_JSON
    const badJson = await handlePricingEstimateRequest(makeReq(null, "{bad json"), {
      skipRateLimit: true,
    });
    expect(badJson.status).toBe(400);
    expect(((await badJson.json()) as { error: { code: string } }).error.code).toBe("INVALID_JSON");

    // 2. Invalid schema -> 422 VALIDATION_ERROR
    const invalidZod = await handlePricingEstimateRequest(
      makeReq({ category: "Plumbing", estimatedHours: -4 }),
      { skipRateLimit: true },
    );
    expect(invalidZod.status).toBe(422);
    expect(((await invalidZod.json()) as { error: { code: string } }).error.code).toBe(
      "VALIDATION_ERROR",
    );

    // 3. No GEMINI_API_KEY configured -> 200 deterministic heuristic fallback
    const noKeyRes = await handlePricingEstimateRequest(
      makeReq({ category: "Plumbing", estimatedHours: 4, urgency: "standard" }),
      { env: {}, skipRateLimit: true },
    );
    expect(noKeyRes.status).toBe(200);
    const noKeyPayload = (await noKeyRes.json()) as PricingEstimateResult;
    expect(noKeyPayload.source).toBe("heuristic");
    expect(noKeyPayload.minimumWageFloorPhp).toBe(270);

    // 4. Configured GEMINI_API_KEY -> 200 external_ai response
    const aiRes = await handlePricingEstimateRequest(
      makeReq({
        category: "Electrical",
        estimatedHours: 4,
        urgency: "urgent",
        barangay: "bajada",
      }),
      {
        env: { GEMINI_API_KEY: "live-demo-key", GEMINI_MODEL: "gemini-3.5-flash" },
        skipRateLimit: true,
        fetchFn: async () =>
          new Response(
            JSON.stringify({
              candidates: [
                {
                  content: {
                    parts: [
                      {
                        text: JSON.stringify({
                          recommendedPhp: 740,
                          suggestedMinPhp: 660,
                          suggestedMaxPhp: 850,
                          rationale:
                            "Urgent breaker check in Bajada with insulation testing tools.",
                        }),
                      },
                    ],
                  },
                },
              ],
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          ),
      },
    );
    expect(aiRes.status).toBe(200);
    expect(aiRes.headers.get("Cache-Control")).toBe("no-store");
    const aiPayload = (await aiRes.json()) as PricingEstimateResult;
    expect(aiPayload.source).toBe("external_ai");
    expect(aiPayload.recommendedPhp).toBe(740);
    expect(aiPayload.rationale).toContain("Bajada");

    // 5. Server entrypoint direct dispatch (Cloudflare Worker / SSR fetch) works cleanly
    const serverRes = await serverEntry.fetch(
      makeReq({ category: "Cleaning", estimatedHours: 4, urgency: "standard" }),
      {},
      {},
    );
    expect(serverRes.status).toBe(200);
    const serverPayload = (await serverRes.json()) as PricingEstimateResult;
    expect(serverPayload.source).toBe("heuristic");

    // 6. Rate limiting triggers 429 RATE_LIMITED with Retry-After after 30 requests in 60s
    resetPricingRateLimiter();
    let lastStatus = 200;
    for (let i = 0; i < 31; i++) {
      const r = await handlePricingEstimateRequest(
        makeReq({ category: "Cleaning", estimatedHours: 2 }),
        { env: {}, now: 1_750_000_000_000 + i, clientKey: "burst-ip" },
      );
      lastStatus = r.status;
      if (i === 30) {
        expect(r.status).toBe(429);
        expect(r.headers.get("Retry-After")).toBeTruthy();
      }
    }
    expect(lastStatus).toBe(429);
  });

  it("wires RemoteWithFallbackMarketplaceClient & renders Gemini AI Pricing badges cleanly in SSR", async () => {
    const localClient = new LocalDemoMarketplaceClient();
    const localEstimate = await localClient.estimatePricing({
      category: "Plumbing",
      estimatedHours: 4,
      urgency: "standard",
      requiredSkills: [],
    });
    expect(localEstimate.source).toBe("heuristic");

    // Remote client reads backend 200 external_ai, degrades on 429, and throws GawDomainError on 422
    const originalFetch = globalThis.fetch;
    try {
      const mockEstimate: PricingEstimateResult = {
        ...localEstimate,
        recommendedPhp: 680,
        suggestedMinPhp: 600,
        suggestedMaxPhp: 780,
        hourlyRateRecommendedPhp: 170,
        rationale: "Mocked Gemini AI fair-pay guidance for Bajada.",
        source: "external_ai",
      };

      globalThis.fetch = (async () =>
        new Response(JSON.stringify(mockEstimate), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })) as typeof fetch;

      const remoteClient = new RemoteWithFallbackMarketplaceClient("https://gaw.local");
      const remoteResult = await remoteClient.estimatePricing({
        category: "Plumbing",
        estimatedHours: 4,
        urgency: "standard",
        requiredSkills: [],
      });
      expect(remoteResult.source).toBe("external_ai");
      expect(remoteResult.recommendedPhp).toBe(680);

      // 429 degrades gracefully to local heuristic
      globalThis.fetch = (async () =>
        new Response(JSON.stringify({ error: { code: "RATE_LIMITED", message: "Slow down" } }), {
          status: 429,
          headers: { "Content-Type": "application/json" },
        })) as typeof fetch;
      const rateFallback = await remoteClient.estimatePricing({
        category: "Plumbing",
        estimatedHours: 4,
        urgency: "standard",
        requiredSkills: [],
      });
      expect(rateFallback.source).toBe("heuristic");

      // 422 throws GawDomainError
      globalThis.fetch = (async () =>
        new Response(
          JSON.stringify({ error: { code: "VALIDATION_ERROR", message: "Bad hours" } }),
          {
            status: 422,
            headers: { "Content-Type": "application/json" },
          },
        )) as typeof fetch;
      await expect(
        remoteClient.estimatePricing({
          category: "Plumbing",
          estimatedHours: 4,
          urgency: "standard",
          requiredSkills: [],
        }),
      ).rejects.toBeInstanceOf(GawDomainError);

      // SSR UI check for FairPayEstimateCard with external_ai & PostGigCard toggle
      const aiCardHtml = renderToStaticMarkup(
        <I18nProvider>
          <FairPayEstimateCard
            estimate={mockEstimate}
            offeredBudgetPhp={680}
            useAiPricer
            onToggleAiPricer={() => {}}
          />
        </I18nProvider>,
      );
      expect(aiCardHtml).toContain("Gemini AI Estimate");
      expect(aiCardHtml).toContain("AI Pricer On");

      const postCardHtml = renderWithProviders(<PostGigCard defaultOpen showMyGigsLink />);
      expect(postCardHtml).toContain("AI Pricer On");
      expect(postCardHtml).toContain("Local Guide Fallback");

      const manualEstimate = estimateGigPrice({
        category: "Cleaning",
        estimatedHours: 3,
        urgency: "standard",
        requiredSkills: [],
      });
      expect(manualEstimate.source).toBe("heuristic");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("highlights GAW Pro Subscription inside AccountMenu with refined gold premium tokens without affecting other items", () => {
    const baseState = makeSignedInState({
      mode: "hire",
      plans: ["employer"],
      customJobs: [
        buildEnrichedJob({
          id: "j-custom-menu",
          title: "Fix Kitchen Tap",
          category: "Plumbing",
          barangayId: "bajada",
          landmark: "Bajada",
          lat: DAVAO_CENTER.lat,
          lng: DAVAO_CENTER.lng,
          poster: "Juan Dela Cruz",
          budget: "₱600",
          budgetNum: 600,
          estimatedHours: 3,
          posted: "Just now",
          schedule: "Flexible",
          description: "Quick valve repair.",
          isCustom: true,
        }),
      ],
    });

    const hireMenuHtml = renderWithProviders(
      <DropdownMenuPrimitive.Root open>
        <DropdownMenuPrimitive.Content forceMount>
          <AccountMenuContentBody />
        </DropdownMenuPrimitive.Content>
      </DropdownMenuPrimitive.Root>,
      { state: baseState, path: "/hire" },
    );

    // GAW Pro Subscription uses premium gold hover microinteraction tokens, subtle glow, lift, synchronized SVG motion, and zero active override on /hire
    expect(hireMenuHtml).toContain("GAW Pro Subscription");
    expect(hireMenuHtml).toContain("bg-premium-surface");
    expect(hireMenuHtml).toContain("hover:bg-premium-hover-surface");
    expect(hireMenuHtml).toContain("ring-premium-border");
    expect(hireMenuHtml).toContain("hover:ring-premium-hover-border");
    expect(hireMenuHtml).toContain("hover:shadow-premium-hover");
    expect(hireMenuHtml).toContain("data-[highlighted]:shadow-premium-hover");
    expect(hireMenuHtml).toContain("hover:-translate-y-[1.5px]");
    expect(hireMenuHtml).toContain("data-[highlighted]:-translate-y-[1.5px]");
    expect(hireMenuHtml).toContain("hover:[&amp;&gt;svg:first-of-type]:scale-[1.08]");
    expect(hireMenuHtml).toContain("hover:[&amp;&gt;svg[data-trailing]]:translate-x-[3.5px]");
    expect(hireMenuHtml).toContain("duration-200");
    expect(hireMenuHtml).toContain("cubic-bezier(0.22,1,0.36,1)");
    expect(hireMenuHtml).toContain("active:scale-[0.985]");
    expect(hireMenuHtml).toContain("data-[highlighted]:active:translate-y-0");
    expect(hireMenuHtml).toContain("data-[highlighted]:active:shadow-premium-active");
    expect(hireMenuHtml).toContain("data-[active=true]:shadow-premium-active");
    expect(hireMenuHtml).toContain("data-[disabled]:shadow-none");
    expect(hireMenuHtml).toContain("focus-visible:ring-premium-focus");
    expect(hireMenuHtml).toContain("focus-visible:shadow-premium-hover");
    expect(hireMenuHtml).toContain("motion-reduce:hover:translate-y-0");
    expect(hireMenuHtml).toContain("motion-reduce:hover:[&amp;&gt;svg:first-of-type]:scale-100");
    expect(hireMenuHtml).toContain(
      "motion-reduce:hover:[&amp;&gt;svg[data-trailing]]:translate-x-0",
    );
    expect(hireMenuHtml).not.toContain("animate-pulse");
    expect(hireMenuHtml).not.toContain("animate-bounce");
    expect(hireMenuHtml).toContain('data-trailing="true"');
    expect(hireMenuHtml).toContain("min-w-0 flex-1 truncate");
    expect(hireMenuHtml).toContain("GAW Pro (demo) active");
    expect(hireMenuHtml).not.toContain('data-active="true"');

    // Only one item carries the persistent gold highlight; regular items keep clean default styling
    const premiumMenuItems = hireMenuHtml
      .split('role="menuitem"')
      .slice(1)
      .filter((chunk) => chunk.slice(0, chunk.indexOf(">")).includes("bg-premium-surface"));
    expect(premiumMenuItems).toHaveLength(1);
    expect(premiumMenuItems[0]).toContain("GAW Pro Subscription");
    expect(hireMenuHtml).toContain("My Posted Gigs");
    expect(hireMenuHtml).toContain("Verification Center");
    expect(hireMenuHtml).toContain("Account Settings");
    expect(hireMenuHtml).toContain("Switch role");
    expect(hireMenuHtml).toContain("Reset demo data");
    expect(hireMenuHtml).toContain("Log out");

    // When active route IS /pro, the item exposes distinguishable active selection attributes
    const activeProMenuHtml = renderWithProviders(
      <DropdownMenuPrimitive.Root open>
        <DropdownMenuPrimitive.Content forceMount>
          <AccountMenuContentBody />
        </DropdownMenuPrimitive.Content>
      </DropdownMenuPrimitive.Root>,
      { state: baseState, path: "/pro" },
    );
    expect(activeProMenuHtml).toContain('data-active="true"');
    expect(activeProMenuHtml).toContain('aria-current="page"');

    // Multilingual consistency in Filipino & Bisaya
    for (const loc of ["fil-PH", "ceb-PH"] as const) {
      const locHtml = renderWithProviders(
        <DropdownMenuPrimitive.Root open>
          <DropdownMenuPrimitive.Content forceMount>
            <AccountMenuContentBody />
          </DropdownMenuPrimitive.Content>
        </DropdownMenuPrimitive.Root>,
        { state: baseState, path: "/hire", locale: loc },
      );
      expect(locHtml).toContain("GAW Pro Subscription");
      expect(locHtml).toContain("bg-premium-surface");
    }
  });

  it("strictly enforces RIGHT -> BOTTOM -> TOP placement priority (never left) across viewports", () => {
    // Wide desktop (1920px & 1440px with centered max-w-6xl header): fits on the right with clamped maxWidth
    expect(
      resolveProTooltipPlacement({
        rect: { left: 1272, right: 1516, top: 410, bottom: 446 },
        viewportWidth: 1920,
        viewportHeight: 1080,
      }),
    ).toEqual({ side: "right", maxWidth: 224 });

    expect(
      resolveProTooltipPlacement({
        rect: { left: 1016, right: 1260, top: 410, bottom: 446 },
        viewportWidth: 1440,
        viewportHeight: 900,
      }),
    ).toEqual({ side: "right", maxWidth: 158 });

    // Even a 1440px window with scrollbar margin (1425px clientWidth) fits cleanly on right without triggering Radix flip
    expect(
      resolveProTooltipPlacement({
        rect: { left: 1010, right: 1254, top: 410, bottom: 446 },
        viewportWidth: 1425,
        viewportHeight: 900,
      }),
    ).toEqual({ side: "right", maxWidth: 149 });

    // Laptop / near right edge (1280px, 1024px, 768px): falls back strictly to bottom first
    expect(
      resolveProTooltipPlacement({
        rect: { left: 936, right: 1180, top: 410, bottom: 446 },
        viewportWidth: 1280,
        viewportHeight: 720,
      }),
    ).toEqual({ side: "bottom", maxWidth: 224 });

    expect(
      resolveProTooltipPlacement({
        rect: { left: 488, right: 732, top: 410, bottom: 446 },
        viewportWidth: 768,
        viewportHeight: 1024,
      }),
    ).toEqual({ side: "bottom", maxWidth: 224 });

    // Mobile viewports (390px and 360px): bottom first, never right or left
    expect(
      resolveProTooltipPlacement({
        rect: { left: 118, right: 374, top: 410, bottom: 446 },
        viewportWidth: 390,
        viewportHeight: 844,
      }),
    ).toEqual({ side: "bottom", maxWidth: 224 });

    expect(
      resolveProTooltipPlacement({
        rect: { left: 88, right: 344, top: 410, bottom: 446 },
        viewportWidth: 360,
        viewportHeight: 640,
      }),
    ).toEqual({ side: "bottom", maxWidth: 224 });

    // When right AND below are insufficient, falls back to top — NEVER left
    expect(
      resolveProTooltipPlacement({
        rect: { left: 980, right: 1220, top: 200, bottom: 236 },
        viewportWidth: 1260,
        viewportHeight: 260,
      }),
    ).toEqual({ side: "top", maxWidth: 224 });
  });
});
