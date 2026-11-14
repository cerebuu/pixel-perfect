import { Link } from "@tanstack/react-router";
import { Bookmark, Briefcase, Clock, MapPin, Navigation, Scale, Star, Zap } from "lucide-react";
import { interactiveEntityCardClass, iconActionButtonClass } from "./interactions";
import { Avatar, AvailabilityBadge, PriceDisplay, SkillChip } from "./primitives";
import { Button } from "@/components/ui/button";
import { barangayName, type Job } from "@/lib/gaw/data";
import { estimateTravelMinutes, formatDistanceBadge } from "@/lib/gaw/domain";
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

export interface JobCardProps {
  job: Job & { distance?: number };
  applied?: boolean;
  saved?: boolean;
  onToggleSave?: () => void;
  onFocusMap?: () => void;
}

export function JobCard({ job, applied, saved, onToggleSave, onFocusMap }: JobCardProps) {
  const { tx, translateCategory } = useI18n();
  const eta = job.distance !== undefined ? estimateTravelMinutes(job.distance) : null;
  const benchmarkMet = job.budgetNum === null || job.budgetNum >= job.minimumRequiredPhp;

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
            {benchmarkMet && (
              <span
                className="inline-flex items-center gap-1 rounded-full bg-status-confirmed-bg px-2 py-0.5 text-[11px] font-semibold text-status-confirmed"
                title={tx(
                  `Benchmark floor: ${formatPeso(job.minimumRequiredPhp)} (${job.estimatedHours}h est.)`,
                  `Gabay na sahod: ${formatPeso(job.minimumRequiredPhp)} (${job.estimatedHours} oras)`,
                  `Base nga giya: ${formatPeso(job.minimumRequiredPhp)} (${job.estimatedHours} oras)`,
                )}
              >
                <Scale className="size-3" aria-hidden />
                {job.budgetNum === null
                  ? tx("Quote", "Presyohan", "Presyo")
                  : tx("Benchmark ≥", "Pasok sa gabay", "Pasok sa giya")}
              </span>
            )}
          </div>
          <h3 className="text-base font-extrabold leading-snug tracking-tight text-foreground transition-colors duration-150 group-hover:text-primary">
            {job.title}
          </h3>
          <p className="mt-0.5 text-sm text-muted-foreground">{job.poster}</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <p className="text-right text-sm font-extrabold text-foreground">{job.budget}</p>
          {onToggleSave && (
            <button
              type="button"
              onClick={onToggleSave}
              aria-pressed={!!saved}
              aria-label={
                saved
                  ? tx(
                      `Remove ${job.title} from saved jobs`,
                      `Alisin sa naka-save: ${job.title}`,
                      `Kuhaa sa gi-save: ${job.title}`,
                    )
                  : tx(
                      `Save job ${job.title}`,
                      `I-save ang trabaho: ${job.title}`,
                      `I-save ang trabaho: ${job.title}`,
                    )
              }
              title={
                saved ? tx("Saved", "Naka-save", "Gi-save") : tx("Save job", "I-save", "I-save")
              }
              className={iconActionButtonClass(
                "default",
                cn(
                  "relative z-10 size-9 rounded-full border",
                  saved
                    ? "border-primary/40 bg-secondary text-primary"
                    : "border-border bg-card text-muted-foreground",
                ),
              )}
            >
              <Bookmark className={cn("size-4", saved && "fill-current")} aria-hidden />
            </button>
          )}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <MapPin className="size-3.5 text-primary/85" aria-hidden /> {barangayName(job.barangayId)}
          {job.landmark ? ` · ${job.landmark}` : ""}
        </span>
        {job.distance !== undefined && (
          <span className="inline-flex items-center gap-1 font-semibold text-foreground/85">
            <Navigation className="size-3 text-primary" aria-hidden />
            {formatDistanceBadge(job.distance)}
            {eta &&
              ` · ~${eta.minutes}m ${
                eta.mode === "walk" ? tx("walk", "lakad", "lakaw") : tx("ride", "byahe", "sakay")
              }`}
          </span>
        )}
        <span className="inline-flex items-center gap-1">
          <Clock className="size-3.5 text-primary/85" aria-hidden /> {job.schedule} (
          {job.estimatedHours}h)
        </span>
        <span className="inline-flex items-center gap-1">
          <Briefcase className="size-3.5 text-primary/85" aria-hidden />{" "}
          {tx("Posted", "Na-post", "Gi-post")} {job.posted}
        </span>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border/80 pt-3.5">
        {applied ? (
          <span className="text-sm font-semibold text-primary">
            ✓ {tx("Application submitted", "Naipasa ang aplikasyon", "Na-submit ang aplikasyon")}
          </span>
        ) : (
          <span className="text-sm text-muted-foreground">
            {tx("Open for applications", "Bukas sa aplikasyon", "Abli sa aplikasyon")}
          </span>
        )}
        <div className="flex items-center gap-2">
          {onFocusMap && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onFocusMap}
              className="relative z-10"
            >
              <MapPin className="size-3.5" aria-hidden />
              {tx("On map", "Sa mapa", "Sa mapa")}
            </Button>
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
      </div>
    </article>
  );
}
