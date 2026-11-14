import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  Bookmark,
  Briefcase,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  Eye,
  MapPin,
  MessageSquareWarning,
  Play,
  ShieldCheck,
  Sparkles,
  Tag,
  Trash2,
  Wallet,
  XCircle,
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  canCancelBooking,
  canWithdraw,
  MY_JOBS_TABS,
  resolveBookingPersonas,
  tabForStatus,
  type ApplicationStatus,
  type MyJobsTab,
} from "@/lib/gaw/bookings";
import { barangayName } from "@/lib/gaw/data";
import { FREE_WORKER_QUEUE_LIMIT } from "@/lib/gaw/domain";
import { useI18n } from "@/lib/gaw/i18n";
import { hasPlan, useGaw } from "@/lib/gaw/store";
import { cn } from "@/lib/utils";

type MyJobsSearch = { tab?: MyJobsTab | undefined; bookingId?: string | undefined };

export const Route = createFileRoute("/my-jobs")({
  validateSearch: (s: Record<string, unknown>): MyJobsSearch => {
    const valid = MY_JOBS_TABS.some((t) => t.key === s["tab"]);
    const rawBookingId =
      typeof s["bookingId"] === "string" && s["bookingId"].trim() ? s["bookingId"] : undefined;
    return {
      tab: valid ? (s["tab"] as MyJobsTab) : undefined,
      ...(rawBookingId ? { bookingId: rawBookingId } : {}),
    };
  },
  head: () => ({
    meta: [
      { title: "My Jobs — GAW Worker Mode" },
      {
        name: "description",
        content: "Manage your job applications, booking requests, active jobs, and completed work.",
      },
      { property: "og:title", content: "My Jobs — GAW Worker Mode" },
      {
        property: "og:description",
        content: "Manage your job applications, booking requests, active jobs, and completed work.",
      },
    ],
  }),
  component: MyJobsPage,
});

function MyJobsPage() {
  const { t } = useI18n();
  const search = Route.useSearch();
  return (
    <AppLayout mode="work" title={t("myJobs.pageTitle")}>
      <MyJobsManager initialTab={search.tab} initialBookingId={search.bookingId} />
    </AppLayout>
  );
}

const APP_STATUS_BADGE: Record<ApplicationStatus, { label: string; style: string }> = {
  submitted: { label: "Pending Review", style: "bg-status-pending-bg text-status-pending" },
  withdrawn: { label: "Withdrawn", style: "bg-muted text-muted-foreground" },
  hired: {
    label: "Hired · Moved to Upcoming",
    style: "bg-status-confirmed-bg text-status-confirmed",
  },
};

