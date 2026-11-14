import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Briefcase,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Clock,
  Crown,
  ExternalLink,
  MapPin,
  Plus,
  ShieldCheck,
  Trash2,
  Users,
  Wallet,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { AppLayout, BackButton } from "@/components/gaw/AppLayout";
import { InteractiveMap } from "@/components/gaw/GawMap";
import { prefersReducedMotion, subtleLinkClass } from "@/components/gaw/interactions";
import { PostGigCard } from "@/components/gaw/PostGigCard";
import { EmptyState, SectionHeader } from "@/components/gaw/primitives";
import { VerificationStatusBanner } from "@/components/gaw/VerificationStatusBanner";
import { Button } from "@/components/ui/button";
import { CATEGORIES, OTHER_CATEGORY, WORKERS, barangayName } from "@/lib/gaw/data";
import { FREE_OPEN_GIGS_LIMIT, validateGigPrice } from "@/lib/gaw/domain";
import { distanceKm, roundKm, type JobWithDistance } from "@/lib/gaw/filter";
import { useI18n } from "@/lib/gaw/i18n";
import { hiringOrigin, hiringOriginLabel, useGaw } from "@/lib/gaw/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/gigs")({
  head: () => ({
    meta: [
      { title: "My Posted Gigs — GAW Hiring Mode" },
      {
        name: "description",
        content:
          "Publish service requests across Davao City, review worker proposals, and pin gig locations on the map.",
      },
      { property: "og:title", content: "My Posted Gigs — GAW Hiring Mode" },
      {
        property: "og:description",
        content:
          "Publish service requests across Davao City, review worker proposals, and pin gig locations on the map.",
      },
    ],
  }),
  component: PostedGigsPage,
});

function PostedGigsPage() {
  const { tx } = useI18n();
  return (
    <AppLayout
      mode="hire"
      back={<BackButton to="/hire" />}
      title={tx("My Posted Gigs", "Aking Mga Gig", "Akong Mga Gig")}
    >
      <PostedGigsBody />
    </AppLayout>
  );
}

