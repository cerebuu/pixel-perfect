import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { BARANGAYS, DEMO_PERSONAS, JOBS, nearestBarangay, WORKERS } from "./data";
import {
  applyAction,
  canWithdraw,
  type ApplicationStatus,
  type BookingAction,
  type BookingStatus,
} from "./bookings";
import {
  DEFAULT_REJECTION_REASON,
  DEFAULT_RESUBMISSION_REASON,
  evaluateVerificationGuard,
  type CredentialKey,
  type VerifStatus,
} from "./verification";
import type { LatLng } from "./geo";

export type { BookingStatus } from "./bookings";
export type Mode = "hire" | "work";

export interface Account {
  name: string;
  email: string;
  mobile: string;
  isDemo: boolean;
}

export interface Party {
  name: string;
  initials: string;
}

export interface PlacedLocation extends LatLng {
  label: string;
  source: "gps" | "pin" | "barangay";
}

/**
 * One booking record, shared by both sides of GAW.
 * side "hiring": the user is the employer, `workerId` is a demo worker.
 * side "working": the user is the worker, `client` is a demo resident.
 */
export interface Booking {
  id: string;
  side: "hiring" | "working";
  workerId: string;
  client: Party;
  service: string;
  description: string;
  /** ISO date (yyyy-mm-dd). */
  date: string;
  /** 24h time (HH:mm). */
  time: string;
  barangayId: string;
  location: PlacedLocation | null;
  /** null means a quote was requested. */
  budget: number | null;
  /** Free-text rate for jobs that came from an application. */
  rateText?: string;
  jobId?: string;
  status: BookingStatus;
  createdAt: number;
}

export interface Application {
  id: string;
  jobId: string;
  message: string;
  rate: string;
  status: ApplicationStatus;
  createdAt: number;
}

export interface WorkerProfile {
  skill: string;
  skills: string[];
  barangayId: string;
  /** Centre of the public service area (not the live device position). */
  area: LatLng | null;
  radiusKm: number;
  experience: string;
  description: string;
}

export interface VerifDoc {
  kind: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  isSample: boolean;
  status: VerifStatus;
  reason?: string | undefined;
  submittedAt: number;
}

export interface Verification {
  identity: VerifDoc | null;
  credentials: Partial<Record<CredentialKey, VerifDoc>>;
}

export type ProPlan = "worker" | "employer";

export interface GawState {
  account: Account | null;
  signedIn: boolean;
  mode: Mode | null;
  locationId: string;
  /** Exact hiring location chosen with GPS or a map pin. null = use the barangay centre. */
  serviceLocation: PlacedLocation | null;
  workerProfile: WorkerProfile | null;
  available: boolean;
  bookings: Booking[];
  applications: Application[];
  plans: ProPlan[];
  verification: Verification;
}

const STORAGE_KEY = "gaw:demo:v2";
export const ME = "me";

export const initialState: GawState = {
  account: null,
  signedIn: false,
  mode: null,
  locationId: "bajada",
  serviceLocation: null,
  workerProfile: null,
  available: true,
  bookings: [],
  applications: [],
  plans: [],
  verification: { identity: null, credentials: {} },
};

