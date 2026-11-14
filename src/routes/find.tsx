import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Crown,
  List,
  Map as MapIcon,
  MapPin,
  Navigation,
  Search,
  SearchX,
  Star,
  X,
} from "lucide-react";
import { AppLayout } from "@/components/gaw/AppLayout";
import { WorkerCard } from "@/components/gaw/cards";
import { InteractiveMap, LocationPicker } from "@/components/gaw/GawMap";
import { Avatar, Availability, EmptyState, LocationFilter } from "@/components/gaw/primitives";
import { ServicePicker } from "@/components/gaw/ServicePicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  BARANGAYS,
  barangayName,
  RADIUS_OPTIONS,
  WORKERS,
  type Category,
  type Worker,
} from "@/lib/gaw/data";
import { filterWorkers, type WorkerWithDistance } from "@/lib/gaw/filter";
import {
  formatPeso,
  hasPlan,
  hiringOrigin,
  hiringOriginLabel,
  useGaw,
} from "@/lib/gaw/store";
import { cn } from "@/lib/utils";

type FindSearch = { category?: Category | undefined; q?: string | undefined };

export const Route = createFileRoute("/find")({
  validateSearch: (s: Record<string, unknown>): FindSearch => ({
    category: typeof s["category"] === "string" && s["category"].trim() ? s["category"].trim() : undefined,
    q: typeof s["q"] === "string" && s["q"] ? s["q"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Nearby Finder — GAW" },
      { name: "description", content: "Find available workers within 1 to 10 km of your barangay or GPS location." },
      { property: "og:title", content: "Nearby Finder — GAW" },
      { property: "og:description", content: "Find available workers within 1 to 10 km of your barangay or GPS location." },
    ],
  }),
  component: FindPage,
});

function FindPage() {
  return (
    <AppLayout mode="hire" title="Nearby Finder">
      <NearbyFinder />
    </AppLayout>
  );
}

type ViewMode = "split" | "map" | "list";

