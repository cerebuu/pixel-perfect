import { useEffect, useState } from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, CheckCircle2, Loader2, Pencil, RotateCcw } from "lucide-react";
import { AppLayout } from "@/components/gaw/AppLayout";
import { BookingForm, formatTime, type BookingDraft } from "@/components/gaw/BookingForm";
import { SettlementPreviewCard } from "@/components/gaw/PricingGuide";
import { Avatar, StatusBadge } from "@/components/gaw/primitives";
import { VerificationGuardModal } from "@/components/gaw/VerificationCenter";
import { Button } from "@/components/ui/button";
import { barangayName, WORKERS, type Worker } from "@/lib/gaw/data";
import { useI18n } from "@/lib/gaw/i18n";
import { canPerformProtectedAction, formatPeso, useGaw } from "@/lib/gaw/store";

export const Route = createFileRoute("/book/$workerId")({
  loader: ({ params }) => {
    const worker = WORKERS.find((w) => w.id === params.workerId);
    if (!worker) throw notFound();
    return { worker };
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `Book ${loaderData.worker.name} — GAW` },
          { name: "description", content: `Request a booking with ${loaderData.worker.name}.` },
          { property: "og:title", content: `Book ${loaderData.worker.name} — GAW` },
          {
            property: "og:description",
            content: `Request a booking with ${loaderData.worker.name}.`,
          },
        ]
      : [{ title: "Booking unavailable — GAW" }, { name: "robots", content: "noindex" }],
  }),
  notFoundComponent: () => (
    <div className="grid min-h-screen place-items-center p-6 text-center">
      <div>
        <p className="text-xl font-bold">This worker isn't available for booking.</p>
        <Button asChild className="mt-4">
          <Link to="/find">Back to Nearby Finder</Link>
        </Button>
      </div>
    </div>
  ),
  component: BookPage,
});

type Step = "form" | "review" | "done";

function BookPage() {
  const { worker } = Route.useLoaderData();
  return (
    <AppLayout mode="hire">
      <BookingFlow worker={worker} />
    </AppLayout>
  );
}