function uid(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export function isoDay(offsetDays: number, from = new Date()) {
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate() + offsetDays);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function persona(i: number): Party {
  const p = DEMO_PERSONAS[i % DEMO_PERSONAS.length]!;
  return { name: p.name, initials: p.initials };
}

function seedBookings(me: Party): Booking[] {
  const now = Date.now();
  const base = { workerId: ME, location: null, createdAt: now } as const;
  return [
    // Working side: requests from fictional demo residents to the user's worker profile.
    {
      ...base,
      id: "r-1",
      side: "working",
      client: persona(0),
      service: "Leaking kitchen sink",
      description: "Water drips under the sink cabinet whenever we use the faucet.",
      date: isoDay(1),
      time: "09:00",
      barangayId: "bajada",
      budget: 900,
      status: "pending",
    },
    {
      ...base,
      id: "r-2",
      side: "working",
      client: persona(1),
      service: "Install shelves in garage",
      description: "Two wall shelves for tools. I already have the brackets.",
      date: isoDay(3),
      time: "13:00",
      barangayId: "buhangin",
      budget: null,
      status: "pending",
    },
    {
      ...base,
      id: "r-3",
      side: "working",
      client: persona(2),
      service: "Fix loose door hinges",
      description: "Bedroom and bathroom doors don't close properly.",
      date: isoDay(5),
      time: "10:00",
      barangayId: "matina",
      budget: 600,
      status: "pending",
    },
    {
      ...base,
      id: "r-4",
      side: "working",
      client: persona(3),
      service: "Replace broken window latch",
      description: "Living room window latch snapped off; needs a replacement.",
      date: isoDay(2),
      time: "15:00",
      barangayId: "poblacion",
      budget: 500,
      status: "confirmed",
    },
    {
      ...base,
      id: "r-5",
      side: "working",
      client: persona(4),
      service: "Mount curtain rods",
      description: "Three curtain rods in the bedrooms.",
      date: isoDay(-9),
      time: "10:00",
      barangayId: "bajada",
      budget: 750,
      status: "completed",
    },
    {
      ...base,
      id: "r-6",
      side: "working",
      client: persona(1),
      service: "Patch ceiling leak",
      description: "Cancelled by the resident — the landlord fixed it.",
      date: isoDay(-4),
      time: "08:00",
      barangayId: "buhangin",
      budget: 1200,
      status: "cancelled",
    },
    // Hiring side: a past booking the user made as an employer.
    {
      id: "b-seed",
      side: "hiring",
      workerId: "w-joy",
      client: me,
      service: "Cleaning",
      description: "Deep clean before family visit.",
      date: isoDay(-21),
      time: "09:00",
      barangayId: "bajada",
      location: null,
      budget: 1500,
      status: "completed",
      createdAt: now - 1000 * 60 * 60 * 24 * 21,
    },
  ];
}

export function initialsOf(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function freshAccountState(account: Account): GawState {
  return {
    ...initialState,
    account,
    signedIn: true,
    bookings: seedBookings({ name: account.name, initials: initialsOf(account.name) }),
  };
}

/** Where distances are measured from when hiring. */
export function hiringOrigin(s: Pick<GawState, "serviceLocation" | "locationId">): LatLng {
  if (s.serviceLocation) return s.serviceLocation;
  const b = BARANGAYS.find((x) => x.id === s.locationId) ?? BARANGAYS[0]!;
  return { lat: b.lat, lng: b.lng };
}

export function hiringOriginLabel(s: Pick<GawState, "serviceLocation" | "locationId">) {
  if (s.serviceLocation) return s.serviceLocation.label;
  return BARANGAYS.find((x) => x.id === s.locationId)?.name ?? "Davao City";
}

/** Bookings the user can see as the worker (My Jobs) or as the employer (My Bookings). */
export function bookingsFor(bookings: Booking[], side: Booking["side"]) {
  return bookings.filter((b) => b.side === side);
}

export function hasPlan(plans: ProPlan[], p: ProPlan) {
  return plans.includes(p);
}

/* ---------- Context ---------- */

interface GawContext extends GawState {
  hydrated: boolean;
  signUp: (a: Omit<Account, "isDemo">) => void;
  logIn: (email: string) => boolean;
  demoLogin: () => void;
  logOut: () => void;
  setMode: (m: Mode) => void;
  setLocation: (id: string) => void;
  setServiceLocation: (l: PlacedLocation) => void;
  saveWorkerProfile: (p: WorkerProfile) => void;
  setAvailable: (v: boolean) => void;
  addBooking: (b: Omit<Booking, "id" | "status" | "createdAt" | "side" | "client">) => string;
  bookingAction: (id: string, a: BookingAction) => void;
  applyToJob: (a: Pick<Application, "jobId" | "message" | "rate">) => boolean;
  withdrawApplication: (id: string) => void;
  simulateHire: (applicationId: string) => string | null;
  setPlan: (p: ProPlan, on: boolean) => void;
  submitVerification: (
    target: "identity" | CredentialKey,
    doc: Omit<VerifDoc, "status" | "submittedAt">,
  ) => void;
  setVerificationStatus: (
    target: "identity" | CredentialKey,
    s: VerifStatus,
    reason?: string,
  ) => void;
  removeVerification: (target: "identity" | CredentialKey) => void;
  resetDemo: () => void;
}

const Ctx = createContext<GawContext | null>(null);

export function clearSessionDrafts() {
  if (typeof window === "undefined") return;
  try {
    const toRemove: string[] = [];
    for (let i = 0; i < window.sessionStorage.length; i++) {
      const key = window.sessionStorage.key(i);
      if (key && (key.startsWith("gaw:booking-draft:") || key.startsWith("gaw:job-draft:"))) {
        toRemove.push(key);
      }
    }
    for (const k of toRemove) {
      window.sessionStorage.removeItem(k);
    }
  } catch {
    /* ignore storage errors */
  }
}

export function sanitizeLoadedState(parsed: unknown, fallback: GawState): GawState {
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return fallback;
  }
  const obj = parsed as Partial<GawState>;
  return {
    ...fallback,
    ...obj,
    bookings: Array.isArray(obj.bookings) ? obj.bookings : fallback.bookings,
    applications: Array.isArray(obj.applications) ? obj.applications : fallback.applications,
    plans: Array.isArray(obj.plans) ? obj.plans : fallback.plans,
    verification:
      obj.verification && typeof obj.verification === "object" && !Array.isArray(obj.verification)
        ? {
            identity: obj.verification.identity ?? fallback.verification.identity,
            credentials:
              obj.verification.credentials &&
              typeof obj.verification.credentials === "object" &&
              !Array.isArray(obj.verification.credentials)
                ? obj.verification.credentials
                : fallback.verification.credentials,
          }
        : fallback.verification,
  };
}

export function GawProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<GawState>(initialState);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        setState(sanitizeLoadedState(parsed, initialState));
      }
    } catch {
      /* corrupted demo data: start fresh */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state, hydrated]);

  const patch = useCallback((fn: (s: GawState) => GawState) => setState(fn), []);

  const value = useMemo<GawContext>(
    () => ({
      ...state,
      hydrated,
      signUp: (a) => {
        clearSessionDrafts();
        patch(() => freshAccountState({ ...a, isDemo: false }));
      },
      logIn: (email) => {
        const ok =
          !!state.account && state.account.email.toLowerCase() === email.trim().toLowerCase();
        if (ok) patch((s) => ({ ...s, signedIn: true, mode: null }));
        return ok;
      },
      demoLogin: () => {
        clearSessionDrafts();
        patch((s) =>
          s.account?.isDemo
            ? { ...s, signedIn: true, mode: null }
            : freshAccountState({
                name: "Juan Dela Cruz",
                email: "judge@gaw.demo",
                mobile: "09171234567",
                isDemo: true,
              }),
        );
      },
      logOut: () => {
        clearSessionDrafts();
        patch((s) => ({ ...s, signedIn: false, mode: null }));
      },
      setMode: (mode) => patch((s) => ({ ...s, mode })),
      setLocation: (locationId) => patch((s) => ({ ...s, locationId, serviceLocation: null })),
      setServiceLocation: (l) =>
        patch((s) => ({ ...s, serviceLocation: l, locationId: nearestBarangay(l).id })),
      saveWorkerProfile: (workerProfile) => patch((s) => ({ ...s, workerProfile })),
      setAvailable: (available) => patch((s) => ({ ...s, available })),
      addBooking: (b) => {
        if (!identityVerified(state.verification)) return "";
        const id = uid("b");
        patch((s) => {
          if (!identityVerified(s.verification)) return s;
          const me = s.account
            ? { name: s.account.name, initials: initialsOf(s.account.name) }
            : { name: "You", initials: "ME" };
          return {
            ...s,
            bookings: [
              { ...b, id, side: "hiring", client: me, status: "pending", createdAt: Date.now() },
              ...s.bookings,
            ],
          };
        });
        return id;
      },
      bookingAction: (id, a) => patch((s) => ({ ...s, bookings: applyAction(s.bookings, id, a) })),
      applyToJob: (a) => {
        if (!identityVerified(state.verification)) return false;
        patch((s) => {
          if (!identityVerified(s.verification)) return s;
          const existing = s.applications.find((x) => x.jobId === a.jobId);
          if (existing && existing.status !== "withdrawn") return s;
          const rest = s.applications.filter((x) => x.jobId !== a.jobId);
          return {
            ...s,
            applications: [
              { ...a, id: uid("a"), status: "submitted", createdAt: Date.now() },
              ...rest,
            ],
          };
        });
        return true;
      },
      withdrawApplication: (id) =>
        patch((s) => ({
          ...s,
          applications: s.applications.map((x) =>
            x.id === id && canWithdraw(x.status) ? { ...x, status: "withdrawn" } : x,
          ),
        })),
      simulateHire: (applicationId) => {
        const app = state.applications.find((x) => x.id === applicationId);
        const job = app && JOBS.find((j) => j.id === app.jobId);
        if (!app || !job || app.status !== "submitted") return null;
        const id = uid("r");
        patch((s) => ({
          ...s,
          applications: s.applications.map((x) =>
            x.id === applicationId ? { ...x, status: "hired" } : x,
          ),
          bookings: [
            {
              id,
              side: "working",
              workerId: ME,
              client: { name: job.poster, initials: initialsOf(job.poster) },
              service: job.title,
              description: job.description,
              date: isoDay(2),
              time: "09:00",
              barangayId: job.barangayId,
              location: null,
              budget: null,
              rateText: app.rate,
              jobId: job.id,
              status: "confirmed",
              createdAt: Date.now(),
            },
            ...s.bookings,
          ],
        }));
        return id;
      },
      setPlan: (p, on) =>
        patch((s) => ({
          ...s,
          plans: on ? Array.from(new Set([...s.plans, p])) : s.plans.filter((x) => x !== p),
        })),
      submitVerification: (target, doc) =>
        patch((s) => {
          const full: VerifDoc = {
            ...doc,
            status: "pending",
            reason: undefined,
            submittedAt: Date.now(),
          };
          return target === "identity"
            ? { ...s, verification: { ...s.verification, identity: full } }
            : {
                ...s,
                verification: {
                  ...s.verification,
                  credentials: { ...s.verification.credentials, [target]: full },
                },
              };
        }),
      setVerificationStatus: (target, st, customReason) =>
        patch((s) => {
          const cur =
            target === "identity" ? s.verification.identity : s.verification.credentials[target];
          if (!cur || cur.status !== "pending") return s;
          const resolvedReason =
            st === "rejected"
              ? (customReason ?? DEFAULT_REJECTION_REASON)
              : st === "resubmission_required"
                ? (customReason ?? DEFAULT_RESUBMISSION_REASON)
                : undefined;
          const next: VerifDoc = { ...cur, status: st, reason: resolvedReason };
          return target === "identity"
            ? { ...s, verification: { ...s.verification, identity: next } }
            : {
                ...s,
                verification: {
                  ...s.verification,
                  credentials: { ...s.verification.credentials, [target]: next },
                },
              };
        }),
      removeVerification: (target) =>
        patch((s) => {
          if (target === "identity")
            return { ...s, verification: { ...s.verification, identity: null } };
          const credentials = { ...s.verification.credentials };
          delete credentials[target];
          return { ...s, verification: { ...s.verification, credentials } };
        }),
      resetDemo: () => {
        clearSessionDrafts();
        window.localStorage.removeItem(STORAGE_KEY);
        setState(initialState);
      },
    }),
    [state, hydrated, patch],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useGaw() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useGaw must be used inside GawProvider");
  return c;
}

export function formatPeso(n: number) {
  return `₱${n.toLocaleString("en-PH")}`;
}

export function workerById(id: string) {
  return WORKERS.find((w) => w.id === id);
}

export function identityVerified(v: Verification) {
  return evaluateVerificationGuard(v.identity).allowed;
}

export function canPerformProtectedAction(v: Verification) {
  return evaluateVerificationGuard(v.identity);
}
