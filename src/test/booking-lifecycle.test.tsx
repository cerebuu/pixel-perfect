// @vitest-environment node
import { QueryClient } from "@tanstack/react-query";
import { createMemoryHistory, createRouter, RouterContextProvider } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { MainNavigation } from "@/components/gaw/AppLayout";
import { BookingTimeline, TwoSidedDemoBridge } from "@/components/gaw/BookingLifecycle";
import { StatusBadge } from "@/components/gaw/primitives";
import {
  agreedPriceAmount,
  BOOKING_TIMELINE_STEPS,
  canCancelBooking,
  canConfirmCompletion,
  canReportIssue,
  findActiveJobConflict,
  resolveBookingPersonas,
  timelineStepIndex,
  validateBookingAcceptance,
} from "@/lib/gaw/bookings";
import { I18nProvider, type Locale } from "@/lib/gaw/i18n";
import {
  applyBookingLifecycleAction,
  applyReportBookingIssue,
  applyResolveBookingIssue,
  applySubmitBookingReview,
  bookingsFor,
  GawProvider,
  initialState,
  sanitizeLoadedState,
  type Booking,
  type GawState,
} from "@/lib/gaw/store";
import { ThemeProvider } from "@/lib/gaw/theme";
import { routeTree } from "@/routeTree.gen";
import { BookingsList } from "@/routes/bookings";
import { MyJobsManager } from "@/routes/my-jobs";
import { RequestDetail } from "@/routes/requests.$id";
import { WorkerHome } from "@/routes/work";

function renderWithProviders(
  node: ReactNode,
  opts: { state?: GawState; path?: string; locale?: Locale } = {},
) {
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [opts.path ?? "/my-jobs"] }),
    context: { queryClient: new QueryClient() },
  });

  return renderToStaticMarkup(
    <ThemeProvider>
      <I18nProvider initialLocale={opts.locale ?? "en-PH"}>
        <GawProvider initialStateOverride={opts.state ?? initialState}>
          <RouterContextProvider router={router}>{node}</RouterContextProvider>
        </GawProvider>
      </I18nProvider>
    </ThemeProvider>,
  );
}

function makeDemoBookings(): Booking[] {
  const now = 1_736_000_000_000;
  return [
    {
      id: "r-1",
      side: "working",
      workerId: "me",
      client: { name: "Ana Reyes", initials: "AR" },
      service: "Leaking kitchen sink",
      description: "Water drips under the sink cabinet whenever we use the faucet.",
      date: "2026-11-18",
      time: "09:00",
      barangayId: "bajada",
      location: null,
      budget: 900,
      status: "pending",
      createdAt: now,
    },
    {
      id: "r-2",
      side: "working",
      workerId: "me",
      client: { name: "Pedro Bautista", initials: "PB" },
      service: "Install shelves in garage",
      description: "Two wall shelves for tools. I already have the brackets.",
      date: "2026-11-20",
      time: "13:00",
      barangayId: "buhangin",
      location: null,
      budget: null,
      status: "pending",
      createdAt: now,
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
      createdAt: now - 1000 * 60 * 60 * 24 * 21,
      acceptedAt: now - 1000 * 60 * 60 * 24 * 21 + 1000 * 60 * 20,
      startedAt: now - 1000 * 60 * 60 * 24 * 21 + 1000 * 60 * 60 * 2,
      finishedAt: now - 1000 * 60 * 60 * 24 * 21 + 1000 * 60 * 60 * 5,
      completedAt: now - 1000 * 60 * 60 * 24 * 21 + 1000 * 60 * 60 * 6,
      agreedAt: now - 1000 * 60 * 60 * 24 * 21 + 1000 * 60 * 20,
    },
  ];
}

function makeSeededState(bookings: Booking[] = makeDemoBookings()): GawState {
  return {
    ...initialState,
    signedIn: true,
    mode: "work",
    account: {
      name: "Juan Dela Cruz",
      email: "juan@gaw.demo",
      mobile: "0917 555 0101",
      isDemo: true,
    },
    workerProfile: {
      skill: "Plumbing",
      skills: ["Plumbing", "Carpentry"],
      barangayId: "bajada",
      area: { lat: 7.085, lng: 125.61 },
      radiusKm: 5,
      experience: "3–5 years",
      description: "Reliable home repair specialist in Davao City.",
    },
    bookings,
  };
}

