import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowUpDown,
  List,
  Map as MapIcon,
  MapPin,
  Navigation,
  Search,
  SearchX,
  X,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { AppLayout } from "@/components/gaw/AppLayout";
import { JobCard } from "@/components/gaw/cards";
import { InteractiveMap, LocationPicker } from "@/components/gaw/GawMap";
import {
  filterTabPillClass,
  iconActionButtonClass,
  segmentedOptionClass,
} from "@/components/gaw/interactions";
import { EmptyState, LocationFilter } from "@/components/gaw/primitives";
import { ServicePicker } from "@/components/gaw/ServicePicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  BARANGAYS,
  barangayById,
  barangayName,
  RADIUS_OPTIONS,
  type Category,
} from "@/lib/gaw/data";
import { FREE_WORKER_QUEUE_LIMIT } from "@/lib/gaw/domain";
import { filterAndSortJobs, type JobSortBy, type JobWithDistance } from "@/lib/gaw/filter";
import { useI18n } from "@/lib/gaw/i18n";
import { useGaw } from "@/lib/gaw/store";

export const Route = createFileRoute("/jobs/")({
  head: () => ({
    meta: [
      { title: "Find Jobs — GAW" },
      {
        name: "description",
        content: "Browse nearby plumbing, electrical, cleaning and other jobs in Davao City.",
      },
      { property: "og:title", content: "Find Jobs — GAW" },
      {
        property: "og:description",
        content: "Browse nearby plumbing, electrical, cleaning and other jobs in Davao City.",
      },
    ],
  }),
  component: JobsPage,
});

function JobsPage() {
  const { tx } = useI18n();
  return (
    <AppLayout mode="work" title={tx("Find Jobs", "Maghanap ng Trabaho", "Pangita og Trabaho")}>
      <JobsList />
    </AppLayout>
  );
}

type ViewMode = "split" | "map" | "list";

