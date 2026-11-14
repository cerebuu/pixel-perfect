// One shared booking state machine for both sides of GAW (Hiring and Working).
import { DEMO_PERSONAS, WORKERS } from "./data";

export type BookingStatus =
  | "pending"
  | "confirmed"
  | "in_progress"
  | "awaiting_confirmation"
  | "completed"
  | "declined"
  | "cancelled";

export type BookingAction = "accept" | "decline" | "cancel" | "start" | "finish" | "confirm";

const TRANSITIONS: Record<BookingAction, { from: BookingStatus[]; to: BookingStatus }> = {
  accept: { from: ["pending"], to: "confirmed" },
  decline: { from: ["pending"], to: "declined" },
  cancel: { from: ["pending", "confirmed"], to: "cancelled" },
  start: { from: ["confirmed"], to: "in_progress" },
  finish: { from: ["in_progress"], to: "awaiting_confirmation" },
  confirm: { from: ["awaiting_confirmation"], to: "completed" },
};

/** Who is allowed to take each action. */
export const ACTION_ROLE: Record<BookingAction, "worker" | "employer"> = {
  accept: "worker",
  decline: "worker",
  start: "worker",
  finish: "worker",
  cancel: "employer",
  confirm: "employer",
};

export function nextStatus(status: BookingStatus, action: BookingAction): BookingStatus | null {
  const t = TRANSITIONS[action];
  return t.from.includes(status) ? t.to : null;
}

export function allowedActions(
  status: BookingStatus,
  role?: "worker" | "employer",
): BookingAction[] {
  return (Object.keys(TRANSITIONS) as BookingAction[]).filter(
    (a) => nextStatus(status, a) && (!role || ACTION_ROLE[a] === role),
  );
}

export function applyAction<T extends { id: string; status: BookingStatus }>(
  items: T[],
  id: string,
  action: BookingAction,
): T[] {
  return items.map((it) => {
    if (it.id !== id) return it;
    const to = nextStatus(it.status, action);
    return to ? { ...it, status: to } : it;
  });
}

export const STATUS_LABEL: Record<BookingStatus, string> = {
  pending: "Pending",
  confirmed: "Accepted",
  in_progress: "In progress",
  awaiting_confirmation: "Awaiting confirmation",
  completed: "Completed",
  declined: "Declined",
  cancelled: "Cancelled",
};

export type MyJobsTab =
  "applications" | "saved" | "pending" | "upcoming" | "in_progress" | "completed" | "cancelled";

export const MY_JOBS_TABS: { key: MyJobsTab; label: string }[] = [
  { key: "applications", label: "Applications" },
  { key: "saved", label: "Saved" },
  { key: "pending", label: "Pending Requests" },
  { key: "upcoming", label: "Upcoming" },
  { key: "in_progress", label: "In Progress" },
  { key: "completed", label: "Completed" },
  { key: "cancelled", label: "Cancelled" },
];

/** Which My Jobs tab a booking belongs to. */
export function tabForStatus(s: BookingStatus): Exclude<MyJobsTab, "applications" | "saved"> {
  switch (s) {
    case "pending":
      return "pending";
    case "confirmed":
      return "upcoming";
    case "in_progress":
    case "awaiting_confirmation":
      return "in_progress";
    case "completed":
      return "completed";
    default:
      return "cancelled";
  }
}

export type ApplicationStatus = "submitted" | "withdrawn" | "hired";

export function canWithdraw(s: ApplicationStatus) {
  return s === "submitted";
}

/* ---------- Extended Lifecycle Validation, Metadata & Personas ---------- */

export const BOOKING_TIMELINE_STEPS: readonly BookingStatus[] = [
  "pending",
  "confirmed",
  "in_progress",
  "awaiting_confirmation",
  "completed",
] as const;

export function timelineStepIndex(status: BookingStatus): number {
  return BOOKING_TIMELINE_STEPS.indexOf(status);
}

export interface BookingIssueReport {
  reason: string;
  details: string;
  reportedBy: "employer" | "worker";
  reportedAt: number;
  status: "open" | "resolved";
  resolvedAt?: number | undefined;
  resolutionNote?: string | undefined;
}

