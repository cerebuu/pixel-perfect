import { useState, type FormEvent } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowRight,
  CalendarCheck,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Crown,
  MapPin,
  Navigation,
  Plus,
  Search,
  Trash2,
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
import { PostGigCard } from "@/components/gaw/PostGigCard";
import { Avatar, LocationFilter, SectionHeader, StatusBadge } from "@/components/gaw/primitives";
import { VerificationStatusBanner } from "@/components/gaw/VerificationStatusBanner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  CATEGORIES,
  FEATURED_CATEGORIES,
  OTHER_CATEGORY,
  WORKERS,
  barangayName,
} from "@/lib/gaw/data";
import { filterWorkers } from "@/lib/gaw/filter";
import { useI18n } from "@/lib/gaw/i18n";
import { normalizeService, validateCustomService } from "@/lib/gaw/services";
import {
  bookingsFor,
  hiringOrigin,
  hiringOriginLabel,
  identityVerified,
  useGaw,
} from "@/lib/gaw/store";

export const Route = createFileRoute("/hire")({
  head: () => ({
    meta: [
      { title: "Hire nearby workers — GAW" },
      { name: "description", content: "Find skilled workers near your barangay in Davao City." },
      { property: "og:title", content: "Hire nearby workers — GAW" },
      {
        property: "og:description",
        content: "Find skilled workers near your barangay in Davao City.",
      },
    ],
  }),
  component: EmployerDashboard,
});

function greeting(tx: (en: string, fil: string, ceb: string) => string) {
  const h = new Date().getHours();
  if (h < 12) return tx("Good morning", "Magandang umaga", "Maayong buntag");
  if (h < 18) return tx("Good afternoon", "Magandang hapon", "Maayong hapon");
  return tx("Good evening", "Magandang gabi", "Maayong gabii");
}

function EmployerDashboard() {
  return (
    <AppLayout mode="hire">
      <DashboardBody />
    </AppLayout>
  );
}

