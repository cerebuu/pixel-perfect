import { useEffect, useMemo, useState, type FormEvent } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Bookmark, CalendarDays, CheckCircle2, Loader2, MapPin, Wallet, Zap } from "lucide-react";
import { toast } from "sonner";
import { AppLayout, BackButton } from "@/components/gaw/AppLayout";
import { FairPayEstimateCard, SettlementPreviewCard } from "@/components/gaw/PricingGuide";
import { Field } from "@/components/gaw/primitives";
import { VerificationGuardModal } from "@/components/gaw/VerificationCenter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { barangayName, JOBS, type Job } from "@/lib/gaw/data";
import { estimateGigPrice, FREE_WORKER_QUEUE_LIMIT } from "@/lib/gaw/domain";
import { useI18n } from "@/lib/gaw/i18n";
import { canPerformProtectedAction, formatPeso, hasPlan, jobById, useGaw } from "@/lib/gaw/store";

export const Route = createFileRoute("/jobs/$id")({
  loader: ({ params }) => ({
    id: params.id,
    staticJob: JOBS.find((j) => j.id === params.id) ?? null,
  }),
  head: ({ loaderData }) => ({
    meta: loaderData?.staticJob
      ? [
          { title: `${loaderData.staticJob.title} — GAW Jobs` },
          { name: "description", content: loaderData.staticJob.description },
          { property: "og:title", content: `${loaderData.staticJob.title} — GAW Jobs` },
          { property: "og:description", content: loaderData.staticJob.description },
        ]
      : [{ title: "Job details — GAW" }],
  }),
  component: JobDetailPage,
});