export interface BookingReview {
  rating: number;
  comment: string;
  tags: string[];
  createdAt: number;
  reviewerName: string;
}

export interface BookingLifecycleFields {
  acceptedAt?: number | undefined;
  startedAt?: number | undefined;
  finishedAt?: number | undefined;
  completedAt?: number | undefined;
  cancelledAt?: number | undefined;
  declinedAt?: number | undefined;
  agreedAt?: number | undefined;
  cancelledBy?: "worker" | "employer" | undefined;
  cancelReason?: string | undefined;
  declineReason?: string | undefined;
  quotedAmount?: number | undefined;
  quoteNote?: string | undefined;
  issueReport?: BookingIssueReport | undefined;
  review?: BookingReview | undefined;
}

export interface BookingRecordLike extends BookingLifecycleFields {
  id: string;
  side?: "hiring" | "working" | undefined;
  workerId?: string | undefined;
  client?: { name: string; initials: string } | undefined;
  service?: string | undefined;
  date?: string | undefined;
  time?: string | undefined;
  barangayId?: string | undefined;
  budget: number | null;
  rateText?: string | undefined;
  status: BookingStatus;
}

export interface BookingTransitionOptions {
  quotedAmount?: number | null | undefined;
  quoteNote?: string | undefined;
  reason?: string | undefined;
  actorRole?: "worker" | "employer" | undefined;
  now?: number | undefined;
}

export type BookingTransitionErrorCode =
  | "not_found"
  | "invalid_state"
  | "missing_details"
  | "quote_required"
  | "cannot_cancel_after_start"
  | "issue_open"
  | "verification_required";

export interface BookingTransitionOutcome<T = BookingRecordLike> {
  ok: boolean;
  code?: BookingTransitionErrorCode | undefined;
  error?: string | undefined;
  booking?: T | undefined;
  conflictBooking?: T | undefined;
  previousStatus?: BookingStatus | undefined;
  nextStatus?: BookingStatus | undefined;
}

export function agreedPriceAmount(
  b: Pick<BookingRecordLike, "budget" | "quotedAmount">,
): number | null {
  if (typeof b.quotedAmount === "number" && Number.isFinite(b.quotedAmount) && b.quotedAmount > 0) {
    return b.quotedAmount;
  }
  if (typeof b.budget === "number" && Number.isFinite(b.budget) && b.budget > 0) {
    return b.budget;
  }
  return null;
}

export function hasAgreedPrice(
  b: Pick<BookingRecordLike, "budget" | "quotedAmount" | "rateText">,
): boolean {
  if (agreedPriceAmount(b) !== null) return true;
  return typeof b.rateText === "string" && b.rateText.trim().length > 0;
}

export function canCancelBooking(status: BookingStatus): boolean {
  return status === "pending" || status === "confirmed";
}

export function canReportIssue(b: Pick<BookingRecordLike, "status" | "issueReport">): boolean {
  return (
    (b.status === "awaiting_confirmation" || b.status === "in_progress") &&
    b.issueReport?.status !== "open"
  );
}

export function canConfirmCompletion(
  b: Pick<BookingRecordLike, "status" | "issueReport">,
): boolean {
  return b.status === "awaiting_confirmation" && b.issueReport?.status !== "open";
}

