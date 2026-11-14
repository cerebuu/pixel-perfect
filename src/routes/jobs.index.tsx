import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Search, SearchX } from "lucide-react";
import { AppLayout } from "@/components/gaw/AppLayout";
import { JobCard } from "@/components/gaw/cards";
import { filterTabPillClass } from "@/components/gaw/interactions";
import { EmptyState, LocationFilter } from "@/components/gaw/primitives";
import { ServicePicker } from "@/components/gaw/ServicePicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { JOBS, type Category } from "@/lib/gaw/data";
import { filterJobs } from "@/lib/gaw/filter";
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

function JobsList() {
  const { applications, workerProfile } = useGaw();
  const { tx, translateCategory } = useI18n();
  const [category, setCategory] = useState<Category | "all">("all");
  const [area, setArea] = useState("all");
  const [query, setQuery] = useState("");
  const applied = new Set(applications.map((a) => a.jobId));
  const list = useMemo(
    () => filterJobs(JOBS, { category, barangayId: area, query }),
    [category, area, query],
  );

  return (
    <div className="mx-auto max-w-3xl">
      {!workerProfile && (
        <div className="mb-4 flex flex-col gap-3 rounded-2xl bg-gold-soft p-4 text-gold-foreground sm:flex-row sm:items-center sm:justify-between">
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
      <div className="mb-5 space-y-3 rounded-3xl border bg-card p-4 shadow-soft">
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
            placeholder={tx("Search jobs", "Maghanap ng trabaho", "Pangita og trabaho")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
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
        </div>
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
      </div>
      <p className="mb-3 text-sm text-muted-foreground" aria-live="polite">
        {list.length}{" "}
        {tx(`job${list.length === 1 ? "" : "s"} found`, "trabahong nahanap", "ka trabaho nakit-an")}
      </p>
      {list.length ? (
        <div className="space-y-3">
          {list.map((j) => (
            <JobCard key={j.id} job={j} applied={applied.has(j.id)} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<SearchX className="size-6" />}
          title={tx("No jobs match", "Walang trabahong tumugma", "Walay trabaho nga nihaom")}
          body={tx(
            "Try another category or area.",
            "Subukan ang ibang kategorya o lugar.",
            "Sulayi ang laing kategorya o dapit.",
          )}
          action={
            <Button
              variant="outline"
              onClick={() => {
                setCategory("all");
                setArea("all");
                setQuery("");
              }}
            >
              {tx("Clear filters", "Burahin ang mga filter", "Papason ang mga filter")}
            </Button>
          }
        />
      )}
    </div>
  );
}
