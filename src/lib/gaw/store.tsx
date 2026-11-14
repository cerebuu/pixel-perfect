import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  BARANGAYS,
  barangayById,
  buildEnrichedJob,
  DEMO_PERSONAS,
  JOBS,
  nearestBarangay,
  WORKERS,
  type Job,
} from "./data";
import {
  FREE_OPEN_GIGS_LIMIT,
  FREE_WORKER_QUEUE_LIMIT,
  isWithinDavaoRegion,
  validateGigPrice,
} from "./domain";
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
  /** Explicit user-triggered GPS pin (never auto-requested on mount). */
  userGps: PlacedLocation | null;
  workerProfile: WorkerProfile | null;
  available: boolean;
  bookings: Booking[];
  applications: Application[];
  savedJobIds: string[];
  customJobs: Job[];
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
  userGps: null,
  workerProfile: null,
  available: true,
  bookings: [],
  applications: [],
  savedJobIds: [],
  customJobs: [],
  plans: [],
  verification: { identity: null, credentials: {} },
};

export interface CreateCustomJobInput {
  title: string;
  category: string;
  barangayId: string;
  landmark?: string;
  lat?: number;
  lng?: number;
  budgetNum: number | null;
  estimatedHours: number;
  schedule: string;
  description: string;
  urgent?: boolean;
}

export interface CreateJobOutcome {
  ok: boolean;
  job?: Job;
  error?: "unverified" | "quota_exceeded" | "outside_davao" | "below_benchmark";
  message?: string;
}

export interface SaveJobOutcome {
  saved: boolean;
  quotaExceeded?: boolean;
  limit?: number;
}

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
  allJobs: Job[];
  signUp: (a: Omit<Account, "isDemo">) => void;
  logIn: (email: string) => boolean;
  demoLogin: () => void;
  logOut: () => void;
  setMode: (m: Mode) => void;
  setLocation: (id: string) => void;
  setServiceLocation: (l: PlacedLocation) => void;
  setUserGps: (gps: PlacedLocation | null) => void;
  saveWorkerProfile: (p: WorkerProfile) => void;
  setAvailable: (v: boolean) => void;
  addBooking: (b: Omit<Booking, "id" | "status" | "createdAt" | "side" | "client">) => string;
  bookingAction: (id: string, a: BookingAction) => void;
  applyToJob: (a: Pick<Application, "jobId" | "message" | "rate">) => boolean;
  withdrawApplication: (id: string) => void;
  simulateHire: (applicationId: string) => string | null;
  toggleSaveJob: (jobId: string) => SaveJobOutcome;
  createJob: (input: CreateCustomJobInput) => CreateJobOutcome;
  removeJob: (jobId: string) => void;
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

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

function sanitizePlacedLocation(raw: unknown): PlacedLocation | null {
  if (!isPlainObject(raw)) return null;
  const lat = raw["lat"];
  const lng = raw["lng"];
  const label = raw["label"];
  const source = raw["source"];
  if (
    typeof lat !== "number" ||
    !Number.isFinite(lat) ||
    typeof lng !== "number" ||
    !Number.isFinite(lng)
  ) {
    return null;
  }
  const safeSource = source === "gps" || source === "pin" || source === "barangay" ? source : "pin";
  return {
    lat,
    lng,
    label: typeof label === "string" && label.trim() ? label : nearestBarangay({ lat, lng }).name,
    source: safeSource,
  };
}

function sanitizeAccount(raw: unknown): Account | null {
  if (!isPlainObject(raw)) return null;
  const name = raw["name"];
  const email = raw["email"];
  const mobile = raw["mobile"];
  const isDemo = raw["isDemo"];
  if (typeof name !== "string" || typeof email !== "string") return null;
  return {
    name,
    email,
    mobile: typeof mobile === "string" ? mobile : "",
    isDemo: isDemo === true,
  };
}