export function validateBookingAcceptance(
  b: BookingRecordLike,
  options?: BookingTransitionOptions,
): BookingTransitionOutcome<BookingRecordLike> {
  if (b.status !== "pending") {
    return {
      ok: false,
      code: "invalid_state",
      error: "Only pending booking requests can be accepted.",
      previousStatus: b.status,
    };
  }
  if (!b.service?.trim() || !b.date?.trim() || !b.time?.trim() || !b.barangayId?.trim()) {
    return {
      ok: false,
      code: "missing_details",
      error: "This booking is missing schedule or service location details.",
      previousStatus: b.status,
    };
  }
  const hasQuoteOption = options?.quotedAmount !== undefined && options.quotedAmount !== null;
  if (hasQuoteOption) {
    if (!Number.isFinite(options.quotedAmount!) || options.quotedAmount! < 100) {
      return {
        ok: false,
        code: "quote_required",
        error: "Please enter a valid agreed rate of at least ₱100.",
        previousStatus: b.status,
      };
    }
    return { ok: true, previousStatus: b.status, nextStatus: "confirmed" };
  }
  if (!hasAgreedPrice(b)) {
    return {
      ok: false,
      code: "quote_required",
      error: "Please propose and lock in an agreed ₱ rate (minimum ₱100) before accepting.",
      previousStatus: b.status,
    };
  }
  return { ok: true, previousStatus: b.status, nextStatus: "confirmed" };
}

export function findActiveJobConflict<
  T extends Pick<BookingRecordLike, "id" | "side" | "workerId" | "status" | "service">,
>(bookings: T[], targetId: string): T | undefined {
  const target = bookings.find((b) => b.id === targetId);
  if (!target) return undefined;
  return bookings.find((b) => {
    if (b.id === targetId || b.status !== "in_progress") return false;
    if (target.workerId && b.workerId) {
      return b.workerId === target.workerId || b.side === "working";
    }
    return b.side === "working";
  });
}

export function transitionBookingRecord<T extends BookingRecordLike>(
  items: T[],
  id: string,
  action: BookingAction,
  options?: BookingTransitionOptions,
): { items: T[]; outcome: BookingTransitionOutcome<T> } {
  const target = items.find((it) => it.id === id);
  if (!target) {
    return {
      items,
      outcome: { ok: false, code: "not_found", error: "Booking record was not found." },
    };
  }

  if (action === "cancel" && !canCancelBooking(target.status)) {
    return {
      items,
      outcome: {
        ok: false,
        code: "cannot_cancel_after_start",
        error: "Bookings cannot be cancelled once work has started or completed.",
        previousStatus: target.status,
      },
    };
  }

  const to = nextStatus(target.status, action);
  if (!to) {
    return {
      items,
      outcome: {
        ok: false,
        code: "invalid_state",
        error: `Cannot perform "${action}" from "${target.status}" state.`,
        previousStatus: target.status,
      },
    };
  }

  if (action === "accept") {
    const check = validateBookingAcceptance(target, options);
    if (!check.ok) {
      return { items, outcome: check as BookingTransitionOutcome<T> };
    }
  }

  if (action === "confirm" && target.issueReport?.status === "open") {
    return {
      items,
      outcome: {
        ok: false,
        code: "issue_open",
        error: "Resolve the reported issue before confirming job completion.",
        previousStatus: target.status,
      },
    };
  }

  const ts = options?.now ?? Date.now();
  const conflictBooking = action === "start" ? findActiveJobConflict(items, id) : undefined;
  const trimmedReason = options?.reason?.trim();
  const trimmedQuoteNote = options?.quoteNote?.trim();

  let updatedRecord: T = target;
  const nextItems = items.map((it) => {
    if (it.id !== id) return it;
    const next: T = { ...it, status: to };

    if (action === "accept") {
      next.acceptedAt = ts;
      if (
        typeof options?.quotedAmount === "number" &&
        Number.isFinite(options.quotedAmount) &&
        options.quotedAmount >= 100
      ) {
        const rounded = Math.round(options.quotedAmount);
        next.budget = rounded;
        next.quotedAmount = rounded;
        next.agreedAt = ts;
      } else if (hasAgreedPrice(it)) {
        next.agreedAt = ts;
      }
      if (trimmedQuoteNote) {
        next.quoteNote = trimmedQuoteNote;
      }
    } else if (action === "decline") {
      next.declinedAt = ts;
      if (trimmedReason) {
        next.declineReason = trimmedReason;
      }
    } else if (action === "cancel") {
      next.cancelledAt = ts;
      next.cancelledBy = options?.actorRole ?? "employer";
      if (trimmedReason) {
        next.cancelReason = trimmedReason;
      }
    } else if (action === "start") {
      next.startedAt = ts;
    } else if (action === "finish") {
      next.finishedAt = ts;
    } else if (action === "confirm") {
      next.completedAt = ts;
    }

    updatedRecord = next;
    return next;
  });

  return {
    items: nextItems,
    outcome: {
      ok: true,
      booking: updatedRecord,
      ...(conflictBooking ? { conflictBooking } : {}),
      previousStatus: target.status,
      nextStatus: to,
    },
  };
}

