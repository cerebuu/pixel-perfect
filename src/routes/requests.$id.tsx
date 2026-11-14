import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { CalendarDays, CheckCircle2, MapPin, Play, UserCheck, Wallet, XCircle } from "lucide-react";
import { toast } from "sonner";
import { AppLayout, BackButton } from "@/components/gaw/AppLayout";
import { formatTime } from "@/components/gaw/BookingForm";
import { LiveJobSharingCard } from "@/components/gaw/GawMap";
import { Avatar, StatusBadge } from "@/components/gaw/primitives";
import { Button } from "@/components/ui/button";
import { barangayName } from "@/lib/gaw/data";
import { useI18n } from "@/lib/gaw/i18n";
import { formatPeso, useGaw } from "@/lib/gaw/store";

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

function RequestDetail({ id }: { id: string }) {
  const { bookings, bookingAction } = useGaw();
  const { tx } = useI18n();
  const navigate = useNavigate();
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

  const rateDisplay =
    b.rateText ??
    (b.budget
      ? formatPeso(b.budget)
      : tx("Quote requested", "Humihingi ng presyo", "Nangayo og presyo"));
  const locDisplay = b.location?.label ?? barangayName(b.barangayId);

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <section className="animate-fade-up rounded-3xl border bg-card p-5 shadow-soft md:p-7">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3.5">
            <Avatar initials={b.client.initials} size="lg" />
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-primary">
                {tx(
                  "Incoming Booking Request",
                  "Papasok na Booking Request",
                  "Niabot nga Booking Request",
                )}
              </p>
              <h2 className="text-2xl font-extrabold tracking-tight">{b.service}</h2>
              <p className="text-sm text-muted-foreground">
                {tx("Requested by", "Ipinarequest ni", "Gipangayo ni")}{" "}
                <strong className="text-foreground">{b.client.name}</strong>
              </p>
            </div>
          </div>
          <StatusBadge status={b.status} />
        </div>

        <div className="mt-5 rounded-2xl bg-muted p-4">
          <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
            {tx("Job Description", "Paglalarawan ng Trabaho", "Paghulagway sa Trabaho")}
          </h3>
          <p className="mt-1 text-sm leading-relaxed text-foreground">{b.description}</p>
        </div>

        <dl className="mt-5 grid gap-3 sm:grid-cols-3">
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
            <dd className="mt-1 font-bold">
              {b.date} · {formatTime(b.time)}
            </dd>
          </div>
          <div className="rounded-2xl border p-3.5">
            <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Wallet className="size-3.5 text-primary" aria-hidden />{" "}
              {tx("Budget / Rate", "Badyet / Singil", "Badyet / Suhol")}
            </dt>
            <dd className="mt-1 font-bold text-primary">{rateDisplay}</dd>
          </div>
        </dl>

        {b.status === "in_progress" && (
          <LiveJobSharingCard
            bookingTitle={b.service}
            barangayId={b.barangayId}
            targetLocation={b.location}
          />
        )}

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
          <Button asChild variant="outline">
            <Link to="/my-jobs">
              {tx("Open My Jobs", "Buksan ang Aking Trabaho", "Ablihi ang Akong Trabaho")}
            </Link>
          </Button>

          <div className="flex flex-wrap gap-2">
            {b.status === "pending" && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    bookingAction(b.id, "decline");
                    toast(
                      tx(
                        "Declined booking request",
                        "Tinanggihan ang booking request",
                        "Gibalibaran ang booking request",
                      ),
                    );
                    navigate({ to: "/my-jobs", search: { tab: "cancelled" } });
                  }}
                >
                  <XCircle className="size-4" /> {tx("Decline Request", "Tanggihan", "Balibaran")}
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    bookingAction(b.id, "accept");
                    toast.success(
                      tx(
                        "Accepted booking request! Moved to Upcoming.",
                        "Tinanggap ang booking! Inilipat sa Darating.",
                        "Gidawat ang booking! Gibalhin sa Umaabot.",
                      ),
                    );
                    navigate({ to: "/my-jobs", search: { tab: "upcoming" } });
                  }}
                >
                  <CheckCircle2 className="size-4" /> {tx("Accept Request", "Tanggapin", "Dawata")}
                </Button>
              </>
            )}

            {b.status === "confirmed" && (
              <Button
                type="button"
                onClick={() => {
                  bookingAction(b.id, "start");
                  toast.success(
                    tx(
                      "Job started! Moved to In Progress.",
                      "Sinimulan na ang trabaho!",
                      "Gisugdan na ang trabaho!",
                    ),
                  );
                }}
              >
                <Play className="size-4" />{" "}
                {tx("Start Job", "Simulan ang Trabaho", "Sugdi ang Trabaho")}
              </Button>
            )}

            {b.status === "in_progress" && (
              <Button
                type="button"
                onClick={() => {
                  bookingAction(b.id, "finish");
                  toast.success(
                    tx(
                      "Marked job as completed — awaiting employer confirmation.",
                      "Minarkahang tapos na — naghihintay ng kumpirmasyon.",
                      "Gimarkahan nga human na — naghulat sa kumpirmasyon.",
                    ),
                  );
                }}
              >
                <CheckCircle2 className="size-4" />{" "}
                {tx("Mark Job as Completed", "Markahang Tapos Na", "Markahi nga Human Na")}
              </Button>
            )}

            {b.status === "awaiting_confirmation" && (
              <Button
                type="button"
                variant="gold"
                onClick={() => {
                  bookingAction(b.id, "confirm");
                  toast.success(
                    tx(
                      "Employer confirmed completion!",
                      "Nakumpirma ng nagpapa-hire ang pagtatapos!",
                      "Nakumpirma sa kliyente ang pagkahuman!",
                    ),
                  );
                }}
              >
                <UserCheck className="size-4" />{" "}
                {tx(
                  "Confirm Completion (Employer Demo)",
                  "Kumpirmahin ang Pagtatapos (Employer Demo)",
                  "Kumpirmaha ang Pagkahuman (Employer Demo)",
                )}
              </Button>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
