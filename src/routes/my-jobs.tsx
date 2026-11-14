import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Briefcase,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Eye,
  MapPin,
  Play,
  Sparkles,
  Tag,
  UserCheck,
  Wallet,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { AppLayout } from "@/components/gaw/AppLayout";
import { formatTime } from "@/components/gaw/BookingForm";
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
  canWithdraw,
  MY_JOBS_TABS,
  tabForStatus,
  type ApplicationStatus,
  type BookingAction,
  type MyJobsTab,
} from "@/lib/gaw/bookings";
import { barangayName, DEMO_PERSONAS, JOBS, WORKERS } from "@/lib/gaw/data";
import { formatPeso, useGaw, type Booking } from "@/lib/gaw/store";
import { cn } from "@/lib/utils";

type MyJobsSearch = { tab?: MyJobsTab | undefined };

export const Route = createFileRoute("/my-jobs")({
  validateSearch: (s: Record<string, unknown>): MyJobsSearch => {
    const valid = MY_JOBS_TABS.some((t) => t.key === s["tab"]);
    return { tab: valid ? (s["tab"] as MyJobsTab) : undefined };
  },
  head: () => ({
    meta: [
      { title: "My Jobs — GAW Worker Mode" },
      { name: "description", content: "Manage your job applications, booking requests, active jobs, and completed work." },
      { property: "og:title", content: "My Jobs — GAW Worker Mode" },
      { property: "og:description", content: "Manage your job applications, booking requests, active jobs, and completed work." },
    ],
  }),
  component: MyJobsPage,
});

function MyJobsPage() {
  return (
    <AppLayout mode="work" title="My Jobs">
      <MyJobsManager />
    </AppLayout>
  );
}

const APP_STATUS_BADGE: Record<ApplicationStatus, { label: string; style: string }> = {
  submitted: { label: "Pending Review", style: "bg-status-pending-bg text-status-pending" },
  withdrawn: { label: "Withdrawn", style: "bg-muted text-muted-foreground" },
  hired: { label: "Hired · Moved to Upcoming", style: "bg-status-confirmed-bg text-status-confirmed" },
};

/** Ensure clearly separated employer persona when viewing a synced hiring booking in Worker Mode. */
function employerDisplay(b: Booking, currentUserName?: string) {
  if (b.side === "hiring") {
    const w = WORKERS.find((x) => x.id === b.workerId);
    const clientName =
      b.client.name && b.client.name !== currentUserName
        ? b.client.name
        : `${DEMO_PERSONAS[0]!.name} (Employer)`;
    const clientInitials =
      b.client.name && b.client.name !== currentUserName
        ? b.client.initials
        : DEMO_PERSONAS[0]!.initials;
    return {
      employerName: clientName,
      employerInitials: clientInitials,
      workerNote: w ? `Assigned Worker: ${w.name} (${w.skill})` : undefined,
    };
  }
  return {
    employerName: b.client.name,
    employerInitials: b.client.initials,
    workerNote: undefined,
  };
}