export function applyIssueReportToRecord<T extends BookingRecordLike>(
  items: T[],
  id: string,
  input: { reason: string; details: string; reportedBy?: "employer" | "worker"; now?: number },
): { items: T[]; outcome: BookingTransitionOutcome<T> } {
  const target = items.find((it) => it.id === id);
  if (!target) {
    return {
      items,
      outcome: { ok: false, code: "not_found", error: "Booking record was not found." },
    };
  }
  if (target.status !== "awaiting_confirmation" && target.status !== "in_progress") {
    return {
      items,
      outcome: {
        ok: false,
        code: "invalid_state",
        error: "Issues can only be reported on active or awaiting-confirmation bookings.",
        previousStatus: target.status,
      },
    };
  }

  const ts = input.now ?? Date.now();
  const reason = input.reason.trim() || "Work scope or quality issue";
  const details = input.details.trim();
  if (details.length < 8) {
    return {
      items,
      outcome: {
        ok: false,
        code: "missing_details",
        error: "Please describe the issue (at least 8 characters).",
        previousStatus: target.status,
      },
    };
  }

  let updatedRecord: T = target;
  const nextItems = items.map((it) => {
    if (it.id !== id) return it;
    const next: T = {
      ...it,
      status: "awaiting_confirmation",
      issueReport: {
        reason,
        details,
        reportedBy: input.reportedBy ?? "employer",
        reportedAt: ts,
        status: "open",
      },
    };
    updatedRecord = next;
    return next;
  });

  return {
    items: nextItems,
    outcome: {
      ok: true,
      booking: updatedRecord,
      previousStatus: target.status,
      nextStatus: "awaiting_confirmation",
    },
  };
}

export function resolveBookingIssueOnRecord<T extends BookingRecordLike>(
  items: T[],
  id: string,
  resolutionNote?: string,
  now?: number,
): { items: T[]; outcome: BookingTransitionOutcome<T> } {
  const target = items.find((it) => it.id === id);
  if (!target) {
    return {
      items,
      outcome: { ok: false, code: "not_found", error: "Booking record was not found." },
    };
  }
  if (!target.issueReport || target.issueReport.status !== "open") {
    return {
      items,
      outcome: {
        ok: false,
        code: "invalid_state",
        error: "There is no open issue to resolve on this booking.",
        previousStatus: target.status,
      },
    };
  }

  const ts = now ?? Date.now();
  const trimmedNote = resolutionNote?.trim();
  let updatedRecord: T = target;
  const nextItems = items.map((it) => {
    if (it.id !== id || !it.issueReport) return it;
    const next: T = {
      ...it,
      finishedAt: it.finishedAt ?? ts,
      issueReport: {
        ...it.issueReport,
        status: "resolved",
        resolvedAt: ts,
        ...(trimmedNote ? { resolutionNote: trimmedNote } : {}),
      },
    };
    updatedRecord = next;
    return next;
  });

  return {
    items: nextItems,
    outcome: {
      ok: true,
      booking: updatedRecord,
      previousStatus: target.status,
      nextStatus: target.status,
    },
  };
}

