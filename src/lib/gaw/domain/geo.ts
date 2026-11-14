import { DAVAO_BOUNDS } from "./constants";
import type { LatLng } from "../geo";

const EARTH_RADIUS_KM = 6371;

/** Checks whether coordinates fall within the Davao City demo region bounds. */
export function isWithinDavaoRegion(lat: number, lng: number): boolean {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return false;
  }
  return (
    lat >= DAVAO_BOUNDS.minLat &&
    lat <= DAVAO_BOUNDS.maxLat &&
    lng >= DAVAO_BOUNDS.minLng &&
    lng <= DAVAO_BOUNDS.maxLng
  );
}

/** Calculates great-circle Haversine distance in km (1-meter / 3-decimal precision). */
export function calculateHaversineDistanceKm(a: LatLng, b: LatLng): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const h = sinDLat * sinDLat + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinDLng * sinDLng;
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return Math.round(EARTH_RADIUS_KM * c * 1000) / 1000;
}

/** Heuristic local travel time in minutes for Davao barangay hops (walking <= 1.2km, commute beyond). */
export function estimateTravelMinutes(distanceKm: number): {
  mode: "walk" | "ride";
  minutes: number;
} {
  if (!Number.isFinite(distanceKm) || distanceKm <= 0) {
    return { mode: "walk", minutes: 2 };
  }
  if (distanceKm <= 1.2) {
    return { mode: "walk", minutes: Math.max(2, Math.round(distanceKm * 12)) };
  }
  return { mode: "ride", minutes: Math.max(4, Math.round((distanceKm / 18) * 60 + 2)) };
}

/** Compact distance string for cards (e.g., "450 m" or "1.4 km"). */
export function formatDistanceBadge(distanceKm: number): string {
  if (!Number.isFinite(distanceKm) || distanceKm < 0) return "—";
  if (distanceKm < 1) {
    return `${Math.max(50, Math.round((distanceKm * 1000) / 50) * 50)} m`;
  }
  return `${Math.round(distanceKm * 10) / 10} km`;
}

const HTML_ESCAPE_MAP: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

/** Escapes HTML special characters for safe attribute & text interpolation (e.g., Leaflet divIcon). */
export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (ch) => HTML_ESCAPE_MAP[ch] ?? ch);
}