export function DashboardBody() {
  const gaw = useGaw();
  const { t, tx, translateCategory } = useI18n();
  const {
    account,
    locationId,
    setLocation,
    serviceLocation,
    setServiceLocation,
    bookings,
    applications,
    plans,
    verification,
    customJobs,
    removeJob,
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

  const hiringBookings = bookingsFor(bookings, "hiring");
  const count = (s: string) => hiringBookings.filter((b) => b.status === s).length;
  const latest = hiringBookings[0];
  const latestWorker = latest && WORKERS.find((w) => w.id === latest.workerId);
  const verified = identityVerified(verification);

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
      <VerificationStatusBanner role="hire" />
      <section className="relative overflow-hidden rounded-3xl bg-contour p-5 text-deep-foreground shadow-lift md:p-8">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="flex flex-wrap items-center gap-2 text-sm text-deep-muted">
              <span>
                {greeting(tx)}, {account?.name.split(" ")[0]}
              </span>
              {verified && (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-primary-foreground">
                  <CheckCircle2 className="size-3" aria-hidden />{" "}
                  {tx("Verified", "Beripikado", "Beripikado")}
                </span>
              )}
              {plans.includes("employer") && (
                <span className="inline-flex items-center gap-1 rounded-full bg-gold px-2 py-0.5 text-xs font-bold text-gold-foreground">
                  <Crown className="size-3" aria-hidden /> Employer Pro
                </span>
              )}
            </p>
            <h1 className="mt-1 text-2xl font-extrabold tracking-tight md:text-4xl">
              {tx(
                "Who do you need today?",
                "Sino ang kailangan mo ngayon?",
                "Kinsa ang imong gikinahanglan karon?",
              )}
            </h1>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="w-full sm:w-52 [&_label]:text-deep-muted">
              <LocationFilter
                id="dash-location"
                label={tx("Your barangay", "Iyong barangay", "Imong barangay")}
                value={locationId}
                onChange={setLocation}
              />
            </div>
            <Button
              type="button"
              variant="secondary"
              className="h-11 shrink-0"
              onClick={() => setShowMapPicker((v) => !v)}
            >
              <Navigation className="size-4" />
              {showMapPicker
                ? tx("Hide Map", "Itago ang Mapa", "Tagoa ang Mapa")
                : tx("Use GPS / Pin", "Gamitin ang GPS / Pin", "Gamita ang GPS / Pin")}
            </Button>
          </div>
        </div>

        <form onSubmit={onSearch} role="search" className="mt-5 flex gap-2">
          <label htmlFor="dash-search" className="sr-only">
            {tx("Search workers", "Maghanap ng manggagawa", "Pangita og trabahante")}
          </label>
          <div className="relative flex-1">
            <Search
              className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              id="dash-search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={tx(
                "Try “leak repair”, “aircon cleaning”, or “Motorcycle Mechanic”",
                "Subukan ang “leak repair”, “linis ng aircon”, o “Motorcycle Mechanic”",
                "Sulayi ang “leak repair”, “limpyo sa aircon”, o “Motorcycle Mechanic”",
              )}
              className="h-12 rounded-xl border-transparent pl-11 text-foreground dark:border-border dark:bg-card"
            />
          </div>
          <Button type="submit" variant="gold" size="lg" className="h-12">
            {tx("Search", "Maghanap", "Pangitaa")}
          </Button>
        </form>
      </section>

      {showMapPicker && (
        <div className="animate-fade-up">
          <LocationPicker
            modeLabel={tx(
              "Pinpoint Your Hiring Location (GPS or Map Pin)",
              "Ituro ang Lokasyon ng Serbisyo (GPS o Map Pin)",
              "Itudlo ang Lokasyon sa Serbisyo (GPS o Map Pin)",
            )}
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

      {/* Post a Service Request — feeds /jobs, /work, /gigs, and /bookings */}
      <PostGigCard showMyGigsLink />

      {/* Unlimited Service Categories Section */}
      <section aria-labelledby="cat-h">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 id="cat-h" className="text-lg font-bold tracking-tight">
            {tx("Services", "Mga Serbisyo", "Mga Serbisyo")}
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setShowCustomInput((v) => !v)}
            >
              {tx(
                "Other / Custom Service",
                "Iba pa / Custom na Serbisyo",
                "Uban pa / Custom nga Serbisyo",
              )}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setShowAllCats((v) => !v)}
            >
              {showAllCats ? (
                <>
                  {tx("Show fewer", "Bawasan", "Kamenosi")} <ChevronUp className="size-4" />
                </>
              ) : (
                <>
                  {tx(
                    `All ${CATEGORIES.length} categories`,
                    `Lahat ng ${CATEGORIES.length} kategorya`,
                    `Tanang ${CATEGORIES.length} ka kategorya`,
                  )}{" "}
                  <ChevronDown className="size-4" />
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
                {translateCategory(c)}
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
              {tx("Other / Custom", "Iba pa / Custom", "Uban pa / Custom")}
            </button>
          )}
        </div>

        {showCustomInput && (
          <form
            onSubmit={onCustomServiceSubmit}
            className="mt-3 animate-fade-up rounded-2xl border bg-card p-4 shadow-soft"
          >
            <label
              htmlFor="custom-home-service"
              className="block text-xs font-bold uppercase tracking-wide text-primary"
            >
              {tx(
                "Service: Other — Enter Custom Service Name",
                "Serbisyo: Iba pa — Ilagay ang Custom na Serbisyo",
                "Serbisyo: Uban pa — Isulat ang Custom nga Serbisyo",
              )}
            </label>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
              <Input
                id="custom-home-service"
                value={customService}
                onChange={(e) => setCustomService(e.target.value)}
                placeholder="e.g. Motorcycle Mechanic, Appliance Technician, Piano Tutor"
                className="flex-1"
              />
              <Button type="submit">
                {tx("Find Custom Service", "Maghanap ng Serbisyo", "Pangita og Serbisyo")}
              </Button>
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
            title={tx(
              `Nearby around ${originLabel}`,
              `Malapit sa ${originLabel}`,
              `Duol sa ${originLabel}`,
            )}
            action={
              <Link to="/find" className={subtleLinkClass}>
                {tx(
                  "Open Map & Finder",
                  "Buksan ang Mapa at Paghahanap",
                  "Ablihi ang Mapa ug Pangita",
                )}{" "}
                <ArrowRight className={subtleArrowIconClass} aria-hidden />
              </Link>
            }
          />
          <div className="grid gap-3 sm:grid-cols-2">
            {nearby.map((w) => (
              <WorkerCard key={w.id} worker={w} />
            ))}
          </div>
          <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="size-3.5" aria-hidden />{" "}
            {tx(
              `Distances are calculated from your selected location (${originLabel}) to each worker’s service area.`,
              `Kinakalkula ang layo mula sa napiling lokasyon (${originLabel}) papunta sa lugar ng bawat manggagawa.`,
              `Gikalkula ang gilay-on gikan sa gipiling lokasyon (${originLabel}) padulong sa dapit sa matag trabahante.`,
            )}
          </p>
        </section>

        <aside className="space-y-4">
          <section className="rounded-2xl border bg-card p-5 shadow-soft">
            <SectionHeader
              title={tx("My bookings", "Mga booking ko", "Akong mga booking")}
              action={
                <Link to="/bookings" className={subtleLinkClass}>
                  {tx("View all", "Tingnan lahat", "Tan-awa tanan")}
                </Link>
              }
            />
            <dl className="grid grid-cols-3 gap-2 text-center">
              {[
                [tx("Pending", "Pending", "Pending"), count("pending")],
                [
                  tx("Active", "Aktibo", "Aktibo"),
                  count("confirmed") + count("in_progress") + count("awaiting_confirmation"),
                ],
                [tx("Completed", "Tapos na", "Nahuman"), count("completed")],
              ].map(([l, n]) => (
                <div key={String(l)} className="rounded-xl bg-muted px-2 py-3">
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
                <CalendarCheck className="size-4" aria-hidden />{" "}
                {tx("No bookings yet.", "Wala pang booking.", "Wala pay booking.")}
              </p>
            )}
          </section>

          <section className="rounded-2xl border bg-card p-5 shadow-soft">
            <SectionHeader
              title={t("hire.yourRequestsTitle")}
              action={
                <Link to="/gigs" className={subtleLinkClass}>
                  {tx("Manage", "Pamahalaan", "Dumala")}
                </Link>
              }
            />
            <p className="-mt-2 mb-3 text-xs text-muted-foreground">{t("hire.yourRequestsSub")}</p>
            {customJobs.length === 0 ? (
              <div className="rounded-xl border border-dashed bg-muted/35 p-3.5 text-center">
                <p className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground">
                  <ClipboardList className="size-4" aria-hidden />
                  {tx(
                    "No open requests yet.",
                    "Wala pang nakapost na request.",
                    "Wala pay na-post nga request.",
                  )}
                </p>
                <Button asChild size="sm" variant="soft" className="mt-2.5">
                  <Link to="/gigs">
                    <Plus className="size-3.5" aria-hidden /> {t("hire.postRequestCta")}
                  </Link>
                </Button>
              </div>
            ) : (
              <ul className="space-y-2.5">
                {customJobs.slice(0, 3).map((job) => {
                  const matchingCount = WORKERS.filter(
                    (w) =>
                      job.category === OTHER_CATEGORY ||
                      w.skill.toLowerCase() === job.category.toLowerCase() ||
                      w.skills.some((s) => s.toLowerCase() === job.category.toLowerCase()),
                  ).length;
                  const proposalCount = applications.filter((a) => a.jobId === job.id).length;
                  return (
                    <li
                      key={job.id}
                      className="rounded-xl border bg-background/60 p-3 text-sm transition-colors hover:border-primary/40"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <Link
                          to="/gigs"
                          className="min-w-0 flex-1 font-semibold text-foreground hover:text-primary"
                        >
                          <span className="line-clamp-1">{job.title}</span>
                        </Link>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-9 px-2.5"
                          aria-label={tx(
                            `Remove ${job.title}`,
                            `Alisin ang ${job.title}`,
                            `Kuhaa ang ${job.title}`,
                          )}
                          onClick={() => removeJob(job.id)}
                        >
                          <Trash2 className="size-3.5 text-muted-foreground" aria-hidden />
                        </Button>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {translateCategory(job.category)} · {barangayName(job.barangayId)} ·{" "}
                        <strong className="text-foreground">{job.budget}</strong>
                      </p>
                      <p className="mt-1 text-[11px] text-primary">
                        {proposalCount > 0
                          ? tx(
                              `${proposalCount} proposal${proposalCount === 1 ? "" : "s"} · ${matchingCount} workers nearby`,
                              `${proposalCount} aplikante · ${matchingCount} manggagawa`,
                              `${proposalCount} aplikante · ${matchingCount} trabahante`,
                            )
                          : tx(
                              `${matchingCount} matching worker${matchingCount === 1 ? "" : "s"} in Davao`,
                              `${matchingCount} tugmang manggagawa sa Davao`,
                              `${matchingCount} ka haom nga trabahante sa Davao`,
                            )}
                      </p>
                    </li>
                  );
                })}
              </ul>
            )}
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
                ? tx(
                    "Top-rated filter & priority booking tools unlocked",
                    "Naka-unlock na ang top-rated filter at priority booking",
                    "Naka-unlock na ang top-rated filter ug priority booking",
                  )
                : tx(
                    "Saved searches & top-rated worker filters",
                    "Mga naka-save na paghahanap at top-rated worker filter",
                    "Mga naka-save nga pagpangita ug top-rated worker filter",
                  )}
            </p>
            <p className="mt-1 text-sm">
              {plans.includes("employer")
                ? tx(
                    "Manage your Pro membership →",
                    "Pamahalaan ang Pro membership →",
                    "Dumalaa ang Pro membership →",
                  )
                : tx(
                    "See demo plans →",
                    "Tingnan ang mga demo plan →",
                    "Tan-awa ang mga demo plan →",
                  )}
            </p>
          </Link>
        </aside>
      </div>
    </div>
  );
}