export function applyBookingReviewToRecord<T extends BookingRecordLike>(
  items: T[],
  id: string,
  input: { rating: number; comment: string; tags?: string[]; reviewerName?: string; now?: number },
): { items: T[]; outcome: BookingTransitionOutcome<T> } {
  const target = items.find((it) => it.id === id);
  if (!target) {
    return {
      items,
      outcome: { ok: false, code: "not_found", error: "Booking record was not found." },
    };
  }
  if (target.status !== "completed") {
    return {
      items,
      outcome: {
        ok: false,
        code: "invalid_state",
        error: "Reviews can only be submitted after employer completion confirmation.",
        previousStatus: target.status,
      },
    };
  }

  const safeRating = Math.min(5, Math.max(1, Math.round(input.rating)));
  const ts = input.now ?? Date.now();
  let updatedRecord: T = target;
  const nextItems = items.map((it) => {
    if (it.id !== id) return it;
    const next: T = {
      ...it,
      review: {
        rating: safeRating,
        comment: input.comment.trim(),
        tags: (input.tags ?? []).filter((t) => t.trim().length > 0).slice(0, 4),
        createdAt: ts,
        reviewerName: input.reviewerName?.trim() || "Davao Employer",
      },
    };
    updatedRecord = next;
    return next;
  });

  return {
    items: nextItems,
    outcome: {
      ok: true,
      booking: updatedRecord,
      previousStatus: target.status,
      nextStatus: target.status,
    },
  };
}

export interface BookingPersonaResolution {
  workerId: string;
  workerName: string;
  workerInitials: string;
  workerSkill: string;
  workerIsLinkable: boolean;
  employerName: string;
  employerInitials: string;
  isSyncedCrossSide: boolean;
}

function stablePersonaIndex(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return hash % DEMO_PERSONAS.length;
}

/**
 * Resolves clear, distinct Worker and Employer identities for any booking regardless of
 * whether the user created it in Hiring mode or received it in Working mode, preventing
 * "self-hiring" confusion where the same name shows as both parties.
 */
export function resolveBookingPersonas(
  b: Pick<BookingRecordLike, "id" | "side" | "workerId" | "client" | "service">,
  opts: {
    currentUserName?: string | undefined;
    workerSkill?: string | undefined;
    viewerRole: "worker" | "employer";
  },
): BookingPersonaResolution {
  const userName = opts.currentUserName?.trim() || "You";
  const userInitials = userName
    .split(" ")
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  if (b.side === "hiring") {
    const matchedWorker = WORKERS.find((w) => w.id === b.workerId) ?? WORKERS[0]!;
    const fallbackResident = DEMO_PERSONAS[stablePersonaIndex(b.id)] ?? DEMO_PERSONAS[0]!;
    const rawClientName = b.client?.name?.trim();
    const isSelfClient = !rawClientName || rawClientName === userName;
    const employerName =
      opts.viewerRole === "worker" && isSelfClient
        ? fallbackResident.name
        : rawClientName || userName;
    const employerInitials =
      opts.viewerRole === "worker" && isSelfClient
        ? fallbackResident.initials
        : b.client?.initials || userInitials || "EM";

    return {
      workerId: matchedWorker.id,
      workerName: matchedWorker.name,
      workerInitials: matchedWorker.initials,
      workerSkill: matchedWorker.skill,
      workerIsLinkable: WORKERS.some((w) => w.id === b.workerId),
      employerName,
      employerInitials,
      isSyncedCrossSide: opts.viewerRole === "worker",
    };
  }

  // b.side === "working"
  const rawEmployerName = b.client?.name?.trim();
  const isSelfEmployer = rawEmployerName === userName;
  const fallbackResident = DEMO_PERSONAS[stablePersonaIndex(b.id)] ?? DEMO_PERSONAS[0]!;
  const employerName = isSelfEmployer
    ? fallbackResident.name
    : rawEmployerName || fallbackResident.name;
  const employerInitials = isSelfEmployer
    ? fallbackResident.initials
    : b.client?.initials || fallbackResident.initials;

  return {
    workerId: b.workerId || "me",
    workerName:
      opts.viewerRole === "employer"
        ? `${userName} (${opts.workerSkill ?? "Worker Profile"})`
        : userName,
    workerInitials: userInitials || "WK",
    workerSkill: opts.workerSkill ?? b.service ?? "General Service",
    workerIsLinkable: false,
    employerName,
    employerInitials,
    isSyncedCrossSide: opts.viewerRole === "employer",
  };
}
