import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { DEMO_PERSONAS, type Category } from "./data";

export type BookingStatus = "pending" | "confirmed" | "declined" | "completed";
export type Mode = "hire" | "work";

export interface Account {
  name: string;
  email: string;
  mobile: string;
  isDemo: boolean;
}

export interface Booking {
  id: string;
  workerId: string;
  service: string;
  description: string;
  date: string;
  time: string;
  barangayId: string;
  /** null means the user asked the worker for a quote. */
  budget: number | null;
  status: BookingStatus;
  createdAt: number;
}

export interface Application {
  id: string;
  jobId: string;
  message: string;
  rate: string;
  createdAt: number;
}

export interface IncomingRequest {
  id: string;
  persona: string;
  initials: string;
  service: string;
  description: string;
  date: string;
  time: string;
  barangayId: string;
  budget: string;
  status: BookingStatus;
}

export interface WorkerProfile {
  skill: Category;
  barangayId: string;
  experience: string;
  description: string;
}

export type ProPlan = "worker" | "employer";

export interface GawState {
  account: Account | null;
  signedIn: boolean;
  mode: Mode | null;
  locationId: string;
  workerProfile: WorkerProfile | null;
  available: boolean;
  bookings: Booking[];
  applications: Application[];
  requests: IncomingRequest[];
  plans: ProPlan[];
}

const STORAGE_KEY = "gaw:demo:v1";

export const initialState: GawState = {
  account: null,
  signedIn: false,
  mode: null,
  locationId: "bajada",
  workerProfile: null,
  available: true,
  bookings: [],
  applications: [],
  requests: [],
  plans: [],
};

function uid(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

function seedRequests(): IncomingRequest[] {
  return [
    {
      id: "r-1",
      persona: DEMO_PERSONAS[0].name,
      initials: DEMO_PERSONAS[0].initials,
      service: "Leaking kitchen sink",
      description: "Water drips under the sink cabinet whenever we use the faucet.",
      date: "Tomorrow",
      time: "9:00 AM",
      barangayId: "bajada",
      budget: "₱900",
      status: "pending",
    },
    {
      id: "r-2",
      persona: DEMO_PERSONAS[1].name,
      initials: DEMO_PERSONAS[1].initials,
      service: "Install shelves in garage",
      description: "Two wall shelves for tools. I already have the brackets.",
      date: "Saturday",
      time: "1:00 PM",
      barangayId: "buhangin",
      budget: "Request quote",
      status: "pending",
    },
    {
      id: "r-3",
      persona: DEMO_PERSONAS[2].name,
      initials: DEMO_PERSONAS[2].initials,
      service: "Fix loose door hinges",
      description: "Bedroom and bathroom doors don't close properly.",
      date: "Next Monday",
      time: "10:00 AM",
      barangayId: "matina",
      budget: "₱600",
      status: "pending",
    },
  ];
}

function seedBookings(): Booking[] {
  return [
    {
      id: "b-seed",
      workerId: "w-joy",
      service: "Cleaning",
      description: "Deep clean before family visit.",
      date: "2026-10-24",
      time: "09:00",
      barangayId: "bajada",
      budget: 1500,
      status: "completed",
      createdAt: Date.now() - 1000 * 60 * 60 * 24 * 21,
    },
  ];
}

function freshAccountState(account: Account): GawState {
  return { ...initialState, account, signedIn: true, bookings: seedBookings(), requests: seedRequests() };
}

/* ---------- Pure transitions (unit-tested) ---------- */

export function bookingNextStatuses(status: BookingStatus): BookingStatus[] {
  if (status === "pending") return ["confirmed", "declined"];
  if (status === "confirmed") return ["completed"];
  return [];
}

export function updateStatus<T extends { id: string; status: BookingStatus }>(
  items: T[],
  id: string,
  next: BookingStatus,
): T[] {
  return items.map((it) => (it.id === id && bookingNextStatuses(it.status).includes(next) ? { ...it, status: next } : it));
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
  saveWorkerProfile: (p: WorkerProfile) => void;
  setAvailable: (v: boolean) => void;
  addBooking: (b: Omit<Booking, "id" | "status" | "createdAt">) => string;
  setBookingStatus: (id: string, s: BookingStatus) => void;
  applyToJob: (a: Omit<Application, "id" | "createdAt">) => void;
  setRequestStatus: (id: string, s: BookingStatus) => void;
  togglePlan: (p: ProPlan, on: boolean) => void;
  resetDemo: () => void;
}

const Ctx = createContext<GawContext | null>(null);

export function GawProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<GawState>(initialState);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setState({ ...initialState, ...JSON.parse(raw) });
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
      signUp: (a) => patch(() => freshAccountState({ ...a, isDemo: false })),
      logIn: (email) => {
        const ok = !!state.account && state.account.email.toLowerCase() === email.trim().toLowerCase();
        if (ok) patch((s) => ({ ...s, signedIn: true, mode: null }));
        return ok;
      },
      demoLogin: () =>
        patch((s) =>
          s.account?.isDemo
            ? { ...s, signedIn: true, mode: null }
            : freshAccountState({ name: "Juan Dela Cruz", email: "judge@gaw.demo", mobile: "09171234567", isDemo: true }),
        ),
      logOut: () => patch((s) => ({ ...s, signedIn: false, mode: null })),
      setMode: (mode) => patch((s) => ({ ...s, mode })),
      setLocation: (locationId) => patch((s) => ({ ...s, locationId })),
      saveWorkerProfile: (workerProfile) => patch((s) => ({ ...s, workerProfile })),
      setAvailable: (available) => patch((s) => ({ ...s, available })),
      addBooking: (b) => {
        const id = uid("b");
        patch((s) => ({ ...s, bookings: [{ ...b, id, status: "pending", createdAt: Date.now() }, ...s.bookings] }));
        return id;
      },
      setBookingStatus: (id, st) => patch((s) => ({ ...s, bookings: updateStatus(s.bookings, id, st) })),
      applyToJob: (a) =>
        patch((s) =>
          s.applications.some((x) => x.jobId === a.jobId)
            ? s
            : { ...s, applications: [{ ...a, id: uid("a"), createdAt: Date.now() }, ...s.applications] },
        ),
      setRequestStatus: (id, st) => patch((s) => ({ ...s, requests: updateStatus(s.requests, id, st) })),
      togglePlan: (p, on) =>
        patch((s) => ({ ...s, plans: on ? Array.from(new Set([...s.plans, p])) : s.plans.filter((x) => x !== p) })),
      resetDemo: () => {
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
