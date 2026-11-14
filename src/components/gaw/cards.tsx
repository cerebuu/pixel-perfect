import { Link } from "@tanstack/react-router";
import { Briefcase, Clock, MapPin, Star, Zap } from "lucide-react";
import { interactiveEntityCardClass } from "./interactions";
import { Avatar, AvailabilityBadge, PriceDisplay, SkillChip } from "./primitives";
import { Button } from "@/components/ui/button";
import { barangayName, type Job } from "@/lib/gaw/data";
import type { WorkerWithDistance } from "@/lib/gaw/filter";
import { useI18n } from "@/lib/gaw/i18n";
import { formatPeso } from "@/lib/gaw/store";
import { cn } from "@/lib/utils";

export function WorkerCard({ worker }: { worker: WorkerWithDistance }) {
  const { tx, translateCategory } = useI18n();
  return (
    <article className={cn(interactiveEntityCardClass, "flex flex-col justify-between")}>
      <div className="flex gap-3.5">
        <Avatar initials={worker.initials} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="truncate text-base font-extrabold tracking-tight text-foreground transition-colors duration-150 group-hover:text-primary">
                {worker.name}
              </h3>
              <p className="text-sm font-semibold text-primary">
                {translateCategory(worker.skill)}
              </p>
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
            <span aria-hidden className="text-muted-foreground/50">
              ·
            </span>
            <span
              title={tx(
                "Calculated distance from your selected service location",
                "Kinarkulang layo mula sa napiling lokasyon ng serbisyo",
                "Gikalkula nga gilay-on gikan sa gipiling lokasyon sa serbisyo",
              )}
            >
              ≈ {worker.distance} {tx("km away", "km ang layo", "km ang gilay-on")}
            </span>
          </div>
          {worker.skills.length > 0 && (
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {worker.skills.slice(0, 3).map((s) => (
                <SkillChip key={s}>{translateCategory(s)}</SkillChip>
              ))}
            </div>
          )}
          <div className="mt-2.5">
            <AvailabilityBadge available={worker.available} />
          </div>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between gap-3 border-t border-border/80 pt-3.5">
        <PriceDisplay
          formattedRate={worker.rate ? formatPeso(worker.rate) : null}
          unit={tx("/ hour", "/ oras", "/ oras")}
          fallback={tx("Request Quote", "Humingi ng Presyo", "Mangayo og Presyo")}
        />
        <Button
          asChild
          size="sm"
          variant="soft"
          className="group-hover:border-primary group-hover:bg-primary group-hover:text-primary-foreground group-hover:shadow-soft"
        >
          <Link
            to="/workers/$id"
            params={{ id: worker.id }}
            aria-label={`View profile of ${worker.name}`}
            className="after:absolute after:inset-0 after:rounded-2xl after:content-['']"
          >
            {tx("View Profile", "Tingnan ang Profile", "Tan-awa ang Profile")}
          </Link>
        </Button>
      </div>
    </article>
  );
}

export function JobCard({ job, applied }: { job: Job; applied?: boolean }) {
  const { tx, translateCategory } = useI18n();
  return (
    <article className={interactiveEntityCardClass}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-1.5 flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-primary/20 bg-secondary px-2.5 py-0.5 text-xs font-semibold text-secondary-foreground">
              {translateCategory(job.category)}
            </span>
            {job.urgent && (
              <span className="inline-flex items-center gap-1 rounded-full bg-gold-soft px-2.5 py-0.5 text-xs font-semibold text-gold-foreground ring-1 ring-inset ring-gold/30 dark:text-gold">
                <Zap className="size-3" aria-hidden /> {tx("Urgent", "Apurahan", "Dinalian")}
              </span>
            )}
          </div>
          <h3 className="text-base font-extrabold leading-snug tracking-tight text-foreground transition-colors duration-150 group-hover:text-primary">
            {job.title}
          </h3>
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
          <Briefcase className="size-3.5 text-primary/85" aria-hidden />{" "}
          {tx("Posted", "Na-post", "Gi-post")} {job.posted}
        </span>
      </div>
      <div className="mt-4 flex items-center justify-between gap-3 border-t border-border/80 pt-3.5">
        {applied ? (
          <span className="text-sm font-semibold text-primary">
            ✓ {tx("Application submitted", "Naipasa ang aplikasyon", "Na-submit ang aplikasyon")}
          </span>
        ) : (
          <span className="text-sm text-muted-foreground">
            {tx("Open for applications", "Bukas sa aplikasyon", "Abli sa aplikasyon")}
          </span>
        )}
        <Button
          asChild
          size="sm"
          variant={applied ? "outline" : "default"}
          className={
            applied
              ? "group-hover:border-hover-border group-hover:bg-hover-surface group-hover:text-foreground"
              : "group-hover:brightness-[1.06] group-hover:shadow-soft"
          }
        >
          <Link
            to="/jobs/$id"
            params={{ id: job.id }}
            aria-label={`View job: ${job.title}`}
            className="after:absolute after:inset-0 after:rounded-2xl after:content-['']"
          >
            {tx("View Job", "Tingnan ang Trabaho", "Tan-awa ang Trabaho")}
          </Link>
        </Button>
      </div>
    </article>
  );
}
