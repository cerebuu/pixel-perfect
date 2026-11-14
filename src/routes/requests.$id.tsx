import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  MapPin,
  MessageSquareWarning,
  Play,
  ShieldCheck,
  Wallet,
  XCircle,
} from "lucide-react";
import { AppLayout, BackButton } from "@/components/gaw/AppLayout";
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
import { Avatar, StatusBadge } from "@/components/gaw/primitives";
import { Button } from "@/components/ui/button";
import { canCancelBooking, resolveBookingPersonas } from "@/lib/gaw/bookings";
import { barangayName } from "@/lib/gaw/data";
import { useI18n } from "@/lib/gaw/i18n";
import { useGaw } from "@/lib/gaw/store";

export const Route = createFileRoute("/requests/$id")({
  head: () => ({
    meta: [
      { title: "Booking Request Details — GAW" },
      { name: "description", content: "Review and respond to an incoming booking request." },
    ],
  }),
  component: RequestDetailPage,
});

function RequestDetailPage() {
  const { id } = Route.useParams();
  const { tx } = useI18n();
  return (
    <AppLayout
      mode="work"
      back={
        <BackButton
          to="/work"
          label={tx("Back to Worker Home", "Bumalik sa Worker Home", "Balik sa Worker Home")}
        />
      }
      title={tx("Booking Request", "Booking Request", "Booking Request")}
    >
      <RequestDetail id={id} />
    </AppLayout>
  );
}