describe("GAW Booking Acceptance & Job Lifecycle System", () => {
  it("runs the full validated worker-employer lifecycle from pending to completed with timestamps", () => {
    const t0 = 1_736_000_000_000;
    let state = makeSeededState();

    // 1. Worker accepts r-1 (Leaking kitchen sink, budget ₱900)
    const acceptRes = applyBookingLifecycleAction(state, "r-1", "accept", { now: t0 + 1_000 });
    expect(acceptRes.outcome.ok).toBe(true);
    expect(acceptRes.outcome.previousStatus).toBe("pending");
    expect(acceptRes.outcome.nextStatus).toBe("confirmed");
    expect(acceptRes.outcome.booking?.acceptedAt).toBe(t0 + 1_000);
    expect(acceptRes.outcome.booking?.agreedAt).toBe(t0 + 1_000);
    state = acceptRes.nextState;

    // 2. Worker marks work as started -> in_progress
    const startRes = applyBookingLifecycleAction(state, "r-1", "start", { now: t0 + 2_000 });
    expect(startRes.outcome.ok).toBe(true);
    expect(startRes.outcome.nextStatus).toBe("in_progress");
    expect(startRes.outcome.booking?.startedAt).toBe(t0 + 2_000);
    state = startRes.nextState;

    // 3. Cannot start r-1 twice or cancel after start
    expect(canCancelBooking("in_progress")).toBe(false);
    const cancelAfterStart = applyBookingLifecycleAction(state, "r-1", "cancel", {
      reason: "Changed my mind",
      now: t0 + 2_500,
    });
    expect(cancelAfterStart.outcome.ok).toBe(false);
    expect(cancelAfterStart.outcome.code).toBe("cannot_cancel_after_start");

    // 4. Worker finishes work -> awaiting_confirmation
    const finishRes = applyBookingLifecycleAction(state, "r-1", "finish", { now: t0 + 3_000 });
    expect(finishRes.outcome.ok).toBe(true);
    expect(finishRes.outcome.nextStatus).toBe("awaiting_confirmation");
    expect(finishRes.outcome.booking?.finishedAt).toBe(t0 + 3_000);
    state = finishRes.nextState;

    // 5. Employer confirms completion -> completed
    const confirmRes = applyBookingLifecycleAction(state, "r-1", "confirm", { now: t0 + 4_000 });
    expect(confirmRes.outcome.ok).toBe(true);
    expect(confirmRes.outcome.nextStatus).toBe("completed");
    expect(confirmRes.outcome.booking?.completedAt).toBe(t0 + 4_000);
    expect(confirmRes.outcome.booking?.status).toBe("completed");
  });

  it("validates quote-needed bookings (r-2) and locks quoted rate upon acceptance", () => {
    const t0 = 1_736_100_000_000;
    const state = makeSeededState();
    const quoteBooking = state.bookings.find((b) => b.id === "r-2")!;
    expect(quoteBooking.budget).toBeNull();

    // Missing quote should be rejected cleanly
    const missingQuote = validateBookingAcceptance(quoteBooking);
    expect(missingQuote.ok).toBe(false);
    expect(missingQuote.code).toBe("quote_required");

    const belowMinQuote = applyBookingLifecycleAction(state, "r-2", "accept", {
      quotedAmount: 50,
      now: t0,
    });
    expect(belowMinQuote.outcome.ok).toBe(false);
    expect(belowMinQuote.outcome.code).toBe("quote_required");

    // Valid quote >= ₱100 succeeds and locks budget + quotedAmount + agreedAt
    const accepted = applyBookingLifecycleAction(state, "r-2", "accept", {
      quotedAmount: 650,
      quoteNote: "Includes wall anchors and bracket leveling.",
      now: t0 + 500,
    });
    expect(accepted.outcome.ok).toBe(true);
    expect(accepted.outcome.booking?.status).toBe("confirmed");
    expect(accepted.outcome.booking?.budget).toBe(650);
    expect(accepted.outcome.booking?.quotedAmount).toBe(650);
    expect(accepted.outcome.booking?.quoteNote).toBe("Includes wall anchors and bracket leveling.");
    expect(accepted.outcome.booking?.agreedAt).toBe(t0 + 500);
    expect(agreedPriceAmount(accepted.outcome.booking!)).toBe(650);
  });

  it("detects active-job conflicts via findActiveJobConflict without mutating other jobs", () => {
    const state = makeSeededState();
    // Accept r-1 and move r-1 into in_progress; accept r-2 into confirmed
    const s1 = applyBookingLifecycleAction(state, "r-1", "accept").nextState;
    const s2 = applyBookingLifecycleAction(s1, "r-1", "start").nextState;
    const s3 = applyBookingLifecycleAction(s2, "r-2", "accept", { quotedAmount: 650 }).nextState;

    const conflict = findActiveJobConflict(s3.bookings, "r-2");
    expect(conflict).not.toBeNull();
    expect(conflict?.id).toBe("r-1");
    expect(conflict?.status).toBe("in_progress");

    // Checking conflict against the already-in-progress booking itself returns undefined
    expect(findActiveJobConflict(s3.bookings, "r-1")).toBeUndefined();
  });

  it("supports declining with reason and pre-start cancellation rules", () => {
    const t0 = 1_736_200_000_000;
    const state = makeSeededState();

    expect(canCancelBooking("pending")).toBe(true);
    expect(canCancelBooking("confirmed")).toBe(true);
    expect(canCancelBooking("in_progress")).toBe(false);
    expect(canCancelBooking("awaiting_confirmation")).toBe(false);
    expect(canCancelBooking("completed")).toBe(false);

    // Decline r-1 with reason
    const declined = applyBookingLifecycleAction(state, "r-1", "decline", {
      reason: "Already booked in another barangay at that time.",
      now: t0,
    });
    expect(declined.outcome.ok).toBe(true);
    expect(declined.outcome.nextStatus).toBe("declined");
    expect(declined.outcome.booking?.declineReason).toBe(
      "Already booked in another barangay at that time.",
    );
    expect(declined.outcome.booking?.declinedAt).toBe(t0);

    // Accept then cancel r-2 before start
    const acceptedR2 = applyBookingLifecycleAction(state, "r-2", "accept", {
      quotedAmount: 540,
      now: t0,
    }).nextState;
    const cancelledR2 = applyBookingLifecycleAction(acceptedR2, "r-2", "cancel", {
      reason: "Emergency family conflict before start.",
      actorRole: "worker",
      now: t0 + 1_000,
    });
    expect(cancelledR2.outcome.ok).toBe(true);
    expect(cancelledR2.outcome.nextStatus).toBe("cancelled");
    expect(cancelledR2.outcome.booking?.cancelReason).toBe(
      "Emergency family conflict before start.",
    );
    expect(cancelledR2.outcome.booking?.cancelledBy).toBe("worker");
    expect(cancelledR2.outcome.booking?.cancelledAt).toBe(t0 + 1_000);
  });

  it("holds completion when employer reports an issue and unblocks once resolved, then accepts optional review", () => {
    let state = makeSeededState();
    state = applyBookingLifecycleAction(state, "r-1", "accept").nextState;
    state = applyBookingLifecycleAction(state, "r-1", "start").nextState;
    state = applyBookingLifecycleAction(state, "r-1", "finish").nextState;

    const awaiting = state.bookings.find((b) => b.id === "r-1")!;
    expect(canReportIssue(awaiting)).toBe(true);
    expect(canConfirmCompletion(awaiting)).toBe(true);

    // Report an issue
    const reported = applyReportBookingIssue(state, "r-1", {
      reason: "Slow drip under trap nut",
      details: "Found slight dampness after testing full water flow.",
      reportedBy: "employer",
    });
    expect(reported.outcome.ok).toBe(true);
    expect(reported.outcome.booking?.issueReport?.status).toBe("open");
    state = reported.nextState;

    const held = state.bookings.find((b) => b.id === "r-1")!;
    expect(canConfirmCompletion(held)).toBe(false);
    expect(canReportIssue(held)).toBe(false);

    // Confirming while issue is open must be blocked with issue_open
    const blockedConfirm = applyBookingLifecycleAction(state, "r-1", "confirm");
    expect(blockedConfirm.outcome.ok).toBe(false);
    expect(blockedConfirm.outcome.code).toBe("issue_open");

    // Resolving the issue restores confirmation eligibility
    const resolved = applyResolveBookingIssue(
      state,
      "r-1",
      "Replaced washer and dried test towel confirmed clean.",
    );
    expect(resolved.outcome.ok).toBe(true);
    expect(resolved.outcome.booking?.issueReport?.status).toBe("resolved");
    expect(resolved.outcome.booking?.issueReport?.resolutionNote).toBe(
      "Replaced washer and dried test towel confirmed clean.",
    );
    state = resolved.nextState;

    const unblocked = state.bookings.find((b) => b.id === "r-1")!;
    expect(canConfirmCompletion(unblocked)).toBe(true);

    // Confirm completion and leave a 5-star review
    const completed = applyBookingLifecycleAction(state, "r-1", "confirm");
    expect(completed.outcome.ok).toBe(true);
    state = completed.nextState;

    const reviewed = applySubmitBookingReview(state, "r-1", {
      rating: 5,
      comment: "Prompt arrival and neat repair.",
      tags: ["On time", "Clean work"],
    });
    expect(reviewed.outcome.ok).toBe(true);
    expect(reviewed.outcome.booking?.review?.rating).toBe(5);
    expect(reviewed.outcome.booking?.review?.comment).toBe("Prompt arrival and neat repair.");
    expect(reviewed.outcome.booking?.review?.reviewerName).toBe("Juan Dela Cruz");
  });

  it("persists extended lifecycle fields cleanly across sanitizeLoadedState", () => {
    let state = makeSeededState();
    state = applyBookingLifecycleAction(state, "r-2", "accept", {
      quotedAmount: 720,
      quoteNote: "Two wall shelves",
      now: 1_736_300_000_000,
    }).nextState;
    state = applyBookingLifecycleAction(state, "r-2", "start", {
      now: 1_736_300_010_000,
    }).nextState;
    state = applyBookingLifecycleAction(state, "r-2", "finish", {
      now: 1_736_300_020_000,
    }).nextState;
    state = applyReportBookingIssue(state, "r-2", {
      reason: "Level check",
      details: "Right bracket slightly tilted",
      reportedBy: "employer",
    }).nextState;
    state = applyResolveBookingIssue(state, "r-2", "Shimmed and leveled").nextState;
    state = applyBookingLifecycleAction(state, "r-2", "confirm", {
      now: 1_736_300_030_000,
    }).nextState;
    state = applySubmitBookingReview(state, "r-2", {
      rating: 5,
      comment: "Solid shelves",
      tags: ["Friendly"],
    }).nextState;

    const roundTripped = sanitizeLoadedState(JSON.parse(JSON.stringify(state)), initialState);
    const saved = roundTripped.bookings.find((b) => b.id === "r-2")!;
    expect(saved.status).toBe("completed");
    expect(saved.budget).toBe(720);
    expect(saved.quotedAmount).toBe(720);
    expect(saved.quoteNote).toBe("Two wall shelves");
    expect(saved.acceptedAt).toBe(1_736_300_000_000);
    expect(saved.startedAt).toBe(1_736_300_010_000);
    expect(saved.finishedAt).toBe(1_736_300_020_000);
    expect(saved.completedAt).toBe(1_736_300_030_000);
    expect(saved.issueReport?.status).toBe("resolved");
    expect(saved.issueReport?.resolutionNote).toBe("Shimmed and leveled");
    expect(saved.review?.rating).toBe(5);
    expect(saved.review?.tags).toEqual(["Friendly"]);
  });

  it("prevents self-hiring persona confusion across worker and employer perspectives", () => {
    // Working-side incoming request r-1 should show client "Ana Reyes" vs worker Juan Dela Cruz
    const r1 = makeDemoBookings().find((b) => b.id === "r-1")!;
    const workerViewR1 = resolveBookingPersonas(r1, {
      currentUserName: "Juan Dela Cruz",
      workerSkill: "Home Repair",
      viewerRole: "worker",
    });
    expect(workerViewR1.employerName).toBe("Ana Reyes");
    expect(workerViewR1.workerName).toBe("Juan Dela Cruz");
    expect(workerViewR1.employerName).not.toBe(workerViewR1.workerName);

    const employerViewR1 = resolveBookingPersonas(r1, {
      currentUserName: "Juan Dela Cruz",
      workerSkill: "Home Repair",
      viewerRole: "employer",
    });
    expect(employerViewR1.employerName).toBe("Ana Reyes");
    expect(employerViewR1.workerName).toBe("Juan Dela Cruz (Home Repair)");
    expect(employerViewR1.isSyncedCrossSide).toBe(true);

    // Same-name guard when a legacy hiring booking has client.name == hired worker.name
    const legacySelf: Booking = {
      id: "b-legacy",
      side: "hiring",
      workerId: "w-ramon",
      client: { name: "Ramon Santos", initials: "RS" },
      service: "Leaky faucet",
      description: "Fix tap",
      date: "2026-11-20",
      time: "10:00",
      barangayId: "bajada",
      location: null,
      budget: 700,
      status: "pending",
      createdAt: Date.now(),
    };
    const safePersonas = resolveBookingPersonas(legacySelf, {
      currentUserName: "Ramon Santos",
      viewerRole: "employer",
    });
    expect(safePersonas.employerName).not.toBe(safePersonas.workerName);
  });

  it("renders timelines, Issue Under Review badge, TwoSidedDemoBridge, RequestDetail, MyJobsManager, BookingsList, WorkerHome, and MainNavigation across en-PH/fil-PH/ceb-PH", () => {
    expect(BOOKING_TIMELINE_STEPS).toEqual([
      "pending",
      "confirmed",
      "in_progress",
      "awaiting_confirmation",
      "completed",
    ]);
    expect(timelineStepIndex("pending")).toBe(0);
    expect(timelineStepIndex("confirmed")).toBe(1);
    expect(timelineStepIndex("in_progress")).toBe(2);
    expect(timelineStepIndex("awaiting_confirmation")).toBe(3);
    expect(timelineStepIndex("completed")).toBe(4);
    expect(timelineStepIndex("declined")).toBe(-1);

    let state = makeSeededState();
    state = applyBookingLifecycleAction(state, "r-1", "accept").nextState;
    state = applyBookingLifecycleAction(state, "r-1", "start").nextState;
    state = applyBookingLifecycleAction(state, "r-1", "finish").nextState;
    state = applyReportBookingIssue(state, "r-1", {
      reason: "Recheck seal",
      details: "Please tighten trap collar.",
      reportedBy: "employer",
    }).nextState;

    const r1Issue = state.bookings.find((b) => b.id === "r-1")!;

    // Issue Under Review badge & timeline in all 3 locales
    const badgeEn = renderWithProviders(<StatusBadge status={r1Issue.status} hasOpenIssue />);
    const badgeFil = renderWithProviders(<StatusBadge status={r1Issue.status} hasOpenIssue />, {
      locale: "fil-PH",
    });
    const badgeCeb = renderWithProviders(<StatusBadge status={r1Issue.status} hasOpenIssue />, {
      locale: "ceb-PH",
    });
    expect(badgeEn).toContain("Issue Under Review");
    expect(badgeFil).toContain("May Isyu · Sinusuri");
    expect(badgeCeb).toContain("Naay Isyu · Ginasusi");

    const fullTimelineHtml = renderWithProviders(
      <BookingTimeline booking={r1Issue} variant="full" />,
      { state },
    );
    expect(fullTimelineHtml).toContain("booking-timeline-r-1");
    expect(fullTimelineHtml).toContain("Completed");

    const bridgeHtml = renderWithProviders(
      <TwoSidedDemoBridge booking={r1Issue} currentRole="worker" />,
      { state },
    );
    expect(bridgeHtml).toContain("Switch to Employer Bookings");

    // Worker & Employer routes render key lifecycle controls & Demo Settlement copy cleanly
    const requestDetailHtml = renderWithProviders(<RequestDetail id="r-2" />, {
      state,
      path: "/requests/r-2",
    });
    expect(requestDetailHtml).toContain("Install shelves");
    expect(requestDetailHtml).toContain("Propose Quote &amp; Accept");

    const myJobsHtml = renderWithProviders(
      <MyJobsManager initialTab="in_progress" initialBookingId="r-1" />,
      { state, path: "/my-jobs" },
    );
    expect(myJobsHtml).toContain("Leaking kitchen sink");
    expect(myJobsHtml).toContain("Issue Under Review");

    const bookingsHtml = renderWithProviders(<BookingsList initialBookingId="r-1" />, {
      state: { ...state, mode: "hire" },
      path: "/bookings",
    });
    expect(bookingsHtml).toContain("Leaking kitchen sink");
    expect(bookingsHtml).toContain("Close Issue");
    expect(bookingsHtml).toContain("Issue Reported");
    expect(bookingsHtml).toContain("Leave Rating &amp; Review");

    const workerHomeHtml = renderWithProviders(<WorkerHome />, { state, path: "/work" });
    expect(workerHomeHtml).toContain("Leaking kitchen sink");
    expect(workerHomeHtml).toContain("Issue Under Review");

    // Existing employer bookings invariant on /hire remains intact
    expect(bookingsFor(state.bookings, "hiring").some((b) => b.id === "b-seed")).toBe(true);

    // Nav badge includes open issues on work mode
    const navWorkHtml = renderWithProviders(<MainNavigation mode="work" pathname="/work" />, {
      state,
    });
    expect(navWorkHtml).toContain("/my-jobs");
  });
});
