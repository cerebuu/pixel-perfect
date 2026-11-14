import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  CalendarCheck,
  CalendarDays,
  CheckCircle2,
  MapPin,
  MessageSquareWarning,
  Play,
  Plus,
  ShieldCheck,
  Trash2,
  Wallet,
  XCircle,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { AppLayout } from "@/components/gaw/AppLayout";
import {
  BookingIssueBanner,
  BookingLifecycleDialogs,
  BookingReviewDisplay,
  BookingTimeline,
  DemoSettlementNotice,
  TwoSidedDemoBridge,
  useBookingDisplay,
  type LifecycleDialogState,
} from "@/components/gaw/BookingLifecycle";
import { LiveJobSharingCard } from "@/components/gaw/GawMap";
import { filterTabPillClass, subtleLinkClass } from "@/components/gaw/interactions";
import { Avatar, EmptyState, StatusBadge } from "@/components/gaw/primitives";
import { Button } from "@/components/ui/button";
import {
  canCancelBooking,
  canConfirmCompletion,
  canReportIssue,
  resolveBookingPersonas,
} from "@/lib/gaw/bookings";
import { barangayName, CATEGORIES, OTHER_CATEGORY, WORKERS } from "@/lib/gaw/data";
import { FREE_OPEN_GIGS_LIMIT } from "@/lib/gaw/domain";
import { useI18n } from "@/lib/gaw/i18n";
import { useGaw, type BookingStatus } from "@/lib/gaw/store";
import { cn } from "@/lib/utils";

type BookingsSearch = {
  tab?: "bookings" | "requests" | undefined;
  bookingId?: string | undefined;
};

export const Route = createFileRoute("/bookings")({
  validateSearch: (search: Record<string, unknown>): BookingsSearch => {
    const tab =
      search["tab"] === "requests"
        ? "requests"
        : search["tab"] === "bookings"
          ? "bookings"
          : undefined;
    const bookingId =
      typeof search["bookingId"] === "string" && search["bookingId"].trim()
        ? search["bookingId"]
        : undefined;
    return {
      ...(tab ? { tab } : {}),
      ...(bookingId ? { bookingId } : {}),
    };
  },
  head: () => ({
    meta: [
      { title: "My Bookings — GAW" },
      { name: "description", content: "Track your booking requests with nearby workers." },
      { property: "og:title", content: "My Bookings — GAW" },
      { property: "og:description", content: "Track your booking requests with nearby workers." },
    ],
  }),
  component: BookingsPage,
});

function BookingsPage() {
  const { tx } = useI18n();
  const { tab, bookingId } = Route.useSearch();
  return (
    <AppLayout mode="hire" title={tx("My Bookings", "Mga Booking Ko", "Akong mga Booking")}>
      <BookingsList initialTab={tab} initialBookingId={bookingId} />
    </AppLayout>
  );
}

