import { useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowLeftRight,
  CalendarDays,
  Check,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  MapPin,
  MessageSquareWarning,
  Play,
  ShieldAlert,
  Sparkles,
  Star,
  Wallet,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { formatTime } from "@/components/gaw/BookingForm";
import { Avatar, StatusBadge } from "@/components/gaw/primitives";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  agreedPriceAmount,
  BOOKING_TIMELINE_STEPS,
  canCancelBooking,
  findActiveJobConflict,
  hasAgreedPrice,
  resolveBookingPersonas,
  timelineStepIndex,
  type BookingAction,
  type BookingStatus,
  type BookingTransitionOptions,
} from "@/lib/gaw/bookings";
import { barangayName } from "@/lib/gaw/data";
import { DAILY_WAGE_REFERENCE, HOURLY_WAGE_REFERENCE } from "@/lib/gaw/domain";
import { useI18n } from "@/lib/gaw/i18n";
import { formatPeso, useGaw, type Booking } from "@/lib/gaw/store";
import { cn } from "@/lib/utils";

/* ---------- Formatting & Rate Helpers ---------- */

export function useBookingDisplay() {
  const { locale, tx } = useI18n();

  const formatRate = (b: Pick<Booking, "budget" | "quotedAmount" | "rateText">) => {
    const agreed = agreedPriceAmount(b);
    if (b.quotedAmount && b.quotedAmount > 0) {
      return formatPeso(b.quotedAmount);
    }
    if (b.rateText && b.rateText.trim().length > 0) {
      return b.rateText;
    }
    if (agreed !== null) {
      return formatPeso(agreed);
    }
    return tx("Quote requested", "Humihingi ng presyo", "Nangayo og presyo");
  };

  const formatDateTime = (ts?: number) => {
    if (!ts || !Number.isFinite(ts)) return "";
    return new Intl.DateTimeFormat([locale, "en-PH"], {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(ts);
  };

  const formatBookingDate = (dateIso: string, time24: string) => {
    const parsed = new Date(`${dateIso}T00:00`);
    const dateLabel = Number.isNaN(parsed.getTime())
      ? dateIso
      : parsed.toLocaleDateString([locale, "fil-PH", "en-PH"], {
          month: "short",
          day: "numeric",
          year: "numeric",
        });
    return `${dateLabel} · ${formatTime(time24)}`;
  };

  const stepLabel = (step: BookingStatus, short = false): string => {
    switch (step) {
      case "pending":
        return tx("Pending", "Naka-pending", "Naka-pending");
      case "confirmed":
        return tx("Confirmed", "Kumpirmado", "Kumpirmado");
      case "in_progress":
        return tx("In Progress", "Ginagawa Na", "Ginahimo Na");
      case "awaiting_confirmation":
        return short
          ? tx("To Confirm", "Kumpirmahin", "Kumpirmaha")
          : tx("Awaiting Confirmation", "Naghihintay ng Kumpirma", "Naghulat sa Kumpirma");
      case "completed":
        return tx("Completed", "Tapos Na", "Nahuman Na");
      case "declined":
        return tx("Declined", "Tinanggihan", "Gibalibaran");
      case "cancelled":
        return tx("Cancelled", "Kinansela", "Gikansela");
    }
  };

  return { formatRate, formatDateTime, formatBookingDate, stepLabel };
}

/* ---------- Progress Timeline ---------- */

export function BookingTimeline({
  booking,
  variant = "compact",
  className,
}: {
  booking: Booking;
  variant?: "compact" | "full";
  className?: string;
}) {
  const { tx } = useI18n();
  const { formatDateTime, stepLabel } = useBookingDisplay();

  const hasOpenIssue = booking.issueReport?.status === "open";
  const isTerminalClosed = booking.status === "declined" || booking.status === "cancelled";

  if (isTerminalClosed) {
    const reasonText = booking.status === "declined" ? booking.declineReason : booking.cancelReason;
    const closedTs = booking.status === "declined" ? booking.declinedAt : booking.cancelledAt;
    return (
      <div
        data-testid={`booking-timeline-${booking.id}`}
        className={cn(
          "rounded-xl border px-3 py-2.5 text-xs",
          booking.status === "declined"
            ? "border-status-declined/30 bg-status-declined-bg/45 text-foreground"
            : "border-border bg-muted/60 text-muted-foreground",
          className,
        )}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 font-bold text-foreground">
            <XCircle className="size-3.5 text-status-declined" aria-hidden />
            {booking.status === "declined"
              ? tx(
                  "Request Declined by Worker",
                  "Tinanggihan ng Manggagawa",
                  "Gibalibaran sa Trabahante",
                )
              : tx(
                  `Booking Cancelled${booking.cancelledBy === "worker" ? " by Worker" : " Before Start"}`,
                  "Kinansela ang Booking Bago Magsimula",
                  "Gikansela ang Booking Sa Wala Pa Magsugod",
                )}
          </span>
          {closedTs && <span>{formatDateTime(closedTs)}</span>}
        </div>
        {reasonText && <p className="mt-1 text-foreground/85">{reasonText}</p>}
      </div>
    );
  }

  const currentIdx = timelineStepIndex(booking.status);
  const nextStep =
    currentIdx >= 0 && currentIdx < BOOKING_TIMELINE_STEPS.length - 1
      ? BOOKING_TIMELINE_STEPS[currentIdx + 1]
      : null;

  if (variant === "compact") {
    return (
      <div data-testid={`booking-timeline-${booking.id}`} className={cn("space-y-1.5", className)}>
        <div
          className="grid grid-cols-5 gap-1.5"
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={5}
          aria-valuenow={Math.max(1, currentIdx + 1)}
          aria-label={tx(
            "Booking lifecycle progress",
            "Progreso ng booking",
            "Progreso sa booking",
          )}
        >
          {BOOKING_TIMELINE_STEPS.map((step, i) => {
            const completed = i < currentIdx || booking.status === "completed";
            const current = i === currentIdx && booking.status !== "completed";
            return (
              <span
                key={step}
                className={cn(
                  "h-1.5 rounded-full transition-colors",
                  hasOpenIssue && current
                    ? "bg-status-declined"
                    : completed
                      ? "bg-primary"
                      : current
                        ? step === "pending" || step === "awaiting_confirmation"
                          ? "bg-status-pending"
                          : "bg-primary"
                        : "bg-muted",
                )}
              />
            );
          })}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
          <span
            className={cn(
              "font-semibold",
              hasOpenIssue ? "text-status-declined" : "text-foreground",
            )}
          >
            {hasOpenIssue
              ? tx(
                  "Step 4 of 5 · Issue Under Review",
                  "Hakbang 4 sa 5 · May Isyu sa Trabaho",
                  "Lakang 4 sa 5 · Naay Isyu nga Ginasusi",
                )
              : tx(
                  `Step ${currentIdx + 1} of 5 · ${stepLabel(booking.status)}`,
                  `Hakbang ${currentIdx + 1} sa 5 · ${stepLabel(booking.status)}`,
                  `Lakang ${currentIdx + 1} sa 5 · ${stepLabel(booking.status)}`,
                )}
          </span>
          <span className="text-muted-foreground">
            {hasOpenIssue
              ? tx(
                  "Resolve issue to confirm",
                  "Ayusin ang isyu bago kumpirmahin",
                  "Sulbara ang isyu una kumpirmahon",
                )
              : nextStep
                ? `${tx("Next:", "Susunod:", "Sunod:")} ${stepLabel(nextStep, true)}`
                : tx("Service complete", "Kumpleto ang serbisyo", "Kumpleto ang serbisyo")}
          </span>
        </div>
      </div>
    );
  }

  const timestampForStep = (step: BookingStatus): number | undefined => {
    switch (step) {
      case "pending":
        return booking.createdAt;
      case "confirmed":
        return booking.acceptedAt;
      case "in_progress":
        return booking.startedAt;
      case "awaiting_confirmation":
        return booking.finishedAt;
      case "completed":
        return booking.completedAt;
      default:
        return undefined;
    }
  };

  return (
    <div data-testid={`booking-timeline-${booking.id}`} className={cn("space-y-2.5", className)}>
      <ol
        className="grid grid-cols-5 gap-2"
        aria-label={tx("Booking progress stages", "Mga yugto ng booking", "Mga yugto sa booking")}
      >
        {BOOKING_TIMELINE_STEPS.map((step, i) => {
          const isCompletedStep = i < currentIdx || booking.status === "completed";
          const isCurrent = i === currentIdx && booking.status !== "completed";
          const stepTs = timestampForStep(step);
          const isWaitingAmber =
            isCurrent && (step === "pending" || step === "awaiting_confirmation") && !hasOpenIssue;

          return (
            <li
              key={step}
              aria-current={isCurrent ? "step" : undefined}
              className="flex flex-col items-center text-center"
            >
              <div className="relative flex w-full items-center justify-center">
                {i > 0 && (
                  <span
                    aria-hidden
                    className={cn(
                      "absolute right-1/2 top-1/2 -z-0 h-0.5 w-full -translate-y-1/2",
                      i <= currentIdx ? "bg-primary" : "bg-border",
                    )}
                  />
                )}
                <span
                  className={cn(
                    "relative z-10 grid size-7 place-items-center rounded-full text-xs font-bold transition-colors",
                    hasOpenIssue && isCurrent
                      ? "bg-status-declined-bg text-status-declined ring-2 ring-status-declined/40"
                      : isCompletedStep
                        ? "bg-primary text-primary-foreground"
                        : isWaitingAmber
                          ? "bg-status-pending-bg text-status-pending ring-2 ring-status-pending/40"
                          : isCurrent
                            ? "bg-status-confirmed-bg text-status-confirmed ring-2 ring-primary/40"
                            : "border border-border bg-muted text-muted-foreground",
                  )}
                >
                  {isCompletedStep ? (
                    <Check className="size-3.5" aria-hidden />
                  ) : hasOpenIssue && isCurrent ? (
                    <AlertTriangle className="size-3.5" aria-hidden />
                  ) : (
                    i + 1
                  )}
                </span>
              </div>
              <span
                className={cn(
                  "mt-1.5 text-[11px] leading-tight",
                  hasOpenIssue && isCurrent
                    ? "font-bold text-status-declined"
                    : isCurrent
                      ? "font-bold text-foreground"
                      : isCompletedStep
                        ? "font-semibold text-foreground"
                        : "font-medium text-muted-foreground",
                )}
              >
                {hasOpenIssue && isCurrent
                  ? tx("Issue Review", "May Isyu", "Naay Isyu")
                  : stepLabel(step, true)}
              </span>
              {stepTs && (isCompletedStep || isCurrent) && (
                <span className="mt-0.5 hidden text-[10px] text-muted-foreground sm:block">
                  {formatDateTime(stepTs)}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/* ---------- Issue Banner, Review Display & Demo Settlement Notice ---------- */

export function BookingIssueBanner({ booking }: { booking: Booking }) {
  const { tx } = useI18n();
  const { formatDateTime } = useBookingDisplay();
  const issue = booking.issueReport;
  if (!issue) return null;

  const isOpen = issue.status === "open";
  return (
    <div
      role="status"
      data-testid={`booking-issue-${booking.id}`}
      className={cn(
        "rounded-2xl border p-3.5 text-xs",
        isOpen
          ? "border-status-declined/40 bg-status-declined-bg/50 text-foreground"
          : "border-primary/30 bg-secondary/45 text-foreground",
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 font-bold">
          {isOpen ? (
            <ShieldAlert className="size-4 text-status-declined" aria-hidden />
          ) : (
            <CheckCircle2 className="size-4 text-primary" aria-hidden />
          )}
          {isOpen
            ? tx(
                `Issue Reported (${issue.reason}) · Completion Paused`,
                `May Naiulat na Isyu (${issue.reason}) · Nakahinto ang Pagtatapos`,
                `Naay Gi-report nga Isyu (${issue.reason}) · Gipahunong ang Paghuman`,
              )
            : tx(
                `Issue Resolved (${issue.reason})`,
                `Naayos na ang Isyu (${issue.reason})`,
                `Nasulbad na ang Isyu (${issue.reason})`,
              )}
        </span>
        <span className="text-muted-foreground">
          {formatDateTime(isOpen ? issue.reportedAt : (issue.resolvedAt ?? issue.reportedAt))}
        </span>
      </div>
      <p className="mt-1.5 text-foreground/90">{issue.details}</p>
      {issue.resolutionNote && (
        <p className="mt-1.5 rounded-lg bg-background/70 px-2.5 py-1.5 font-medium text-foreground">
          {tx("Resolution note:", "Paliwanag:", "Nota sa pagsulbad:")} {issue.resolutionNote}
        </p>
      )}
    </div>
  );
}

export function BookingReviewDisplay({
  booking,
  onRequestReview,
  canRate,
}: {
  booking: Booking;
  onRequestReview?: (() => void) | undefined;
  canRate?: boolean | undefined;
}) {
  const { tx } = useI18n();
  const { formatDateTime } = useBookingDisplay();

  if (booking.status !== "completed") return null;

  if (!booking.review) {
    if (!canRate || !onRequestReview) return null;
    return (
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-gold/40 bg-gold-soft/45 px-3.5 py-2.5 text-xs dark:border-gold/30 dark:bg-gold/10">
        <span className="font-semibold text-foreground">
          {tx(
            "Share optional feedback to help other Davao households.",
            "Magbigay ng opsyonal na review para makatulong sa iba.",
            "Pagbilin og opsyonal nga review aron makatabang sa uban.",
          )}
        </span>
        <Button type="button" size="sm" variant="gold" onClick={onRequestReview}>
          <Star className="size-3.5" aria-hidden />
          {tx("Leave Rating & Review", "Mag-iwan ng Rating", "Pagbilin og Rating")}
        </Button>
      </div>
    );
  }

  return (
    <div
      data-testid={`booking-review-${booking.id}`}
      className="rounded-xl border border-gold/40 bg-gold-soft/40 p-3.5 text-xs dark:border-gold/30 dark:bg-gold/10"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 font-bold text-foreground">
          <span className="inline-flex items-center gap-0.5 text-gold-foreground dark:text-gold">
            {Array.from({ length: 5 }, (_, idx) => (
              <Star
                key={idx}
                className={cn("size-3.5", idx < booking.review!.rating && "fill-current")}
                aria-hidden
              />
            ))}
          </span>
          <span>
            {booking.review.rating}/5 · {booking.review.reviewerName}
          </span>
        </div>
        <span className="text-muted-foreground">{formatDateTime(booking.review.createdAt)}</span>
      </div>
      {booking.review.tags.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {booking.review.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-background/80 px-2 py-0.5 text-[11px] font-semibold text-foreground"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
      {booking.review.comment && (
        <p className="mt-1.5 text-foreground/90">“{booking.review.comment}”</p>
      )}
    </div>
  );
}

export function DemoSettlementNotice({ booking }: { booking: Booking }) {
  const { tx } = useI18n();
  const { formatRate } = useBookingDisplay();

  const isOpenIssue = booking.issueReport?.status === "open";
  const isCompleted = booking.status === "completed";
  const isClosed = booking.status === "cancelled" || booking.status === "declined";

  return (
    <div
      data-testid={`demo-settlement-${booking.id}`}
      className="rounded-xl border border-dashed border-border bg-muted/45 px-3.5 py-2.5 text-xs"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 font-bold text-foreground">
          <Wallet className="size-3.5 text-primary" aria-hidden />
          {tx("Demo Payment & Settlement Status", "Estado ng Demo Bayad", "Estado sa Demo Bayad")}
        </span>
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-[11px] font-bold",
            isOpenIssue
              ? "bg-status-declined-bg text-status-declined"
              : isCompleted
                ? "bg-status-confirmed-bg text-status-confirmed"
                : "bg-muted text-muted-foreground",
          )}
        >
          {isOpenIssue
            ? tx("On Hold (Issue Open)", "Nakahinto (May Isyu)", "Gipahunong (Naay Isyu)")
            : isCompleted
              ? tx(
                  "Ready for Direct Cash / Demo Payout",
                  "Handa sa Direktang Bayad (Demo)",
                  "Andam sa Direktang Bayad (Demo)",
                )
              : isClosed
                ? tx("No Settlement", "Walang Singilan", "Walay Bayranan")
                : tx(
                    "Pending Job Completion",
                    "Magbabayad Pagkatapos ng Trabaho",
                    "Bayad Human sa Trabaho",
                  )}
        </span>
      </div>
      <p className="mt-1 text-muted-foreground">
        {tx(
          `Agreed rate: ${formatRate(booking)}. Direct peer-to-peer cash or local e-wallet applies after employer confirmation — no real money is processed in this GAW prototype.`,
          `Napagkasunduang halaga: ${formatRate(booking)}. Direktang bayad lang pagkatapos kumpirmahin — walang totoong pera sa GAW prototype na ito.`,
          `Gikasabotang kantidad: ${formatRate(booking)}. Direktang bayad human makumpirma — walay tinuod nga kwarta ang maproseso niining GAW prototype.`,
        )}
      </p>
    </div>
  );
}

/* ---------- Separated Two-Sided Demo Bridge ---------- */

export function TwoSidedDemoBridge({
  booking,
  currentRole,
  counterpartyAction,
}: {
  booking: Booking;
  currentRole: "worker" | "employer";
  counterpartyAction?: ReactNode;
}) {
  const { tx } = useI18n();
  const { setMode } = useGaw();

  const targetPath = currentRole === "worker" ? "/bookings" : "/my-jobs";
  const targetMode = currentRole === "worker" ? "hire" : "work";

  return (
    <div
      data-testid={`demo-bridge-${booking.id}`}
      className="flex flex-wrap items-center justify-between gap-2.5 rounded-xl border border-dashed border-gold/45 bg-gold-soft/35 px-3.5 py-2.5 text-xs dark:border-gold/30 dark:bg-gold/10"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1 rounded-full bg-gold px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-gold-foreground">
          <Sparkles className="size-3" aria-hidden />
          {tx("Demo Bridge", "Demo Bridge", "Demo Bridge")}
        </span>
        <span className="text-muted-foreground">
          {currentRole === "worker"
            ? tx(
                "Inspect or simulate the Employer perspective for this shared booking:",
                "Tingnan o i-simulate ang panig ng Nag-book:",
                "Tan-awa o i-simulate ang bahin sa Nag-book:",
              )
            : tx(
                "Inspect or simulate the Worker perspective for this shared booking:",
                "Tingnan o i-simulate ang panig ng Manggagawa:",
                "Tan-awa o i-simulate ang bahin sa Trabahante:",
              )}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {counterpartyAction}
        <Button asChild size="sm" variant="outline" onClick={() => setMode(targetMode)}>
          <Link
            to={targetPath}
            search={
              targetPath === "/my-jobs"
                ? { bookingId: booking.id }
                : { tab: "bookings", bookingId: booking.id }
            }
          >
            <ArrowLeftRight className="size-3.5" aria-hidden />
            {currentRole === "worker"
              ? tx(
                  "Switch to Employer Bookings",
                  "Lumipat sa Employer Bookings",
                  "Balhin sa Employer Bookings",
                )
              : tx(
                  "Switch to Worker My Jobs",
                  "Lumipat sa Worker My Jobs",
                  "Balhin sa Worker My Jobs",
                )}
          </Link>
        </Button>
      </div>
    </div>
  );
}

/* ---------- Modal Intent & Interactive Lifecycle Dialogs ---------- */

export type LifecycleDialogMode =
  | "accept"
  | "accepted_success"
  | "decline"
  | "cancel"
  | "start"
  | "finish"
  | "confirm"
  | "completed_success"
  | "report_issue"
  | "resolve_issue"
  | "review";

export interface LifecycleDialogState {
  mode: LifecycleDialogMode;
  bookingId: string;
  actorRole: "worker" | "employer";
}

export function BookingLifecycleDialogs({
  dialog,
  onClose,
  onNavigateViewJob,
  onNavigateMyJobs,
  onTransitionSuccess,
}: {
  dialog: LifecycleDialogState | null;
  onClose: () => void;
  onNavigateViewJob?: ((b: Booking) => void) | undefined;
  onNavigateMyJobs?:
    | ((b: Booking, targetTab: "upcoming" | "in_progress" | "completed" | "cancelled") => void)
    | undefined;
  onTransitionSuccess?: ((b: Booking, mode: LifecycleDialogMode) => void) | undefined;
}) {
  const { tx } = useI18n();
  const navigate = useNavigate();
  const {
    account,
    bookings,
    workerProfile,
    bookingAction,
    reportBookingIssue,
    resolveBookingIssue,
    submitBookingReview,
  } = useGaw();
  const { formatRate, formatBookingDate } = useBookingDisplay();

  const [mode, setMode] = useState<LifecycleDialogMode | null>(dialog?.mode ?? null);
  const [quoteInput, setQuoteInput] = useState("");
  const [quoteNote, setQuoteNote] = useState("");
  const [reason, setReason] = useState("");
  const [issueReason, setIssueReason] = useState("Incomplete work");
  const [issueDetails, setIssueDetails] = useState("");
  const [resolutionNote, setResolutionNote] = useState("");
  const [rating, setRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewTags, setReviewTags] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const booking = dialog ? (bookings.find((b) => b.id === dialog.bookingId) ?? null) : null;

  useEffect(() => {
    if (!dialog || !booking) {
      setMode(null);
      return;
    }
    setMode(dialog.mode);
    setError(null);
    const existingPrice = agreedPriceAmount(booking);
    setQuoteInput(existingPrice ? String(existingPrice) : "");
    setQuoteNote(booking.quoteNote ?? "");
    setReason("");
    setIssueReason("Incomplete work");
    setIssueDetails("");
    setResolutionNote("");
    setRating(booking.review?.rating ?? 5);
    setReviewComment(booking.review?.comment ?? "");
    setReviewTags(booking.review?.tags ?? []);
  }, [dialog?.bookingId, dialog?.mode]);

  if (!dialog || !booking || !mode) return null;

  const personas = resolveBookingPersonas(booking, {
    currentUserName: account?.name,
    workerSkill: workerProfile?.skill,
    viewerRole: dialog.actorRole === "employer" ? "employer" : "worker",
  });

  const conflictBooking =
    mode === "start" ? findActiveJobConflict(bookings, booking.id) : undefined;
  const needsQuoteInput = !hasAgreedPrice(booking);
  const locDisplay = booking.location?.label ?? barangayName(booking.barangayId);

  const runAction = (action: BookingAction, options?: BookingTransitionOptions) => {
    const res = bookingAction(booking.id, action, options);
    if (!res.ok) {
      setError(res.error ?? "Action could not be completed.");
      return null;
    }
    return res.booking ?? booking;
  };

  const handleConfirmAccept = () => {
    const parsedQuote = quoteInput.trim() ? Number(quoteInput) : undefined;
    if (needsQuoteInput || quoteInput.trim().length > 0) {
      if (parsedQuote === undefined || !Number.isFinite(parsedQuote) || parsedQuote < 100) {
        setError(
          tx(
            "Please enter a valid agreed rate of at least ₱100 before accepting.",
            "Maglagay ng tamang halaga na hindi bababa sa ₱100 bago tanggapin.",
            "Palihug pagbutang og sakto nga presyo nga labing menos ₱100 una modawat.",
          ),
        );
        return;
      }
    }

    const updated = runAction("accept", {
      quotedAmount: needsQuoteInput ? parsedQuote : undefined,
      quoteNote: quoteNote.trim() || undefined,
      actorRole: "worker",
    });
    if (!updated) return;

    toast.success(
      tx(
        `Booking confirmed for “${updated.service}”`,
        `Kumpirmado ang booking para sa “${updated.service}”`,
        `Nakumpirma ang booking alang sa “${updated.service}”`,
      ),
    );
    setError(null);
    setMode("accepted_success");
    onTransitionSuccess?.(updated, "accept");
  };

  const handleConfirmDecline = () => {
    const updated = runAction("decline", {
      reason:
        reason.trim() ||
        tx(
          "Worker unavailable for the requested schedule",
          "Hindi bakante sa napiling iskedyul",
          "Dili bakante sa napili nga iskedyul",
        ),
      actorRole: "worker",
    });
    if (!updated) return;
    toast(
      tx(
        `Declined “${updated.service}”`,
        `Tinanggihan ang “${updated.service}”`,
        `Gibalibaran ang “${updated.service}”`,
      ),
    );
    onTransitionSuccess?.(updated, "decline");
    onClose();
  };

  const handleConfirmCancel = () => {
    if (!canCancelBooking(booking.status)) {
      setError(
        tx(
          "Bookings cannot be cancelled after work has started.",
          "Hindi na makansela kapag nagsimula na ang trabaho.",
          "Dili na makanselar kon nagsugod na ang trabaho.",
        ),
      );
      return;
    }
    const updated = runAction("cancel", {
      reason:
        reason.trim() ||
        tx(
          "Cancelled before job start",
          "Kinansela bago magsimula",
          "Gikansela sa wala pa magsugod",
        ),
      actorRole: dialog.actorRole,
    });
    if (!updated) return;
    toast(
      tx(
        `Cancelled booking “${updated.service}”`,
        `Kinansela ang booking na “${updated.service}”`,
        `Gikansela ang booking nga “${updated.service}”`,
      ),
    );
    onTransitionSuccess?.(updated, "cancel");
    onClose();
  };

  const handleConfirmStart = () => {
    const updated = runAction("start", { actorRole: "worker" });
    if (!updated) return;
    toast.success(
      tx(
        `Started “${updated.service}” — now In Progress`,
        `Sinimulan ang “${updated.service}”`,
        `Gisugdan ang “${updated.service}”`,
      ),
    );
    onTransitionSuccess?.(updated, "start");
    onClose();
  };

  const handleConfirmFinish = () => {
    const updated = runAction("finish", { actorRole: "worker" });
    if (!updated) return;
    toast.success(
      tx(
        `Marked “${updated.service}” finished — awaiting employer confirmation`,
        `Minarkahang tapos ang “${updated.service}” — naghihintay ng kumpirmasyon`,
        `Gimarkahan nga nahuman ang “${updated.service}” — naghulat sa kumpirmasyon`,
      ),
    );
    onTransitionSuccess?.(updated, "finish");
    onClose();
  };

  const handleConfirmCompletion = () => {
    const updated = runAction("confirm", { actorRole: "employer" });
    if (!updated) return;
    toast.success(
      tx(
        `Confirmed completion of “${updated.service}”!`,
        `Nakumpirma ang pagtatapos ng “${updated.service}”!`,
        `Nakumpirma ang pagkahuman sa “${updated.service}”!`,
      ),
    );
    setError(null);
    setMode("completed_success");
    onTransitionSuccess?.(updated, "confirm");
  };

  const handleSubmitIssue = () => {
    const res = reportBookingIssue(booking.id, {
      reason: issueReason,
      details: issueDetails,
      reportedBy: "employer",
    });
    if (!res.ok) {
      setError(
        res.error ??
          tx(
            "Please describe the issue (at least 8 characters).",
            "Ilarawan ang isyu (hindi bababa sa 8 karakter).",
            "Palihug ihulagway ang isyu (labing menos 8 ka karakter).",
          ),
      );
      return;
    }
    toast(
      tx(
        "Issue reported — completion and demo settlement are paused for review.",
        "Naiulat ang isyu — nakahinto muna ang pagtatapos at demo bayad.",
        "Na-report ang isyu — gipahunong usa ang paghuman ug demo bayad.",
      ),
    );
    if (res.booking) onTransitionSuccess?.(res.booking, "report_issue");
    onClose();
  };

  const handleResolveIssue = () => {
    const res = resolveBookingIssue(booking.id, resolutionNote);
    if (!res.ok) {
      setError(res.error ?? "Unable to resolve issue.");
      return;
    }
    toast.success(
      tx(
        "Issue marked resolved — ready for employer completion confirmation.",
        "Naayos na ang isyu — handa na para sa kumpirmasyon.",
        "Nasulbad na ang isyu — andam na para sa kumpirmasyon.",
      ),
    );
    if (res.booking) onTransitionSuccess?.(res.booking, "resolve_issue");
    onClose();
  };

  const handleSubmitReview = () => {
    const res = submitBookingReview(booking.id, {
      rating,
      comment: reviewComment,
      tags: reviewTags,
    });
    if (!res.ok) {
      setError(res.error ?? "Could not save review.");
      return;
    }
    toast.success(
      tx(
        "Thank you! Rating and review saved.",
        "Salamat! Na-save ang rating at review.",
        "Salamat! Na-save ang rating ug review.",
      ),
    );
    if (res.booking) onTransitionSuccess?.(res.booking, "review");
    onClose();
  };

  const quickTags = [
    tx("Punctual", "Maagap", "Maayo moabot sa oras"),
    tx("Quality work", "Magaling ang gawa", "Maayo ang agi"),
    tx("Fair price", "Patas ang singil", "Patas ang presyo"),
    tx("Polite & clean", "Magalang at malinis", "Buotan ug limpyo"),
  ];

  const declinePresets = [
    tx("Schedule conflict", "May kasabay na trabaho", "Naay kasabay nga trabaho"),
    tx("Too far from service area", "Malayo sa lugar ko", "Layo sa akong dapit"),
    tx("Tools/materials unavailable", "Walang dalang gamit", "Walay igong gamit"),
  ];

  const cancelPresets = [
    tx("Schedule changed", "Nagbago ang iskedyul", "Nausab ang iskedyul"),
    tx("Issue already fixed", "Naayos na ang problema", "Naayo na ang problema"),
    tx("Need to rebook another date", "Ililipat sa ibang araw", "Ibalhin sa laing adlaw"),
  ];

  const toggleTag = (tag: string) =>
    setReviewTags((prev) => (prev.includes(tag) ? prev.filter((x) => x !== tag) : [...prev, tag]));

  return (
    <Dialog open={!!dialog} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg rounded-3xl">
        {/* 1. Accept Confirmation & Quote Check */}
        {mode === "accept" && (
          <>
            <DialogHeader>
              <DialogTitle className="text-xl font-extrabold">
                {tx(
                  "Accept this booking?",
                  "Tanggapin ang booking na ito?",
                  "Dawaton kini nga booking?",
                )}
              </DialogTitle>
              <DialogDescription>
                {tx(
                  "Review the job details and agreed rate below before confirming.",
                  "Suriin ang detalye ng trabaho at bayad bago kumpirmahin.",
                  "Susiha ang detalye sa trabaho ug presyo una kumpirmahon.",
                )}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 text-sm">
              <dl className="grid grid-cols-2 gap-2.5 rounded-2xl border bg-muted/40 p-3.5 text-xs">
                <div>
                  <dt className="text-muted-foreground">{tx("Service", "Serbisyo", "Serbisyo")}</dt>
                  <dd className="mt-0.5 font-bold text-foreground">{booking.service}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">
                    {tx("Employer", "Nag-book", "Nag-book")}
                  </dt>
                  <dd className="mt-0.5 font-bold text-foreground">{personas.employerName}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">
                    {tx("Date & Time", "Petsa at Oras", "Petsa ug Oras")}
                  </dt>
                  <dd className="mt-0.5 font-bold text-foreground">
                    {formatBookingDate(booking.date, booking.time)}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">
                    {tx("Location", "Lokasyon", "Lokasyon")}
                  </dt>
                  <dd className="mt-0.5 font-bold text-foreground">{locDisplay}</dd>
                </div>
              </dl>

              {needsQuoteInput ? (
                <div className="space-y-2.5 rounded-2xl border border-gold/45 bg-gold-soft/35 p-3.5 dark:border-gold/30 dark:bg-gold/10">
                  <label htmlFor="booking-quote-amount" className="block text-xs font-bold">
                    {tx(
                      "Agreed / Quoted Rate (₱) — Required",
                      "Napagkasunduang Singil (₱) — Kailangan",
                      "Gikasabotang Presyo (₱) — Kinahanglan",
                    )}
                  </label>
                  <p className="text-xs text-muted-foreground">
                    {tx(
                      `The employer requested a quote. Davao reference floor: ₱${HOURLY_WAGE_REFERENCE.toFixed(2)}/hr (₱${DAILY_WAGE_REFERENCE.toFixed(2)}/8h).`,
                      `Humihingi ng presyo ang nag-book. Batayang Davao: ₱${HOURLY_WAGE_REFERENCE.toFixed(2)}/oras (₱${DAILY_WAGE_REFERENCE.toFixed(2)}/8h).`,
                      `Nangayo og presyo ang nag-book. Giya sa Davao: ₱${HOURLY_WAGE_REFERENCE.toFixed(2)}/oras (₱${DAILY_WAGE_REFERENCE.toFixed(2)}/8h).`,
                    )}
                  </p>
                  <Input
                    id="booking-quote-amount"
                    type="number"
                    min={100}
                    step={10}
                    value={quoteInput}
                    onChange={(e) => {
                      setQuoteInput(e.target.value);
                      setError(null);
                    }}
                    placeholder="e.g., 750"
                  />
                  <div className="flex flex-wrap gap-1.5">
                    {[540, 750, 900, 1200].map((preset) => (
                      <Button
                        key={preset}
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setQuoteInput(String(preset));
                          setError(null);
                        }}
                      >
                        {formatPeso(preset)}
                      </Button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between rounded-2xl border bg-secondary/40 px-3.5 py-2.5">
                  <span className="text-xs text-muted-foreground">
                    {tx("Agreed Price", "Napagkasunduang Bayad", "Gikasabotang Presyo")}
                  </span>
                  <span className="text-base font-extrabold text-primary">
                    {formatRate(booking)}
                  </span>
                </div>
              )}

              <div className="space-y-1.5">
                <label htmlFor="booking-quote-note" className="block text-xs font-semibold">
                  {tx(
                    "Arrival or rate note (optional)",
                    "Paalala sa pagdating o bayad (opsyonal)",
                    "Pahinumdom sa pag-abot o bayad (opsyonal)",
                  )}
                </label>
                <Input
                  id="booking-quote-note"
                  value={quoteNote}
                  onChange={(e) => setQuoteNote(e.target.value)}
                  placeholder={tx(
                    "e.g., Bringing wrench kit; will message 15 mins before arrival",
                    "hal., May dalang gamit; magmemensahe bago dumating",
                    "pananglitan, Naa koy dalang gamit; mo-chat ko sa dili pa moabot",
                  )}
                />
              </div>

              {error && (
                <p role="alert" className="text-xs font-semibold text-destructive">
                  {error}
                </p>
              )}

              <div className="flex flex-wrap justify-end gap-2 border-t pt-3">
                <Button type="button" variant="outline" onClick={onClose}>
                  {tx("Cancel", "Kanselahin", "Kanselahon")}
                </Button>
                <Button type="button" onClick={handleConfirmAccept}>
                  <CheckCircle2 className="size-4" aria-hidden />
                  {tx(
                    "Confirm Acceptance",
                    "Kumpirmahin ang Pagtanggap",
                    "Kumpirmaha ang Pagdawat",
                  )}
                </Button>
              </div>
            </div>
          </>
        )}

        {/* 2. Accepted Success Feedback State */}
        {mode === "accepted_success" && (
          <>
            <DialogHeader>
              <div className="flex items-center gap-2">
                <span className="grid size-10 place-items-center rounded-2xl bg-status-confirmed-bg text-status-confirmed">
                  <CheckCircle2 className="size-5" aria-hidden />
                </span>
                <div>
                  <DialogTitle className="text-xl font-extrabold">
                    {tx(
                      "Booking Confirmed!",
                      "Kumpirmado na ang Booking!",
                      "Nakumpirma na ang Booking!",
                    )}
                  </DialogTitle>
                  <DialogDescription>
                    {tx(
                      "Added to Upcoming Jobs and synced with Employer Bookings.",
                      "Idinagdag sa Nakaiskedyul at na-sync sa Employer Bookings.",
                      "Gidugang sa Umaabot nga Trabaho ug na-sync sa Employer Bookings.",
                    )}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-4 text-sm">
              <div className="rounded-2xl border bg-muted/40 p-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-bold text-foreground">{booking.service}</p>
                  <StatusBadge status={booking.status} />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {personas.employerName} · {formatBookingDate(booking.date, booking.time)} ·{" "}
                  <strong className="text-primary">{formatRate(booking)}</strong>
                </p>
                <BookingTimeline booking={booking} variant="compact" className="mt-3" />
              </div>

              <div className="flex flex-wrap justify-end gap-2 border-t pt-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    onClose();
                    if (onNavigateViewJob) {
                      onNavigateViewJob(booking);
                    } else {
                      navigate({ to: "/requests/$id", params: { id: booking.id } });
                    }
                  }}
                >
                  {tx("View Job Details", "Tingnan ang Detalye", "Tan-awa ang Detalye")}
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    onClose();
                    if (onNavigateMyJobs) {
                      onNavigateMyJobs(booking, "upcoming");
                    } else {
                      navigate({
                        to: "/my-jobs",
                        search: { tab: "upcoming", bookingId: booking.id },
                      });
                    }
                  }}
                >
                  {tx("Go to My Jobs", "Pumunta sa Aking Trabaho", "Adto sa Akong Trabaho")}
                </Button>
              </div>
            </div>
          </>
        )}

        {/* 3. Decline Booking Request */}
        {mode === "decline" && (
          <>
            <DialogHeader>
              <DialogTitle className="text-xl font-extrabold">
                {tx(
                  "Decline booking request?",
                  "Tanggihan ang booking request?",
                  "Balibaran ang booking request?",
                )}
              </DialogTitle>
              <DialogDescription>
                {tx(
                  `Let ${personas.employerName} know why “${booking.service}” cannot be accepted.`,
                  `Ipaalam kay ${personas.employerName} kung bakit hindi matatanggap ang “${booking.service}”.`,
                  `Ipahibalo kang ${personas.employerName} ngano dili madawat ang “${booking.service}”.`,
                )}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 text-sm">
              <div className="flex flex-wrap gap-1.5">
                {declinePresets.map((preset) => (
                  <Button
                    key={preset}
                    type="button"
                    size="sm"
                    variant={reason === preset ? "default" : "outline"}
                    onClick={() => setReason(preset)}
                  >
                    {preset}
                  </Button>
                ))}
              </div>
              <div className="space-y-1.5">
                <label htmlFor="booking-decline-reason" className="block text-xs font-semibold">
                  {tx("Reason (optional)", "Dahilan (opsyonal)", "Rason (opsyonal)")}
                </label>
                <Textarea
                  id="booking-decline-reason"
                  rows={2}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder={tx(
                    "Optional note for the resident…",
                    "Opsyonal na mensahe para sa residente…",
                    "Opsyonal nga mensahe alang sa residente…",
                  )}
                />
              </div>

              <div className="flex flex-wrap justify-end gap-2 border-t pt-3">
                <Button type="button" variant="outline" onClick={onClose}>
                  {tx("Keep Pending", "Panatilihin Muna", "Pabilin Usa")}
                </Button>
                <Button type="button" variant="destructive" onClick={handleConfirmDecline}>
                  <XCircle className="size-4" aria-hidden />
                  {tx("Confirm Decline", "Kumpirmahin ang Pagtanggi", "Kumpirmaha ang Pagbalibad")}
                </Button>
              </div>
            </div>
          </>
        )}

        {/* 4. Cancel Booking (Before Start Only) */}
        {mode === "cancel" && (
          <>
            <DialogHeader>
              <DialogTitle className="text-xl font-extrabold">
                {tx(
                  "Cancel this booking?",
                  "Kanselahin ang booking?",
                  "Kanselahon kini nga booking?",
                )}
              </DialogTitle>
              <DialogDescription>
                {tx(
                  `Cancellation is allowed before work starts on “${booking.service}”.`,
                  `Maaari pang kanselahin ang “${booking.service}” bago ito magsimula.`,
                  `Mahimo pa ikanselar ang “${booking.service}” sa dili pa kini magsugod.`,
                )}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 text-sm">
              <div className="flex flex-wrap gap-1.5">
                {cancelPresets.map((preset) => (
                  <Button
                    key={preset}
                    type="button"
                    size="sm"
                    variant={reason === preset ? "default" : "outline"}
                    onClick={() => setReason(preset)}
                  >
                    {preset}
                  </Button>
                ))}
              </div>
              <div className="space-y-1.5">
                <label htmlFor="booking-cancel-reason" className="block text-xs font-semibold">
                  {tx(
                    "Reason for cancellation (optional)",
                    "Dahilan ng pagkansela (opsyonal)",
                    "Rason sa pagkansela (opsyonal)",
                  )}
                </label>
                <Textarea
                  id="booking-cancel-reason"
                  rows={2}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </div>
              {error && (
                <p role="alert" className="text-xs font-semibold text-destructive">
                  {error}
                </p>
              )}

              <div className="flex flex-wrap justify-end gap-2 border-t pt-3">
                <Button type="button" variant="outline" onClick={onClose}>
                  {tx("Keep Booking", "Huwag Kanselahin", "Ayaw Kanselaha")}
                </Button>
                <Button type="button" variant="destructive" onClick={handleConfirmCancel}>
                  <XCircle className="size-4" aria-hidden />
                  {tx(
                    "Confirm Cancellation",
                    "Kumpirmahin ang Pagkansela",
                    "Kumpirmaha ang Pagkansela",
                  )}
                </Button>
              </div>
            </div>
          </>
        )}

        {/* 5. Start Job Confirmation + Active Job Conflict Check */}
        {mode === "start" && (
          <>
            <DialogHeader>
              <DialogTitle className="text-xl font-extrabold">
                {tx(
                  "Start this job now?",
                  "Simulan na ang trabahong ito?",
                  "Sugdan na kini nga trabaho?",
                )}
              </DialogTitle>
              <DialogDescription>
                {tx(
                  `Moving “${booking.service}” to In Progress records a start timestamp and unlocks optional live location sharing.`,
                  `Ililipat sa Ginagawa Na ang “${booking.service}” at magsisimula ang timer ng trabaho.`,
                  `Ibalhin sa Ginahimo Na ang “${booking.service}” ug maablihan ang live location sharing.`,
                )}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 text-sm">
              {conflictBooking && (
                <div
                  role="alert"
                  className="flex items-start gap-2.5 rounded-2xl border border-status-pending/45 bg-status-pending-bg p-3 text-xs text-status-pending"
                >
                  <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
                  <div>
                    <p className="font-bold">
                      {tx(
                        "Another job is currently In Progress",
                        "May isa pang trabahong kasalukuyang ginagawa",
                        "Naay laing trabaho nga kasamtangang ginahimo",
                      )}
                    </p>
                    <p className="mt-0.5 text-foreground/85">
                      {tx(
                        `“${conflictBooking.service}” (${formatBookingDate(conflictBooking.date, conflictBooking.time)}) is still marked In Progress. Confirm only if you can attend to this job now.`,
                        `Ang “${conflictBooking.service}” ay naka-Ginagawa Na pa. Magpatuloy lang kung handa ka nang magsimula.`,
                        `Ang “${conflictBooking.service}” naka-Ginahimo Na pa. Padayon lang kon andam ka na mosugod.`,
                      )}
                    </p>
                  </div>
                </div>
              )}

              <div className="rounded-2xl border bg-muted/40 p-3.5 text-xs">
                <p className="flex items-center gap-1.5 font-bold text-foreground">
                  <MapPin className="size-3.5 text-primary" aria-hidden /> {locDisplay}
                </p>
                <p className="mt-1 flex items-center gap-1.5 text-muted-foreground">
                  <CalendarDays className="size-3.5" aria-hidden />{" "}
                  {formatBookingDate(booking.date, booking.time)} ·{" "}
                  <strong className="text-primary">{formatRate(booking)}</strong>
                </p>
              </div>

              <div className="flex flex-wrap justify-end gap-2 border-t pt-3">
                <Button type="button" variant="outline" onClick={onClose}>
                  {tx("Not Yet", "Hindi Pa", "Dili Pa")}
                </Button>
                <Button type="button" onClick={handleConfirmStart}>
                  <Play className="size-4" aria-hidden />
                  {tx("Confirm Start Job", "Simulan Na", "Sugdi Na")}
                </Button>
              </div>
            </div>
          </>
        )}

        {/* 6. Worker Mark as Completed -> Awaiting Employer Confirmation */}
        {mode === "finish" && (
          <>
            <DialogHeader>
              <DialogTitle className="text-xl font-extrabold">
                {tx(
                  "Have you finished the agreed service?",
                  "Natapos mo na ba ang napagkasunduang serbisyo?",
                  "Nahuman na ba nimo ang gikasabotang serbisyo?",
                )}
              </DialogTitle>
              <DialogDescription>
                {tx(
                  "This moves the booking to Awaiting Confirmation so the employer can verify completion before final settlement.",
                  "Ililipat ito sa Naghihintay ng Kumpirmasyon para masuri muna ng nag-book.",
                  "Ibalhin kini sa Naghulat sa Kumpirmasyon aron makasusi una ang nag-book.",
                )}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 text-sm">
              <div className="rounded-2xl border bg-muted/40 p-3.5 text-xs">
                <p className="font-bold text-foreground">{booking.service}</p>
                <p className="mt-1 text-muted-foreground">
                  {personas.employerName} · {tx("Agreed rate:", "Bayad:", "Presyo:")}{" "}
                  <strong className="text-primary">{formatRate(booking)}</strong>
                </p>
              </div>

              <div className="flex flex-wrap justify-end gap-2 border-t pt-3">
                <Button type="button" variant="outline" onClick={onClose}>
                  {tx("Back to Work", "Bumalik", "Balik")}
                </Button>
                <Button type="button" onClick={handleConfirmFinish}>
                  <ClipboardCheck className="size-4" aria-hidden />
                  {tx("Mark as Finished", "Markahang Tapos Na", "Markahi nga Nahuman Na")}
                </Button>
              </div>
            </div>
          </>
        )}

        {/* 7. Employer Confirm Job Completion */}
        {mode === "confirm" && (
          <>
            <DialogHeader>
              <DialogTitle className="text-xl font-extrabold">
                {tx(
                  "Confirm job completion?",
                  "Kumpirmahin ang pagtatapos ng trabaho?",
                  "Kumpirmahon ang pagkahuman sa trabaho?",
                )}
              </DialogTitle>
              <DialogDescription>
                {tx(
                  "Confirm that the service was delivered satisfactorily. If something is incomplete, report an issue instead.",
                  "Kumpirmahing maayos ang serbisyo. Kung may kulang, mag-ulat muna ng isyu.",
                  "Kumpirmaha nga maayo ang serbisyo. Kon naay kulang, pag-report una og isyu.",
                )}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 text-sm">
              <div className="rounded-2xl border bg-muted/40 p-3.5 text-xs">
                <div className="flex items-center gap-2.5">
                  <Avatar initials={personas.workerInitials} size="sm" />
                  <div>
                    <p className="font-bold text-foreground">{personas.workerName}</p>
                    <p className="text-muted-foreground">
                      {booking.service} ·{" "}
                      <strong className="text-primary">{formatRate(booking)}</strong>
                    </p>
                  </div>
                </div>
              </div>

              <DemoSettlementNotice booking={booking} />

              {error && (
                <p role="alert" className="text-xs font-semibold text-destructive">
                  {error}
                </p>
              )}

              <div className="flex flex-wrap justify-between gap-2 border-t pt-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setError(null);
                    setMode("report_issue");
                  }}
                >
                  <MessageSquareWarning className="size-4" aria-hidden />
                  {tx("Report an Issue", "Mag-ulat ng Isyu", "Pag-report og Isyu")}
                </Button>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="ghost" onClick={onClose}>
                    {tx("Cancel", "Kanselahin", "Kanselahon")}
                  </Button>
                  <Button type="button" onClick={handleConfirmCompletion}>
                    <CheckCircle2 className="size-4" aria-hidden />
                    {tx(
                      "Confirm Job Completion",
                      "Kumpirmahin na Tapos Na",
                      "Kumpirmaha nga Nahuman Na",
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* 8. Completed Summary + Optional Post-Completion Review */}
        {mode === "completed_success" && (
          <>
            <DialogHeader>
              <div className="flex items-center gap-2.5">
                <span className="grid size-10 place-items-center rounded-2xl bg-status-confirmed-bg text-status-confirmed">
                  <CheckCircle2 className="size-5" aria-hidden />
                </span>
                <div>
                  <DialogTitle className="text-xl font-extrabold">
                    {tx(
                      "Job Completed Successfully",
                      "Matagumpay na Natapos ang Trabaho",
                      "Malampuson nga Nahuman ang Trabaho",
                    )}
                  </DialogTitle>
                  <DialogDescription>
                    {tx(
                      "Leave an optional rating & review or close to continue.",
                      "Magbigay ng opsyonal na rating at review o isara ito.",
                      "Pagbilin og opsyonal nga rating ug review o isira kini.",
                    )}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-4 text-sm">
              <DemoSettlementNotice booking={booking} />

              <div className="space-y-2.5 rounded-2xl border bg-muted/35 p-3.5">
                <p className="text-xs font-bold">
                  {tx(
                    `Rate ${personas.workerName} (optional)`,
                    `I-rate si ${personas.workerName} (opsyonal)`,
                    `I-rate si ${personas.workerName} (opsyonal)`,
                  )}
                </p>
                <div className="flex items-center gap-1.5" role="group" aria-label="Star rating">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      aria-label={`${star} star${star === 1 ? "" : "s"}`}
                      aria-pressed={rating >= star}
                      onClick={() => setRating(star)}
                      className={cn(
                        "cursor-pointer rounded-lg p-1.5 transition-colors hover:bg-hover-surface",
                        rating >= star
                          ? "text-gold-foreground dark:text-gold"
                          : "text-muted-foreground/45",
                      )}
                    >
                      <Star
                        className={cn("size-5", rating >= star && "fill-current")}
                        aria-hidden
                      />
                    </button>
                  ))}
                  <span className="ml-1 text-xs font-semibold text-foreground">{rating}/5</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {quickTags.map((tag) => (
                    <Button
                      key={tag}
                      type="button"
                      size="sm"
                      variant={reviewTags.includes(tag) ? "default" : "outline"}
                      onClick={() => toggleTag(tag)}
                    >
                      {tag}
                    </Button>
                  ))}
                </div>
                <Textarea
                  rows={2}
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder={tx(
                    "Share how the service went…",
                    "Ibahagi ang naging serbisyo…",
                    "Ipaambit kon giunsa ang serbisyo…",
                  )}
                />
              </div>

              <div className="flex flex-wrap justify-end gap-2 border-t pt-3">
                <Button type="button" variant="ghost" onClick={onClose}>
                  {tx("Skip for Now", "Sa Susunod Na", "Unya Na")}
                </Button>
                <Button type="button" variant="gold" onClick={handleSubmitReview}>
                  <Star className="size-4" aria-hidden />
                  {tx("Save Rating & Review", "I-save ang Rating", "I-save ang Rating")}
                </Button>
              </div>
            </div>
          </>
        )}

        {/* 9. Report Issue Modal */}
        {mode === "report_issue" && (
          <>
            <DialogHeader>
              <DialogTitle className="text-xl font-extrabold">
                {tx(
                  "Report an issue with this booking",
                  "Mag-ulat ng isyu sa booking",
                  "Pag-report og isyu sa booking",
                )}
              </DialogTitle>
              <DialogDescription>
                {tx(
                  "Reporting an issue places completion & demo settlement on hold until resolved.",
                  "Ihihinto muna ang pagtatapos at demo bayad hanggang maayos ang isyu.",
                  "Ipahunong usa ang paghuman ug demo bayad hangtod masulbad ang isyu.",
                )}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 text-sm">
              <div className="flex flex-wrap gap-1.5">
                {[
                  tx("Incomplete work", "Hindi kumpletong gawa", "Kulang nga trabaho"),
                  tx("Quality concern", "May problema sa kalidad", "Problema sa kalidad"),
                  tx("Rate disagreement", "Hindi tugma sa presyo", "Dili tugma sa presyo"),
                ].map((opt) => (
                  <Button
                    key={opt}
                    type="button"
                    size="sm"
                    variant={issueReason === opt ? "default" : "outline"}
                    onClick={() => setIssueReason(opt)}
                  >
                    {opt}
                  </Button>
                ))}
              </div>
              <div className="space-y-1.5">
                <label htmlFor="booking-issue-details" className="block text-xs font-semibold">
                  {tx(
                    "What needs attention? (min 8 chars)",
                    "Ano ang kailangang ayusin?",
                    "Unsay kinahanglan ayohon?",
                  )}
                </label>
                <Textarea
                  id="booking-issue-details"
                  rows={3}
                  value={issueDetails}
                  onChange={(e) => {
                    setIssueDetails(e.target.value);
                    setError(null);
                  }}
                  placeholder={tx(
                    "Describe what still needs fixing before you can confirm completion…",
                    "Ilarawan ang kulang o kailangang ayusin…",
                    "Ihulagway ang kulang o kinahanglan ayohon…",
                  )}
                />
              </div>
              {error && (
                <p role="alert" className="text-xs font-semibold text-destructive">
                  {error}
                </p>
              )}

              <div className="flex flex-wrap justify-end gap-2 border-t pt-3">
                <Button type="button" variant="outline" onClick={onClose}>
                  {tx("Cancel", "Kanselahin", "Kanselahon")}
                </Button>
                <Button type="button" variant="destructive" onClick={handleSubmitIssue}>
                  <AlertTriangle className="size-4" aria-hidden />
                  {tx("Submit Issue & Hold Completion", "Ipasa ang Isyu", "I-submit ang Isyu")}
                </Button>
              </div>
            </div>
          </>
        )}

        {/* 10. Resolve Open Issue */}
        {mode === "resolve_issue" && (
          <>
            <DialogHeader>
              <DialogTitle className="text-xl font-extrabold">
                {tx(
                  "Resolve issue & resubmit",
                  "Ayusin ang isyu at ipasa muli",
                  "Sulbara ang isyu ug ipasa pag-usab",
                )}
              </DialogTitle>
              <DialogDescription>
                {tx(
                  "Add a short note explaining the fix so the employer can confirm job completion.",
                  "Maglagay ng paliwanag para makumpirma na ng nag-book.",
                  "Pagbutang og mubo nga nota aron makakumpirma na ang nag-book.",
                )}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 text-sm">
              <BookingIssueBanner booking={booking} />
              <div className="space-y-1.5">
                <label htmlFor="booking-issue-resolution" className="block text-xs font-semibold">
                  {tx("Resolution note", "Paliwanag sa pag-aayos", "Nota sa pagsulbad")}
                </label>
                <Textarea
                  id="booking-issue-resolution"
                  rows={2}
                  value={resolutionNote}
                  onChange={(e) => setResolutionNote(e.target.value)}
                  placeholder={tx(
                    "e.g., Replaced gasket and verified zero leaks for 15 minutes",
                    "hal., Pinalitan na ang gasket at walang tagas",
                    "pananglitan, Giilisan ang gasket ug gisusi nga walay tulo",
                  )}
                />
              </div>
              {error && (
                <p role="alert" className="text-xs font-semibold text-destructive">
                  {error}
                </p>
              )}

              <div className="flex flex-wrap justify-end gap-2 border-t pt-3">
                <Button type="button" variant="outline" onClick={onClose}>
                  {tx("Cancel", "Kanselahin", "Kanselahon")}
                </Button>
                <Button type="button" onClick={handleResolveIssue}>
                  <Clock className="size-4" aria-hidden />
                  {tx("Mark Issue Resolved", "Markahang Naayos Na", "Markahi nga Nasulbad Na")}
                </Button>
              </div>
            </div>
          </>
        )}

        {/* 11. Standalone Review Dialog */}
        {mode === "review" && (
          <>
            <DialogHeader>
              <DialogTitle className="text-xl font-extrabold">
                {tx(
                  `Rate ${personas.workerName}`,
                  `I-rate si ${personas.workerName}`,
                  `I-rate si ${personas.workerName}`,
                )}
              </DialogTitle>
              <DialogDescription>
                {tx(
                  `Completed job: ${booking.service} (${formatRate(booking)})`,
                  `Natapos na trabaho: ${booking.service} (${formatRate(booking)})`,
                  `Nahumang trabaho: ${booking.service} (${formatRate(booking)})`,
                )}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-1.5" role="group" aria-label="Star rating">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    aria-label={`${star} star${star === 1 ? "" : "s"}`}
                    aria-pressed={rating >= star}
                    onClick={() => setRating(star)}
                    className={cn(
                      "cursor-pointer rounded-lg p-1.5 transition-colors hover:bg-hover-surface",
                      rating >= star
                        ? "text-gold-foreground dark:text-gold"
                        : "text-muted-foreground/45",
                    )}
                  >
                    <Star className={cn("size-5", rating >= star && "fill-current")} aria-hidden />
                  </button>
                ))}
                <span className="ml-1 text-xs font-semibold text-foreground">{rating}/5</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {quickTags.map((tag) => (
                  <Button
                    key={tag}
                    type="button"
                    size="sm"
                    variant={reviewTags.includes(tag) ? "default" : "outline"}
                    onClick={() => toggleTag(tag)}
                  >
                    {tag}
                  </Button>
                ))}
              </div>
              <Textarea
                rows={3}
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder={tx(
                  "Optional comment about punctuality, workmanship, or pricing…",
                  "Opsyonal na komento tungkol sa serbisyo…",
                  "Opsyonal nga komento mahitungod sa serbisyo…",
                )}
              />
              {error && (
                <p role="alert" className="text-xs font-semibold text-destructive">
                  {error}
                </p>
              )}

              <div className="flex flex-wrap justify-end gap-2 border-t pt-3">
                <Button type="button" variant="outline" onClick={onClose}>
                  {tx("Cancel", "Kanselahin", "Kanselahon")}
                </Button>
                <Button type="button" variant="gold" onClick={handleSubmitReview}>
                  <Star className="size-4" aria-hidden />
                  {tx("Submit Review", "Ipasa ang Review", "I-submit ang Review")}
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