function parseNumericPhp(raw: string): number | null {
  const digits = raw.replace(/[^\d.]/g, "");
  if (!digits) return null;
  const n = Number(digits);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function JobDetailPage() {
  const { id, staticJob } = Route.useLoaderData();
  const { hydrated, customJobs } = useGaw();
  const { tx } = useI18n();

  const job = staticJob ?? (hydrated ? jobById(id, customJobs) : undefined);

  return (
    <AppLayout
      mode="work"
      back={
        <BackButton
          to="/jobs"
          label={tx("Back to jobs", "Bumalik sa mga trabaho", "Balik sa mga trabaho")}
        />
      }
      title={tx("Job details", "Detalye ng trabaho", "Detalye sa trabaho")}
    >
      {!job ? (
        <div className="mx-auto max-w-md rounded-3xl border bg-card p-6 text-center shadow-soft">
          <p className="text-xl font-bold">
            {hydrated
              ? tx(
                  "This job is no longer available.",
                  "Hindi na available ang trabahong ito.",
                  "Dili na available kining trabahoa.",
                )
              : tx("Loading job…", "Nilo-load ang trabaho…", "Gina-load ang trabaho…")}
          </p>
          {hydrated && (
            <Button asChild className="mt-4">
              <Link to="/jobs">
                {tx("Browse jobs", "Tingnan ang mga trabaho", "Tan-awa ang mga trabaho")}
              </Link>
            </Button>
          )}
        </div>
      ) : (
        <JobDetail job={job} />
      )}
    </AppLayout>
  );
}

function JobDetail({ job }: { job: Job }) {
  const {
    account,
    applications,
    applyToJob,
    workerProfile,
    verification,
    savedJobIds,
    toggleSaveJob,
    plans,
  } = useGaw();
  const { tx, translateCategory } = useI18n();
  const already = applications.find((a) => a.jobId === job.id && a.status !== "withdrawn");
  const isSaved = savedJobIds.includes(job.id);
  const workerTier = hasPlan(plans, "worker") ? "PRO" : "FREE";
  const draftKey = `gaw:job-draft:${account?.email ?? "anon"}:${job.id}`;

  const [message, setMessage] = useState("");
  const [rate, setRate] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [showVerifModal, setShowVerifModal] = useState(false);

  const estimate = useMemo(
    () =>
      estimateGigPrice({
        category: job.category,
        estimatedHours: job.estimatedHours,
        urgency: job.urgent ? "urgent" : "standard",
        requiredSkills: [],
        title: job.title,
        description: job.description,
        barangay: job.barangayId,
      }),
    [job],
  );

  useEffect(() => {
    try {
      const saved = window.sessionStorage.getItem(draftKey);
      if (saved) {
        const parsed = JSON.parse(saved) as { message?: string; rate?: string };
        if (parsed.message) setMessage(parsed.message);
        if (parsed.rate) setRate(parsed.rate);
      }
    } catch {
      /* ignore session storage errors */
    }
  }, [draftKey]);

  useEffect(() => {
    try {
      if (message || rate) {
        window.sessionStorage.setItem(draftKey, JSON.stringify({ message, rate }));
      }
    } catch {
      /* ignore session storage errors */
    }
  }, [draftKey, message, rate]);

  const handleToggleSave = () => {
    const res = toggleSaveJob(job.id);
    if (res.quotaExceeded) {
      toast.error(
        tx(
          `Free tier lets you save up to ${res.limit ?? FREE_WORKER_QUEUE_LIMIT} jobs. Upgrade to Worker Pro for unlimited slots.`,
          `Hanggang ${res.limit ?? FREE_WORKER_QUEUE_LIMIT} trabaho lang ang maaaring i-save sa Free tier. Mag-Worker Pro para walang limit.`,
          `Hangtod ${res.limit ?? FREE_WORKER_QUEUE_LIMIT} ka trabaho lang ang ma-save sa Free tier. Pag-Worker Pro aron walay limit.`,
        ),
      );
      return;
    }
    toast(
      res.saved
        ? tx("Saved to My Jobs", "Naka-save sa Aking Trabaho", "Gi-save sa Akong Trabaho")
        : tx("Removed from saved jobs", "Inalis sa naka-save", "Gikuha sa gi-save"),
    );
  };

  const parsedCustomOffer = parseNumericPhp(rate);
  const previewPayPhp = parsedCustomOffer ?? job.budgetNum ?? estimate.recommendedPhp;

  const executeApplicationSubmit = () => {
    if (busy) return;
    setBusy(true);
    setTimeout(() => {
      const ok = applyToJob({
        jobId: job.id,
        message: message.trim(),
        rate: rate.trim() || job.budget,
      });
      setBusy(false);
      if (ok) {
        try {
          window.sessionStorage.removeItem(draftKey);
        } catch {
          /* ignore */
        }
      }
    }, 450);
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (message.trim().length < 10) {
      setError(
        tx(
          "Write a short message (at least 10 characters).",
          "Sumulat ng maikling mensahe (hindi bababa sa 10 karakter).",
          "Pagsulat og mubo nga mensahe (labing menos 10 ka karakter).",
        ),
      );
      return;
    }
    setError("");

    const guard = canPerformProtectedAction(verification);
    if (!guard.allowed) {
      setShowVerifModal(true);
      return;
    }

    executeApplicationSubmit();
  };

  return (
    <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-[1fr_340px]">
      <section className="animate-fade-up space-y-5 rounded-3xl border bg-card p-5 shadow-soft md:p-7">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold text-secondary-foreground">
              {translateCategory(job.category)}
            </span>
            {job.urgent && (
              <span className="inline-flex items-center gap-1 rounded-full bg-gold-soft px-2.5 py-1 text-xs font-semibold text-gold-foreground dark:text-gold">
                <Zap className="size-3.5" aria-hidden />
                {tx("Urgent", "Apurahan", "Dinalian")}
              </span>
            )}
          </div>
          <Button
            type="button"
            size="sm"
            variant={isSaved ? "soft" : "outline"}
            onClick={handleToggleSave}
            aria-pressed={isSaved}
          >
            <Bookmark className={`size-4 ${isSaved ? "fill-current" : ""}`} aria-hidden />
            {isSaved ? tx("Saved", "Naka-save", "Gi-save") : tx("Save job", "I-save", "I-save")}
          </Button>
        </div>

        <div>
          <h2 className="text-2xl font-extrabold tracking-tight">{job.title}</h2>
          <p className="mt-1 text-muted-foreground">
            {tx("Posted by", "Na-post ni", "Gi-post ni")} {job.poster} · {job.posted}
          </p>
        </div>

        <dl className="grid gap-3 sm:grid-cols-3">
          {[
            [
              MapPin,
              tx("Area", "Lugar", "Dapit"),
              `${barangayName(job.barangayId)}${job.landmark ? ` (${job.landmark})` : ""}`,
            ],
            [
              CalendarDays,
              tx("When", "Kailan", "Kanus-a"),
              `${job.schedule} (${job.estimatedHours}h est.)`,
            ],
            [Wallet, tx("Budget", "Badyet", "Badyet"), job.budget],
          ].map(([Icon, k, v]) => {
            const I = Icon as typeof MapPin;
            return (
              <div key={k as string} className="rounded-2xl bg-muted p-3">
                <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <I className="size-3.5" aria-hidden /> {k as string}
                </dt>
                <dd className="mt-0.5 font-bold">{v as string}</dd>
              </div>
            );
          })}
        </dl>

        <div>
          <h3 className="font-bold">
            {tx("Job description", "Paglalarawan ng trabaho", "Paghulagway sa trabaho")}
          </h3>
          <p className="mt-1.5 leading-relaxed text-muted-foreground">{job.description}</p>
        </div>

        <FairPayEstimateCard estimate={estimate} offeredBudgetPhp={job.budgetNum} />

        <SettlementPreviewCard
          amountPhp={Math.max(previewPayPhp, job.minimumRequiredPhp)}
          estimatedHours={job.estimatedHours}
          employerTier="FREE"
          employeeTier={workerTier}
          perspective="worker"
        />

        <p className="text-xs text-muted-foreground">
          {job.isCustom
            ? tx(
                "Posted in your local demo session.",
                "Na-post sa iyong lokal na demo session.",
                "Gi-post sa imong lokal nga demo session.",
              )
            : tx(
                "Sample job listing for this demo.",
                "Sample na listahan ng trabaho para sa demo na ito.",
                "Sample nga listahan sa trabaho alang niining demo.",
              )}
        </p>
      </section>

      <aside className="md:sticky md:top-24 md:self-start">
        {already ? (
          <div
            className="animate-fade-up rounded-3xl border bg-card p-6 text-center shadow-soft"
            role="status"
          >
            <span className="mx-auto grid size-14 place-items-center rounded-full bg-secondary text-primary">
              <CheckCircle2 className="size-8" aria-hidden />
            </span>
            <h2 className="mt-3 text-xl font-extrabold">
              {tx(
                "Application submitted",
                "Naipasa na ang aplikasyon",
                "Na-submit na ang aplikasyon",
              )}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {tx(
                `${job.poster} will see your message and offer of ${already.rate}.`,
                `Makikita ni ${job.poster} ang iyong mensahe at alok na ${already.rate}.`,
                `Makita ni ${job.poster} ang imong mensahe ug tanyag nga ${already.rate}.`,
              )}
            </p>
            <div className="mt-5 flex flex-col gap-2">
              <Button asChild>
                <Link to="/my-jobs">
                  {tx("View My Jobs", "Tingnan sa Aking Trabaho", "Tan-awa sa Akong Trabaho")}
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/jobs">
                  {tx("Find more jobs", "Maghanap pa ng trabaho", "Pangita pa og trabaho")}
                </Link>
              </Button>
            </div>
          </div>
        ) : !workerProfile ? (
          <div className="rounded-3xl bg-gold-soft p-6 text-gold-foreground">
            <p className="font-bold">
              {tx(
                "Set up your worker profile first",
                "I-set up muna ang iyong worker profile",
                "I-set up una ang imong worker profile",
              )}
            </p>
            <p className="mt-1 text-sm">
              {tx(
                "It takes a minute and lets you apply to jobs.",
                "Isang minuto lang ito para makapag-apply sa mga trabaho.",
                "Usa ra ka minuto kini aron maka-apply ka sa mga trabaho.",
              )}
            </p>
            <Button asChild variant="gold" className="mt-4 w-full">
              <Link to="/work">
                {tx("Set up profile", "I-set up ang profile", "I-set up ang profile")}
              </Link>
            </Button>
          </div>
        ) : (
          <form
            noValidate
            onSubmit={submit}
            className="space-y-4 rounded-3xl border bg-card p-5 shadow-soft"
          >
            <h2 className="text-lg font-bold">
              {tx("Apply for this job", "Mag-apply sa trabahong ito", "Pag-apply niining trabahoa")}
            </h2>
            <Field
              id="message"
              label={tx(
                "Message to the client",
                "Mensahe sa nagpapagawa",
                "Mensahe ngadto sa kliyente",
              )}
              error={error}
            >
              <Textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={`Hi! I'm a ${workerProfile.skill.toLowerCase()} worker near ${barangayName(job.barangayId)}…`}
                aria-invalid={!!error}
                aria-describedby={error ? "message-error" : undefined}
              />
            </Field>
            <Field
              id="rate"
              label={tx(
                "Your offer (optional)",
                "Inaalok mong singil (opsyonal)",
                "Imong tanyag (opsyonal)",
              )}
              hint={tx(
                `Leave blank to accept ${job.budget}. Local benchmark: ${formatPeso(job.minimumRequiredPhp)}.`,
                `Iwanang blangko para tanggapin ang ${job.budget}. Lokal na gabay: ${formatPeso(job.minimumRequiredPhp)}.`,
                `Pasagdi nga blangko aron dawaton ang ${job.budget}. Lokal nga giya: ${formatPeso(job.minimumRequiredPhp)}.`,
              )}
            >
              <Input
                id="rate"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                placeholder={`e.g. ₱${Math.round(estimate.recommendedPhp)}`}
              />
              {parsedCustomOffer !== null && parsedCustomOffer < job.minimumRequiredPhp && (
                <p className="mt-1.5 text-xs font-medium text-warning">
                  {tx(
                    `Heads up: this offer is below GAW's ${formatPeso(job.minimumRequiredPhp)} Davao fair-pay benchmark.`,
                    `Paalala: mas mababa ito sa ${formatPeso(job.minimumRequiredPhp)} na gabay sa patas na bayad.`,
                    `Pahibalo: ubos kini sa ${formatPeso(job.minimumRequiredPhp)} nga giya sa patas nga suhol.`,
                  )}
                </p>
              )}
            </Field>
            <Button type="submit" size="lg" className="w-full" disabled={busy}>
              {busy && <Loader2 className="animate-spin" />}
              {busy
                ? tx("Submitting…", "Ipinapadala…", "Gipadala…")
                : tx("Apply", "Mag-apply", "Mo-apply")}
            </Button>
          </form>
        )}
      </aside>

      <VerificationGuardModal
        open={showVerifModal}
        onOpenChange={setShowVerifModal}
        role="work"
        actionContext={`Apply for “${job.title}”`}
        onVerifiedContinue={executeApplicationSubmit}
      />
    </div>
  );
}