function MyJobsManager() {
  const search = Route.useSearch();
  const gaw = useGaw();
  const {
    account,
    bookings,
    applications,
    bookingAction,
    withdrawApplication,
    simulateHire,
    workerProfile,
  } = gaw;

  const [activeTab, setActiveTab] = useState<MyJobsTab>(search.tab ?? "pending");
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);

  const selectedBooking = bookings.find((b) => b.id === selectedBookingId) ?? null;

  const counts: Record<MyJobsTab, number> = {
    applications: applications.length,
    pending: bookings.filter((b) => tabForStatus(b.status) === "pending").length,
    upcoming: bookings.filter((b) => tabForStatus(b.status) === "upcoming").length,
    in_progress: bookings.filter((b) => tabForStatus(b.status) === "in_progress").length,
    completed: bookings.filter((b) => tabForStatus(b.status) === "completed").length,
    cancelled: bookings.filter((b) => tabForStatus(b.status) === "cancelled").length,
  };

  const tabBookings =
    activeTab === "applications"
      ? []
      : bookings.filter((b) => tabForStatus(b.status) === activeTab);

  const handleAction = (b: Booking, action: BookingAction) => {
    bookingAction(b.id, action);
    switch (action) {
      case "accept":
        toast.success(`Accepted “${b.service}” — moved to Upcoming`);
        setActiveTab("upcoming");
        break;
      case "decline":
        toast(`Declined “${b.service}” — moved to Cancelled`);
        setActiveTab("cancelled");
        break;
      case "start":
        toast.success(`Started “${b.service}” — moved to In Progress`);
        setActiveTab("in_progress");
        break;
      case "finish":
        toast.success(`Marked “${b.service}” as finished — awaiting employer confirmation`);
        break;
      case "confirm":
        toast.success(`Employer confirmed completion of “${b.service}” — moved to Completed`);
        setActiveTab("completed");
        break;
      case "cancel":
        toast(`Booking “${b.service}” cancelled`);
        setActiveTab("cancelled");
        break;
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Shared-state synchronization info banner */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border bg-card px-4 py-3 text-xs text-muted-foreground shadow-soft">
        <span>
          <strong>Live Shared State:</strong> Actions here immediately sync with the Employer{" "}
          <Link to="/bookings" className={cn(subtleLinkClass, "inline text-[length:inherit]")}>
            My Bookings
          </Link>{" "}
          dashboard.
        </span>
        {workerProfile && (
          <span className="rounded-full bg-secondary px-2.5 py-1 font-semibold text-secondary-foreground">
            Worker Skill: {workerProfile.skill}
          </span>
        )}
      </div>

      {/* 6 My Jobs Tabs */}
      <div
        role="tablist"
        aria-label="My Jobs categories"
        className="-mx-4 flex gap-2 overflow-x-auto px-4 py-1.5"
      >
        {MY_JOBS_TABS.map((t) => {
          const active = activeTab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setActiveTab(t.key)}
              className={filterTabPillClass(
                active,
                "inline-flex h-10 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-semibold",
              )}
            >
              <span>{t.label}</span>
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-xs font-bold",
                  active ? "bg-deep-foreground/15 text-deep-foreground" : "bg-muted text-muted-foreground",
                )}
              >
                {counts[t.key]}
              </span>
            </button>
          );
        })}
      </div>

      {/* Tab 1: Applications */}
      {activeTab === "applications" && (
        <section aria-label="Job Applications" className="space-y-3">
          {applications.length === 0 ? (
            <EmptyState
              icon={<ClipboardList className="size-6" />}
              title="No active jobs yet. Explore nearby opportunities."
              body="Apply to open jobs posted by Davao City residents and track your proposals here."
              action={
                <Button asChild>
                  <Link to="/jobs">Find Jobs</Link>
                </Button>
              }
            />
          ) : (
            applications.map((app) => {
              const job = JOBS.find((j) => j.id === app.jobId);
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
                          {job?.category ?? "General Service"}
                        </span>
                        <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", badge.style)}>
                          {badge.label}
                        </span>
                      </div>
                      <h3 className="text-lg font-bold">{job?.title ?? "Job Application"}</h3>
                      <p className="text-sm text-muted-foreground">
                        Employer: <strong className="text-foreground">{job?.poster ?? "Local Resident"}</strong>
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Quoted Rate</p>
                      <p className="text-base font-extrabold text-primary">{app.rate}</p>
                    </div>
                  </div>

                  <p className="mt-2 rounded-xl bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
                    Your pitch: “{app.message}”
                  </p>

                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="size-3.5" aria-hidden />{" "}
                      {job ? barangayName(job.barangayId) : "Davao City"}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <CalendarDays className="size-3.5" aria-hidden />{" "}
                      {job?.schedule ?? "Flexible schedule"}
                    </span>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t pt-3">
                    <div className="flex flex-wrap gap-2">
                      {job && (
                        <Button asChild size="sm" variant="outline">
                          <Link to="/jobs/$id" params={{ id: job.id }}>
                            <Eye className="size-3.5" /> View Job Details
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
                            toast("Application withdrawn");
                          }}
                        >
                          <XCircle className="size-3.5" /> Withdraw Pending Application
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
                            toast.success("Employer hired you! Job added to Upcoming.");
                            setActiveTab("upcoming");
                          }
                        }}
                      >
                        <Sparkles className="size-3.5" /> Simulate Employer Hire
                      </Button>
                    )}
                  </div>
                </article>
              );
            })
          )}
        </section>
      )}

      {/* Tabs 2-6: Booking State Machine Tabs */}
      {activeTab !== "applications" && (
        <section aria-label={activeTab} className="space-y-3">
          {tabBookings.length === 0 ? (
            <EmptyState
              icon={<Briefcase className="size-6" />}
              title="No active jobs yet. Explore nearby opportunities."
              body="When employers send booking requests or jobs move to this stage, they will appear here."
              action={
                <Button asChild>
                  <Link to="/jobs">Find Jobs</Link>
                </Button>
              }
            />
          ) : (
            tabBookings.map((b) => {
              const { employerName, employerInitials, workerNote } = employerDisplay(b, account?.name);
              const jobCategory =
                b.jobId
                  ? (JOBS.find((j) => j.id === b.jobId)?.category ?? b.service)
                  : (workerProfile?.skill ?? b.service);
              const rateDisplay = b.rateText ?? (b.budget ? formatPeso(b.budget) : "Quote requested");
              const locDisplay = b.location?.label ?? barangayName(b.barangayId);

              return (
                <article
                  key={b.id}
                  className="animate-fade-up rounded-2xl border bg-card p-4 shadow-soft md:p-5"
                >
                  <div className="flex items-start gap-3.5">
                    <Avatar initials={employerInitials} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <div className="mb-1 flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-0.5 text-xs font-semibold text-secondary-foreground">
                              <Tag className="size-3" aria-hidden /> {jobCategory}
                            </span>
                            {workerNote && (
                              <span className="rounded-full bg-gold-soft px-2.5 py-0.5 text-xs font-semibold text-gold-foreground">
                                {workerNote}
                              </span>
                            )}
                          </div>
                          <h3 className="text-lg font-bold leading-snug">{b.service}</h3>
                          <p className="text-sm text-muted-foreground">
                            Employer: <strong className="text-foreground">{employerName}</strong>
                          </p>
                        </div>
                        <StatusBadge status={b.status} />
                      </div>

                      <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{b.description}</p>

                      <dl className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
                        <div className="inline-flex items-center gap-1">
                          <MapPin className="size-3.5 text-primary" aria-hidden />
                          <dt className="sr-only">General Location</dt>
                          <dd>{locDisplay}</dd>
                        </div>
                        <div className="inline-flex items-center gap-1">
                          <CalendarDays className="size-3.5 text-primary" aria-hidden />
                          <dt className="sr-only">Scheduled Date</dt>
                          <dd>
                            {new Date(b.date + "T00:00").toLocaleDateString("en-PH", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}{" "}
                            · {formatTime(b.time)}
                          </dd>
                        </div>
                        <div className="inline-flex items-center gap-1 font-semibold text-foreground">
                          <Wallet className="size-3.5 text-primary" aria-hidden />
                          <dt className="sr-only">Agreed Rate or Quotation</dt>
                          <dd>{rateDisplay}</dd>
                        </div>
                      </dl>
                    </div>
                  </div>

                  {/* Optional Live GPS Location Sharing during active (`in_progress`) booking */}
                  {b.status === "in_progress" && (
                    <LiveJobSharingCard
                      bookingTitle={b.service}
                      barangayId={b.barangayId}
                      targetLocation={b.location}
                    />
                  )}

                  {/* Action Bar Enforcing Valid State Transitions */}
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t pt-3">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedBookingId(b.id)}
                    >
                      <Eye className="size-3.5" />
                      {b.status === "completed" ? "View Completed Job" : "View Details"}
                    </Button>

                    <div className="flex flex-wrap items-center gap-2">
                      {b.status === "pending" && (
                        <>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => handleAction(b, "decline")}
                          >
                            <XCircle className="size-3.5" /> Decline Booking Request
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => handleAction(b, "accept")}
                          >
                            <CheckCircle2 className="size-3.5" /> Accept Booking Request
                          </Button>
                        </>
                      )}

                      {b.status === "confirmed" && (
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => handleAction(b, "start")}
                        >
                          <Play className="size-3.5" /> Start Job
                        </Button>
                      )}

                      {b.status === "in_progress" && (
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => handleAction(b, "finish")}
                        >
                          <CheckCircle2 className="size-3.5" /> Mark Job as Completed
                        </Button>
                      )}

                      {b.status === "awaiting_confirmation" && (
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-medium text-muted-foreground">
                            Waiting for employer confirmation
                          </span>
                          <Button
                            type="button"
                            size="sm"
                            variant="gold"
                            onClick={() => handleAction(b, "confirm")}
                          >
                            <UserCheck className="size-3.5" /> Confirm Completion (Employer Demo)
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </section>
      )}

      {/* Job Details Modal */}
      <Dialog open={!!selectedBooking} onOpenChange={(open) => !open && setSelectedBookingId(null)}>
        <DialogContent className="max-w-lg rounded-3xl">
          {selectedBooking && (() => {
            const { employerName, workerNote } = employerDisplay(selectedBooking, account?.name);
            const rateDisplay =
              selectedBooking.rateText ??
              (selectedBooking.budget ? formatPeso(selectedBooking.budget) : "Quote requested");
            const locDisplay = selectedBooking.location?.label ?? barangayName(selectedBooking.barangayId);

            return (
              <>
                <DialogHeader>
                  <div className="flex items-center justify-between gap-2 pr-6">
                    <StatusBadge status={selectedBooking.status} />
                    <span className="text-xs text-muted-foreground">Booking ID: {selectedBooking.id}</span>
                  </div>
                  <DialogTitle className="mt-2 text-xl font-extrabold">{selectedBooking.service}</DialogTitle>
                  <DialogDescription>
                    Employer: <strong>{employerName}</strong>
                    {workerNote ? ` · ${workerNote}` : ""}
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 text-sm">
                  <div className="rounded-2xl bg-muted p-3.5">
                    <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                      Job Description
                    </p>
                    <p className="mt-1 text-foreground">{selectedBooking.description}</p>
                  </div>

                  <dl className="grid grid-cols-2 gap-3 text-xs">
                    <div className="rounded-xl border p-3">
                      <dt className="text-muted-foreground">General Location</dt>
                      <dd className="mt-0.5 font-bold text-foreground">{locDisplay}</dd>
                    </div>
                    <div className="rounded-xl border p-3">
                      <dt className="text-muted-foreground">Scheduled Date & Time</dt>
                      <dd className="mt-0.5 font-bold text-foreground">
                        {selectedBooking.date} · {formatTime(selectedBooking.time)}
                      </dd>
                    </div>
                    <div className="rounded-xl border p-3">
                      <dt className="text-muted-foreground">Agreed Rate / Quote</dt>
                      <dd className="mt-0.5 font-bold text-primary">{rateDisplay}</dd>
                    </div>
                    <div className="rounded-xl border p-3">
                      <dt className="text-muted-foreground">Barangay Area</dt>
                      <dd className="mt-0.5 font-bold text-foreground">
                        {barangayName(selectedBooking.barangayId)}
                      </dd>
                    </div>
                  </dl>

                  {/* Valid State Actions inside Dialog */}
                  <div className="flex flex-wrap justify-end gap-2 border-t pt-3">
                    {selectedBooking.status === "pending" && (
                      <>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            handleAction(selectedBooking, "decline");
                            setSelectedBookingId(null);
                          }}
                        >
                          Decline Request
                        </Button>
                        <Button
                          type="button"
                          onClick={() => {
                            handleAction(selectedBooking, "accept");
                            setSelectedBookingId(null);
                          }}
                        >
                          Accept Request
                        </Button>
                      </>
                    )}
                    {selectedBooking.status === "confirmed" && (
                      <Button
                        type="button"
                        onClick={() => {
                          handleAction(selectedBooking, "start");
                          setSelectedBookingId(null);
                        }}
                      >
                        Start Job
                      </Button>
                    )}
                    {selectedBooking.status === "in_progress" && (
                      <Button
                        type="button"
                        onClick={() => {
                          handleAction(selectedBooking, "finish");
                          setSelectedBookingId(null);
                        }}
                      >
                        Mark Job as Completed
                      </Button>
                    )}
                    {selectedBooking.status === "awaiting_confirmation" && (
                      <Button
                        type="button"
                        variant="gold"
                        onClick={() => {
                          handleAction(selectedBooking, "confirm");
                          setSelectedBookingId(null);
                        }}
                      >
                        Confirm Completion (Employer Demo)
                      </Button>
                    )}
                    <Button type="button" variant="ghost" onClick={() => setSelectedBookingId(null)}>
                      Close
                    </Button>
                  </div>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