function NearbyFinder() {
  const search = Route.useSearch();
  const gaw = useGaw();
  const {
    locationId,
    setLocation,
    serviceLocation,
    setServiceLocation,
    workerProfile,
    available,
    account,
    plans,
  } = gaw;

  const origin = hiringOrigin(gaw);
  const originLabel = hiringOriginLabel(gaw);

  const [category, setCategory] = useState<Category | "all">(search.category ?? "all");
  const [query, setQuery] = useState(search.q ?? "");
  const [radius, setRadius] = useState<number>(5);
  const [availableOnly, setAvailableOnly] = useState(false);
  const [topRatedOnly, setTopRatedOnly] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("split");
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [selectedWorker, setSelectedWorker] = useState<WorkerWithDistance | null>(null);

  const isEmployerPro = hasPlan(plans, "employer");

  // Combine seeded Davao workers with user's custom worker profile preview (if set) so custom skills appear in search results
  const allWorkers = useMemo<Worker[]>(() => {
    if (!workerProfile) return WORKERS;
    const brgy = BARANGAYS.find((b) => b.id === workerProfile.barangayId) ?? BARANGAYS[0]!;
    const area = workerProfile.area ?? { lat: brgy.lat, lng: brgy.lng };
    const selfWorker: Worker = {
      id: "w-me",
      name: `${account?.name ?? "Your Profile"} (Your Worker Profile)`,
      initials: "ME",
      skill: workerProfile.skill,
      skills: workerProfile.skills,
      barangayId: workerProfile.barangayId,
      lat: area.lat,
      lng: area.lng,
      rate: 350,
      available,
      rating: 4.9,
      jobsDone: 12,
      years: 3,
      bio: workerProfile.description,
      hours: "Flexible schedule",
      reviews: [
        { author: "Maria S.", rating: 5, text: "Great communication and reliable work.", when: "Recent" },
      ],
      portfolio: [workerProfile.skill, ...workerProfile.skills.slice(0, 2)],
    };
    return [selfWorker, ...WORKERS];
  }, [workerProfile, available, account?.name]);

  const results = useMemo(
    () =>
      filterWorkers(allWorkers, {
        origin,
        category,
        query,
        radius,
        availableOnly,
        topRatedOnly: isEmployerPro && topRatedOnly,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [allWorkers, origin.lat, origin.lng, category, query, radius, availableOnly, isEmployerPro, topRatedOnly],
  );

  const filtersActive = category !== "all" || query || availableOnly || topRatedOnly;

  const clear = () => {
    setCategory("all");
    setQuery("");
    setAvailableOnly(false);
    setTopRatedOnly(false);
  };

  return (
    <div className="space-y-5">
      {/* Top Location & View Mode Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border bg-card p-4 shadow-soft">
        <div className="flex flex-wrap items-center gap-3">
          <span className="grid size-10 place-items-center rounded-2xl bg-secondary text-primary">
            <MapPin className="size-5" aria-hidden />
          </span>
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Selected Service Location ({serviceLocation ? serviceLocation.source.toUpperCase() : "Barangay"})
            </p>
            <p className="text-sm font-extrabold text-foreground">
              {originLabel}{" "}
              <span className="font-normal text-muted-foreground">
                · {results.length} {results.length === 1 ? "worker" : "workers"} within {radius} km
              </span>
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            variant={showLocationPicker ? "default" : "outline"}
            onClick={() => setShowLocationPicker((v) => !v)}
          >
            <Navigation className="size-3.5" />
            {showLocationPicker ? "Close Pinpoint Map" : "Use GPS / Move Pin"}
          </Button>
        </div>

        {/* View Toggle (Map + List / Map / List) */}
        <div
          role="group"
          aria-label="Discovery view mode"
          className="inline-flex rounded-full border bg-muted p-1 text-xs font-semibold"
        >
          {(
            [
              ["split", "Map & List", MapIcon],
              ["map", "Map Only", MapIcon],
              ["list", "List Only", List],
            ] as const
          ).map(([k, l, Icon]) => (
            <button
              key={k}
              type="button"
              aria-pressed={viewMode === k}
              onClick={() => setViewMode(k)}
              className={cn(
                "inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-full px-3 transition-colors",
                viewMode === k ? "bg-card text-primary shadow-soft" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="size-3.5" aria-hidden />
              <span>{l}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Expandable Live GPS & Pinpoint Location Picker */}
      {showLocationPicker && (
        <div className="animate-fade-up">
          <LocationPicker
            modeLabel="Employer Service Location (Live GPS or Map Pin)"
            initialLocation={origin}
            initialBarangayId={locationId}
            initialLabel={serviceLocation?.label ?? barangayName(locationId)}
            onConfirm={(placed) => {
              setServiceLocation(placed);
              setShowLocationPicker(false);
            }}
          />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        {/* Left Sidebar Filters */}
        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <div className="space-y-4 rounded-3xl border bg-card p-5 shadow-soft">
            <div className="space-y-1.5">
              <label htmlFor="finder-q" className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Search Name or Skill
              </label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                <Input
                  id="finder-q"
                  type="search"
                  placeholder="Try “Motorcycle Mechanic”, “Ramon”, or “leak”"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <LocationFilter
              id="finder-brgy"
              label="Barangay Quick Jump"
              value={locationId}
              onChange={(id) => {
                setLocation(id);
                setSelectedWorker(null);
              }}
            />

            {/* Unlimited Service Categories & Custom Service Picker */}
            <ServicePicker
              id="finder-cat"
              label="Service Category (Predefined or Custom)"
              value={category}
              onChange={(svc) => setCategory(svc)}
              includeAll
              allLabel="All services"
              allowCustom
            />

            <fieldset>
              <legend className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Proximity Radius
              </legend>
              <div className="grid grid-cols-4 gap-1 rounded-xl bg-muted p-1">
                {RADIUS_OPTIONS.map((r) => (
                  <button
                    key={r}
                    type="button"
                    aria-pressed={radius === r}
                    onClick={() => setRadius(r)}
                    className={cn(
                      "h-10 cursor-pointer rounded-lg text-sm font-semibold transition-all",
                      radius === r ? "bg-card text-primary shadow-soft" : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {r} km
                  </button>
                ))}
              </div>
            </fieldset>

            <div className="flex items-center justify-between gap-3">
              <label htmlFor="finder-avail" className="text-sm font-semibold">
                Available now only
              </label>
              <Switch id="finder-avail" checked={availableOnly} onCheckedChange={setAvailableOnly} />
            </div>

            {/* Employer Pro Filter */}
            <div className="flex items-center justify-between gap-3 rounded-2xl bg-muted/60 p-3">
              <div>
                <label htmlFor="finder-pro-top" className="flex items-center gap-1.5 text-xs font-bold">
                  <Crown className="size-3.5 text-gold" aria-hidden /> Top-Rated Only (4.8★+)
                </label>
                {!isEmployerPro && (
                  <Link to="/pro" className="text-[11px] font-semibold text-primary underline">
                    Unlock with GAW Employer Pro (Demo) →
                  </Link>
                )}
              </div>
              <Switch
                id="finder-pro-top"
                checked={isEmployerPro && topRatedOnly}
                disabled={!isEmployerPro}
                onCheckedChange={setTopRatedOnly}
              />
            </div>

            {filtersActive && (
              <Button variant="ghost" size="sm" onClick={clear} className="w-full">
                Clear filters
              </Button>
            )}
          </div>
        </aside>

        {/* Right Discovery Area: Interactive Map & Worker List */}
        <section aria-live="polite" aria-label="Results" className="space-y-5">
          {/* Interactive Map View */}
          {(viewMode === "split" || viewMode === "map") && (
            <div className="space-y-3 rounded-3xl border bg-card p-4 shadow-soft">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-base font-extrabold">
                    Interactive Worker Map · {originLabel} ({radius} km radius)
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Tap any worker marker on the map to open their card, or drag the location pin to change your search center.
                  </p>
                </div>
                <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-bold text-secondary-foreground">
                  {results.length} nearby
                </span>
              </div>

              <InteractiveMap
                center={origin}
                pin={origin}
                pinLabel={`Your service location (${originLabel})`}
                draggablePin
                onMovePin={(pos) => {
                  const near = BARANGAYS.find((b) => b.id === locationId) ?? BARANGAYS[0]!;
                  setServiceLocation({
                    lat: pos.lat,
                    lng: pos.lng,
                    label: `Pin near ${near.name} (${pos.lat.toFixed(4)}, ${pos.lng.toFixed(4)})`,
                    source: "pin",
                  });
                }}
                radiusKm={radius}
                workers={results}
                selectedWorkerId={selectedWorker?.id ?? null}
                onSelectWorker={(w) => setSelectedWorker(w)}
                className={viewMode === "map" ? "h-[460px]" : "h-72 md:h-80"}
              />

              {/* Selected Worker Marker Drawer Card */}
              {selectedWorker && (
                <div className="animate-fade-up rounded-2xl border-2 border-primary bg-muted/40 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <Avatar initials={selectedWorker.initials} />
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-extrabold">{selectedWorker.name}</h3>
                          <span className="inline-flex items-center gap-1 text-xs font-bold">
                            <Star className="size-3.5 fill-gold text-gold" aria-hidden />
                            {selectedWorker.rating.toFixed(1)}
                          </span>
                        </div>
                        <p className="text-sm font-semibold text-primary">{selectedWorker.skill}</p>
                        <p className="text-xs text-muted-foreground">
                          {barangayName(selectedWorker.barangayId)} · ≈ {selectedWorker.distance} km from your pin
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedWorker(null)}
                      className="cursor-pointer rounded-full p-1 text-muted-foreground hover:text-foreground"
                      aria-label="Close selected worker preview"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t pt-3">
                    <div className="flex items-center gap-3">
                      <Availability available={selectedWorker.available} />
                      <span className="text-sm font-bold">
                        {selectedWorker.rate ? `${formatPeso(selectedWorker.rate)} / hr` : "Request Quote"}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <Button asChild size="sm" variant="outline">
                        <Link to="/workers/$id" params={{ id: selectedWorker.id }}>
                          View Profile
                        </Link>
                      </Button>
                      {selectedWorker.id !== "w-me" && (
                        <Button asChild size="sm">
                          <Link to="/book/$workerId" params={{ workerId: selectedWorker.id }}>
                            Request Booking
                          </Link>
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Worker List View */}
          {(viewMode === "split" || viewMode === "list") && (
            <>
              {results.length ? (
                <div className="grid gap-3 md:grid-cols-2">
                  {results.map((w) => (
                    <WorkerCard key={w.id} worker={w} />
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={<SearchX className="size-6" />}
                  title="No workers match yet"
                  body={`Nobody fits these filters within ${radius} km of ${originLabel}. Try a wider radius or fewer filters.`}
                  action={
                    <div className="flex flex-wrap justify-center gap-2">
                      {radius < 10 && <Button onClick={() => setRadius(10)}>Widen to 10 km</Button>}
                      {filtersActive && (
                        <Button variant="outline" onClick={clear}>
                          Clear filters
                        </Button>
                      )}
                    </div>
                  }
                />
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