export function MyJobsManager({
  initialTab,
  initialBookingId,
}: {
  initialTab?: MyJobsTab | undefined;
  initialBookingId?: string | undefined;
} = {}) {
  const navigate = useNavigate();
  const gaw = useGaw();
  const {
    account,
    bookings,
    applications,
    allJobs,
    savedJobIds,
    toggleSaveJob,
    plans,
    withdrawApplication,
    simulateHire,
    workerProfile,
  } = gaw;

  const { t, tx, translateCategory, myJobsTabLabel, appStatusLabel } = useI18n();
  const { formatRate, formatBookingDate } = useBookingDisplay();

  const resolvedBookingId = initialBookingId;
  const focusedBooking = resolvedBookingId
    ? bookings.find((b) => b.id === resolvedBookingId)
    : undefined;
  const defaultTab: MyJobsTab =
    initialTab ?? (focusedBooking ? tabForStatus(focusedBooking.status) : "pending");

  const [activeTab, setActiveTab] = useState<MyJobsTab>(defaultTab);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [highlightedId, setHighlightedId] = useState<string | null>(resolvedBookingId ?? null);
  const [dialog, setDialog] = useState<LifecycleDialogState | null>(null);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    } else if (initialBookingId) {
      const b = bookings.find((x) => x.id === initialBookingId);
      if (b) setActiveTab(tabForStatus(b.status));
    }
    if (initialBookingId) {
      setHighlightedId(initialBookingId);
    }
  }, [initialTab, initialBookingId]);

  const selectedBooking = bookings.find((b) => b.id === selectedBookingId) ?? null;
  const savedJobs = allJobs.filter((j) => savedJobIds.includes(j.id));
  const isWorkerPro = hasPlan(plans, "worker");

  const counts: Record<MyJobsTab, number> = {
    applications: applications.length,
    saved: savedJobs.length,
    pending: bookings.filter((b) => tabForStatus(b.status) === "pending").length,
    upcoming: bookings.filter((b) => tabForStatus(b.status) === "upcoming").length,
    in_progress: bookings.filter((b) => tabForStatus(b.status) === "in_progress").length,
    completed: bookings.filter((b) => tabForStatus(b.status) === "completed").length,
    cancelled: bookings.filter((b) => tabForStatus(b.status) === "cancelled").length,
  };

  const tabBookings =
    activeTab === "applications" || activeTab === "saved"
      ? []
      : bookings.filter((b) => tabForStatus(b.status) === activeTab);

  const openActionDialog = (
    bookingId: string,
    mode: LifecycleDialogState["mode"],
    actorRole: "worker" | "employer" = "worker",
  ) => {
    setSelectedBookingId(null);
    setDialog({ mode, bookingId, actorRole });
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Shared-state synchronization info banner */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border bg-card px-4 py-3 text-xs text-muted-foreground shadow-soft">
        <span>
          <strong>{tx("Live Shared State:", "Live Shared State:", "Live Shared State:")}</strong>{" "}
          {tx(
            "Actions here immediately sync with the Employer",
            "Agad na nag-sy-sync ang mga aksyon dito sa dashboard ng Nag-book:",
            "Dali dayon mo-sync ang mga aksyon dinhi sa dashboard sa Nag-book:",
          )}{" "}
          <Link to="/bookings" className={cn(subtleLinkClass, "inline text-[length:inherit]")}>
            {t("bookings.pageTitle")}
          </Link>
          {tx(" dashboard.", ".", ".")}
        </span>
        {workerProfile && (
          <span className="rounded-full bg-secondary px-2.5 py-1 font-semibold text-secondary-foreground">
            {tx("Worker Skill:", "Kasanayan:", "Kahanas:")} {translateCategory(workerProfile.skill)}
          </span>
        )}
      </div>

      {/* 7 My Jobs Tabs (ARIA tablist with Left/Right/Home/End keyboard navigation) */}
      <div
        role="tablist"
        aria-label={tx(
          "My Jobs categories",
          "Mga kategorya ng Aking mga Trabaho",
          "Mga kategorya sa Akong mga Trabaho",
        )}
        className="-mx-4 flex gap-2 overflow-x-auto px-4 py-1.5"
      >
        {MY_JOBS_TABS.map((tab, index) => {
          const active = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              id={`myjobs-tab-${tab.key}`}
              type="button"
              role="tab"
              aria-selected={active}
              aria-controls="myjobs-tabpanel"
              tabIndex={active ? 0 : -1}
              onClick={() => setActiveTab(tab.key)}
              onKeyDown={(e) => {
                let targetIdx: number | null = null;
                if (e.key === "ArrowRight") targetIdx = (index + 1) % MY_JOBS_TABS.length;
                else if (e.key === "ArrowLeft") {
                  targetIdx = (index - 1 + MY_JOBS_TABS.length) % MY_JOBS_TABS.length;
                } else if (e.key === "Home") targetIdx = 0;
                else if (e.key === "End") targetIdx = MY_JOBS_TABS.length - 1;
                if (targetIdx !== null) {
                  e.preventDefault();
                  const nextKey = MY_JOBS_TABS[targetIdx]!.key;
                  setActiveTab(nextKey);
                  document.getElementById(`myjobs-tab-${nextKey}`)?.focus();
                }
              }}
              className={filterTabPillClass(
                active,
                "inline-flex h-10 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-semibold",
              )}
            >
              <span>{myJobsTabLabel(tab.key)}</span>
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-xs font-bold",
                  active
                    ? "bg-deep-foreground/15 text-deep-foreground"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {counts[tab.key]}
              </span>
            </button>
          );
        })}
      </div>

      {/* Tab 1: Applications */}
      {activeTab === "applications" && (
        <section
          id="myjobs-tabpanel"
          role="tabpanel"
          aria-labelledby="myjobs-tab-applications"
          className="space-y-3"
        >
          {applications.length === 0 ? (
            <EmptyState
              icon={<ClipboardList className="size-6" />}
              title={tx(
                "No active jobs yet. Explore nearby opportunities.",
                "Wala pang aktibong trabaho. Maghanap ng mga kalapit na oportunidad.",
                "Wala pay aktibong trabaho. Pangita og duol nga oportunidad.",
              )}
              body={tx(
                "Apply to open jobs posted by Davao City residents and track your proposals here.",
                "Mag-apply sa mga bukas na trabahong ipinost ng mga taga-Davao at subaybayan dito ang iyong aplikasyon.",
                "Pag-apply sa mga bakanteng trabaho gikan sa mga taga-Davao ug bantayi dinhi ang imong aplikasyon.",
              )}
              action={
                <Button asChild>
                  <Link to="/jobs">
                    {tx("Find Jobs", "Maghanap ng Trabaho", "Pangita og Trabaho")}
                  </Link>
                </Button>
              }
            />
          ) : (
            applications.map((app) => {
              const job = allJobs.find((j) => j.id === app.jobId);
              const badge = APP_STATUS_BADGE[app.status];
              return (
                <article
                  key={app.id}
                  className="animate-fade-up rounded-2xl border bg-card p-4 shadow-soft md:p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-semibold text-secondary-foreground">
                          {job?.category
                            ? translateCategory(job.category)
                            : tx(
                                "General Service",
                                "Pangkalahatang Serbisyo",
                                "Kinatibuk-ang Serbisyo",
                              )}
                        </span>
                        <span
                          className={cn(
                            "rounded-full px-2.5 py-0.5 text-xs font-semibold",
                            badge.style,
                          )}
                        >
                          {appStatusLabel(app.status)}
                        </span>
                      </div>
                      <h3 className="text-lg font-bold">
                        {job?.title ??
                          tx("Job Application", "Aplikasyon sa Trabaho", "Aplikasyon sa Trabaho")}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {tx("Employer:", "Nag-book:", "Nag-book:")}{" "}
                        <strong className="text-foreground">
                          {job?.poster ??
                            tx("Local Resident", "Lokal na Residente", "Lokal nga Residente")}
                        </strong>
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">
                        {tx("Quoted Rate", "Alok na Bayad", "Gisugyot nga Bayad")}
                      </p>
                      <p className="text-base font-extrabold text-primary">{app.rate}</p>
                    </div>
                  </div>

                  <p className="mt-2 rounded-xl bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
                    {tx("Your pitch:", "Mensahe mo:", "Imong mensahe:")} “{app.message}”
                  </p>

                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="size-3.5" aria-hidden />{" "}
                      {job ? barangayName(job.barangayId) : "Davao City"}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <CalendarDays className="size-3.5" aria-hidden />{" "}
                      {job?.schedule ??
                        tx(
                          "Flexible schedule",
                          "Pwedeng pag-usapan ang oras",
                          "Flexible ang iskedyul",
                        )}
                    </span>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t pt-3">
                    <div className="flex flex-wrap gap-2">
                      {job && (
                        <Button asChild size="sm" variant="outline">
                          <Link to="/jobs/$id" params={{ id: job.id }}>
                            <Eye className="size-3.5" />{" "}
                            {tx("View Job Details", "Tingnan ang Detalye", "Tan-awa ang Detalye")}
                          </Link>
                        </Button>
                      )}
                      {canWithdraw(app.status) && (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            withdrawApplication(app.id);
                            toast(
                              tx(
                                "Application withdrawn",
                                "Binawi ang aplikasyon",
                                "Gibakwi ang aplikasyon",
                              ),
                            );
                          }}
                        >
                          <XCircle className="size-3.5" /> {t("myJobs.withdrawApp")}
                        </Button>
                      )}
                    </div>

                    {app.status === "submitted" && (
                      <Button
                        type="button"
                        size="sm"
                        variant="gold"
                        onClick={() => {
                          const bookingId = simulateHire(app.id);
                          if (bookingId) {
                            toast.success(
                              tx(
                                "Employer hired you! Job added to Upcoming.",
                                "Kinuha ka ng nag-book! Idinagdag sa Nakaiskedyul.",
                                "Gikuha ka sa nag-book! Gidugang sa Umaabot.",
                              ),
                            );
                            setActiveTab("upcoming");
                          }
                        }}
                      >
                        <Sparkles className="size-3.5" />{" "}
                        {tx(
                          "Simulate Employer Hire",
                          "I-simulate ang Pag-hire",
                          "I-simulate ang Pag-hire",
                        )}
                      </Button>
                    )}
                  </div>
                </article>
              );
            })
          )}
        </section>
      )}

      {/* Tab 2: Saved / Desired Jobs */}
      {activeTab === "saved" && (
        <section
          id="myjobs-tabpanel"
          role="tabpanel"
          aria-labelledby="myjobs-tab-saved"
          className="space-y-3"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border bg-card px-4 py-3 text-xs shadow-soft">
            <span className="font-semibold text-foreground">
              {isWorkerPro
                ? tx(
                    `${savedJobs.length} saved jobs · Unlimited queue (Worker Pro)`,
                    `${savedJobs.length} naka-save · Walang limit (Worker Pro)`,
                    `${savedJobs.length} gi-save · Walay limit (Worker Pro)`,
                  )
                : tx(
                    `${savedJobs.length} of ${FREE_WORKER_QUEUE_LIMIT} saved queue slots used (Free)`,
                    `${savedJobs.length} sa ${FREE_WORKER_QUEUE_LIMIT} naka-save na trabaho ang gamit (Free)`,
                    `${savedJobs.length} sa ${FREE_WORKER_QUEUE_LIMIT} ka gi-save nga trabaho ang nagamit (Free)`,
                  )}
            </span>
            {!isWorkerPro && (
              <Link to="/pro" className={subtleLinkClass}>
                {tx("Unlock unlimited →", "I-unlock ang unlimited →", "I-unlock ang unlimited →")}
              </Link>
            )}
          </div>

          {savedJobs.length === 0 ? (
            <EmptyState
              icon={<Bookmark className="size-6" />}
              title={tx(
                "No saved jobs yet",
                "Wala pang naka-save na trabaho",
                "Wala pay gi-save nga trabaho",
              )}
              body={tx(
                "Tap the bookmark icon on any listing in Find Jobs to shortlist gigs you want to apply for.",
                "Pindutin ang bookmark sa alinmang trabaho sa Maghanap ng Trabaho para i-save ito rito.",
                "Pindota ang bookmark sa bisan unsang trabaho sa Pangita og Trabaho aron ma-save dinhi.",
              )}
              action={
                <Button asChild>
                  <Link to="/jobs">
                    {tx("Browse Open Jobs", "Maghanap ng Trabaho", "Pangita og Trabaho")}
                  </Link>
                </Button>
              }
            />
          ) : (
            savedJobs.map((job) => {
              const hasApplied = applications.some(
                (a) => a.jobId === job.id && a.status !== "withdrawn",
              );
              return (
                <article
                  key={job.id}
                  className="animate-fade-up rounded-2xl border bg-card p-4 shadow-soft md:p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-semibold text-secondary-foreground">
                          {translateCategory(job.category)}
                        </span>
                        {hasApplied && (
                          <span className="rounded-full bg-status-confirmed-bg px-2.5 py-0.5 text-xs font-semibold text-status-confirmed">
                            {tx("Applied", "Nag-apply na", "Naka-apply na")}
                          </span>
                        )}
                      </div>
                      <h3 className="text-lg font-bold">{job.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {job.poster} · {barangayName(job.barangayId)}
                        {job.landmark ? ` (${job.landmark})` : ""}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-base font-extrabold text-primary">{job.budget}</p>
                      <p className="text-xs text-muted-foreground">
                        {job.schedule} · {job.estimatedHours}h
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center justify-end gap-2 border-t pt-3">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        toggleSaveJob(job.id);
                        toast(
                          tx(
                            `Removed “${job.title}” from saved jobs`,
                            `Inalis ang “${job.title}” sa naka-save`,
                            `Gikuha ang “${job.title}” sa gi-save`,
                          ),
                        );
                      }}
                    >
                      <Trash2 className="size-3.5" aria-hidden />
                      {tx("Remove", "Alisin", "Kuhaa")}
                    </Button>
                    <Button asChild size="sm">
                      <Link to="/jobs/$id" params={{ id: job.id }}>
                        {hasApplied
                          ? tx("View Details", "Tingnan ang Detalye", "Tan-awa ang Detalye")
                          : tx("View & Apply", "Tingnan at Mag-apply", "Tan-awa ug Mo-apply")}
                      </Link>
                    </Button>
                  </div>
                </article>
              );
            })
          )}
        </section>
      )}

      {/* Tabs 3-7: Booking State Machine Tabs */}
      {activeTab !== "applications" && activeTab !== "saved" && (
        <section
          id="myjobs-tabpanel"
          role="tabpanel"
          aria-labelledby={`myjobs-tab-${activeTab}`}
          className="space-y-3"
        >
          {tabBookings.length === 0 ? (
            <EmptyState
              icon={<Briefcase className="size-6" />}
              title={tx(
                "No active jobs yet. Explore nearby opportunities.",
                "Wala pang aktibong trabaho. Maghanap ng mga kalapit na oportunidad.",
                "Wala pay aktibong trabaho. Pangita og duol nga oportunidad.",
              )}
              body={tx(
                "When employers send booking requests or jobs move to this stage, they will appear here.",
                "Kapag may ipinadalang booking request o may trabahong umabot sa yugtong ito, lalabas ito rito.",
                "Kon naay ipadala nga booking request o trabahong moabot ani nga yugto, makita kini dinhi.",
              )}
              action={
                <Button asChild>
                  <Link to="/jobs">
                    {tx("Find Jobs", "Maghanap ng Trabaho", "Pangita og Trabaho")}
                  </Link>
                </Button>
              }
            />
          ) : (
            tabBookings.map((b) => {
              const personas = resolveBookingPersonas(b, {
                currentUserName: account?.name,
                workerSkill: workerProfile?.skill,
                viewerRole: "worker",
              });
              const rawCategory = b.jobId
                ? (allJobs.find((j) => j.id === b.jobId)?.category ?? b.service)
                : (workerProfile?.skill ?? b.service);
              const jobCategory = translateCategory(rawCategory);
              const locDisplay = b.location?.label ?? barangayName(b.barangayId);
              const hasOpenIssue = b.issueReport?.status === "open";
              const needsQuote = b.budget === null && !b.quotedAmount && !b.rateText;
              const isHighlighted = highlightedId === b.id;

              return (
                <article
                  key={b.id}
                  data-booking-id={b.id}
                  className={cn(
                    "animate-fade-up space-y-3 rounded-2xl border bg-card p-4 shadow-soft md:p-5",
                    isHighlighted && "border-primary/60 ring-2 ring-primary/35",
                  )}
                >
                  <div className="flex items-start gap-3.5">
                    <Avatar initials={personas.employerInitials} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <div className="mb-1 flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-0.5 text-xs font-semibold text-secondary-foreground">
                              <Tag className="size-3" aria-hidden /> {jobCategory}
                            </span>
                            {personas.isSyncedCrossSide && (
                              <span className="rounded-full bg-gold-soft px-2.5 py-0.5 text-xs font-semibold text-gold-foreground dark:text-gold">
                                {tx("Assigned:", "Naka-assign:", "Gi-assign:")}{" "}
                                {personas.workerName}
                              </span>
                            )}
                          </div>
                          <h3 className="text-lg font-bold leading-snug">{b.service}</h3>
                          <p className="text-sm text-muted-foreground">
                            {tx("Employer:", "Nag-book:", "Nag-book:")}{" "}
                            <strong className="text-foreground">{personas.employerName}</strong>
                          </p>
                        </div>
                        <StatusBadge status={b.status} hasOpenIssue={hasOpenIssue} />
                      </div>

                      <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                        {b.description}
                      </p>

                      {b.quoteNote && (
                        <p className="mt-2 rounded-xl bg-muted/60 px-3 py-1.5 text-xs text-muted-foreground">
                          <strong>{tx("Quote note:", "Paalala:", "Nota:")}</strong> {b.quoteNote}
                        </p>
                      )}

                      <dl className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
                        <div className="inline-flex items-center gap-1">
                          <MapPin className="size-3.5 text-primary" aria-hidden />
                          <dt className="sr-only">
                            {tx("General Location", "Lokasyon", "Lokasyon")}
                          </dt>
                          <dd>{locDisplay}</dd>
                        </div>
                        <div className="inline-flex items-center gap-1">
                          <CalendarDays className="size-3.5 text-primary" aria-hidden />
                          <dt className="sr-only">{tx("Scheduled Date", "Petsa", "Petsa")}</dt>
                          <dd>{formatBookingDate(b.date, b.time)}</dd>
                        </div>
                        <div className="inline-flex items-center gap-1 font-semibold text-foreground">
                          <Wallet className="size-3.5 text-primary" aria-hidden />
                          <dt className="sr-only">
                            {tx(
                              "Agreed Rate or Quotation",
                              "Napagkasunduang Bayad",
                              "Gikasabotang Bayad",
                            )}
                          </dt>
                          <dd>{formatRate(b)}</dd>
                        </div>
                      </dl>
                    </div>
                  </div>

                  {/* Compact 5-Stage Lifecycle Timeline */}
                  <BookingTimeline booking={b} variant="compact" />

                  <BookingIssueBanner booking={b} />

                  {/* Optional Live GPS Location Sharing during active (`in_progress`) booking */}
                  {b.status === "in_progress" && (
                    <LiveJobSharingCard
                      bookingTitle={b.service}
                      barangayId={b.barangayId}
                      targetLocation={b.location}
                    />
                  )}

                  {b.status === "completed" && (
                    <>
                      <DemoSettlementNotice booking={b} />
                      <BookingReviewDisplay booking={b} />
                    </>
                  )}

                  {/* Single-Primary-Action Worker Control Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedBookingId(b.id)}
                    >
                      <Eye className="size-3.5" />
                      {b.status === "completed"
                        ? tx(
                            "View Completed Job",
                            "Tingnan ang Natapos na Trabaho",
                            "Tan-awa ang Nahuman nga Trabaho",
                          )
                        : tx("View Details", "Tingnan ang Detalye", "Tan-awa ang Detalye")}
                    </Button>

                    <div className="flex flex-wrap items-center gap-2">
                      {b.status === "pending" && (
                        <>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => openActionDialog(b.id, "decline")}
                          >
                            <XCircle className="size-3.5" />{" "}
                            {tx("Decline Request", "Tanggihan ang Request", "Balibari ang Request")}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => openActionDialog(b.id, "accept")}
                          >
                            <CheckCircle2 className="size-3.5" />{" "}
                            {needsQuote
                              ? tx(
                                  "Propose Quote & Accept",
                                  "Mag-alok at Tanggapin",
                                  "Pagsugyot ug Dawata",
                                )
                              : t("myJobs.acceptBooking")}
                          </Button>
                        </>
                      )}

                      {b.status === "confirmed" && (
                        <>
                          {canCancelBooking(b.status) && (
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="text-destructive hover:text-destructive"
                              onClick={() => openActionDialog(b.id, "cancel")}
                            >
                              <XCircle className="size-3.5" />{" "}
                              {tx("Cancel", "Kanselahin", "Kanselahon")}
                            </Button>
                          )}
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => openActionDialog(b.id, "start")}
                          >
                            <Play className="size-3.5" /> {t("myJobs.startWork")}
                          </Button>
                        </>
                      )}

                      {b.status === "in_progress" && (
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => openActionDialog(b.id, "finish")}
                        >
                          <ClipboardCheck className="size-3.5" /> {t("myJobs.completeWork")}
                        </Button>
                      )}

                      {b.status === "awaiting_confirmation" && hasOpenIssue && (
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => openActionDialog(b.id, "resolve_issue")}
                        >
                          <ShieldCheck className="size-3.5" />{" "}
                          {tx(
                            "Resolve Issue & Resubmit",
                            "Ayusin ang Isyu at Ipasa Muli",
                            "Sulbara ang Isyu ug Ipasa Pag-usab",
                          )}
                        </Button>
                      )}

                      {b.status === "awaiting_confirmation" && !hasOpenIssue && (
                        <span className="rounded-full bg-status-pending-bg px-3 py-1 text-xs font-semibold text-status-pending">
                          {tx(
                            "Waiting for employer confirmation",
                            "Naghihintay ng kumpirmasyon ng nag-book",
                            "Naghulat sa kumpirmasyon sa nag-book",
                          )}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Separated Two-Sided Demo Bridge */}
                  <TwoSidedDemoBridge
                    booking={b}
                    currentRole="worker"
                    counterpartyAction={
                      b.status === "awaiting_confirmation" && !hasOpenIssue ? (
                        <>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => openActionDialog(b.id, "report_issue", "employer")}
                          >
                            <MessageSquareWarning className="size-3.5" />{" "}
                            {tx("Simulate Issue", "I-simulate ang Isyu", "I-simulate ang Isyu")}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="gold"
                            onClick={() => openActionDialog(b.id, "confirm", "employer")}
                          >
                            <CheckCircle2 className="size-3.5" />{" "}
                            {tx(
                              "Simulate Employer Confirm",
                              "Kumpirmahin (Demo)",
                              "Kumpirmaha (Demo)",
                            )}
                          </Button>
                        </>
                      ) : undefined
                    }
                  />
                </article>
              );
            })
          )}
        </section>
      )}

      {/* Job Details Modal */}
      <Dialog open={!!selectedBooking} onOpenChange={(open) => !open && setSelectedBookingId(null)}>
        <DialogContent className="max-w-lg rounded-3xl">
          {selectedBooking &&
            (() => {
              const personas = resolveBookingPersonas(selectedBooking, {
                currentUserName: account?.name,
                workerSkill: workerProfile?.skill,
                viewerRole: "worker",
              });
              const locDisplay =
                selectedBooking.location?.label ?? barangayName(selectedBooking.barangayId);
              const hasOpenIssue = selectedBooking.issueReport?.status === "open";
              const needsQuote =
                selectedBooking.budget === null &&
                !selectedBooking.quotedAmount &&
                !selectedBooking.rateText;

              return (
                <>
                  <DialogHeader>
                    <div className="flex items-center justify-between gap-2 pr-6">
                      <StatusBadge status={selectedBooking.status} hasOpenIssue={hasOpenIssue} />
                      <span className="text-xs text-muted-foreground">
                        Booking ID: {selectedBooking.id}
                      </span>
                    </div>
                    <DialogTitle className="mt-2 text-xl font-extrabold">
                      {selectedBooking.service}
                    </DialogTitle>
                    <DialogDescription>
                      {tx("Employer:", "Nag-book:", "Nag-book:")}{" "}
                      <strong>{personas.employerName}</strong>
                      {personas.isSyncedCrossSide
                        ? ` · ${tx("Assigned:", "Naka-assign:", "Gi-assign:")} ${personas.workerName}`
                        : ""}
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-4 text-sm">
                    <div className="rounded-2xl border bg-muted/35 p-3">
                      <BookingTimeline booking={selectedBooking} variant="full" />
                    </div>

                    <div className="rounded-2xl bg-muted p-3.5">
                      <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                        {tx("Job Description", "Paglalarawan ng Trabaho", "Deskripsyon sa Trabaho")}
                      </p>
                      <p className="mt-1 text-foreground">{selectedBooking.description}</p>
                    </div>

                    <dl className="grid grid-cols-2 gap-3 text-xs">
                      <div className="rounded-xl border p-3">
                        <dt className="text-muted-foreground">
                          {tx("General Location", "Lokasyon", "Lokasyon")}
                        </dt>
                        <dd className="mt-0.5 font-bold text-foreground">{locDisplay}</dd>
                      </div>
                      <div className="rounded-xl border p-3">
                        <dt className="text-muted-foreground">
                          {tx("Scheduled Date & Time", "Petsa at Oras", "Petsa ug Oras")}
                        </dt>
                        <dd className="mt-0.5 font-bold text-foreground">
                          {formatBookingDate(selectedBooking.date, selectedBooking.time)}
                        </dd>
                      </div>
                      <div className="rounded-xl border p-3">
                        <dt className="text-muted-foreground">
                          {tx("Agreed Rate / Quote", "Bayad / Alok", "Bayad / Presyo")}
                        </dt>
                        <dd className="mt-0.5 font-bold text-primary">
                          {formatRate(selectedBooking)}
                        </dd>
                      </div>
                      <div className="rounded-xl border p-3">
                        <dt className="text-muted-foreground">
                          {tx("Barangay Area", "Barangay", "Barangay")}
                        </dt>
                        <dd className="mt-0.5 font-bold text-foreground">
                          {barangayName(selectedBooking.barangayId)}
                        </dd>
                      </div>
                    </dl>

                    <BookingIssueBanner booking={selectedBooking} />
                    <DemoSettlementNotice booking={selectedBooking} />
                    <BookingReviewDisplay booking={selectedBooking} />

                    {/* Valid State Actions inside Dialog */}
                    <div className="flex flex-wrap justify-end gap-2 border-t pt-3">
                      {selectedBooking.status === "pending" && (
                        <>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => openActionDialog(selectedBooking.id, "decline")}
                          >
                            {t("myJobs.declineBooking")}
                          </Button>
                          <Button
                            type="button"
                            onClick={() => openActionDialog(selectedBooking.id, "accept")}
                          >
                            {needsQuote
                              ? tx(
                                  "Propose Quote & Accept",
                                  "Mag-alok at Tanggapin",
                                  "Pagsugyot ug Dawata",
                                )
                              : t("myJobs.acceptBooking")}
                          </Button>
                        </>
                      )}
                      {selectedBooking.status === "confirmed" && (
                        <>
                          {canCancelBooking(selectedBooking.status) && (
                            <Button
                              type="button"
                              variant="ghost"
                              className="text-destructive hover:text-destructive"
                              onClick={() => openActionDialog(selectedBooking.id, "cancel")}
                            >
                              {tx("Cancel", "Kanselahin", "Kanselahon")}
                            </Button>
                          )}
                          <Button
                            type="button"
                            onClick={() => openActionDialog(selectedBooking.id, "start")}
                          >
                            {t("myJobs.startWork")}
                          </Button>
                        </>
                      )}
                      {selectedBooking.status === "in_progress" && (
                        <Button
                          type="button"
                          onClick={() => openActionDialog(selectedBooking.id, "finish")}
                        >
                          {t("myJobs.completeWork")}
                        </Button>
                      )}
                      {selectedBooking.status === "awaiting_confirmation" && hasOpenIssue && (
                        <Button
                          type="button"
                          onClick={() => openActionDialog(selectedBooking.id, "resolve_issue")}
                        >
                          {tx("Resolve Issue & Resubmit", "Ayusin ang Isyu", "Sulbara ang Isyu")}
                        </Button>
                      )}
                      {selectedBooking.status === "awaiting_confirmation" && !hasOpenIssue && (
                        <Button
                          type="button"
                          variant="gold"
                          onClick={() =>
                            openActionDialog(selectedBooking.id, "confirm", "employer")
                          }
                        >
                          {tx(
                            "Simulate Employer Confirm",
                            "Kumpirmahin (Demo)",
                            "Kumpirmaha (Demo)",
                          )}
                        </Button>
                      )}
                      <Button asChild type="button" variant="outline">
                        <Link to="/requests/$id" params={{ id: selectedBooking.id }}>
                          {tx("Full Request Page", "Buong Detalye", "Tibuok nga Pahina")}
                        </Link>
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setSelectedBookingId(null)}
                      >
                        {t("common.close")}
                      </Button>
                    </div>
                  </div>
                </>
              );
            })()}
        </DialogContent>
      </Dialog>

      <BookingLifecycleDialogs
        dialog={dialog}
        onClose={() => setDialog(null)}
        onNavigateViewJob={(b) => setSelectedBookingId(b.id)}
        onNavigateMyJobs={(b, targetTab) => {
          setActiveTab(targetTab);
          setHighlightedId(b.id);
        }}
        onTransitionSuccess={(b, actionMode) => {
          if (actionMode === "accept") {
            setActiveTab("upcoming");
            setHighlightedId(b.id);
          } else if (actionMode === "decline" || actionMode === "cancel") {
            setActiveTab("cancelled");
            setHighlightedId(b.id);
          } else if (
            actionMode === "start" ||
            actionMode === "finish" ||
            actionMode === "report_issue" ||
            actionMode === "resolve_issue"
          ) {
            setActiveTab("in_progress");
            setHighlightedId(b.id);
          } else if (actionMode === "confirm") {
            setActiveTab("completed");
            setHighlightedId(b.id);
          }
          navigate({
            to: "/my-jobs",
            search: { tab: tabForStatus(b.status), bookingId: b.id },
          });
        }}
      />
    </div>
  );
}