function BookingFlow({ worker }: { worker: Worker }) {
  const { account, locationId, serviceLocation, addBooking, verification, plans } = useGaw();
  const { locale, tx, translateCategory } = useI18n();
  const draftKey = `gaw:booking-draft:${account?.email ?? "anon"}:${worker.id}`;

  const defaultDraft = (): BookingDraft => ({
    service: worker.skill,
    description: "",
    date: "",
    time: "",
    barangayId: locationId,
    location: serviceLocation,
    budgetMode: worker.rate ? "budget" : "quote",
    budget: "",
  });

  const [step, setStep] = useState<Step>("form");
  const [busy, setBusy] = useState(false);
  const [showVerifModal, setShowVerifModal] = useState(false);
  const [restoredFromStorage, setRestoredFromStorage] = useState(false);
  const [draft, setDraft] = useState<BookingDraft>(defaultDraft);

  useEffect(() => {
    try {
      const saved = window.sessionStorage.getItem(draftKey);
      if (saved) {
        const parsed = JSON.parse(saved) as { draft?: BookingDraft; step?: Step };
        if (parsed.draft) {
          setDraft(parsed.draft);
          if (parsed.draft.description || parsed.draft.date || parsed.draft.budget) {
            setRestoredFromStorage(true);
          }
        }
        if (parsed.step === "form" || parsed.step === "review") setStep(parsed.step);
      }
    } catch {
      /* ignore session storage errors */
    }
  }, [draftKey]);

  useEffect(() => {
    if (step === "done") return;
    try {
      window.sessionStorage.setItem(draftKey, JSON.stringify({ draft, step }));
    } catch {
      /* ignore session storage errors */
    }
  }, [draftKey, draft, step]);

  const discardDraft = () => {
    try {
      window.sessionStorage.removeItem(draftKey);
    } catch {
      /* ignore */
    }
    setDraft(defaultDraft());
    setStep("form");
    setRestoredFromStorage(false);
  };

  const executeBookingConfirm = () => {
    if (busy) return;
    setBusy(true);
    setTimeout(() => {
      const createdId = addBooking({
        workerId: worker.id,
        service: draft.service,
        description: draft.description.trim(),
        date: draft.date,
        time: draft.time,
        barangayId: draft.barangayId,
        location: draft.location ?? null,
        budget: draft.budgetMode === "budget" ? Number(draft.budget) : null,
      });
      setBusy(false);
      if (createdId) {
        try {
          window.sessionStorage.removeItem(draftKey);
        } catch {
          /* ignore */
        }
        setRestoredFromStorage(false);
        setStep("done");
        window.scrollTo({ top: 0 });
      }
    }, 450);
  };

  const confirm = () => {
    const guard = canPerformProtectedAction(verification);
    if (!guard.allowed) {
      setShowVerifModal(true);
      return;
    }
    executeBookingConfirm();
  };

  const localizedSteps: { key: Step; label: string }[] = [
    { key: "form", label: tx("Details", "Detalye", "Detalye") },
    { key: "review", label: tx("Review", "Suriin", "Susiha") },
    { key: "done", label: tx("Sent", "Naipadala", "Napadala") },
  ];

  const idx = localizedSteps.findIndex((s) => s.key === step);

  return (
    <div className="mx-auto max-w-xl">
      {step !== "done" && (
        <div className="mb-5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {step === "form" ? (
              <Button asChild variant="outline" size="icon" className="rounded-full">
                <Link
                  to="/workers/$id"
                  params={{ id: worker.id }}
                  aria-label={tx("Back to profile", "Bumalik sa profile", "Balik sa profile")}
                >
                  <ArrowLeft />
                </Link>
              </Button>
            ) : (
              <Button
                variant="outline"
                size="icon"
                className="rounded-full"
                onClick={() => setStep("form")}
                aria-label={tx("Back to details", "Bumalik sa detalye", "Balik sa detalye")}
              >
                <ArrowLeft />
              </Button>
            )}
            <h1 className="text-2xl font-extrabold tracking-tight">
              {tx("Request Booking", "Mag-book ng Manggagawa", "I-book ang Trabahante")}
            </h1>
          </div>
          {restoredFromStorage && step === "form" && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={discardDraft}
              className="text-xs"
            >
              <RotateCcw className="size-3.5" />
              {tx("Reset draft", "I-reset ang draft", "I-reset ang draft")}
            </Button>
          )}
        </div>
      )}

      <ol className="mb-6 grid grid-cols-3 gap-2" aria-label="Booking progress">
        {localizedSteps.map((s, i) => (
          <li key={s.key} aria-current={i === idx ? "step" : undefined}>
            <div className={`h-1.5 rounded-full ${i <= idx ? "bg-primary" : "bg-border"}`} />
            <p
              className={`mt-1.5 text-xs font-semibold ${i <= idx ? "text-primary" : "text-muted-foreground"}`}
            >
              {s.label}
            </p>
          </li>
        ))}
      </ol>

      <div className="mb-5 flex items-center gap-3 rounded-2xl border bg-card p-3.5 shadow-soft">
        <Avatar initials={worker.initials} />
        <div>
          <p className="font-bold">{worker.name}</p>
          <p className="text-sm text-muted-foreground">
            {translateCategory(worker.skill)} ·{" "}
            {worker.rate
              ? `${formatPeso(worker.rate)}/hr`
              : tx("Quote on request", "Presyo ayon sa usapan", "Presyo base sa sabot")}
          </p>
        </div>
      </div>

      {step === "form" && (
        <div className="animate-fade-up rounded-3xl border bg-card p-5 shadow-soft md:p-7">
          <BookingForm
            worker={worker}
            initial={draft}
            onChange={(d) => setDraft(d)}
            onReview={(d) => {
              setDraft(d);
              setStep("review");
              window.scrollTo({ top: 0 });
            }}
          />
        </div>
      )}

      {step === "review" && (
        <div className="animate-fade-up rounded-3xl border bg-card p-5 shadow-soft md:p-7">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">
              {tx("Review details", "Suriin ang detalye", "Susiha ang detalye")}
            </h2>
            <Button variant="ghost" size="sm" onClick={() => setStep("form")}>
              <Pencil /> {tx("Edit", "I-edit", "Usbon")}
            </Button>
          </div>
          <dl className="mt-4 divide-y">
            {[
              [tx("Service", "Serbisyo", "Serbisyo"), translateCategory(draft.service)],
              [tx("Job description", "Paglalarawan", "Paghulagway"), draft.description],
              [
                tx("Preferred date", "Gustong petsa", "Gusto nga petsa"),
                new Date(draft.date + "T00:00").toLocaleDateString(locale, {
                  weekday: "short",
                  month: "long",
                  day: "numeric",
                }),
              ],
              [tx("Preferred time", "Gustong oras", "Gusto nga oras"), formatTime(draft.time)],
              [
                tx("Service area", "Lugar ng serbisyo", "Dapit sa serbisyo"),
                draft.location?.label ?? barangayName(draft.barangayId),
              ],
              [
                tx("Budget", "Badyet", "Badyet"),
                draft.budgetMode === "budget"
                  ? formatPeso(Number(draft.budget))
                  : tx("Requesting a quote", "Humihingi ng presyo", "Nangayo og presyo"),
              ],
            ].map(([k, v]) => (
              <div key={k} className="grid grid-cols-[120px_1fr] gap-3 py-3 text-sm">
                <dt className="text-muted-foreground">{k}</dt>
                <dd className="font-medium">{v}</dd>
              </div>
            ))}
          </dl>
          {draft.budgetMode === "budget" && Number(draft.budget) >= 100 && (
            <SettlementPreviewCard
              amountPhp={Number(draft.budget)}
              estimatedHours={Number(draft.budget) >= 254 ? 4 : Number(draft.budget) >= 127 ? 2 : 1}
              employerTier={plans.includes("employer") ? "PRO" : "FREE"}
              employeeTier="FREE"
              perspective="employer"
              className="mt-4"
            />
          )}
          <Button size="lg" className="mt-5 w-full" onClick={confirm} disabled={busy}>
            {busy && <Loader2 className="animate-spin" />}
            {busy
              ? tx("Sending request…", "Ipinapadala ang request…", "Gipadala ang request…")
              : tx("Confirm Request", "Kumpirmahin ang Request", "Kumpirmaha ang Request")}
          </Button>
          <p className="mt-3 text-center text-xs text-muted-foreground">
            {tx(
              `No payment is taken. ${worker.name.split(" ")[0]} will confirm or decline.`,
              `Walang babayaran ngayon. Kukumpirmahin o tatanggihan ito ni ${worker.name.split(" ")[0]}.`,
              `Walay bayaran karon. Kumpirmahon o balibaran kini ni ${worker.name.split(" ")[0]}.`,
            )}
          </p>
        </div>
      )}

      {step === "done" && (
        <div
          className="animate-fade-up rounded-3xl border bg-card p-6 text-center shadow-soft md:p-10"
          role="status"
        >
          <span className="mx-auto grid size-16 place-items-center rounded-full bg-secondary text-primary">
            <CheckCircle2 className="size-9" aria-hidden />
          </span>
          <h1 className="mt-4 text-2xl font-extrabold tracking-tight">
            {tx(
              "Booking request sent!",
              "Naipadala na ang booking request!",
              "Napadala na ang booking request!",
            )}
          </h1>
          <p className="mt-2 text-muted-foreground">
            {tx(
              `${worker.name} will review your request for ${draft.service.toLowerCase()} on ${new Date(draft.date + "T00:00").toLocaleDateString(locale, { month: "short", day: "numeric" })} at ${formatTime(draft.time)}.`,
              `Susuriin ni ${worker.name} ang iyong request para sa ${draft.service.toLowerCase()} sa ${new Date(draft.date + "T00:00").toLocaleDateString(locale, { month: "short", day: "numeric" })} nang ${formatTime(draft.time)}.`,
              `Susihon ni ${worker.name} ang imong request para sa ${draft.service.toLowerCase()} karong ${new Date(draft.date + "T00:00").toLocaleDateString(locale, { month: "short", day: "numeric" })} sa ${formatTime(draft.time)}.`,
            )}
          </p>
          <div className="mt-4">
            <StatusBadge status="pending" />
          </div>
          <div className="mt-7 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Button asChild size="lg">
              <Link to="/bookings">
                {tx("View My Bookings", "Tingnan ang Mga Booking", "Tan-awa ang Akong mga Booking")}
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/my-jobs" search={{ tab: "pending" }}>
                {tx(
                  "Respond in Worker My Jobs",
                  "Sumagot sa Aking Trabaho",
                  "Tubag sa Akong Trabaho",
                )}
              </Link>
            </Button>
          </div>
        </div>
      )}

      <VerificationGuardModal
        open={showVerifModal}
        onOpenChange={setShowVerifModal}
        role="hire"
        actionContext={`Confirm booking with ${worker.name} (${draft.service})`}
        onVerifiedContinue={executeBookingConfirm}
      />
    </div>
  );
}