export function BookingsList({
  initialTab,
  initialBookingId,
}: {
  initialTab?: "bookings" | "requests" | undefined;
  initialBookingId?: string | undefined;
} = {}) {
  const [view, setView] = useState<"bookings" | "requests">(initialTab ?? "bookings");
  const { account, bookings, workerProfile, customJobs, applications, removeJob, plans } = useGaw();
  const { t, tx, statusLabel, translateCategory } = useI18n();
  const { formatRate, formatBookingDate } = useBookingDisplay();
  const [filter, setFilter] = useState<BookingStatus | "all">("all");
  const [dialog, setDialog] = useState<LifecycleDialogState | null>(null);
  const activeHighlightId = initialBookingId;

  const localizedFilters: { key: BookingStatus | "all"; label: string }[] = [
    { key: "all", label: tx("All", "Lahat", "Tanan") },
    { key: "pending", label: tx("Pending", "Pending", "Pending") },
    { key: "confirmed", label: tx("Accepted", "Tinanggap", "Gidawat") },
    { key: "in_progress", label: tx("In Progress", "Ginagawa Na", "Ginahimo Na") },
    {
      key: "awaiting_confirmation",
      label: tx("Awaiting Confirmation", "Naghihintay ng Kumpirmasyon", "Naghulat sa Kumpirmasyon"),
    },
    { key: "completed", label: tx("Completed", "Tapos Na", "Nahuman Na") },
    { key: "cancelled", label: tx("Cancelled", "Kinansela", "Gikansela") },
    { key: "declined", label: tx("Declined", "Tinanggihan", "Gibalibaran") },
  ];

  useEffect(() => {
    if (initialTab) setView(initialTab);
  }, [initialTab]);

  const list = bookings.filter((b) => filter === "all" || b.status === filter);

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      {/* Shared state note */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border bg-card px-4 py-3 text-xs text-muted-foreground shadow-soft">
        <span>
          <strong>
            {tx(
              "Shared Booking State:",
              "Pinagsamang Estado ng Booking:",
              "Gipaambit nga Estado sa Booking:",
            )}
          </strong>{" "}
          {tx(
            "Status changes in Worker",
            "Ang pagbabago ng status sa",
            "Ang kausaban sa status sa",
          )}{" "}
          <Link to="/my-jobs" className={cn(subtleLinkClass, "inline text-[length:inherit]")}>
            {tx("My Jobs", "Aking Trabaho", "Akong Trabaho")}
          </Link>{" "}
          {tx("immediately update here.", "ay agad na makikita rito.", "makita dayon dinhi.")}
        </span>
        <Button asChild size="sm" variant="soft">
          <Link to="/find">
            {tx("+ Request New Booking", "+ Mag-book ng Bago", "+ Pag-book og Bag-o")}
          </Link>
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-b pb-3" role="tablist">
        {(
          [
            ["bookings", t("bookings.tabBookings", { count: bookings.length })],
            ["requests", t("bookings.tabRequests", { count: customJobs.length })],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            id={`bookings-tab-${k}`}
            type="button"
            role="tab"
            aria-selected={view === k}
            aria-controls={`bookings-panel-${k}`}
            onClick={() => setView(k)}
            className={cn(
              "rounded-full px-4 py-2 text-sm font-semibold transition-colors",
              view === k
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted text-muted-foreground hover:text-foreground",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {view === "requests" && (
        <section
          id="bookings-panel-requests"
          role="tabpanel"
          aria-labelledby="bookings-tab-requests"
          className="space-y-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border bg-card p-4 shadow-soft">
            <div>
              <h2 className="text-base font-bold">{t("hire.yourRequestsTitle")}</h2>
              <p className="text-xs text-muted-foreground">
                {plans.includes("employer")
                  ? tx(
                      "Employer Pro · Unlimited open service requests",
                      "Employer Pro · Walang limit na requests",
                      "Employer Pro · Walay limit nga requests",
                    )
                  : tx(
                      `${customJobs.length} of ${FREE_OPEN_GIGS_LIMIT} Free active open requests used`,
                      `${customJobs.length} sa ${FREE_OPEN_GIGS_LIMIT} Free open requests nagamit`,
                      `${customJobs.length} sa ${FREE_OPEN_GIGS_LIMIT} Free open requests nagamit`,
                    )}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild size="sm" variant="outline">
                <Link to="/gigs">
                  {tx("Open My Gigs", "Buksan ang My Gigs", "Ablihi ang My Gigs")}
                </Link>
              </Button>
              <Button asChild size="sm">
                <Link to="/gigs">
                  <Plus className="size-4" aria-hidden /> {t("hire.postRequestCta")}
                </Link>
              </Button>
            </div>
          </div>

          {customJobs.length === 0 ? (
            <EmptyState
              icon={<CalendarCheck className="size-6" />}
              title={tx(
                "No posted requests yet",
                "Wala pang nakapost na request",
                "Wala pay na-post nga request",
              )}
              body={tx(
                "Post an open service request from My Gigs or Employer Home to receive worker applications across Davao City.",
                "Mag-post ng bukas na service request mula sa My Gigs o Employer Home para makahanap ng mga manggagawa.",
                "Pag-post og abli nga service request gikan sa My Gigs o Employer Home aron makadawat og mga aplikante.",
              )}
              action={
                <Button asChild size="lg">
                  <Link to="/gigs">{t("hire.postRequestCta")}</Link>
                </Button>
              }
            />
          ) : (
            <ul className="space-y-3">
              {customJobs.map((job) => {
                const proposalCount = applications.filter((a) => a.jobId === job.id).length;
                const matchCount = WORKERS.filter(
                  (w) =>
                    job.category === OTHER_CATEGORY ||
                    w.skill.toLowerCase() === job.category.toLowerCase() ||
                    w.skills.some((s) => s.toLowerCase() === job.category.toLowerCase()),
                ).length;
                return (
                  <li key={job.id} className="rounded-2xl border bg-card p-4 shadow-soft sm:p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Link
                            to="/jobs/$id"
                            params={{ id: job.id }}
                            className="text-base font-bold text-foreground hover:text-primary"
                          >
                            {job.title}
                          </Link>
                          <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-semibold text-secondary-foreground">
                            {translateCategory(job.category)}
                          </span>
                          {job.urgent && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-gold-soft px-2 py-0.5 text-[11px] font-bold text-gold-foreground dark:text-gold">
                              <Zap className="size-3" aria-hidden />
                              {tx("Urgent", "Apurahan", "Dinalian")}
                            </span>
                          )}
                          <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                            {tx(
                              `${proposalCount} proposals`,
                              `${proposalCount} aplikante`,
                              `${proposalCount} aplikante`,
                            )}
                          </span>
                        </div>
                        <p className="line-clamp-2 text-sm text-muted-foreground">
                          {job.description}
                        </p>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1 text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="size-3.5" aria-hidden />
                            {barangayName(job.barangayId)}
                            {job.landmark ? ` · ${job.landmark}` : ""}
                          </span>
                          <span className="inline-flex items-center gap-1 font-semibold text-foreground">
                            <Wallet className="size-3.5" aria-hidden />
                            {job.budget} · {job.estimatedHours}h
                          </span>
                          <span>{job.schedule}</span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <Button asChild size="sm" variant="soft">
                          <Link to="/gigs">
                            {tx("Manage in My Gigs", "Sa My Gigs", "Sa My Gigs")}
                          </Link>
                        </Button>
                        <Button asChild size="sm" variant="outline">
                          <Link
                            to="/find"
                            search={
                              (CATEGORIES as readonly string[]).includes(job.category)
                                ? { category: job.category }
                                : { q: job.category }
                            }
                          >
                            {tx(
                              `${matchCount} workers`,
                              `${matchCount} manggagawa`,
                              `${matchCount} trabahante`,
                            )}
                          </Link>
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => {
                            removeJob(job.id);
                            toast.success(
                              tx("Request removed", "Inalis ang request", "Gikuha ang request"),
                            );
                          }}
                        >
                          <Trash2 className="size-3.5" aria-hidden />
                          {tx("Close", "Isara", "Sirad-a")}
                        </Button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}

      {view === "bookings" && (
        <div
          id="bookings-panel-bookings"
          role="tabpanel"
          aria-labelledby="bookings-tab-bookings"
          className="space-y-4"
        >
          {/* Filter pills */}
          <div
            className="-mx-4 flex gap-2 overflow-x-auto px-4 py-1.5"
            role="group"
            aria-label={tx(
              "Filter by status",
              "I-filter ayon sa status",
              "I-filter base sa status",
            )}
          >
            {localizedFilters.map((f) => {
              const n =
                f.key === "all"
                  ? bookings.length
                  : bookings.filter((b) => b.status === f.key).length;
              return (
                <button
                  key={f.key}
                  type="button"
                  aria-pressed={filter === f.key}
                  onClick={() => setFilter(f.key)}
                  className={filterTabPillClass(
                    filter === f.key,
                    "h-10 shrink-0 rounded-full border px-4 text-sm font-semibold",
                  )}
                >
                  {f.label} <span className="opacity-70">({n})</span>
                </button>
              );
            })}
          </div>

          {list.length === 0 ? (
            <EmptyState
              icon={<CalendarCheck className="size-6" />}
              title={
                filter === "all"
                  ? tx("No bookings yet", "Wala pang mga booking", "Wala pay mga booking")
                  : tx(
                      `No ${statusLabel(filter).toLowerCase()} bookings`,
                      `Walang booking na ${statusLabel(filter).toLowerCase()}`,
                      `Walay booking nga ${statusLabel(filter).toLowerCase()}`,
                    )
              }
              body={tx(
                "Find a nearby worker and send a booking request — it will show up here.",
                "Maghanap ng manggagawa sa malapit at magpadala ng booking request — lalabas ito rito.",
                "Pangita og trabahante sa duol ug pagpadala og booking request — makita kana dinhi.",
              )}
              action={
                <Button asChild>
                  <Link to="/find">
                    {tx("Open Nearby Finder", "Buksan ang Paghahanap", "Ablihi ang Pangita")}
                  </Link>
                </Button>
              }
            />
          ) : (
            <ul className="space-y-3">
              {list.map((b) => {
                const personas = resolveBookingPersonas(b, {
                  currentUserName: account?.name,
                  workerSkill: workerProfile?.skill,
                  viewerRole: "employer",
                });
                const locDisplay = b.location?.label ?? barangayName(b.barangayId);
                const hasOpenIssue = b.issueReport?.status === "open";
                const isHighlighted = activeHighlightId === b.id;

                return (
                  <li
                    key={b.id}
                    data-booking-id={b.id}
                    className={cn(
                      "animate-fade-up space-y-3.5 rounded-2xl border bg-card p-4 shadow-soft md:p-5",
                      b.status === "awaiting_confirmation" && !hasOpenIssue && "border-primary/45",
                      hasOpenIssue && "border-status-declined/45",
                      isHighlighted && "ring-2 ring-primary/35",
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <Avatar initials={personas.workerInitials} />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <div className="mb-1 flex flex-wrap items-center gap-1.5">
                              <span
                                className={cn(
                                  "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                                  personas.isSyncedCrossSide
                                    ? "bg-gold-soft text-gold-foreground dark:text-gold"
                                    : "bg-secondary text-secondary-foreground",
                                )}
                              >
                                {personas.isSyncedCrossSide
                                  ? tx(
                                      "Shared Worker Booking",
                                      "Synced na Trabaho",
                                      "Synced nga Trabaho",
                                    )
                                  : tx(
                                      "Direct Hire Booking",
                                      "Direktang Pag-hire",
                                      "Direktang Pag-hire",
                                    )}
                              </span>
                            </div>
                            {personas.workerIsLinkable ? (
                              <Link
                                to="/workers/$id"
                                params={{ id: personas.workerId }}
                                className={cn(
                                  subtleLinkClass,
                                  "inline text-base font-bold text-foreground hover:text-primary",
                                )}
                              >
                                {personas.workerName}
                              </Link>
                            ) : (
                              <p className="font-bold">{personas.workerName}</p>
                            )}
                            <p className="text-sm font-semibold text-primary">{b.service}</p>
                            <p className="text-xs text-muted-foreground">
                              {tx("Employer:", "Nag-book:", "Nag-book:")} {personas.employerName}
                            </p>
                          </div>
                          <StatusBadge status={b.status} hasOpenIssue={hasOpenIssue} />
                        </div>
                        <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                          {b.description}
                        </p>
                        {b.quoteNote && (
                          <p className="mt-2 rounded-xl bg-muted/60 px-3 py-1.5 text-xs text-muted-foreground">
                            <strong>
                              {tx(
                                "Worker quote note:",
                                "Paalala ng worker:",
                                "Nota sa trabahante:",
                              )}
                            </strong>{" "}
                            {b.quoteNote}
                          </p>
                        )}
                        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <CalendarDays className="size-3.5" aria-hidden />
                            {formatBookingDate(b.date, b.time)}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="size-3.5" aria-hidden /> {locDisplay}
                          </span>
                          <span className="inline-flex items-center gap-1 font-semibold text-foreground">
                            <Wallet className="size-3.5" aria-hidden /> {formatRate(b)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Progress Timeline */}
                    <BookingTimeline booking={b} variant="compact" />

                    {/* Issue Report Callout if present */}
                    <BookingIssueBanner booking={b} />

                    {/* Optional Live Location Sharing for Active In-Progress Booking */}
                    {b.status === "in_progress" && (
                      <LiveJobSharingCard
                        bookingTitle={b.service}
                        barangayId={b.barangayId}
                        targetLocation={b.location}
                      />
                    )}

                    {/* Employer Confirmation Banner when Worker marks job finished */}
                    {b.status === "awaiting_confirmation" && (
                      <div
                        className={cn(
                          "flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3.5",
                          hasOpenIssue
                            ? "border-status-declined/35 bg-status-declined-bg/45"
                            : "border-primary/30 bg-secondary/60",
                        )}
                      >
                        <div className="text-xs">
                          <p className="font-bold text-foreground">
                            {hasOpenIssue
                              ? tx(
                                  "Issue Reported — Completion & Demo Settlement On Hold",
                                  "May Naiulat na Isyu — Nakahinto ang Pagtatapos",
                                  "Naay Isyu nga Gi-report — Gipahunong ang Paghuman",
                                )
                              : tx(
                                  "Worker marked this job as finished",
                                  "Minarkahan ng manggagawa na tapos na ito",
                                  "Gimarkahan sa trabahante nga human na kini",
                                )}
                          </p>
                          <p className="text-muted-foreground">
                            {hasOpenIssue
                              ? tx(
                                  "Confirm once the worker resolves the issue or close the issue manually.",
                                  "Kumpirmahin kapag naayos na ng manggagawa ang isyu.",
                                  "Kumpirmaha kon masulbad na sa trabahante ang isyu.",
                                )
                              : tx(
                                  "Inspect the work, then confirm completion or report an issue.",
                                  "Suriin ang trabaho bago kumpirmahin o mag-ulat ng isyu.",
                                  "Susiha ang trabaho una kumpirmahon o mag-report og isyu.",
                                )}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {canReportIssue(b) && (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                setDialog({
                                  mode: "report_issue",
                                  bookingId: b.id,
                                  actorRole: "employer",
                                })
                              }
                            >
                              <MessageSquareWarning className="size-3.5" aria-hidden />{" "}
                              {tx("Report an Issue", "Mag-ulat ng Isyu", "Pag-report og Isyu")}
                            </Button>
                          )}
                          {hasOpenIssue && (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                setDialog({
                                  mode: "resolve_issue",
                                  bookingId: b.id,
                                  actorRole: "employer",
                                })
                              }
                            >
                              <ShieldCheck className="size-3.5" aria-hidden />{" "}
                              {tx("Close Issue", "Isara ang Isyu", "Isira ang Isyu")}
                            </Button>
                          )}
                          {canConfirmCompletion(b) && (
                            <Button
                              type="button"
                              size="sm"
                              onClick={() =>
                                setDialog({
                                  mode: "confirm",
                                  bookingId: b.id,
                                  actorRole: "employer",
                                })
                              }
                            >
                              <CheckCircle2 className="size-4" aria-hidden />{" "}
                              {tx(
                                "Confirm Job Completion",
                                "Kumpirmahin na Tapos",
                                "Kumpirmaha nga Human Na",
                              )}
                            </Button>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Completed Demo Settlement Separation & Rating/Review */}
                    {(b.status === "awaiting_confirmation" || b.status === "completed") && (
                      <DemoSettlementNotice booking={b} />
                    )}

                    <BookingReviewDisplay
                      booking={b}
                      canRate={b.status === "completed" && !b.review}
                      onRequestReview={() =>
                        setDialog({ mode: "review", bookingId: b.id, actorRole: "employer" })
                      }
                    />

                    {/* Employer Primary Status & Action Footer */}
                    {(canCancelBooking(b.status) ||
                      b.status === "in_progress" ||
                      ((b.status === "completed" ||
                        b.status === "declined" ||
                        b.status === "cancelled") &&
                        personas.workerIsLinkable)) && (
                      <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3">
                        <span className="text-xs text-muted-foreground">
                          {b.status === "pending"
                            ? tx(
                                `Waiting for ${personas.workerName} to confirm or submit a quote.`,
                                `Naghihintay ng tugon mula kay ${personas.workerName}.`,
                                `Naghulat sa tubag gikan kang ${personas.workerName}.`,
                              )
                            : b.status === "confirmed"
                              ? tx(
                                  "Accepted & scheduled. Worker will start at the agreed time.",
                                  "Tinanggap at naka-iskedyul na. Magsisimula ang manggagawa sa oras.",
                                  "Gidawat ug naka-iskedyul na. Mosugod ang trabahante sa oras.",
                                )
                              : b.status === "in_progress"
                                ? tx(
                                    "Job is in progress — cancellation is locked once work begins.",
                                    "Ginagawa na ang trabaho — hindi na maaaring ikansela.",
                                    "Ginahimo na ang trabaho — dili na makanselar.",
                                  )
                                : null}
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {canCancelBooking(b.status) && (
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="text-destructive hover:text-destructive"
                              onClick={() =>
                                setDialog({
                                  mode: "cancel",
                                  bookingId: b.id,
                                  actorRole: "employer",
                                })
                              }
                            >
                              <XCircle className="size-3.5" aria-hidden />{" "}
                              {tx("Cancel Booking", "Kanselahin", "Kanselahon")}
                            </Button>
                          )}
                          {(b.status === "completed" ||
                            b.status === "declined" ||
                            b.status === "cancelled") &&
                            personas.workerIsLinkable && (
                              <Button asChild size="sm" variant="outline">
                                <Link to="/book/$workerId" params={{ workerId: personas.workerId }}>
                                  {b.status === "completed"
                                    ? tx("Book Again", "I-book Muli", "I-book Pag-usab")
                                    : tx("Try Again", "Subukan Muli", "Sulayi Pag-usab")}
                                </Link>
                              </Button>
                            )}
                        </div>
                      </div>
                    )}

                    {/* Separated Two-Sided Demo Bridge (keeps simulation buttons out of Employer bar) */}
                    <TwoSidedDemoBridge
                      booking={b}
                      currentRole="employer"
                      counterpartyAction={
                        b.status === "pending" ? (
                          <>
                            <Button
                              type="button"
                              size="sm"
                              onClick={() =>
                                setDialog({ mode: "accept", bookingId: b.id, actorRole: "worker" })
                              }
                            >
                              <CheckCircle2 className="size-3.5" aria-hidden />{" "}
                              {tx(
                                "Simulate: Worker Accepts",
                                "Tinanggap ng Worker",
                                "Gidawat sa Worker",
                              )}
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                setDialog({ mode: "decline", bookingId: b.id, actorRole: "worker" })
                              }
                            >
                              {tx(
                                "Worker Declines",
                                "Tinanggihan ng Worker",
                                "Gibalibaran sa Worker",
                              )}
                            </Button>
                          </>
                        ) : b.status === "confirmed" ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="soft"
                            onClick={() =>
                              setDialog({ mode: "start", bookingId: b.id, actorRole: "worker" })
                            }
                          >
                            <Play className="size-3.5" aria-hidden />{" "}
                            {tx(
                              "Simulate: Worker Starts Job",
                              "I-simulate: Simulan ang Trabaho",
                              "I-simulate: Sugdi ang Trabaho",
                            )}
                          </Button>
                        ) : b.status === "in_progress" ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="soft"
                            onClick={() =>
                              setDialog({ mode: "finish", bookingId: b.id, actorRole: "worker" })
                            }
                          >
                            {tx(
                              "Simulate: Worker Marks Completed",
                              "I-simulate: Markahang Tapos Na",
                              "I-simulate: Markahi nga Human Na",
                            )}
                          </Button>
                        ) : undefined
                      }
                    />
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      <BookingLifecycleDialogs dialog={dialog} onClose={() => setDialog(null)} />
    </div>
  );
}