function sanitizeWorkerProfile(raw: unknown): WorkerProfile | null {
  if (!isPlainObject(raw) || typeof raw["skill"] !== "string") return null;
  const rawArea = raw["area"];
  const validArea =
    isPlainObject(rawArea) &&
    typeof rawArea["lat"] === "number" &&
    Number.isFinite(rawArea["lat"]) &&
    typeof rawArea["lng"] === "number" &&
    Number.isFinite(rawArea["lng"])
      ? { lat: rawArea["lat"], lng: rawArea["lng"] }
      : null;
  const rawSkills = raw["skills"];
  const rawBarangayId = raw["barangayId"];
  const rawRadius = raw["radiusKm"];
  const rawExperience = raw["experience"];
  const rawDescription = raw["description"];
  return {
    skill: raw["skill"],
    skills: Array.isArray(rawSkills)
      ? rawSkills.filter((s): s is string => typeof s === "string" && s.trim().length > 0)
      : [],
    barangayId: typeof rawBarangayId === "string" ? rawBarangayId : "bajada",
    area: validArea,
    radiusKm:
      typeof rawRadius === "number" && Number.isFinite(rawRadius) && rawRadius > 0 ? rawRadius : 3,
    experience: typeof rawExperience === "string" ? rawExperience : "",
    description: typeof rawDescription === "string" ? rawDescription : "",
  };
}

function sanitizeCustomJob(raw: unknown): Job | null {
  if (!isPlainObject(raw)) return null;
  const rawId = raw["id"];
  const rawTitle = raw["title"];
  if (typeof rawId !== "string" || !rawId.trim() || typeof rawTitle !== "string") {
    return null;
  }
  const rawBarangayId = raw["barangayId"];
  const barangayId =
    typeof rawBarangayId === "string" && barangayById(rawBarangayId)
      ? rawBarangayId
      : BARANGAYS[0]!.id;
  const brgy = barangayById(barangayId) ?? BARANGAYS[0]!;
  const rawLat = raw["lat"];
  const rawLng = raw["lng"];
  const lat = typeof rawLat === "number" && Number.isFinite(rawLat) ? rawLat : brgy.lat;
  const lng = typeof rawLng === "number" && Number.isFinite(rawLng) ? rawLng : brgy.lng;
  const rawHours = raw["estimatedHours"];
  const estimatedHours =
    typeof rawHours === "number" && Number.isFinite(rawHours) && rawHours > 0 ? rawHours : 4;
  const rawBudgetNum = raw["budgetNum"];
  const budgetNum =
    typeof rawBudgetNum === "number" && Number.isFinite(rawBudgetNum) && rawBudgetNum >= 0
      ? rawBudgetNum
      : null;
  const rawCategory = raw["category"];
  const category = typeof rawCategory === "string" && rawCategory.trim() ? rawCategory : "Handyman";
  const rawDescription = raw["description"];
  const description = typeof rawDescription === "string" ? rawDescription : "";
  const rawLandmark = raw["landmark"];
  const rawPoster = raw["poster"];
  const rawBudget = raw["budget"];
  const rawPosted = raw["posted"];
  const rawSchedule = raw["schedule"];
  const rawCreatedAt = raw["createdAt"];

  return buildEnrichedJob({
    id: rawId,
    title: rawTitle,
    category,
    barangayId,
    landmark: typeof rawLandmark === "string" ? rawLandmark : brgy.name,
    lat,
    lng,
    poster: typeof rawPoster === "string" && rawPoster.trim() ? rawPoster : "Davao Employer",
    budget:
      typeof rawBudget === "string" && rawBudget.trim()
        ? rawBudget
        : budgetNum !== null
          ? `₱${budgetNum.toLocaleString("en-PH")}`
          : "Request quote",
    budgetNum,
    estimatedHours,
    posted: typeof rawPosted === "string" && rawPosted.trim() ? rawPosted : "Just now",
    schedule: typeof rawSchedule === "string" && rawSchedule.trim() ? rawSchedule : "Flexible",
    description,
    urgent: raw["urgent"] === true,
    isCustom: true,
    createdAt:
      typeof rawCreatedAt === "number" && Number.isFinite(rawCreatedAt) ? rawCreatedAt : Date.now(),
  });
}

