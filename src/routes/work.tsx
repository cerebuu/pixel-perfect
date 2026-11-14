import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  CheckCircle2,
  Crown,
  Inbox,
  MapPin,
  Pencil,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { AppLayout } from "@/components/gaw/AppLayout";
import { JobCard } from "@/components/gaw/cards";
import {
  interactiveNavCardClass,
  subtleArrowIconClass,
  subtleLinkClass,
} from "@/components/gaw/interactions";
import { ProfileSetup } from "@/components/gaw/ProfileSetup";
import { Avatar, EmptyState, SectionHeader, StatusBadge } from "@/components/gaw/primitives";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { barangayName, JOBS } from "@/lib/gaw/data";
import { useI18n } from "@/lib/gaw/i18n";
import { identityVerified, useGaw } from "@/lib/gaw/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/work")({
  head: () => ({
    meta: [
      { title: "Find work nearby — GAW" },
      { name: "description", content: "See nearby jobs and booking requests in Davao City." },
      { property: "og:title", content: "Find work nearby — GAW" },
      {
        property: "og:description",
        content: "See nearby jobs and booking requests in Davao City.",
      },
    ],
  }),
  component: WorkPage,
});

function WorkPage() {
  return (
    <AppLayout mode="work">
      <WorkerHome />
    </AppLayout>
  );
}

function WorkerHome() {
  const { workerProfile } = useGaw();
  const [editing, setEditing] = useState(false);

  if (!workerProfile || editing) {
    return (
      <ProfileSetup
        initial={workerProfile}
        onDone={workerProfile ? () => setEditing(false) : undefined}
      />
    );
  }
  return <WorkerDashboard onEditProfile={() => setEditing(true)} />;
}

