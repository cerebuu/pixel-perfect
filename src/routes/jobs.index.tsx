import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Search, SearchX } from "lucide-react";
import { AppLayout } from "@/components/gaw/AppLayout";
import { JobCard } from "@/components/gaw/cards";
import { EmptyState, LocationFilter } from "@/components/gaw/primitives";
import { ServicePicker } from "@/components/gaw/ServicePicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { JOBS, type Category } from "@/lib/gaw/data";
import { filterJobs } from "@/lib/gaw/filter";
import { useGaw } from "@/lib/gaw/store";

export const Route = createFileRoute("/jobs/")({
  head: () => ({
    meta: [
      { title: "Find Jobs — GAW" },
      { name: "description", content: "Browse nearby plumbing, electrical, cleaning and other jobs in Davao City." },
      { property: "og:title", content: "Find Jobs — GAW" },
      { property: "og:description", content: "Browse nearby plumbing, electrical, cleaning and other jobs in Davao City." },
    ],
  }),
  component: () => (
    <AppLayout mode="work" title="Find Jobs">
      <JobsList />
    </AppLayout>
  ),
});

function JobsList() {
  const { applications, workerProfile } = useGaw();
  const [category, setCategory] = useState<Category | "all">("all");
  const [area, setArea] = useState("all");
  const [query, setQuery] = useState("");
  const applied = new Set(applications.map((a) => a.jobId));
  const list = useMemo(() => filterJobs(JOBS, { category, barangayId: area, query }), [category, area, query]);

  return (
    <div className="mx-auto max-w-3xl">
      {!workerProfile && (
        <div className="mb-4 flex flex-col gap-3 rounded-2xl bg-gold-soft p-4 text-gold-foreground sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-semibold">Set up your worker profile to apply for jobs.</p>
          <Button asChild size="sm" variant="gold">
            <Link to="/work">Set up profile</Link>
          </Button>
        </div>
      )}
      <div className="mb-5 space-y-3 rounded-3xl border bg-card p-4 shadow-soft">
        <div className="relative">
          <label htmlFor="jobs-q" className="sr-only">
            Search jobs
          </label>
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input id="jobs-q" type="search" placeholder="Search jobs" value={query} onChange={(e) => setQuery(e.target.value)} className="pl-10" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <ServicePicker
            id="jobs-cat"
            label="Category"
            value={category}
            onChange={(svc) => setCategory(svc)}
            includeAll
            allLabel="All categories"
            allowCustom
          />
          <LocationFilter id="jobs-area" label="Area" value={area} onChange={setArea} includeAll />
        </div>
        {workerProfile && category !== workerProfile.skill && (
          <button
            type="button"
            onClick={() => setCategory(workerProfile.skill)}
            className="cursor-pointer text-sm font-semibold text-primary underline-offset-4 hover:underline"
          >
            Show only {workerProfile.skill} jobs
          </button>
        )}
      </div>
      <p className="mb-3 text-sm text-muted-foreground" aria-live="polite">
        {list.length} job{list.length === 1 ? "" : "s"} found
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
          title="No jobs match"
          body="Try another category or area."
          action={
            <Button
              variant="outline"
              onClick={() => {
                setCategory("all");
                setArea("all");
                setQuery("");
              }}
            >
              Clear filters
            </Button>
          }
        />
      )}
    </div>
  );
}