export function PostedGigsBody() {
  const gaw = useGaw();
  const { account, customJobs, applications, plans, removeJob, simulateHire } = gaw;
  const { locale, tx, translateCategory } = useI18n();

  const origin = hiringOrigin(gaw);
  const originLabel = hiringOriginLabel(gaw);
  const isEmployerPro = plans.includes("employer");

  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [recenterKey, setRecenterKey] = useState(0);

  const jobsWithDistance: JobWithDistance[] = useMemo(
    () =>
      customJobs.map((j) => ({
        ...j,
        distance: roundKm(distanceKm(origin, j)),
      })),
    [customJobs, origin],
  );

  const activeJobId =
    selectedJobId && jobsWithDistance.some((j) => j.id === selectedJobId)
      ? selectedJobId
      : (jobsWithDistance[0]?.id ?? null);

  const activeJob = jobsWithDistance.find((j) => j.id === activeJobId) ?? null;

  const customJobIds = new Set(customJobs.map((j) => j.id));
  const proposalsForMyGigs = applications.filter((a) => customJobIds.has(a.jobId));
  const pendingProposalsCount = proposalsForMyGigs.filter((a) => a.status === "submitted").length;
  const hiredProposalsCount = proposalsForMyGigs.filter((a) => a.status === "hired").length;

  const focusJobOnMap = (jobId: string) => {
    setSelectedJobId(jobId);
    setRecenterKey((k) => k + 1);
    if (typeof document !== "undefined") {
      document.getElementById("gigs-map")?.scrollIntoView({
        behavior: prefersReducedMotion() ? "auto" : "smooth",
        block: "center",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* State-aware Verification Warning Banner */}
      <VerificationStatusBanner role="hire" />

      {/* KPI Summary Strip */}
      <section
        aria-label={tx("Gig overview", "Buod ng mga gig", "Sumada sa mga gig")}
        className="grid gap-4 sm:grid-cols-3"
      >
        <div className="rounded-2xl border bg-card p-4 shadow-soft">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <span>{tx("Open Posted Gigs", "Mga Bukas na Gig", "Mga Abli nga Gig")}</span>
            <ClipboardList className="size-4 text-primary" aria-hidden />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tracking-tight">{customJobs.length}</span>
            <span className="text-xs font-medium text-muted-foreground">
              {isEmployerPro
                ? tx("Pro · Unlimited", "Pro · Walang limit", "Pro · Walay limit")
                : tx(
                    `/ ${FREE_OPEN_GIGS_LIMIT} free limit`,
                    `/ ${FREE_OPEN_GIGS_LIMIT} libreng limit`,
                    `/ ${FREE_OPEN_GIGS_LIMIT} libreng limit`,
                  )}
            </span>
          </div>
          {!isEmployerPro && (
            <div className="mt-3 space-y-1.5">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-[width] duration-300"
                  style={{
                    width: `${Math.min(100, (customJobs.length / FREE_OPEN_GIGS_LIMIT) * 100)}%`,
                  }}
                />
              </div>
              {customJobs.length >= FREE_OPEN_GIGS_LIMIT && (
                <Link
                  to="/pro"
                  className="inline-flex items-center gap-1 text-xs font-bold text-gold-foreground hover:underline dark:text-gold"
                >
                  <Crown className="size-3.5" aria-hidden />
                  {tx(
                    "Upgrade for unlimited gigs",
                    "Mag-Pro para sa unlimited",
                    "Mag-Pro alang sa unlimited",
                  )}
                </Link>
              )}
            </div>
          )}
        </div>

        <div className="rounded-2xl border bg-card p-4 shadow-soft">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <span>{tx("Worker Proposals", "Mga Aplikante", "Mga Aplikante")}</span>
            <Users className="size-4 text-primary" aria-hidden />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tracking-tight">
              {proposalsForMyGigs.length}
            </span>
            <span className="text-xs font-medium text-muted-foreground">
              {pendingProposalsCount > 0
                ? tx(
                    `${pendingProposalsCount} pending review`,
                    `${pendingProposalsCount} naghihintay`,
                    `${pendingProposalsCount} naghulat`,
                  )
                : hiredProposalsCount > 0
                  ? tx(
                      `${hiredProposalsCount} hired`,
                      `${hiredProposalsCount} kinuha`,
                      `${hiredProposalsCount} gikuha`,
                    )
                  : tx("awaiting workers", "naghihintay ng aplikante", "naghulat og aplikante")}
            </span>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            {tx(
              "Applications submitted by nearby Davao workers sync here in real time.",
              "Ang mga aplikasyon mula sa Davao workers ay agad makikita rito.",
              "Ang mga aplikasyon gikan sa Davao workers makita dayon dinhi.",
            )}
          </p>
        </div>

        <div className="rounded-2xl border bg-card p-4 shadow-soft">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <span>{tx("Broadcast Area", "Lugar ng Broadcast", "Dapit sa Broadcast")}</span>
            <MapPin className="size-4 text-primary" aria-hidden />
          </div>
          <p className="mt-2 truncate text-lg font-extrabold tracking-tight">{originLabel}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">Davao City, Philippines</p>
          <div className="mt-3">
            <Link to="/find" className={subtleLinkClass}>
              {tx("Browse nearby workers →", "Maghanap ng manggagawa →", "Pangita og trabahante →")}
            </Link>
          </div>
        </div>
      </section>

      {/* Post a Gig Form (shared across /hire & /gigs) */}
      <PostGigCard
        defaultOpen={customJobs.length === 0}
        showMyGigsLink={false}
        onPosted={(job) => {
          setSelectedJobId(job.id);
          setRecenterKey((k) => k + 1);
        }}
      />

      {/* Posted Gigs List & Davao Map Preview */}
      <div className="grid gap-6 lg:grid-cols-[1.25fr_0.95fr] lg:items-start">
        <section
          aria-label={tx("Posted gigs", "Mga nakapost na gig", "Mga na-post nga gig")}
          className="space-y-4"
        >
          <SectionHeader
            title={tx(
              `Active Service Requests (${customJobs.length})`,
              `Mga Aktibong Request (${customJobs.length})`,
              `Mga Aktibong Request (${customJobs.length})`,
            )}
            action={
              <Link to="/bookings" search={{ tab: "requests" }} className={subtleLinkClass}>
                {tx("Synced in Bookings", "Naka-sync sa Bookings", "Naka-sync sa Bookings")}
              </Link>
            }
          />

          {jobsWithDistance.length === 0 ? (
            <EmptyState
              icon={<Briefcase className="size-6" />}
              title={tx(
                "No posted gigs yet",
                "Wala pang nakapost na gig",
                "Wala pay na-post nga gig",
              )}
              body={tx(
                "Use the form above to broadcast your first Davao City service request. It immediately becomes discoverable on Find Jobs and Worker Dashboards.",
                "Gamitin ang form sa itaas upang mag-post ng unang request sa Davao City.",
                "Gamita ang porma sa taas aron mag-post sa imong unang request sa Davao City.",
              )}
              action={
                <Button asChild variant="outline">
                  <Link to="/find">
                    <Plus className="size-4" aria-hidden />
                    {tx(
                      "Or find a worker directly",
                      "O maghanap ng manggagawa",
                      "O pangita og trabahante",
                    )}
                  </Link>
                </Button>
              }
            />
          ) : (
            <ul className="space-y-4">
              {jobsWithDistance.map((job) => {
                const proposals = applications.filter((a) => a.jobId === job.id);
                const matchCount = WORKERS.filter(
                  (w) =>
                    job.category === OTHER_CATEGORY ||
                    w.skill.toLowerCase() === job.category.toLowerCase() ||
                    w.skills.some((s) => s.toLowerCase() === job.category.toLowerCase()),
                ).length;
                const priceValid =
                  job.budgetNum !== null
                    ? validateGigPrice(job.estimatedHours, job.budgetNum).isValid
                    : true;
                const isSelected = activeJobId === job.id;

                return (
                  <li
                    key={job.id}
                    className={cn(
                      "rounded-2xl border bg-card p-5 shadow-soft transition-[border-color,box-shadow] duration-150",
                      isSelected && "border-primary/50 ring-1 ring-primary/25",
                    )}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center gap-1 rounded-full bg-status-confirmed-bg px-2.5 py-0.5 text-[11px] font-bold text-status-confirmed">
                            <CheckCircle2 className="size-3" aria-hidden />
                            {tx("Open", "Bukas", "Abli")}
                          </span>
                          <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-semibold text-secondary-foreground">
                            {translateCategory(job.category)}
                          </span>
                          {job.urgent && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-gold-soft px-2 py-0.5 text-[11px] font-bold text-gold-foreground dark:text-gold">
                              <Zap className="size-3" aria-hidden />
                              {tx("Urgent", "Apurahan", "Dinalian")}
                            </span>
                          )}
                          {job.budgetNum !== null && priceValid && (
                            <span className="inline-flex items-center gap-1 rounded-full border border-primary/25 bg-secondary/40 px-2 py-0.5 text-[11px] font-semibold text-primary">
                              <ShieldCheck className="size-3" aria-hidden />
                              {tx("Fair Pay Checked", "Makatarungang Bayad", "Patas nga Bayad")}
                            </span>
                          )}
                        </div>

                        <Link
                          to="/jobs/$id"
                          params={{ id: job.id }}
                          className="block text-base font-bold text-foreground hover:text-primary"
                        >
                          {job.title}
                        </Link>
                        <p className="text-sm leading-relaxed text-muted-foreground">
                          {job.description}
                        </p>

                        <div className="flex flex-wrap gap-x-4 gap-y-1.5 pt-1 text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="size-3.5 text-primary" aria-hidden />
                            {barangayName(job.barangayId)}
                            {job.landmark ? ` · ${job.landmark}` : ""} ({job.distance} km)
                          </span>
                          <span className="inline-flex items-center gap-1 font-semibold text-foreground">
                            <Wallet className="size-3.5 text-primary" aria-hidden />
                            {job.budget} · {job.estimatedHours}h
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <CalendarDays className="size-3.5" aria-hidden />
                            {job.schedule}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Proposals section */}
                    <div className="mt-4 rounded-xl border bg-muted/40 p-3.5">
                      <div className="flex items-center justify-between gap-2">
                        <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                          <Users className="size-3.5 text-primary" aria-hidden />
                          {tx(
                            `Applicant Proposals (${proposals.length})`,
                            `Mga Aplikante (${proposals.length})`,
                            `Mga Aplikante (${proposals.length})`,
                          )}
                        </p>
                        {proposals.length === 0 && (
                          <span className="text-[11px] text-muted-foreground">
                            {tx(
                              `${matchCount} matching workers nearby`,
                              `${matchCount} angkop na manggagawa`,
                              `${matchCount} angay nga trabahante`,
                            )}
                          </span>
                        )}
                      </div>

                      {proposals.length === 0 ? (
                        <p className="mt-1.5 text-xs text-muted-foreground">
                          {tx(
                            "No worker proposals yet. Nearby verified workers can apply directly from Find Jobs.",
                            "Wala pang nag-a-apply. Maaaring mag-apply ang mga manggagawa mula sa Find Jobs.",
                            "Wala pay ni-apply. Mahimo mo-apply ang mga trabahante gikan sa Find Jobs.",
                          )}
                        </p>
                      ) : (
                        <ul className="mt-2.5 space-y-2.5">
                          {proposals.map((app) => {
                            const isSubmitted = app.status === "submitted";
                            const isHired = app.status === "hired";
                            return (
                              <li
                                key={app.id}
                                className="flex flex-col gap-2 rounded-xl border bg-card p-3 sm:flex-row sm:items-center sm:justify-between"
                              >
                                <div className="min-w-0 space-y-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-sm font-bold text-foreground">
                                      {account?.name ?? tx("Applicant", "Aplikante", "Aplikante")}
                                    </span>
                                    <span
                                      className={cn(
                                        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold",
                                        isHired
                                          ? "bg-status-confirmed-bg text-status-confirmed"
                                          : isSubmitted
                                            ? "bg-status-pending-bg text-status-pending"
                                            : "bg-muted text-muted-foreground",
                                      )}
                                    >
                                      {isSubmitted && <Clock className="size-3" aria-hidden />}
                                      {isHired && <CheckCircle2 className="size-3" aria-hidden />}
                                      {isHired
                                        ? tx("Hired", "Kinuha", "Gikuha")
                                        : isSubmitted
                                          ? tx("Pending Review", "Sinusuri", "Ginasusi")
                                          : tx("Withdrawn", "Binawi", "Gibawi")}
                                    </span>
                                    {app.rate && (
                                      <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-semibold text-primary">
                                        {app.rate}
                                      </span>
                                    )}
                                    <span className="text-[11px] text-muted-foreground">
                                      {new Intl.DateTimeFormat(locale, {
                                        month: "short",
                                        day: "numeric",
                                      }).format(app.createdAt)}
                                    </span>
                                  </div>
                                  <p className="text-xs leading-relaxed text-muted-foreground">
                                    {app.message}
                                  </p>
                                </div>

                                <div className="flex shrink-0 flex-wrap gap-2">
                                  {isSubmitted && (
                                    <Button
                                      type="button"
                                      size="sm"
                                      onClick={() => {
                                        const bookingId = simulateHire(app.id);
                                        if (bookingId) {
                                          toast.success(
                                            tx(
                                              "Applicant hired! Booking created and synced to Bookings & My Jobs.",
                                              "Nakuha na ang aplikante! Nakagawa na ng booking.",
                                              "Nadawat na ang aplikante! Nahimo na ang booking.",
                                            ),
                                          );
                                        }
                                      }}
                                    >
                                      <CheckCircle2 className="size-3.5" aria-hidden />
                                      {tx("Hire Applicant", "Kunin", "Dawata")}
                                    </Button>
                                  )}
                                  {isHired && (
                                    <Button asChild size="sm" variant="outline">
                                      <Link to="/bookings">
                                        {tx("View Booking", "Tingnan", "Tan-awa")}
                                      </Link>
                                    </Button>
                                  )}
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>

                    {/* Action Bar */}
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t pt-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant={isSelected ? "default" : "outline"}
                          onClick={() => focusJobOnMap(job.id)}
                        >
                          <MapPin className="size-3.5" aria-hidden />
                          {tx("Pin on Map", "Ituro sa Mapa", "Itudlo sa Mapa")}
                        </Button>
                        <Button asChild size="sm" variant="soft">
                          <Link to="/jobs/$id" params={{ id: job.id }}>
                            <ExternalLink className="size-3.5" aria-hidden />
                            {tx("View Listing", "Tingnan", "Tan-awa")}
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
                              `Find Workers (${matchCount})`,
                              `Manggagawa (${matchCount})`,
                              `Trabahante (${matchCount})`,
                            )}
                          </Link>
                        </Button>
                      </div>

                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        onClick={() => {
                          removeJob(job.id);
                          if (selectedJobId === job.id) setSelectedJobId(null);
                          toast.success(
                            tx(
                              "Posted gig closed and removed.",
                              "Isinara at inalis ang nakapost na gig.",
                              "Gisirad-an ug gikuha ang na-post nga gig.",
                            ),
                          );
                        }}
                      >
                        <Trash2 className="size-3.5" aria-hidden />
                        {tx("Close Gig", "Isara ang Gig", "Sirad-a ang Gig")}
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Interactive Davao City Broadcast Map */}
        <aside id="gigs-map" className="space-y-3 lg:sticky lg:top-24">
          <div className="rounded-2xl border bg-card p-4 shadow-soft">
            <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
              <div>
                <h2 className="text-base font-bold">
                  {tx("Gig Map Preview", "Mapa ng Mga Gig", "Mapa sa Mga Gig")}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {activeJob
                    ? `${activeJob.title} · ${barangayName(activeJob.barangayId)} (${activeJob.lat.toFixed(4)}, ${activeJob.lng.toFixed(4)})`
                    : tx(
                        `Broadcast origin: ${originLabel}, Davao City`,
                        `Pinagmulan: ${originLabel}, Davao City`,
                        `Sinugdanan: ${originLabel}, Davao City`,
                      )}
                </p>
              </div>
              {activeJob && (
                <Button asChild size="sm" variant="soft">
                  <Link to="/jobs/$id" params={{ id: activeJob.id }}>
                    {tx("Open", "Buksan", "Ablihi")}
                  </Link>
                </Button>
              )}
            </div>

            <InteractiveMap
              center={activeJob ? { lat: activeJob.lat, lng: activeJob.lng } : origin}
              pin={
                activeJob
                  ? { lat: activeJob.lat, lng: activeJob.lng }
                  : { lat: origin.lat, lng: origin.lng }
              }
              pinLabel={activeJob ? activeJob.title : originLabel}
              jobs={jobsWithDistance}
              selectedJobId={activeJobId}
              onSelectJob={(j) => {
                setSelectedJobId(j.id);
                setRecenterKey((k) => k + 1);
              }}
              recenterKey={recenterKey}
              className="h-[300px] md:h-[340px]"
            />
          </div>
        </aside>
      </div>
    </div>
  );
}
