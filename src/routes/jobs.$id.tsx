import { useEffect, useState, type FormEvent } from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { CalendarDays, CheckCircle2, Loader2, MapPin, Wallet } from "lucide-react";
import { AppLayout, BackButton } from "@/components/gaw/AppLayout";
import { Field } from "@/components/gaw/primitives";
import { VerificationGuardModal } from "@/components/gaw/VerificationCenter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { barangayName, JOBS, type Job } from "@/lib/gaw/data";
import { useI18n } from "@/lib/gaw/i18n";
import { canPerformProtectedAction, useGaw } from "@/lib/gaw/store";

export const Route = createFileRoute("/jobs/$id")({
  loader: ({ params }) => {
    const job = JOBS.find((j) => j.id === params.id);
    if (!job) throw notFound();
    return { job };
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.job.title} — GAW Jobs` },
          { name: "description", content: loaderData.job.description },
          { property: "og:title", content: `${loaderData.job.title} — GAW Jobs` },
          { property: "og:description", content: loaderData.job.description },
        ]
      : [{ title: "Job unavailable — GAW" }, { name: "robots", content: "noindex" }],
  }),
  notFoundComponent: () => (
    <div className="grid min-h-screen place-items-center p-6 text-center">
      <div>
        <p className="text-xl font-bold">This job is no longer available.</p>
        <Button asChild className="mt-4">
          <Link to="/jobs">Browse jobs</Link>
        </Button>
      </div>
    </div>
  ),
  component: JobDetailPage,
});

function JobDetailPage() {
  const { job } = Route.useLoaderData();
  const { tx } = useI18n();
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
      <JobDetail job={job} />
    </AppLayout>
  );
}

function JobDetail({ job }: { job: Job }) {
  const { account, applications, applyToJob, workerProfile, verification } = useGaw();
  const { tx, translateCategory } = useI18n();
  const already = applications.find((a) => a.jobId === job.id && a.status !== "withdrawn");
  const draftKey = `gaw:job-draft:${account?.email ?? "anon"}:${job.id}`;

  const [message, setMessage] = useState("");
  const [rate, setRate] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [showVerifModal, setShowVerifModal] = useState(false);

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
      setError("Write a short message (at least 10 characters).");
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
      <section className="animate-fade-up rounded-3xl border bg-card p-5 shadow-soft md:p-7">
        <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold text-secondary-foreground">
          {translateCategory(job.category)}
        </span>
        <h2 className="mt-3 text-2xl font-extrabold tracking-tight">{job.title}</h2>
        <p className="mt-1 text-muted-foreground">
          {tx("Posted by", "Na-post ni", "Gi-post ni")} {job.poster} · {job.posted}
        </p>
        <dl className="mt-5 grid gap-3 sm:grid-cols-3">
          {[
            [MapPin, tx("Area", "Lugar", "Dapit"), barangayName(job.barangayId)],
            [CalendarDays, tx("When", "Kailan", "Kanus-a"), job.schedule],
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
        <h3 className="mt-6 font-bold">
          {tx("Job description", "Paglalarawan ng trabaho", "Paghulagway sa trabaho")}
        </h3>
        <p className="mt-1.5 leading-relaxed text-muted-foreground">{job.description}</p>
        <p className="mt-6 text-xs text-muted-foreground">
          {tx(
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
                `Leave blank to accept ${job.budget}.`,
                `Iwanang blangko para tanggapin ang ${job.budget}.`,
                `Pasagdi nga blangko aron dawaton ang ${job.budget}.`,
              )}
            >
              <Input
                id="rate"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                placeholder="e.g. ₱1,000"
              />
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
