import { Link } from "@tanstack/react-router";
import { Briefcase, Clock, MapPin, Star, Zap } from "lucide-react";
import { Avatar, AvailabilityBadge, PriceDisplay, SkillChip } from "./primitives";
import { Button } from "@/components/ui/button";
import { barangayName, type Job } from "@/lib/gaw/data";
import type { WorkerWithDistance } from "@/lib/gaw/filter";
import { formatPeso } from "@/lib/gaw/store";

export function WorkerCard({ worker }: { worker: WorkerWithDistance }) {
  return (
    <article className="group animate-fade-up flex flex-col justify-between rounded-2xl border bg-card p-4 shadow-soft transition-all hover:border-primary/45 hover:shadow-lift md:p-5">
      <div className="flex gap-3.5">
        <Avatar initials={worker.initials} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="truncate text-base font-extrabold tracking-tight text-foreground">{worker.name}</h3>
              <p className="text-sm font-semibold text-primary">{worker.skill}</p>
            </div>
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-gold/12 px-2.5 py-0.5 text-xs font-extrabold text-foreground ring-1 ring-inset ring-gold/30">
              <Star className="size-3.5 fill-gold text-gold" aria-hidden />
              {worker.rating.toFixed(1)}
            </span>
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1 font-medium text-foreground/85">
              <MapPin className="size-3.5 text-primary/85" aria-hidden />
              {barangayName(worker.barangayId)}
            </span>
            <span aria-hidden className="text-muted-foreground/50">·</span>
            <span title="Calculated distance from your selected service location">≈ {worker.distance} km away</span>
          </div>
          {worker.skills.length > 0 && (
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {worker.skills.slice(0, 3).map((s) => (
                <SkillChip key={s}>{s}</SkillChip>
              ))}
            </div>
          )}
          <div className="mt-2.5">
            <AvailabilityBadge available={worker.available} />
          </div>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between gap-3 border-t border-border/80 pt-3.5">
        <PriceDisplay formattedRate={worker.rate ? formatPeso(worker.rate) : null} />
        <Button asChild size="sm" variant="soft">
          <Link to="/workers/$id" params={{ id: worker.id }} aria-label={`View profile of ${worker.name}`}>
            View Profile
          </Link>
        </Button>
      </div>
    </article>
  );
}

export function JobCard({ job, applied }: { job: Job; applied?: boolean }) {
  return (
    <article className="animate-fade-up rounded-2xl border bg-card p-4 shadow-soft transition-all hover:border-primary/45 hover:shadow-lift md:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-1.5 flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-primary/20 bg-secondary px-2.5 py-0.5 text-xs font-semibold text-secondary-foreground">
              {job.category}
            </span>
            {job.urgent && (
              <span className="inline-flex items-center gap-1 rounded-full bg-gold-soft px-2.5 py-0.5 text-xs font-semibold text-gold-foreground ring-1 ring-inset ring-gold/30 dark:text-gold">
                <Zap className="size-3" aria-hidden /> Urgent
              </span>
            )}
          </div>
          <h3 className="text-base font-extrabold leading-snug tracking-tight text-foreground">{job.title}</h3>
          <p className="mt-0.5 text-sm text-muted-foreground">{job.poster}</p>
        </div>
        <p className="shrink-0 text-right text-sm font-extrabold text-foreground">{job.budget}</p>
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <MapPin className="size-3.5 text-primary/85" aria-hidden /> {barangayName(job.barangayId)}
        </span>
        <span className="inline-flex items-center gap-1">
          <Clock className="size-3.5 text-primary/85" aria-hidden /> {job.schedule}
        </span>
        <span className="inline-flex items-center gap-1">
          <Briefcase className="size-3.5 text-primary/85" aria-hidden /> Posted {job.posted}
        </span>
      </div>
      <div className="mt-4 flex items-center justify-between gap-3 border-t border-border/80 pt-3.5">
        {applied ? (
          <span className="text-sm font-semibold text-primary">✓ Application submitted</span>
        ) : (
          <span className="text-sm text-muted-foreground">Open for applications</span>
        )}
        <Button asChild size="sm" variant={applied ? "outline" : "default"}>
          <Link to="/jobs/$id" params={{ id: job.id }} aria-label={`View job: ${job.title}`}>
            View Job
          </Link>
        </Button>
      </div>
    </article>
  );
}