export function sanitizeLoadedState(parsed: unknown, fallback: GawState): GawState {
  if (!isPlainObject(parsed)) {
    return fallback;
  }
  const obj = parsed as Partial<GawState>;
  const safeMode: Mode | null = obj.mode === "hire" || obj.mode === "work" ? obj.mode : null;

  return {
    ...fallback,
    account: obj.account === null ? null : (sanitizeAccount(obj.account) ?? fallback.account),
    signedIn: typeof obj.signedIn === "boolean" ? obj.signedIn : fallback.signedIn,
    mode: safeMode,
    locationId:
      typeof obj.locationId === "string" && obj.locationId.trim()
        ? obj.locationId
        : fallback.locationId,
    serviceLocation:
      obj.serviceLocation === null
        ? null
        : (sanitizePlacedLocation(obj.serviceLocation) ?? fallback.serviceLocation),
    userGps:
      obj.userGps === null ? null : (sanitizePlacedLocation(obj.userGps) ?? fallback.userGps),
    workerProfile:
      obj.workerProfile === null
        ? null
        : (sanitizeWorkerProfile(obj.workerProfile) ?? fallback.workerProfile),
    available: typeof obj.available === "boolean" ? obj.available : fallback.available,
    bookings: Array.isArray(obj.bookings)
      ? obj.bookings.filter((b): b is Booking => isPlainObject(b) && typeof b.id === "string")
      : fallback.bookings,
    applications: Array.isArray(obj.applications)
      ? obj.applications.filter(
          (a): a is Application =>
            isPlainObject(a) && typeof a.id === "string" && typeof a.jobId === "string",
        )
      : fallback.applications,
    savedJobIds: Array.isArray(obj.savedJobIds)
      ? Array.from(
          new Set(
            obj.savedJobIds.filter(
              (id): id is string => typeof id === "string" && id.trim().length > 0,
            ),
          ),
        )
      : fallback.savedJobIds,
    customJobs: Array.isArray(obj.customJobs)
      ? obj.customJobs.map(sanitizeCustomJob).filter((j): j is Job => j !== null)
      : fallback.customJobs,
    plans: Array.isArray(obj.plans)
      ? Array.from(
          new Set(obj.plans.filter((p): p is ProPlan => p === "worker" || p === "employer")),
        )
      : fallback.plans,
    verification: isPlainObject(obj.verification)
      ? {
          identity:
            obj.verification.identity && isPlainObject(obj.verification.identity)
              ? (obj.verification.identity as VerifDoc)
              : fallback.verification.identity,
          credentials: isPlainObject(obj.verification.credentials)
            ? (obj.verification.credentials as Verification["credentials"])
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

  const allJobs = useMemo(() => [...state.customJobs, ...JOBS], [state.customJobs]);

  const value = useMemo<GawContext>(
    () => ({
      ...state,
      hydrated,
      allJobs,
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
      setUserGps: (userGps) => patch((s) => ({ ...s, userGps })),
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
        const job = app && allJobs.find((j) => j.id === app.jobId);
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
      toggleSaveJob: (jobId) => {
        const res = applyToggleSaveJob(state, jobId);
        if (!res.result.quotaExceeded) {
          patch((s) => applyToggleSaveJob(s, jobId).nextState);
        }
        return res.result;
      },
      createJob: (input) => {
        const res = applyCreateJob(state, input);
        if (res.result.ok) {
          patch((s) => {
            const next = applyCreateJob(s, input);
            return next.result.ok ? next.nextState : s;
          });
        }
        return res.result;
      },
      removeJob: (jobId) => patch((s) => applyRemoveJob(s, jobId)),
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
    [state, hydrated, allJobs, patch],
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

export function jobById(id: string, customJobs: Job[] = []) {
  return customJobs.find((j) => j.id === id) ?? JOBS.find((j) => j.id === id);
}

export function identityVerified(v: Verification) {
  return evaluateVerificationGuard(v.identity).allowed;
}

export function canPerformProtectedAction(v: Verification) {
  return evaluateVerificationGuard(v.identity);
}

/** Pure state transition helper for saving/unsaving a job with Free vs Worker Pro queue limits. */
export function applyToggleSaveJob(
  s: GawState,
  jobId: string,
): { nextState: GawState; result: ReturnType<GawContext["toggleSaveJob"]> } {
  const currentlySaved = s.savedJobIds.includes(jobId);
  if (currentlySaved) {
    return {
      nextState: { ...s, savedJobIds: s.savedJobIds.filter((id) => id !== jobId) },
      result: { saved: false },
    };
  }
  const isWorkerPro = hasPlan(s.plans, "worker");
  if (!isWorkerPro && s.savedJobIds.length >= FREE_WORKER_QUEUE_LIMIT) {
    return {
      nextState: s,
      result: { saved: false, quotaExceeded: true, limit: FREE_WORKER_QUEUE_LIMIT },
    };
  }
  return {
    nextState: { ...s, savedJobIds: [jobId, ...s.savedJobIds] },
    result: { saved: true },
  };
}

/** Pure state transition helper for posting a custom service request with all marketplace invariants. */
export function applyCreateJob(
  s: GawState,
  input: Parameters<GawContext["createJob"]>[0],
): { nextState: GawState; result: ReturnType<GawContext["createJob"]> } {
  if (!identityVerified(s.verification)) {
    return { nextState: s, result: { ok: false, error: "unverified" } };
  }
  const isEmployerPro = hasPlan(s.plans, "employer");
  if (!isEmployerPro && s.customJobs.length >= FREE_OPEN_GIGS_LIMIT) {
    return {
      nextState: s,
      result: {
        ok: false,
        error: "quota_exceeded",
        message: `Free tier allows up to ${FREE_OPEN_GIGS_LIMIT} active open requests.`,
      },
    };
  }
  const brgy = barangayById(input.barangayId) ?? BARANGAYS[0]!;
  const lat = input.lat ?? brgy.lat;
  const lng = input.lng ?? brgy.lng;
  if (!isWithinDavaoRegion(lat, lng)) {
    return {
      nextState: s,
      result: {
        ok: false,
        error: "outside_davao",
        message: "Selected location falls outside the Davao City service area.",
      },
    };
  }
  if (input.budgetNum !== null) {
    const check = validateGigPrice(input.estimatedHours, input.budgetNum);
    if (!check.isValid) {
      return {
        nextState: s,
        result: {
          ok: false,
          error: "below_benchmark",
          message: `Budget ₱${input.budgetNum.toLocaleString("en-PH")} is below GAW's ₱${check.minimumRequiredPhp.toLocaleString("en-PH")} fair-pay benchmark for ${input.estimatedHours}h.`,
        },
      };
    }
  }
  const job = buildEnrichedJob({
    id: uid("j-custom"),
    title: input.title.trim(),
    category: input.category,
    barangayId: brgy.id,
    landmark: input.landmark?.trim() || brgy.name,
    lat,
    lng,
    poster: s.account?.name || "You",
    budget:
      input.budgetNum !== null ? `₱${input.budgetNum.toLocaleString("en-PH")}` : "Request quote",
    budgetNum: input.budgetNum,
    estimatedHours: input.estimatedHours,
    posted: "Just now",
    schedule: input.schedule.trim() || "Flexible",
    description: input.description.trim(),
    urgent: input.urgent === true,
    isCustom: true,
    createdAt: Date.now(),
  });
  return {
    nextState: { ...s, customJobs: [job, ...s.customJobs] },
    result: { ok: true, job },
  };
}

/** Pure state transition helper for removing a custom request and cascading savedQueue cleanup. */
export function applyRemoveJob(s: GawState, jobId: string): GawState {
  return {
    ...s,
    customJobs: s.customJobs.filter((j) => j.id !== jobId),
    savedJobIds: s.savedJobIds.filter((id) => id !== jobId),
  };
}
