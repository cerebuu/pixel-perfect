import { barangayName, type Job, type Worker } from "./data";
import { offersService } from "./services";
import type { LatLng } from "./geo";

/** Straight-line (great-circle) distance in km. */
export function distanceKm(a: LatLng, b: LatLng) {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function roundKm(km: number) {
  return Math.round(km * 10) / 10;
}

export interface WorkerFilters {
  origin: LatLng;
  category: string | "all";
  query: string;
  radius: number;
  availableOnly: boolean;
  /** Employer Pro (demo) filter. */
  topRatedOnly?: boolean;
}

export type WorkerWithDistance = Worker & { distance: number };

export function filterWorkers(workers: Worker[], f: WorkerFilters): WorkerWithDistance[] {
  const q = f.query.trim().toLowerCase();
  return workers
    .map((w) => {
      const rawDist = distanceKm(f.origin, w);
      return { w, rawDist, distance: roundKm(rawDist) };
    })
    .filter(({ rawDist }) => rawDist <= f.radius)
    .map(({ w, distance }) => ({ ...w, distance }))
    .filter((w) => f.category === "all" || offersService(w, f.category))
    .filter((w) => !f.availableOnly || w.available)
    .filter((w) => !f.topRatedOnly || w.rating >= 4.8)
    .filter((w) => {
      if (!q) return true;
      const hay = [w.name, w.skill, ...w.skills, barangayName(w.barangayId)]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    })
    .sort((a, b) => Number(b.available) - Number(a.available) || a.distance - b.distance);
}

export interface JobFilters {
  category: string | "all";
  barangayId: string | "all";
  query: string;
}

export type JobSortBy = "nearest" | "pay" | "urgent";

export type JobWithDistance = Job & { distance: number };

export interface JobDiscoveryFilters extends JobFilters {
  origin: LatLng;
  radiusKm?: number | undefined;
  urgentOnly?: boolean;
  sortBy?: JobSortBy;
}

function matchesJobFilters(j: Job, f: JobFilters, q: string) {
  return (
    (f.category === "all" || offersService({ skill: j.category, skills: [] }, f.category)) &&
    (f.barangayId === "all" || j.barangayId === f.barangayId) &&
    (!q ||
      `${j.title} ${j.description} ${j.poster} ${j.category} ${j.landmark ?? ""} ${barangayName(j.barangayId)}`
        .toLowerCase()
        .includes(q))
  );
}

export function filterJobs(jobs: Job[], f: JobFilters): Job[] {
  const q = f.query.trim().toLowerCase();
  return jobs.filter((j) => matchesJobFilters(j, f, q));
}

export function filterAndSortJobs(jobs: Job[], f: JobDiscoveryFilters): JobWithDistance[] {
  const q = f.query.trim().toLowerCase();
  const sortBy = f.sortBy ?? "nearest";

  return jobs
    .map((j) => {
      const rawDist = distanceKm(f.origin, j);
      return { j, rawDist, distance: roundKm(rawDist) };
    })
    .filter(({ j, rawDist }) => {
      if (f.radiusKm !== undefined && rawDist > f.radiusKm) return false;
      if (f.urgentOnly && !j.urgent) return false;
      return matchesJobFilters(j, f, q);
    })
    .sort((a, b) => {
      if (sortBy === "pay") {
        const payA = a.j.budgetNum ?? a.j.aiRecommendedPhp ?? 0;
        const payB = b.j.budgetNum ?? b.j.aiRecommendedPhp ?? 0;
        return payB - payA || a.rawDist - b.rawDist;
      }
      if (sortBy === "urgent") {
        return Number(!!b.j.urgent) - Number(!!a.j.urgent) || a.rawDist - b.rawDist;
      }
      return (
        a.rawDist - b.rawDist ||
        Number(!!b.j.urgent) - Number(!!a.j.urgent) ||
        (b.j.budgetNum ?? b.j.aiRecommendedPhp ?? 0) - (a.j.budgetNum ?? a.j.aiRecommendedPhp ?? 0)
      );
    })
    .map(({ j, distance }) => ({ ...j, distance }));
}
