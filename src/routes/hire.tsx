import { useState, type FormEvent } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowRight,
  CalendarCheck,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Crown,
  MapPin,
  Navigation,
  Search,
  ShieldCheck,
} from "lucide-react";
import { AppLayout } from "@/components/gaw/AppLayout";
import { WorkerCard } from "@/components/gaw/cards";
import { iconFor } from "@/components/gaw/categoryIcons";
import { LocationPicker } from "@/components/gaw/GawMap";
import {
  FOCUS_RING,
  REDUCED_MOTION_RESET,
  interactiveNavCardClass,
  subtleArrowIconClass,
  subtleLinkClass,
} from "@/components/gaw/interactions";
import { Avatar, LocationFilter, SectionHeader, StatusBadge } from "@/components/gaw/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  CATEGORIES,
  FEATURED_CATEGORIES,
  OTHER_CATEGORY,
  WORKERS,
} from "@/lib/gaw/data";
import { filterWorkers } from "@/lib/gaw/filter";
import { normalizeService, validateCustomService } from "@/lib/gaw/services";
import {
  hiringOrigin,
  hiringOriginLabel,
  identityVerified,
  useGaw,
} from "@/lib/gaw/store";
import { VERIF_LABEL } from "@/lib/gaw/verification";

export const Route = createFileRoute("/hire")({
  head: () => ({
    meta: [
      { title: "Hire nearby workers — GAW" },
      { name: "description", content: "Find skilled workers near your barangay in Davao City." },
      { property: "og:title", content: "Hire nearby workers — GAW" },
      { property: "og:description", content: "Find skilled workers near your barangay in Davao City." },
    ],
  }),
  component: EmployerDashboard,
});

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

function EmployerDashboard() {
  return (
    <AppLayout mode="hire">
      <DashboardBody />
    </AppLayout>
  );
}