function WorkerDashboard({ onEditProfile }: { onEditProfile: () => void }) {
  const {
    account,
    workerProfile: p,
    available,
    setAvailable,
    bookings,
    applications,
    plans,
    verification,
  } = useGaw();
  const { tx, translateCategory, verifLabel, verifNext } = useI18n();

  if (!p || !account) return null;

  const initials = account.name
    .split(" ")
    .map((x) => x[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const pending = bookings.filter((r) => r.status === "pending");
  const upcoming = bookings.filter((r) => r.status === "confirmed" || r.status === "in_progress");
  const applied = new Set(applications.map((a) => a.jobId));

  const nearbyJobs = [...JOBS]
    .sort(
      (a, b) =>
        Number(b.category === p.skill) - Number(a.category === p.skill) ||
        Number(b.barangayId === p.barangayId) - Number(a.barangayId === p.barangayId),
    )
    .slice(0, 3);

  const idStatus = verification.identity?.status ?? "not_submitted";
  const verified = identityVerified(verification);

  return (
    <div className="space-y-8">
      <section className="rounded-3xl bg-contour p-5 text-deep-foreground shadow-lift md:p-8">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <Avatar initials={initials} size="lg" className="ring-4 ring-deep-foreground/15" />
            <div>
              <p className="text-sm text-deep-muted">
                {tx("Working mode", "Magtrabaho mode", "Magtrabaho mode")}
              </p>
              <h1 className="flex flex-wrap items-center gap-2 text-2xl font-extrabold tracking-tight">
                <span>{account.name}</span>
                {verified && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-0.5 text-xs font-bold text-primary-foreground">
                    <CheckCircle2 className="size-3" aria-hidden />{" "}
                    {tx("Verified", "Beripikado", "Beripikado")}
                  </span>
                )}
                {plans.includes("worker") && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-gold px-2.5 py-0.5 text-xs font-bold text-gold-foreground">
                    <Crown className="size-3" aria-hidden /> Worker Pro
                  </span>
                )}
              </h1>
              <p className="mt-1 flex flex-wrap items-center gap-x-3 text-sm text-deep-muted">
                <span className="font-semibold text-gold">{translateCategory(p.skill)}</span>
                <span className="inline-flex items-center gap-1">
                  <MapPin className="size-3.5" aria-hidden /> {barangayName(p.barangayId)} (
                  {p.radiusKm} km radius)
                </span>
                <span>{p.experience}</span>
              </p>
              {p.skills.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {p.skills.map((s) => (
                    <span
                      key={s}
                      className="rounded-full bg-deep-foreground/15 px-2.5 py-0.5 text-xs font-medium text-deep-foreground"
                    >
                      {translateCategory(s)}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row md:flex-col md:items-end">
            <div className="flex items-center justify-between gap-4 rounded-2xl bg-deep-foreground/10 px-4 py-3 md:min-w-64">
              <div>
                <label htmlFor="avail" className="block text-sm font-bold">
                  {available
                    ? tx("Available for work", "Available sa trabaho", "Bakante sa trabaho")
                    : tx("Not available", "Hindi available", "Dili bakante")}
                </label>
                <p className="text-xs text-deep-muted">
                  {available
                    ? tx(
                        "Residents can send you requests",
                        "Makakapagpadala ng request ang mga residente",
                        "Makapadala og request ang mga residente",
                      )
                    : tx(
                        "Hidden from new requests",
                        "Nakatago sa mga bagong request",
                        "Gitago sa bag-ong mga request",
                      )}
                </p>
              </div>
              <Switch
                id="avail"
                checked={available}
                onCheckedChange={(v) => {
                  setAvailable(v);
                  toast(
                    v
                      ? tx("You're now available", "Available ka na ngayon", "Bakante ka na karon")
                      : tx(
                          "You're now unavailable",
                          "Hindi ka muna available",
                          "Dili ka usa bakante",
                        ),
                  );
                }}
                className="data-[state=checked]:bg-gold data-[state=unchecked]:bg-deep-foreground/25"
              />
            </div>

            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={onEditProfile}
              className="self-start md:self-end"
            >
              <Pencil className="size-3.5" />{" "}
              {tx(
                "Edit Profile, Skills & Area",
                "I-edit ang Profile, Kasanayan at Lugar",
                "Usba ang Profile, Abilidad ug Dapit",
              )}
            </Button>
          </div>
        </div>

        <dl className="mt-6 grid grid-cols-3 gap-2 text-center">
          {[
            [tx("New requests", "Bagong request", "Bag-ong request"), pending.length],
            [tx("Active & upcoming", "Aktibo at darating", "Aktibo ug umaabot"), upcoming.length],
            [tx("Applications", "Mga aplikasyon", "Mga aplikasyon"), applications.length],
          ].map(([l, n]) => (
            <div key={String(l)} className="rounded-2xl bg-deep-foreground/10 px-2 py-3">
              <dd className="text-2xl font-extrabold">{n}</dd>
              <dt className="text-xs text-deep-muted">{l}</dt>
            </div>
          ))}
        </dl>
      </section>

      <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
        <section className="space-y-6">
          {/* Worker Verification Status Card */}
          <div className="flex flex-col gap-3 rounded-2xl border bg-card p-4 shadow-soft sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-secondary text-primary">
                <ShieldCheck className="size-5" aria-hidden />
              </span>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-bold">
                    {tx(
                      "Worker Verification",
                      "Beripikasyon ng Manggagawa",
                      "Beripikasyon sa Trabahante",
                    )}
                  </p>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
                    {verifLabel(idStatus)}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">{verifNext(idStatus)}</p>
              </div>
            </div>
            <Button asChild size="sm" variant="outline" className="shrink-0">
              <Link to="/verify">Verification Center</Link>
            </Button>
          </div>

          <div>
            <SectionHeader
              title={tx("Nearby jobs", "Mga trabaho sa malapit", "Mga trabaho sa duol")}
              action={
                <Link to="/jobs" className={subtleLinkClass}>
                  {tx("Find jobs", "Maghanap ng trabaho", "Pangita og trabaho")}{" "}
                  <ArrowRight className={subtleArrowIconClass} aria-hidden />
                </Link>
              }
            />
            <div className="space-y-3">
              {nearbyJobs.map((j) => (
                <JobCard key={j.id} job={j} applied={applied.has(j.id)} />
              ))}
            </div>
          </div>
        </section>

        <aside className="space-y-6">
          <section>
            <SectionHeader
              title={tx("Incoming requests", "Mga papasok na request", "Mga niabot nga request")}
              action={
                <Link
                  to="/my-jobs"
                  search={{ tab: "pending" }}
                  className={cn(subtleLinkClass, "text-xs")}
                >
                  {tx(
                    "Manage in My Jobs →",
                    "Pamahalaan sa Aking Trabaho →",
                    "Dumalaa sa Akong Trabaho →",
                  )}
                </Link>
              }
            />
            <p className="-mt-2 mb-3 text-xs text-muted-foreground">
              {tx(
                "Direct booking requests from residents.",
                "Direktang booking request mula sa mga residente.",
                "Diretso nga booking request gikan sa mga residente.",
              )}
            </p>
            {pending.length ? (
              <ul className="space-y-2.5">
                {pending.map((r) => (
                  <li key={r.id}>
                    <Link
                      to="/requests/$id"
                      params={{ id: r.id }}
                      className={cn(
                        "flex items-center gap-3 rounded-2xl border bg-card p-3.5 shadow-soft",
                        interactiveNavCardClass,
                      )}
                    >
                      <Avatar initials={r.client.initials} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold transition-colors duration-150 group-hover:text-primary">
                          {r.service}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {r.client.name} · {r.date}, {r.time}
                        </p>
                      </div>
                      <StatusBadge status={r.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                icon={<Inbox className="size-6" />}
                title={tx("All caught up", "Nacheck na lahat", "Nahuman na tanan")}
                body={tx(
                  "New booking requests will appear here.",
                  "Lalabas dito ang mga bagong booking request.",
                  "Makita dinhi ang mga bag-ong booking request.",
                )}
              />
            )}
          </section>

          <section className="rounded-2xl border bg-card p-5 shadow-soft">
            <SectionHeader
              title={tx("My Jobs", "Aking Trabaho", "Akong Trabaho")}
              action={
                <Link to="/my-jobs" className={subtleLinkClass}>
                  {tx("View all", "Tingnan lahat", "Tan-awa tanan")}
                </Link>
              }
            />
            <p className="text-sm text-muted-foreground">
              {tx(
                `${upcoming.length} active/upcoming · ${applications.length} application${applications.length === 1 ? "" : "s"} sent`,
                `${upcoming.length} aktibo/darating · ${applications.length} aplikasyong naipasa`,
                `${upcoming.length} aktibo/umaabot · ${applications.length} aplikasyon napadala`,
              )}
            </p>
            <Button asChild size="sm" variant="soft" className="mt-3 w-full">
              <Link to="/my-jobs">
                {tx("Open Job Management", "Pamahalaan ang Trabaho", "Ablihi ang Akong Trabaho")}
              </Link>
            </Button>
          </section>

          {plans.includes("worker") ? (
            <section className="rounded-2xl bg-gold-sheen p-5 text-gold-foreground shadow-soft">
              <p className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide">
                <TrendingUp className="size-4" aria-hidden />{" "}
                {tx(
                  "Worker Pro · Earnings Insights (Demo)",
                  "Worker Pro · Buod ng Kita (Demo)",
                  "Worker Pro · Kita Insights (Demo)",
                )}
              </p>
              <p className="mt-2 text-3xl font-extrabold text-foreground">₱18,450</p>
              <p className="text-sm">
                {tx(
                  `This month · up 12% vs last month in ${barangayName(p.barangayId)}`,
                  `Ngayong buwan · mas mataas nang 12% kaysa nakaraang buwan sa ${barangayName(p.barangayId)}`,
                  `Karong bulana · mas taas og 12% kaysa miaging bulan sa ${barangayName(p.barangayId)}`,
                )}
              </p>
              <Link
                to="/pro"
                className={cn(
                  subtleLinkClass,
                  "mt-2 text-xs font-bold text-inherit underline hover:text-foreground",
                )}
              >
                {tx(
                  "Manage Worker Pro →",
                  "Pamahalaan ang Worker Pro →",
                  "Dumalaa ang Worker Pro →",
                )}
              </Link>
            </section>
          ) : (
            <Button asChild variant="gold" className="w-full">
              <Link to="/pro">
                <Crown />{" "}
                {tx(
                  "Explore GAW Worker Pro",
                  "Tuklasin ang GAW Worker Pro",
                  "Tan-awa ang GAW Worker Pro",
                )}
              </Link>
            </Button>
          )}
        </aside>
      </div>
    </div>
  );
}