function JobsList() {
  const {
    allJobs,
    applications,
    workerProfile,
    locationId,
    userGps,
    setUserGps,
    savedJobIds,
    toggleSaveJob,
  } = useGaw();
  const { tx, translateCategory } = useI18n();

  const defaultBrgyId = workerProfile?.barangayId ?? locationId ?? "bajada";
  const defaultBrgy = barangayById(defaultBrgyId) ?? BARANGAYS[0]!;
  const origin = useMemo(
    () => userGps ?? workerProfile?.area ?? { lat: defaultBrgy.lat, lng: defaultBrgy.lng },
    [userGps, workerProfile?.area, defaultBrgy.lat, defaultBrgy.lng],
  );
  const originLabel = userGps
    ? userGps.label
    : workerProfile?.area
      ? `${barangayName(defaultBrgyId)} (${tx("Service Area", "Lugar ng Serbisyo", "Dapit sa Serbisyo")})`
      : barangayName(defaultBrgyId);

  const [category, setCategory] = useState<Category | "all">("all");
  const [area, setArea] = useState("all");
  const [query, setQuery] = useState("");
  const [radiusKm, setRadiusKm] = useState<number | undefined>(undefined);
  const [sortBy, setSortBy] = useState<JobSortBy>("nearest");
  const [urgentOnly, setUrgentOnly] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("split");
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);

  const applied = new Set(applications.map((a) => a.jobId));
  const savedSet = new Set(savedJobIds);

  const list = useMemo(
    () =>
      filterAndSortJobs(allJobs, {
        origin,
        category,
        barangayId: area,
        query,
        radiusKm,
        urgentOnly,
        sortBy,
      }),
    [allJobs, origin, category, area, query, radiusKm, urgentOnly, sortBy],
  );

  const selectedJob = list.find((j) => j.id === selectedJobId) ?? null;

  const handleToggleSave = (job: JobWithDistance) => {
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

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      {!workerProfile && (
        <div className="flex flex-col gap-3 rounded-2xl bg-gold-soft p-4 text-gold-foreground sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-semibold">
            {tx(
              "Set up your worker profile to apply for jobs.",
              "I-set up muna ang iyong worker profile para makapag-apply sa trabaho.",
              "I-set up una ang imong worker profile aron maka-apply sa trabaho.",
            )}
          </p>
          <Button asChild size="sm" variant="gold">
            <Link to="/work">
              {tx("Set up profile", "I-set up ang profile", "I-set up ang profile")}
            </Link>
          </Button>
        </div>
      )}

      {/* Top Origin & View Mode Bar (mirrors Hiring Finder) */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border bg-card p-4 shadow-soft">
        <div className="flex flex-wrap items-center gap-3">
          <span className="grid size-10 place-items-center rounded-2xl bg-secondary text-primary">
            <MapPin className="size-5" aria-hidden />
          </span>
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              {tx("Distance From", "Layo Mula Sa", "Gilay-on Gikan Sa")}
            </p>
            <p className="text-sm font-extrabold text-foreground">
              {originLabel}{" "}
              <span className="font-normal text-muted-foreground">
                · {list.length}{" "}
                {tx(
                  `job${list.length === 1 ? "" : "s"} found`,
                  "trabahong nahanap",
                  "ka trabaho nakit-an",
                )}
              </span>
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            variant={showLocationPicker ? "default" : "outline"}
            onClick={() => setShowLocationPicker((v) => !v)}
          >
            <Navigation className="size-3.5" aria-hidden />
            {showLocationPicker
              ? tx("Close Map Pin", "Isara ang Mapa", "Sirad-i ang Mapa")
              : tx("Use GPS / Set Area", "Gamitin ang GPS / Lugar", "Gamita ang GPS / Dapit")}
          </Button>
          {userGps && (
            <Button type="button" size="sm" variant="ghost" onClick={() => setUserGps(null)}>
              {tx("Reset pin", "I-reset ang pin", "I-reset ang pin")}
            </Button>
          )}
        </div>

        <div
          role="group"
          aria-label={tx("Job discovery view mode", "Paraan ng pagtingin", "Paagi sa pagtan-aw")}
          className="inline-flex rounded-full border bg-muted p-1 text-xs font-semibold"
        >
          {(
            [
              ["split", tx("Map & List", "Mapa at Listahan", "Mapa ug Listahan"), MapIcon],
              ["map", tx("Map Only", "Mapa Lang", "Mapa Lang"), MapIcon],
              ["list", tx("List Only", "Listahan Lang", "Listahan Lang"), List],
            ] as const
          ).map(([k, l, Icon]) => (
            <button
              key={k}
              type="button"
              aria-pressed={viewMode === k}
              onClick={() => setViewMode(k)}
              className={segmentedOptionClass(
                viewMode === k,
                "card",
                "inline-flex h-8 items-center gap-1.5 rounded-full px-3",
              )}
            >
              <Icon className="size-3.5" aria-hidden />
              <span>{l}</span>
            </button>
          ))}
        </div>
      </div>

      {showLocationPicker && (
        <div className="animate-fade-up">
          <LocationPicker
            modeLabel={tx(
              "Choose Where to Measure Job Distances From (Opt-In GPS or Map Pin)",
              "Piliin Kung Saan Susukatin ang Layo (Opsyonal na GPS o Map Pin)",
              "Pilia Kon Asa Sukdon ang Gilay-on (Opsyonal nga GPS o Map Pin)",
            )}
            initialLocation={origin}
            initialBarangayId={defaultBrgyId}
            initialLabel={originLabel}
            onConfirm={(placed) => {
              setUserGps(placed);
              setShowLocationPicker(false);
            }}
          />
        </div>
      )}

      {/* Search & Filter Controls */}
      <div className="space-y-3 rounded-3xl border bg-card p-4 shadow-soft">
        <div className="relative">
          <label htmlFor="jobs-q" className="sr-only">
            {tx("Search jobs", "Maghanap ng trabaho", "Pangita og trabaho")}
          </label>
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            id="jobs-q"
            type="search"
            placeholder={tx(
              "Search jobs, landmarks, or skills…",
              "Maghanap ng trabaho, palatandaan, o kasanayan…",
              "Pangita og trabaho, landmark, o abilidad…",
            )}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <ServicePicker
            id="jobs-cat"
            label={tx("Category", "Kategorya", "Kategorya")}
            value={category}
            onChange={(svc) => setCategory(svc)}
            includeAll
            allLabel={tx("All categories", "Lahat ng kategorya", "Tanang kategorya")}
            allowCustom
          />
          <LocationFilter
            id="jobs-area"
            label={tx("Area", "Lugar", "Dapit")}
            value={area}
            onChange={setArea}
            includeAll
          />
          <div className="space-y-1.5">
            <label
              htmlFor="jobs-sort"
              className="flex items-center gap-1.5 text-sm font-semibold text-foreground"
            >
              <ArrowUpDown className="size-3.5 text-primary" aria-hidden />
              {tx("Sort by", "Ayusin ayon sa", "Han-aya base sa")}
            </label>
            <select
              id="jobs-sort"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as JobSortBy)}
              className="field"
            >
              <option value="nearest">
                {tx("Nearest first", "Pinakamalapit muna", "Pinakaduol una")}
              </option>
              <option value="pay">
                {tx("Highest pay first", "Pinakamataas na bayad", "Pinakataas nga suhol")}
              </option>
              <option value="urgent">{tx("Urgent first", "Apurahan muna", "Dinalian una")}</option>
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div
            role="group"
            aria-label={tx("Distance radius filter", "Layo ng trabaho", "Gilay-on sa trabaho")}
            className="flex flex-wrap items-center gap-1.5"
          >
            <button
              type="button"
              aria-pressed={radiusKm === undefined}
              onClick={() => setRadiusKm(undefined)}
              className={filterTabPillClass(
                radiusKm === undefined,
                "h-8 rounded-full border px-3 text-xs font-semibold",
              )}
            >
              {tx("All Davao", "Buong Davao", "Tibuok Davao")}
            </button>
            {RADIUS_OPTIONS.map((r) => (
              <button
                key={r}
                type="button"
                aria-pressed={radiusKm === r}
                onClick={() => setRadiusKm(r)}
                className={filterTabPillClass(
                  radiusKm === r,
                  "h-8 rounded-full border px-3 text-xs font-semibold",
                )}
              >
                ≤ {r} km
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {workerProfile && category !== workerProfile.skill && (
              <button
                type="button"
                onClick={() => setCategory(workerProfile.skill)}
                className={filterTabPillClass(
                  false,
                  "inline-flex h-8 items-center rounded-full border border-primary/25 bg-secondary/40 px-3 text-xs font-semibold text-primary hover:border-primary/50 hover:text-primary",
                )}
              >
                {tx(
                  `Show only ${translateCategory(workerProfile.skill)} jobs`,
                  `Ipakita ang ${translateCategory(workerProfile.skill)} lang`,
                  `Ipakita ang ${translateCategory(workerProfile.skill)} lang`,
                )}
              </button>
            )}
            <label
              htmlFor="jobs-urgent"
              className="inline-flex cursor-pointer items-center gap-2 text-xs font-semibold text-foreground"
            >
              <Switch id="jobs-urgent" checked={urgentOnly} onCheckedChange={setUrgentOnly} />
              <Zap className="size-3.5 text-gold" aria-hidden />
              {tx("Urgent only", "Apurahan lang", "Dinalian lang")}
            </label>
          </div>
        </div>
      </div>

      {/* Interactive Jobs Map */}
      {(viewMode === "split" || viewMode === "map") && (
        <div className="space-y-3 rounded-3xl border bg-card p-4 shadow-soft">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-extrabold">
                {tx(
                  "Nearby Davao Jobs Map",
                  "Mapa ng Mga Trabaho sa Davao",
                  "Mapa sa Mga Trabaho sa Davao",
                )}{" "}
                · {originLabel}
              </h2>
              <p className="text-xs text-muted-foreground">
                {tx(
                  "Tap any job pin to inspect pay, distance, and save or apply. Drag the green pin to shift your search center.",
                  "Pindutin ang anumang pin ng trabaho para makita ang bayad, layo, at i-save o mag-apply.",
                  "Pindota ang bisan unsang pin sa trabaho aron makita ang bayad, gilay-on, ug i-save o mo-apply.",
                )}
              </p>
            </div>
            <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-bold text-secondary-foreground">
              {list.length} {tx("shown", "nakalista", "gipakita")}
            </span>
          </div>

          <InteractiveMap
            center={origin}
            pin={origin}
            pinLabel={originLabel}
            draggablePin
            onMovePin={(pos) => {
              const near = BARANGAYS.find((b) => b.id === defaultBrgyId) ?? BARANGAYS[0]!;
              setUserGps({
                lat: pos.lat,
                lng: pos.lng,
                label: `Pin near ${near.name} (${pos.lat.toFixed(4)}, ${pos.lng.toFixed(4)})`,
                source: "pin",
              });
            }}
            radiusKm={radiusKm ?? null}
            jobs={list}
            selectedJobId={selectedJobId}
            onSelectJob={(j) => setSelectedJobId(j.id)}
            className={viewMode === "map" ? "h-[440px]" : "h-72"}
          />

          {selectedJob && (
            <div className="animate-fade-up rounded-2xl border-2 border-primary bg-muted/40 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-semibold text-secondary-foreground">
                      {translateCategory(selectedJob.category)}
                    </span>
                    <span className="text-xs font-semibold text-primary">
                      ≈ {selectedJob.distance} km · {selectedJob.budget}
                    </span>
                  </div>
                  <h3 className="mt-1 font-extrabold">{selectedJob.title}</h3>
                  <p className="text-xs text-muted-foreground">
                    {selectedJob.poster} · {barangayName(selectedJob.barangayId)}
                    {selectedJob.landmark ? ` (${selectedJob.landmark})` : ""}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedJobId(null)}
                  className={iconActionButtonClass("default", "size-8 shrink-0")}
                  aria-label={tx(
                    "Close selected job preview",
                    "Isara ang preview",
                    "Sirad-i ang preview",
                  )}
                >
                  <X className="size-4" />
                </button>
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-end gap-2 border-t pt-3">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => handleToggleSave(selectedJob)}
                >
                  {savedSet.has(selectedJob.id)
                    ? tx("Saved", "Naka-save", "Gi-save")
                    : tx("Save job", "I-save", "I-save")}
                </Button>
                <Button asChild size="sm">
                  <Link to="/jobs/$id" params={{ id: selectedJob.id }}>
                    {tx("View & Apply", "Tingnan at Mag-apply", "Tan-awa ug Mo-apply")}
                  </Link>
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      <p className="text-sm text-muted-foreground" aria-live="polite">
        {list.length}{" "}
        {tx(`job${list.length === 1 ? "" : "s"} found`, "trabahong nahanap", "ka trabaho nakit-an")}
      </p>

      {(viewMode === "split" || viewMode === "list") &&
        (list.length ? (
          <div className="space-y-3">
            {list.map((j) => (
              <JobCard
                key={j.id}
                job={j}
                applied={applied.has(j.id)}
                saved={savedSet.has(j.id)}
                onToggleSave={() => handleToggleSave(j)}
                onFocusMap={() => {
                  setSelectedJobId(j.id);
                  if (viewMode === "list") setViewMode("split");
                }}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<SearchX className="size-6" />}
            title={tx("No jobs match", "Walang trabahong tumugma", "Walay trabaho nga nihaom")}
            body={tx(
              "Try widening the radius or clearing filters.",
              "Subukan ang mas malawak na kilometro o i-reset ang mga filter.",
              "Sulayi ang mas lapad nga kilometro o i-reset ang mga filter.",
            )}
            action={
              <Button
                variant="outline"
                onClick={() => {
                  setCategory("all");
                  setArea("all");
                  setQuery("");
                  setRadiusKm(undefined);
                  setUrgentOnly(false);
                }}
              >
                {tx("Clear filters", "Burahin ang mga filter", "Papason ang mga filter")}
              </Button>
            }
          />
        ))}
    </div>
  );
}