function DashboardBody() {
  const gaw = useGaw();
  const {
    account,
    locationId,
    setLocation,
    serviceLocation,
    setServiceLocation,
    bookings,
    plans,
    verification,
  } = gaw;

  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [showAllCats, setShowAllCats] = useState(false);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customService, setCustomService] = useState("");
  const [customErr, setCustomErr] = useState<string | null>(null);
  const [showMapPicker, setShowMapPicker] = useState(false);

  const origin = hiringOrigin(gaw);
  const originLabel = hiringOriginLabel(gaw);

  const nearby = filterWorkers(WORKERS, {
    origin,
    category: "all",
    query: "",
    radius: 5,
    availableOnly: false,
  }).slice(0, 4);

  const count = (s: string) => bookings.filter((b) => b.status === s).length;
  const latest = bookings[0];
  const latestWorker = latest && WORKERS.find((w) => w.id === latest.workerId);
  const verified = identityVerified(verification);
  const idStatus = verification.identity?.status ?? "not_submitted";

  const onSearch = (e: FormEvent) => {
    e.preventDefault();
    navigate({ to: "/find", search: { q: q.trim() || undefined } });
  };

  const onCustomServiceSubmit = (e: FormEvent) => {
    e.preventDefault();
    const err = validateCustomService(customService);
    if (err) {
      setCustomErr(err);
      return;
    }
    setCustomErr(null);
    const clean = normalizeService(customService);
    navigate({ to: "/find", search: { category: clean, q: clean } });
  };

  const displayedCategories = showAllCats ? CATEGORIES : FEATURED_CATEGORIES;

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-3xl bg-contour p-5 text-deep-foreground shadow-lift md:p-8">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="flex flex-wrap items-center gap-2 text-sm text-deep-muted">
              <span>
                {greeting()}, {account?.name.split(" ")[0]}
              </span>
              {verified && (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-primary-foreground">
                  <CheckCircle2 className="size-3" aria-hidden /> Verified
                </span>
              )}
              {plans.includes("employer") && (
                <span className="inline-flex items-center gap-1 rounded-full bg-gold px-2 py-0.5 text-xs font-bold text-gold-foreground">
                  <Crown className="size-3" aria-hidden /> Employer Pro
                </span>
              )}
            </p>
            <h1 className="mt-1 text-2xl font-extrabold tracking-tight md:text-4xl">Who do you need today?</h1>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="w-full sm:w-52 [&_label]:text-deep-muted">
              <LocationFilter id="dash-location" label="Your barangay" value={locationId} onChange={setLocation} />
            </div>
            <Button
              type="button"
              variant="secondary"
              className="h-11 shrink-0"
              onClick={() => setShowMapPicker((v) => !v)}
            >
              <Navigation className="size-4" />
              {showMapPicker ? "Hide Map" : "Use GPS / Pin"}
            </Button>
          </div>
        </div>

        <form onSubmit={onSearch} role="search" className="mt-5 flex gap-2">
          <label htmlFor="dash-search" className="sr-only">
            Search workers
          </label>
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              id="dash-search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Try “leak repair”, “aircon cleaning”, or “Motorcycle Mechanic”"
              className="h-12 rounded-xl border-transparent pl-11 text-foreground dark:border-border dark:bg-card"
            />
          </div>
          <Button type="submit" variant="gold" size="lg" className="h-12">
            Search
          </Button>
        </form>
      </section>

      {showMapPicker && (
        <div className="animate-fade-up">
          <LocationPicker
            modeLabel="Pinpoint Your Hiring Location (GPS or Map Pin)"
            initialLocation={origin}
            initialBarangayId={locationId}
            initialLabel={serviceLocation?.label}
            onConfirm={(placed) => {
              setServiceLocation(placed);
              setShowMapPicker(false);
            }}
          />
        </div>
      )}

      {/* Unlimited Service Categories Section */}
      <section aria-labelledby="cat-h">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 id="cat-h" className="text-lg font-bold tracking-tight">
            Services
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setShowCustomInput((v) => !v)}
            >
              Other / Custom Service
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setShowAllCats((v) => !v)}
            >
              {showAllCats ? (
                <>
                  Show fewer <ChevronUp className="size-4" />
                </>
              ) : (
                <>
                  All {CATEGORIES.length} categories <ChevronDown className="size-4" />
                </>
              )}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 md:grid-cols-6">
          {displayedCategories.map((c) => {
            const Icon = iconFor(c);
            return (
              <Link
                key={c}
                to="/find"
                search={{ category: c }}
                className={`flex flex-col items-center gap-2 rounded-2xl border bg-card px-2 py-4 text-center text-sm font-semibold shadow-soft ${interactiveNavCardClass}`}
              >
                <span className="grid size-11 place-items-center rounded-xl bg-secondary text-secondary-foreground transition-[background-color,color,transform] duration-150 group-hover:scale-105 group-hover:bg-primary group-hover:text-primary-foreground motion-reduce:group-hover:scale-100">
                  <Icon className="size-5" aria-hidden />
                </span>
                {c}
              </Link>
            );
          })}
          {showAllCats && (
            <button
              type="button"
              onClick={() => setShowCustomInput(true)}
              className={`flex flex-col items-center gap-2 rounded-2xl border border-dashed bg-card px-2 py-4 text-center text-sm font-semibold shadow-soft ${interactiveNavCardClass}`}
            >
              <span className="grid size-11 place-items-center rounded-xl bg-gold-soft text-gold-foreground transition-transform duration-150 group-hover:scale-105 motion-reduce:group-hover:scale-100">
                {(() => {
                  const Icon = iconFor(OTHER_CATEGORY);
                  return <Icon className="size-5" aria-hidden />;
                })()}
              </span>
              {OTHER_CATEGORY}
            </button>
          )}
        </div>

        {showCustomInput && (
          <form
            onSubmit={onCustomServiceSubmit}
            className="mt-3 animate-fade-up rounded-2xl border bg-card p-4 shadow-soft"
          >
            <label htmlFor="custom-home-service" className="block text-xs font-bold uppercase tracking-wide text-primary">
              Service: Other — Enter Custom Service Name
            </label>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
              <Input
                id="custom-home-service"
                value={customService}
                onChange={(e) => setCustomService(e.target.value)}
                placeholder="e.g. Motorcycle Mechanic, Appliance Technician, Piano Tutor"
                className="flex-1"
              />
              <Button type="submit">Find Custom Service</Button>
            </div>
            {customErr && (
              <p role="alert" className="mt-1.5 text-xs font-medium text-destructive">
                {customErr}
              </p>
            )}
          </form>
        )}
      </section>

      <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
        <section>
          <SectionHeader
            title={`Nearby around ${originLabel}`}
            action={
              <Link to="/find" className={subtleLinkClass}>
                Open Map & Finder <ArrowRight className={subtleArrowIconClass} aria-hidden />
              </Link>
            }
          />
          <div className="grid gap-3 sm:grid-cols-2">
            {nearby.map((w) => (
              <WorkerCard key={w.id} worker={w} />
            ))}
          </div>
          <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="size-3.5" aria-hidden /> Distances are calculated from your selected location ({originLabel})
            to each worker’s service area.
          </p>
        </section>

        <aside className="space-y-4">
          <section className="rounded-2xl border bg-card p-5 shadow-soft">
            <SectionHeader
              title="My bookings"
              action={
                <Link to="/bookings" className={subtleLinkClass}>
                  View all
                </Link>
              }
            />
            <dl className="grid grid-cols-3 gap-2 text-center">
              {[
                ["Pending", count("pending")],
                ["Active", count("confirmed") + count("in_progress") + count("awaiting_confirmation")],
                ["Completed", count("completed")],
              ].map(([l, n]) => (
                <div key={l} className="rounded-xl bg-muted px-2 py-3">
                  <dd className="text-2xl font-extrabold">{n}</dd>
                  <dt className="text-xs text-muted-foreground">{l}</dt>
                </div>
              ))}
            </dl>
            {latest ? (
              <Link
                to="/bookings"
                className={`mt-4 flex items-center gap-3 rounded-xl border bg-card/60 p-3 ${interactiveNavCardClass}`}
              >
                <Avatar initials={latestWorker?.initials ?? "WK"} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">
                    {latestWorker?.name ?? latest.service}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">{latest.service}</p>
                </div>
                <StatusBadge status={latest.status} />
              </Link>
            ) : (
              <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                <CalendarCheck className="size-4" aria-hidden /> No bookings yet.
              </p>
            )}
          </section>

          {/* Employer Verification Status Card */}
          <section className="rounded-2xl border bg-card p-4 shadow-soft">
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-primary">
                <ShieldCheck className="size-4" aria-hidden /> Employer Verification
              </span>
              <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                {VERIF_LABEL[idStatus]}
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Basic identity verification builds trust with local workers. No business license required.
            </p>
            <Button asChild size="sm" variant="outline" className="mt-3 w-full">
              <Link to="/verify">Open Verification Center</Link>
            </Button>
          </section>

          <Link
            to="/pro"
            className={`block cursor-pointer rounded-2xl bg-gold-sheen p-5 text-gold-foreground shadow-soft transition-[transform,box-shadow,filter] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 hover:shadow-lift hover:brightness-[1.03] active:translate-y-0 active:scale-[0.995] ${FOCUS_RING} ${REDUCED_MOTION_RESET}`}
          >
            <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide">
              <Crown className="size-4" aria-hidden />{" "}
              {plans.includes("employer") ? "GAW Employer Pro Active" : "GAW Employer Pro"}
            </span>
            <p className="mt-2 font-bold text-foreground">
              {plans.includes("employer")
                ? "Top-rated filter & priority booking tools unlocked"
                : "Saved searches & top-rated worker filters"}
            </p>
            <p className="mt-1 text-sm">
              {plans.includes("employer") ? "Manage your Pro membership →" : "See demo plans →"}
            </p>
          </Link>
        </aside>
      </div>
    </div>
  );
}