export function RequestDetail({ id }: { id: string }) {
  const { account, bookings, workerProfile } = useGaw();
  const { tx } = useI18n();
  const navigate = useNavigate();
  const { formatRate, formatBookingDate } = useBookingDisplay();
  const [dialog, setDialog] = useState<LifecycleDialogState | null>(null);

  const b = bookings.find((x) => x.id === id);

  if (!b) {
    return (
      <div className="mx-auto max-w-md rounded-3xl border bg-card p-6 text-center shadow-soft">
        <p className="text-lg font-bold">
          {tx(
            "This booking request could not be found.",
            "Hindi mahanap ang booking request na ito.",
            "Wala makit-i kining maong booking request.",
          )}
        </p>
        <Button asChild className="mt-4">
          <Link to="/my-jobs">
            {tx("Open My Jobs", "Buksan ang Aking Trabaho", "Ablihi ang Akong Trabaho")}
          </Link>
        </Button>
      </div>
    );
  }

  const personas = resolveBookingPersonas(b, {
    currentUserName: account?.name,
    workerSkill: workerProfile?.skill,
    viewerRole: "worker",
  });
  const locDisplay = b.location?.label ?? barangayName(b.barangayId);
  const hasOpenIssue = b.issueReport?.status === "open";
  const needsQuote = b.budget === null && !b.quotedAmount && !b.rateText;

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <section className="animate-fade-up space-y-5 rounded-3xl border bg-card p-5 shadow-soft md:p-7">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3.5">
            <Avatar initials={personas.employerInitials} size="lg" />
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-xs font-bold uppercase tracking-wide text-primary">
                  {personas.isSyncedCrossSide
                    ? tx(
                        "Synced Booking Request",
                        "Naka-sync na Booking Request",
                        "Na-sync nga Booking Request",
                      )
                    : tx(
                        "Incoming Booking Request",
                        "Papasok na Booking Request",
                        "Niabot nga Booking Request",
                      )}
                </p>
                {personas.isSyncedCrossSide && (
                  <span className="rounded-full bg-gold-soft px-2 py-0.5 text-[11px] font-bold text-gold-foreground dark:text-gold">
                    {tx("Assigned:", "Naka-assign:", "Gi-assign:")} {personas.workerName}
                  </span>
                )}
              </div>
              <h2 className="text-2xl font-extrabold tracking-tight">{b.service}</h2>
              <p className="text-sm text-muted-foreground">
                {tx("Employer:", "Nag-book:", "Nag-book:")}{" "}
                <strong className="text-foreground">{personas.employerName}</strong>
              </p>
            </div>
          </div>
          <StatusBadge status={b.status} hasOpenIssue={hasOpenIssue} />
        </div>

        {/* Full 5-stage progress timeline */}
        <div className="rounded-2xl border bg-muted/35 p-4">
          <BookingTimeline booking={b} variant="full" />
        </div>

        <div className="rounded-2xl bg-muted p-4">
          <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
            {tx("Job Description", "Paglalarawan ng Trabaho", "Paghulagway sa Trabaho")}
          </h3>
          <p className="mt-1 text-sm leading-relaxed text-foreground">{b.description}</p>
          {b.quoteNote && (
            <p className="mt-2 rounded-xl bg-background/70 px-3 py-2 text-xs text-muted-foreground">
              <strong>{tx("Worker note:", "Paalala:", "Pahinumdom:")}</strong> {b.quoteNote}
            </p>
          )}
        </div>

        <dl className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border p-3.5">
            <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <MapPin className="size-3.5 text-primary" aria-hidden />{" "}
              {tx("Location", "Lokasyon", "Lokasyon")}
            </dt>
            <dd className="mt-1 font-bold">{locDisplay}</dd>
          </div>
          <div className="rounded-2xl border p-3.5">
            <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <CalendarDays className="size-3.5 text-primary" aria-hidden />{" "}
              {tx("Date & Time", "Petsa at Oras", "Petsa ug Oras")}
            </dt>
            <dd className="mt-1 font-bold">{formatBookingDate(b.date, b.time)}</dd>
          </div>
          <div className="rounded-2xl border p-3.5">
            <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Wallet className="size-3.5 text-primary" aria-hidden />{" "}
              {tx("Agreed Rate / Budget", "Napagkasunduang Singil", "Gikasabotang Suhol")}
            </dt>
            <dd className="mt-1 font-bold text-primary">{formatRate(b)}</dd>
          </div>
        </dl>

        <BookingIssueBanner booking={b} />

        {b.status === "in_progress" && (
          <LiveJobSharingCard
            bookingTitle={b.service}
            barangayId={b.barangayId}
            targetLocation={b.location}
          />
        )}

        <DemoSettlementNotice booking={b} />

        <BookingReviewDisplay booking={b} />

        {/* Single-Primary-Action Worker Control Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
          <Button asChild variant="outline">
            <Link to="/my-jobs">
              {tx("Open My Jobs", "Buksan ang Aking Trabaho", "Ablihi ang Akong Trabaho")}
            </Link>
          </Button>

          <div className="flex flex-wrap items-center gap-2">
            {b.status === "pending" && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    setDialog({ mode: "decline", bookingId: b.id, actorRole: "worker" })
                  }
                >
                  <XCircle className="size-4" aria-hidden />{" "}
                  {tx("Decline Request", "Tanggihan", "Balibaran")}
                </Button>
                <Button
                  type="button"
                  onClick={() =>
                    setDialog({ mode: "accept", bookingId: b.id, actorRole: "worker" })
                  }
                >
                  <CheckCircle2 className="size-4" aria-hidden />{" "}
                  {needsQuote
                    ? tx("Propose Quote & Accept", "Mag-alok at Tanggapin", "Pagsugyot ug Dawata")
                    : tx("Accept Booking", "Tanggapin ang Booking", "Dawata ang Booking")}
                </Button>
              </>
            )}

            {b.status === "confirmed" && (
              <>
                {canCancelBooking(b.status) && (
                  <Button
                    type="button"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    onClick={() =>
                      setDialog({ mode: "cancel", bookingId: b.id, actorRole: "worker" })
                    }
                  >
                    <XCircle className="size-4" aria-hidden />{" "}
                    {tx("Cancel", "Kanselahin", "Kanselahon")}
                  </Button>
                )}
                <Button
                  type="button"
                  onClick={() => setDialog({ mode: "start", bookingId: b.id, actorRole: "worker" })}
                >
                  <Play className="size-4" aria-hidden />{" "}
                  {tx("Start Job", "Simulan ang Trabaho", "Sugdi ang Trabaho")}
                </Button>
              </>
            )}

            {b.status === "in_progress" && (
              <Button
                type="button"
                onClick={() => setDialog({ mode: "finish", bookingId: b.id, actorRole: "worker" })}
              >
                <ClipboardCheck className="size-4" aria-hidden />{" "}
                {tx("Mark as Completed", "Markahang Tapos Na", "Markahi nga Nahuman Na")}
              </Button>
            )}

            {b.status === "awaiting_confirmation" && hasOpenIssue && (
              <Button
                type="button"
                onClick={() =>
                  setDialog({ mode: "resolve_issue", bookingId: b.id, actorRole: "worker" })
                }
              >
                <ShieldCheck className="size-4" aria-hidden />{" "}
                {tx(
                  "Resolve Issue & Resubmit",
                  "Ayusin ang Isyu at Ipasa Muli",
                  "Sulbara ang Isyu ug Ipasa Pag-usab",
                )}
              </Button>
            )}

            {b.status === "awaiting_confirmation" && !hasOpenIssue && (
              <span className="rounded-full bg-status-pending-bg px-3 py-1.5 text-xs font-semibold text-status-pending">
                {tx(
                  `Waiting for ${personas.employerName} to confirm completion`,
                  `Naghihintay ng kumpirmasyon ni ${personas.employerName}`,
                  `Naghulat sa kumpirmasyon ni ${personas.employerName}`,
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
                  onClick={() =>
                    setDialog({ mode: "report_issue", bookingId: b.id, actorRole: "employer" })
                  }
                >
                  <MessageSquareWarning className="size-3.5" aria-hidden />{" "}
                  {tx("Simulate Issue", "I-simulate ang Isyu", "I-simulate ang Isyu")}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="gold"
                  onClick={() =>
                    setDialog({ mode: "confirm", bookingId: b.id, actorRole: "employer" })
                  }
                >
                  <CheckCircle2 className="size-3.5" aria-hidden />{" "}
                  {tx(
                    "Simulate Employer Confirm",
                    "I-simulate: Kumpirmahin",
                    "I-simulate: Kumpirmaha",
                  )}
                </Button>
              </>
            ) : undefined
          }
        />
      </section>

      <BookingLifecycleDialogs
        dialog={dialog}
        onClose={() => setDialog(null)}
        onNavigateViewJob={(updated) =>
          navigate({ to: "/requests/$id", params: { id: updated.id } })
        }
      />
    </div>
  );
}
