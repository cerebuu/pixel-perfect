import { useMemo, useState, type FormEvent } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowRight,
  CalendarCheck,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Crown,
  MapPin,
  Navigation,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  Zap,
} from "lucide-react";
import { AppLayout } from "@/components/gaw/AppLayout";
import { WorkerCard } from "@/components/gaw/cards";
import { iconFor } from "@/components/gaw/categoryIcons";
import { LocationPicker } from "@/components/gaw/GawMap";
import {
  FOCUS_RING,
  REDUCED_MOTION_RESET,
  interactiveNavCardClass,
  subtleArrowIconClass,
  subtleLinkClass,
} from "@/components/gaw/interactions";
import { FairPayEstimateCard, SettlementPreviewCard } from "@/components/gaw/PricingGuide";
import { Avatar, LocationFilter, SectionHeader, StatusBadge } from "@/components/gaw/primitives";
import { ServicePicker } from "@/components/gaw/ServicePicker";
import { VerificationGuardModal } from "@/components/gaw/VerificationCenter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  CATEGORIES,
  FEATURED_CATEGORIES,
  OTHER_CATEGORY,
  WORKERS,
  barangayName,
} from "@/lib/gaw/data";
import {
  estimateGigPrice,
  FREE_OPEN_GIGS_LIMIT,
  MAX_OFFERED_PRICE_PHP,
  validateGigPrice,
} from "@/lib/gaw/domain";
import { filterWorkers } from "@/lib/gaw/filter";
import { useI18n } from "@/lib/gaw/i18n";
import { normalizeService, validateCustomService } from "@/lib/gaw/services";
import {
  canPerformProtectedAction,
  hiringOrigin,
  hiringOriginLabel,
  identityVerified,
  useGaw,
} from "@/lib/gaw/store";

export const Route = createFileRoute("/hire")({
  head: () => ({
    meta: [
      { title: "Hire nearby workers — GAW" },
      { name: "description", content: "Find skilled workers near your barangay in Davao City." },
      { property: "og:title", content: "Hire nearby workers — GAW" },
      {
        property: "og:description",
        content: "Find skilled workers near your barangay in Davao City.",
      },
    ],
  }),
  component: EmployerDashboard,
});

function greeting(tx: (en: string, fil: string, ceb: string) => string) {
  const h = new Date().getHours();
  if (h < 12) return tx("Good morning", "Magandang umaga", "Maayong buntag");
  if (h < 18) return tx("Good afternoon", "Magandang hapon", "Maayong hapon");
  return tx("Good evening", "Magandang gabi", "Maayong gabii");
}

function EmployerDashboard() {
  return (
    <AppLayout mode="hire">
      <DashboardBody />
    </AppLayout>
  );
}

function DashboardBody() {
  const gaw = useGaw();
  const { t, tx, translateCategory, verifLabel } = useI18n();
  const {
    account,
    locationId,
    setLocation,
    serviceLocation,
    setServiceLocation,
    bookings,
    plans,
    verification,
    customJobs,
    createJob,
    removeJob,
  } = gaw;

  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [showAllCats, setShowAllCats] = useState(false);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customService, setCustomService] = useState("");
  const [customErr, setCustomErr] = useState<string | null>(null);
  const [showMapPicker, setShowMapPicker] = useState(false);

  const [showRequestForm, setShowRequestForm] = useState(false);
  const [reqTitle, setReqTitle] = useState("");
  const [reqCategory, setReqCategory] = useState<string>(CATEGORIES[0] ?? "Plumbing");
  const [reqBarangayId, setReqBarangayId] = useState(locationId);
  const [reqPin, setReqPin] = useState<{ lat: number; lng: number; label: string } | null>(null);
  const [showReqMap, setShowReqMap] = useState(false);
  const [reqHours, setReqHours] = useState(4);
  const [reqUrgent, setReqUrgent] = useState(false);
  const [reqBudgetMode, setReqBudgetMode] = useState<"fixed" | "quote">("fixed");
  const [reqBudget, setReqBudget] = useState("600");
  const [reqSchedule, setReqSchedule] = useState("");
  const [reqLandmark, setReqLandmark] = useState("");
  const [reqDetails, setReqDetails] = useState("");
  const [reqErrors, setReqErrors] = useState<{
    title?: string | undefined;
    service?: string | undefined;
    budget?: string | undefined;
    details?: string | undefined;
    form?: string | undefined;
  }>({});
  const [reqPostedJobId, setReqPostedJobId] = useState<string | null>(null);
  const [showPostVerifModal, setShowPostVerifModal] = useState(false);

  const origin = hiringOrigin(gaw);
  const originLabel = hiringOriginLabel(gaw);

  const nearby = filterWorkers(WORKERS, {
    origin,
    category: "all",
    query: "",
    radius: 5,
    availableOnly: false,
  }).slice(0, 4);

  const isEmployerPro = plans.includes("employer");
  const priceEstimate = useMemo(
    () =>
      estimateGigPrice({
        category: reqCategory || OTHER_CATEGORY,
        estimatedHours: reqHours,
        urgency: reqUrgent ? "urgent" : "standard",
        requiredSkills: [],
        barangay: reqBarangayId,
      }),
    [reqCategory, reqHours, reqUrgent, reqBarangayId],
  );
  const parsedBudget =
    reqBudgetMode === "fixed" && reqBudget.trim() !== "" ? Number(reqBudget) : null;
  const offeredBudgetNum =
    parsedBudget !== null && Number.isFinite(parsedBudget) ? parsedBudget : null;

  const count = (s: string) => bookings.filter((b) => b.status === s).length;
  const latest = bookings[0];
  const latestWorker = latest && WORKERS.find((w) => w.id === latest.workerId);
  const verified = identityVerified(verification);
  const idStatus = verification.identity?.status ?? "not_submitted";

  const toggleRequestForm = () => {
    setShowRequestForm((prev) => {
      const next = !prev;
      if (next) {
        setReqBarangayId(locationId);
        setReqPostedJobId(null);
      }
      return next;
    });
  };

  const executeCreateRequest = () => {
    const landmarkVal = reqLandmark.trim() || reqPin?.label;
    const res = createJob({
      title: reqTitle.trim(),
      category: reqCategory.trim() || OTHER_CATEGORY,
      barangayId: reqBarangayId,
      ...(landmarkVal ? { landmark: landmarkVal } : {}),
      ...(reqPin ? { lat: reqPin.lat, lng: reqPin.lng } : {}),
      budgetNum: reqBudgetMode === "fixed" ? offeredBudgetNum : null,
      estimatedHours: reqHours,
      schedule: reqSchedule.trim() || tx("Flexible", "Flexible", "Flexible"),
      description: reqDetails.trim(),
      urgent: reqUrgent,
    });
    if (!res.ok || !res.job) {
      if (res.error === "unverified") {
        setShowPostVerifModal(true);
        return;
      }
      if (res.error === "below_benchmark") {
        setReqErrors((cur) => ({ ...cur, budget: res.message }));
        return;
      }
      setReqErrors((cur) => ({ ...cur, form: res.message }));
      return;
    }
    setReqErrors({});
    setReqPostedJobId(res.job.id);
    setReqTitle("");
    setReqLandmark("");
    setReqSchedule("");
    setReqDetails("");
    setReqPin(null);
    setShowReqMap(false);
    setShowRequestForm(false);
  };

  const submitCreateRequest = (e: FormEvent) => {
    e.preventDefault();
    const errs: typeof reqErrors = {};
    if (reqTitle.trim().length < 4) {
      errs.title = tx(
        "Enter a clear request title (at least 4 characters).",
        "Ilagay ang malinaw na pamagat (hindi bababa sa 4 letra).",
        "Isulat ang klaro nga titulo (labing menos 4 ka letra).",
      );
    }
    if (!reqCategory.trim()) {
      errs.service = tx(
        "Choose or enter a service category.",
        "Pumili o maglagay ng kategorya ng serbisyo.",
        "Pili o isulat ang kategorya sa serbisyo.",
      );
    }
    if (reqBudgetMode === "fixed") {
      if (offeredBudgetNum === null || offeredBudgetNum <= 0) {
        errs.budget = tx(
          "Enter a valid PHP budget or switch to Request Quote.",
          "Maglagay ng tamang PHP badyet o piliin ang Humingi ng Presyo.",
          "Isulat ang sakto nga PHP badyet o pilia ang Mangayo og Presyo.",
        );
      } else if (offeredBudgetNum > MAX_OFFERED_PRICE_PHP) {
        errs.budget = tx(
          `Maximum budget is ₱${MAX_OFFERED_PRICE_PHP.toLocaleString("en-PH")}.`,
          `Pinakamataas na badyet ay ₱${MAX_OFFERED_PRICE_PHP.toLocaleString("en-PH")}.`,
          `Labing dako nga badyet kay ₱${MAX_OFFERED_PRICE_PHP.toLocaleString("en-PH")}.`,
        );
      } else {
        const floorCheck = validateGigPrice(reqHours, offeredBudgetNum);
        if (!floorCheck.isValid) {
          errs.budget = tx(
            `Budget ₱${offeredBudgetNum.toLocaleString("en-PH")} is below GAW's ₱${floorCheck.minimumRequiredPhp.toLocaleString("en-PH")} Davao fair-pay benchmark for ${reqHours}h.`,
            `Ang badyet na ₱${offeredBudgetNum.toLocaleString("en-PH")} ay mas mababa sa ₱${floorCheck.minimumRequiredPhp.toLocaleString("en-PH")} na gabay para sa ${reqHours} oras.`,
            `Ang badyet nga ₱${offeredBudgetNum.toLocaleString("en-PH")} ubos sa ₱${floorCheck.minimumRequiredPhp.toLocaleString("en-PH")} nga giya alang sa ${reqHours} ka oras.`,
          );
        }
      }
    }
    if (reqDetails.trim().length < 8) {
      errs.details = tx(
        "Describe what needs fixing or done (at least 8 characters).",
        "Ilarawan ang kailangang gawin (hindi bababa sa 8 letra).",
        "Ihulagway ang angay buhaton (labing menos 8 ka letra).",
      );
    }

    setReqErrors(errs);
    const firstKey = Object.keys(errs)[0];
    if (firstKey) {
      const targetId =
        firstKey === "title"
          ? "req-title"
          : firstKey === "service"
            ? "req-service"
            : firstKey === "budget"
              ? "req-budget"
              : "req-details";
      const el = document.getElementById(targetId);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
      el?.focus();
      return;
    }

    const guard = canPerformProtectedAction(verification);
    if (!guard.allowed) {
      setShowPostVerifModal(true);
      return;
    }
    executeCreateRequest();
  };

  const onSearch = (e: FormEvent) => {
    e.preventDefault();
    navigate({ to: "/find", search: { q: q.trim() || undefined } });
  };

  const onCustomServiceSubmit = (e: FormEvent) => {
    e.preventDefault();
    const err = validateCustomService(customService);
    if (err) {
      setCustomErr(err);
      return;
    }
    setCustomErr(null);
    const clean = normalizeService(customService);
    navigate({ to: "/find", search: { category: clean, q: clean } });
  };

  const displayedCategories = showAllCats ? CATEGORIES : FEATURED_CATEGORIES;

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-3xl bg-contour p-5 text-deep-foreground shadow-lift md:p-8">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="flex flex-wrap items-center gap-2 text-sm text-deep-muted">
              <span>
                {greeting(tx)}, {account?.name.split(" ")[0]}
              </span>
              {verified && (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-primary-foreground">
                  <CheckCircle2 className="size-3" aria-hidden />{" "}
                  {tx("Verified", "Beripikado", "Beripikado")}
                </span>
              )}
              {plans.includes("employer") && (
                <span className="inline-flex items-center gap-1 rounded-full bg-gold px-2 py-0.5 text-xs font-bold text-gold-foreground">
                  <Crown className="size-3" aria-hidden /> Employer Pro
                </span>
              )}
            </p>
            <h1 className="mt-1 text-2xl font-extrabold tracking-tight md:text-4xl">
              {tx(
                "Who do you need today?",
                "Sino ang kailangan mo ngayon?",
                "Kinsa ang imong gikinahanglan karon?",
              )}
            </h1>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="w-full sm:w-52 [&_label]:text-deep-muted">
              <LocationFilter
                id="dash-location"
                label={tx("Your barangay", "Iyong barangay", "Imong barangay")}
                value={locationId}
                onChange={setLocation}
              />
            </div>
            <Button
              type="button"
              variant="secondary"
              className="h-11 shrink-0"
              onClick={() => setShowMapPicker((v) => !v)}
            >
              <Navigation className="size-4" />
              {showMapPicker
                ? tx("Hide Map", "Itago ang Mapa", "Tagoa ang Mapa")
                : tx("Use GPS / Pin", "Gamitin ang GPS / Pin", "Gamita ang GPS / Pin")}
            </Button>
          </div>
        </div>

        <form onSubmit={onSearch} role="search" className="mt-5 flex gap-2">
          <label htmlFor="dash-search" className="sr-only">
            {tx("Search workers", "Maghanap ng manggagawa", "Pangita og trabahante")}
          </label>
          <div className="relative flex-1">
            <Search
              className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              id="dash-search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={tx(
                "Try “leak repair”, “aircon cleaning”, or “Motorcycle Mechanic”",
                "Subukan ang “leak repair”, “linis ng aircon”, o “Motorcycle Mechanic”",
                "Sulayi ang “leak repair”, “limpyo sa aircon”, o “Motorcycle Mechanic”",
              )}
              className="h-12 rounded-xl border-transparent pl-11 text-foreground dark:border-border dark:bg-card"
            />
          </div>
          <Button type="submit" variant="gold" size="lg" className="h-12">
            {tx("Search", "Maghanap", "Pangitaa")}
          </Button>
        </form>
      </section>

      {showMapPicker && (
        <div className="animate-fade-up">
          <LocationPicker
            modeLabel={tx(
              "Pinpoint Your Hiring Location (GPS or Map Pin)",
              "Ituro ang Lokasyon ng Serbisyo (GPS o Map Pin)",
              "Itudlo ang Lokasyon sa Serbisyo (GPS o Map Pin)",
            )}
            initialLocation={origin}
            initialBarangayId={locationId}
            initialLabel={serviceLocation?.label}
            onConfirm={(placed) => {
              setServiceLocation(placed);
              setShowMapPicker(false);
            }}
          />
        </div>
      )}

      {/* Post a Service Request — feeds /jobs, /work, and /bookings */}
      <section
        aria-labelledby="post-request-h"
        className="rounded-2xl border bg-card p-5 shadow-soft"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-0.5 text-xs font-bold text-primary">
                <Sparkles className="size-3.5" aria-hidden /> {t("hire.postRequestTag")}
              </span>
              <span className="rounded-full border bg-muted/60 px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
                {isEmployerPro
                  ? tx(
                      "Employer Pro · Unlimited requests",
                      "Employer Pro · Walang limit",
                      "Employer Pro · Walay limit",
                    )
                  : tx(
                      `${customJobs.length} / ${FREE_OPEN_GIGS_LIMIT} Free open requests`,
                      `${customJobs.length} / ${FREE_OPEN_GIGS_LIMIT} Libreng bukas na request`,
                      `${customJobs.length} / ${FREE_OPEN_GIGS_LIMIT} Libreng abli nga request`,
                    )}
              </span>
            </div>
            <h2 id="post-request-h" className="text-lg font-bold tracking-tight">
              {t("hire.postRequestTitle")}
            </h2>
            <p className="max-w-2xl text-sm text-muted-foreground">{t("hire.postRequestDesc")}</p>
          </div>

          <Button
            type="button"
            variant={showRequestForm ? "outline" : "default"}
            aria-expanded={showRequestForm}
            aria-controls="post-request-form"
            onClick={toggleRequestForm}
          >
            {showRequestForm ? (
              <>
                <ChevronUp className="size-4" aria-hidden /> {t("hire.hideForm")}
              </>
            ) : (
              <>
                <Plus className="size-4" aria-hidden /> {t("hire.postRequestCta")}
              </>
            )}
          </Button>
        </div>

        {reqPostedJobId && (
          <div
            role="status"
            aria-live="polite"
            className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-primary/30 bg-secondary/50 px-3.5 py-2.5 text-sm"
          >
            <span className="inline-flex items-center gap-2 font-semibold text-foreground">
              <CheckCircle2 className="size-4 shrink-0 text-primary" aria-hidden />
              {tx(
                "Service request published to nearby workers in Davao!",
                "Naipost na ang request sa mga malapit na manggagawa!",
                "Na-post na ang request sa mga duol nga trabahante sa Davao!",
              )}
            </span>
            <div className="flex flex-wrap gap-2">
              <Button asChild size="sm" variant="soft">
                <Link to="/jobs/$id" params={{ id: reqPostedJobId }}>
                  {tx("View listing", "Tingnan ang post", "Tan-awa ang post")}
                </Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link to="/bookings" search={{ tab: "requests" }}>
                  {tx("Manage requests", "Pamahalaan", "Dumala")}
                </Link>
              </Button>
            </div>
          </div>
        )}

        {showRequestForm && (
          <form
            id="post-request-form"
            noValidate
            onSubmit={submitCreateRequest}
            className="mt-5 space-y-4 border-t pt-5"
          >
            {!isEmployerPro && customJobs.length >= FREE_OPEN_GIGS_LIMIT && (
              <div
                role="alert"
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-primary/40 bg-secondary/45 px-3.5 py-2.5 text-xs"
              >
                <span className="font-semibold text-foreground">
                  {tx(
                    `You have reached the Free limit (${FREE_OPEN_GIGS_LIMIT} open requests). Remove an existing request or try Employer Pro.`,
                    `Naabot na ang limitasyon sa Free (${FREE_OPEN_GIGS_LIMIT} bukas na request). Magtanggal o subukan ang Employer Pro.`,
                    `Naabot na ang limit sa Free (${FREE_OPEN_GIGS_LIMIT} ka abli nga request). Pagtangtang o sulayi ang Employer Pro.`,
                  )}
                </span>
                <Button asChild size="sm" variant="gold">
                  <Link to="/pro">{tx("Upgrade to Pro", "Mag-Pro", "Mag-Pro")}</Link>
                </Button>
              </div>
            )}

            {reqErrors.form && (
              <p
                role="alert"
                className="rounded-xl bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive"
              >
                {reqErrors.form}
              </p>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor="req-title" className="block text-sm font-semibold">
                  {tx("Request title", "Pamagat ng trabaho", "Titulo sa trabaho")}
                </label>
                <Input
                  id="req-title"
                  className="scroll-mt-20"
                  placeholder={tx(
                    "e.g. Fix leaking kitchen sink pipe",
                    "hal. Ayusin ang tumutulong tubo sa lababo",
                    "pananglitan: Ayohon ang nagtulo nga tubo sa lababo",
                  )}
                  value={reqTitle}
                  onChange={(e) => {
                    setReqTitle(e.target.value);
                    setReqErrors((cur) => ({ ...cur, title: undefined }));
                  }}
                  aria-invalid={!!reqErrors.title}
                  aria-describedby={reqErrors.title ? "req-title-error" : undefined}
                />
                {reqErrors.title && (
                  <p
                    id="req-title-error"
                    role="alert"
                    className="text-xs font-medium text-destructive"
                  >
                    {reqErrors.title}
                  </p>
                )}
              </div>

              <ServicePicker
                id="req-service"
                label={t("hire.formServiceLabel")}
                value={reqCategory}
                onChange={(svc) => {
                  setReqCategory(svc);
                  setReqErrors((cur) => ({ ...cur, service: undefined }));
                }}
                error={reqErrors.service}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <LocationFilter
                id="req-brgy"
                value={reqBarangayId}
                onChange={(brgy) => {
                  setReqBarangayId(brgy);
                  setReqPin(null);
                }}
                label={t("hire.formBarangayLabel")}
              />

              <div className="space-y-1.5">
                <label
                  htmlFor="req-landmark"
                  className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                >
                  {tx("Landmark / Street (optional)", "Palatandaan / Kalye", "Ilhanan / Dalan")}
                </label>
                <Input
                  id="req-landmark"
                  placeholder={tx(
                    "e.g. Near Abreeza Gate 2",
                    "hal. Malapit sa Abreeza",
                    "pananglitan: Duol sa Abreeza",
                  )}
                  value={reqLandmark}
                  onChange={(e) => setReqLandmark(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="req-schedule"
                  className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                >
                  {t("hire.formScheduleLabel")}
                </label>
                <Input
                  id="req-schedule"
                  placeholder={tx(
                    "e.g. Today, 2:00 PM",
                    "hal. Ngayong araw, 2:00 PM",
                    "pananglitan: Karon, 2:00 PM",
                  )}
                  value={reqSchedule}
                  onChange={(e) => setReqSchedule(e.target.value)}
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setShowReqMap((v) => !v)}
              >
                <MapPin className="size-3.5 text-primary" aria-hidden />
                {reqPin
                  ? tx(`Pinned: ${reqPin.label}`, `Pin: ${reqPin.label}`, `Pin: ${reqPin.label}`)
                  : tx("Pin exact Davao location", "Ituro sa mapa", "Itudlo sa mapa")}
              </Button>
              {reqPin && (
                <Button type="button" size="sm" variant="ghost" onClick={() => setReqPin(null)}>
                  {tx("Clear pin", "Alisin", "Kuhaa")}
                </Button>
              )}
            </div>

            {showReqMap && (
              <LocationPicker
                modeLabel={tx(
                  "Job Location Pin (Davao City)",
                  "Lokasyon ng Trabaho",
                  "Lokasyon sa Trabaho",
                )}
                initialLocation={reqPin ?? origin}
                initialBarangayId={reqBarangayId}
                initialLabel={reqPin?.label}
                onConfirm={(placed) => {
                  setReqPin(placed);
                  setShowReqMap(false);
                }}
              />
            )}

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-1.5">
                <label htmlFor="req-hours" className="block text-sm font-semibold">
                  {tx("Estimated duration", "Tinatayang tagal", "Banabana nga kadugayon")}
                </label>
                <select
                  id="req-hours"
                  className="field"
                  value={reqHours}
                  onChange={(e) => setReqHours(Number(e.target.value))}
                >
                  {[1, 2, 3, 4, 6, 8].map((h) => (
                    <option key={h} value={h}>
                      {tx(`${h} hour${h > 1 ? "s" : ""}`, `${h} oras`, `${h} ka oras`)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <span className="block text-sm font-semibold">{t("hire.formBudgetLabel")}</span>
                <div className="grid grid-cols-2 gap-2">
                  {(
                    [
                      ["fixed", tx("Fixed PHP", "May Badyet", "Fixed PHP")],
                      ["quote", tx("Request Quote", "Hingi Presyo", "Pangayo Presyo")],
                    ] as const
                  ).map(([mode, label]) => (
                    <Button
                      key={mode}
                      type="button"
                      size="sm"
                      variant={reqBudgetMode === mode ? "default" : "outline"}
                      onClick={() => {
                        setReqBudgetMode(mode);
                        setReqErrors((cur) => ({ ...cur, budget: undefined }));
                      }}
                    >
                      {label}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="block text-sm font-semibold">
                  {tx("Priority", "Prayoridad", "Prayoridad")}
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant={reqUrgent ? "gold" : "outline"}
                  className="w-full"
                  aria-pressed={reqUrgent}
                  onClick={() => setReqUrgent((v) => !v)}
                >
                  <Zap className="size-3.5" aria-hidden />
                  {reqUrgent
                    ? tx("Urgent (+20% estimate)", "Apurahan (+20%)", "Dinalian (+20%)")
                    : tx("Standard schedule", "Karaniwang iskedyul", "Normal nga iskedyul")}
                </Button>
              </div>
            </div>

            {reqBudgetMode === "fixed" && (
              <div className="space-y-1.5">
                <label htmlFor="req-budget" className="block text-sm font-semibold">
                  {tx(
                    "Offered budget (PHP)",
                    "Inaalok na badyet (PHP)",
                    "Gitanyag nga badyet (PHP)",
                  )}
                </label>
                <Input
                  id="req-budget"
                  inputMode="numeric"
                  className="scroll-mt-20 sm:max-w-xs"
                  placeholder={String(Math.round(priceEstimate.recommendedPhp))}
                  value={reqBudget}
                  onChange={(e) => {
                    setReqBudget(e.target.value.replace(/[^\d]/g, ""));
                    setReqErrors((cur) => ({ ...cur, budget: undefined }));
                  }}
                  aria-invalid={!!reqErrors.budget}
                  aria-describedby={reqErrors.budget ? "req-budget-error" : undefined}
                />
                {reqErrors.budget && (
                  <p
                    id="req-budget-error"
                    role="alert"
                    className="text-xs font-medium text-destructive"
                  >
                    {reqErrors.budget}
                  </p>
                )}
              </div>
            )}

            <div className="grid gap-3 lg:grid-cols-2">
              <FairPayEstimateCard
                estimate={priceEstimate}
                offeredBudgetPhp={offeredBudgetNum}
                {...(reqBudgetMode === "fixed"
                  ? { onApplyRecommended: (amt: number) => setReqBudget(String(amt)) }
                  : {})}
              />
              {reqBudgetMode === "fixed" &&
                offeredBudgetNum !== null &&
                offeredBudgetNum >= priceEstimate.minimumWageFloorPhp && (
                  <SettlementPreviewCard
                    amountPhp={offeredBudgetNum}
                    estimatedHours={reqHours}
                    employerTier={isEmployerPro ? "PRO" : "FREE"}
                    employeeTier="FREE"
                    perspective="employer"
                  />
                )}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="req-details" className="block text-sm font-semibold">
                {t("hire.formDetailsLabel")}
              </label>
              <textarea
                id="req-details"
                rows={3}
                className="field min-h-[84px] scroll-mt-20 py-2.5"
                placeholder={t("hire.formDetailsPlaceholder")}
                value={reqDetails}
                onChange={(e) => {
                  setReqDetails(e.target.value);
                  setReqErrors((cur) => ({ ...cur, details: undefined }));
                }}
                aria-invalid={!!reqErrors.details}
                aria-describedby={reqErrors.details ? "req-details-error" : undefined}
              />
              {reqErrors.details && (
                <p
                  id="req-details-error"
                  role="alert"
                  className="text-xs font-medium text-destructive"
                >
                  {reqErrors.details}
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setShowRequestForm(false)}>
                {t("hire.hideForm")}
              </Button>
              <Button type="submit" size="lg">
                <Plus className="size-4" aria-hidden /> {t("hire.formSubmit")}
              </Button>
            </div>
          </form>
        )}
      </section>

      {/* Unlimited Service Categories Section */}
      <section aria-labelledby="cat-h">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 id="cat-h" className="text-lg font-bold tracking-tight">
            {tx("Services", "Mga Serbisyo", "Mga Serbisyo")}
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setShowCustomInput((v) => !v)}
            >
              {tx(
                "Other / Custom Service",
                "Iba pa / Custom na Serbisyo",
                "Uban pa / Custom nga Serbisyo",
              )}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setShowAllCats((v) => !v)}
            >
              {showAllCats ? (
                <>
                  {tx("Show fewer", "Bawasan", "Kamenosi")} <ChevronUp className="size-4" />
                </>
              ) : (
                <>
                  {tx(
                    `All ${CATEGORIES.length} categories`,
                    `Lahat ng ${CATEGORIES.length} kategorya`,
                    `Tanang ${CATEGORIES.length} ka kategorya`,
                  )}{" "}
                  <ChevronDown className="size-4" />
                </>
              )}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 md:grid-cols-6">
          {displayedCategories.map((c) => {
            const Icon = iconFor(c);
            return (
              <Link
                key={c}
                to="/find"
                search={{ category: c }}
                className={`flex flex-col items-center gap-2 rounded-2xl border bg-card px-2 py-4 text-center text-sm font-semibold shadow-soft ${interactiveNavCardClass}`}
              >
                <span className="grid size-11 place-items-center rounded-xl bg-secondary text-secondary-foreground transition-[background-color,color,transform] duration-150 group-hover:scale-105 group-hover:bg-primary group-hover:text-primary-foreground motion-reduce:group-hover:scale-100">
                  <Icon className="size-5" aria-hidden />
                </span>
                {translateCategory(c)}
              </Link>
            );
          })}
          {showAllCats && (
            <button
              type="button"
              onClick={() => setShowCustomInput(true)}
              className={`flex flex-col items-center gap-2 rounded-2xl border border-dashed bg-card px-2 py-4 text-center text-sm font-semibold shadow-soft ${interactiveNavCardClass}`}
            >
              <span className="grid size-11 place-items-center rounded-xl bg-gold-soft text-gold-foreground transition-transform duration-150 group-hover:scale-105 motion-reduce:group-hover:scale-100">
                {(() => {
                  const Icon = iconFor(OTHER_CATEGORY);
                  return <Icon className="size-5" aria-hidden />;
                })()}
              </span>
              {tx("Other / Custom", "Iba pa / Custom", "Uban pa / Custom")}
            </button>
          )}
        </div>

        {showCustomInput && (
          <form
            onSubmit={onCustomServiceSubmit}
            className="mt-3 animate-fade-up rounded-2xl border bg-card p-4 shadow-soft"
          >
            <label
              htmlFor="custom-home-service"
              className="block text-xs font-bold uppercase tracking-wide text-primary"
            >
              {tx(
                "Service: Other — Enter Custom Service Name",
                "Serbisyo: Iba pa — Ilagay ang Custom na Serbisyo",
                "Serbisyo: Uban pa — Isulat ang Custom nga Serbisyo",
              )}
            </label>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
              <Input
                id="custom-home-service"
                value={customService}
                onChange={(e) => setCustomService(e.target.value)}
                placeholder="e.g. Motorcycle Mechanic, Appliance Technician, Piano Tutor"
                className="flex-1"
              />
              <Button type="submit">
                {tx("Find Custom Service", "Maghanap ng Serbisyo", "Pangita og Serbisyo")}
              </Button>
            </div>
            {customErr && (
              <p role="alert" className="mt-1.5 text-xs font-medium text-destructive">
                {customErr}
              </p>
            )}
          </form>
        )}
      </section>

      <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
        <section>
          <SectionHeader
            title={tx(
              `Nearby around ${originLabel}`,
              `Malapit sa ${originLabel}`,
              `Duol sa ${originLabel}`,
            )}
            action={
              <Link to="/find" className={subtleLinkClass}>
                {tx(
                  "Open Map & Finder",
                  "Buksan ang Mapa at Paghahanap",
                  "Ablihi ang Mapa ug Pangita",
                )}{" "}
                <ArrowRight className={subtleArrowIconClass} aria-hidden />
              </Link>
            }
          />
          <div className="grid gap-3 sm:grid-cols-2">
            {nearby.map((w) => (
              <WorkerCard key={w.id} worker={w} />
            ))}
          </div>
          <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="size-3.5" aria-hidden />{" "}
            {tx(
              `Distances are calculated from your selected location (${originLabel}) to each worker’s service area.`,
              `Kinakalkula ang layo mula sa napiling lokasyon (${originLabel}) papunta sa lugar ng bawat manggagawa.`,
              `Gikalkula ang gilay-on gikan sa gipiling lokasyon (${originLabel}) padulong sa dapit sa matag trabahante.`,
            )}
          </p>
        </section>

        <aside className="space-y-4">
          <section className="rounded-2xl border bg-card p-5 shadow-soft">
            <SectionHeader
              title={tx("My bookings", "Mga booking ko", "Akong mga booking")}
              action={
                <Link to="/bookings" className={subtleLinkClass}>
                  {tx("View all", "Tingnan lahat", "Tan-awa tanan")}
                </Link>
              }
            />
            <dl className="grid grid-cols-3 gap-2 text-center">
              {[
                [tx("Pending", "Pending", "Pending"), count("pending")],
                [
                  tx("Active", "Aktibo", "Aktibo"),
                  count("confirmed") + count("in_progress") + count("awaiting_confirmation"),
                ],
                [tx("Completed", "Tapos na", "Nahuman"), count("completed")],
              ].map(([l, n]) => (
                <div key={String(l)} className="rounded-xl bg-muted px-2 py-3">
                  <dd className="text-2xl font-extrabold">{n}</dd>
                  <dt className="text-xs text-muted-foreground">{l}</dt>
                </div>
              ))}
            </dl>
            {latest ? (
              <Link
                to="/bookings"
                className={`mt-4 flex items-center gap-3 rounded-xl border bg-card/60 p-3 ${interactiveNavCardClass}`}
              >
                <Avatar initials={latestWorker?.initials ?? "WK"} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">
                    {latestWorker?.name ?? latest.service}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">{latest.service}</p>
                </div>
                <StatusBadge status={latest.status} />
              </Link>
            ) : (
              <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                <CalendarCheck className="size-4" aria-hidden />{" "}
                {tx("No bookings yet.", "Wala pang booking.", "Wala pay booking.")}
              </p>
            )}
          </section>

          <section className="rounded-2xl border bg-card p-5 shadow-soft">
            <SectionHeader
              title={t("hire.yourRequestsTitle")}
              action={
                <Link to="/bookings" search={{ tab: "requests" }} className={subtleLinkClass}>
                  {tx("Manage", "Pamahalaan", "Dumala")}
                </Link>
              }
            />
            <p className="-mt-2 mb-3 text-xs text-muted-foreground">{t("hire.yourRequestsSub")}</p>
            {customJobs.length === 0 ? (
              <div className="rounded-xl border border-dashed bg-muted/35 p-3.5 text-center">
                <p className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground">
                  <ClipboardList className="size-4" aria-hidden />
                  {tx(
                    "No open requests yet.",
                    "Wala pang nakapost na request.",
                    "Wala pay na-post nga request.",
                  )}
                </p>
                {!showRequestForm && (
                  <Button
                    type="button"
                    size="sm"
                    variant="soft"
                    className="mt-2.5"
                    onClick={toggleRequestForm}
                  >
                    <Plus className="size-3.5" aria-hidden /> {t("hire.postRequestCta")}
                  </Button>
                )}
              </div>
            ) : (
              <ul className="space-y-2.5">
                {customJobs.slice(0, 3).map((job) => {
                  const matchingCount = WORKERS.filter(
                    (w) =>
                      job.category === OTHER_CATEGORY ||
                      w.skill.toLowerCase() === job.category.toLowerCase() ||
                      w.skills.some((s) => s.toLowerCase() === job.category.toLowerCase()),
                  ).length;
                  return (
                    <li
                      key={job.id}
                      className="rounded-xl border bg-background/60 p-3 text-sm transition-colors hover:border-primary/40"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <Link
                          to="/jobs/$id"
                          params={{ id: job.id }}
                          className="min-w-0 flex-1 font-semibold text-foreground hover:text-primary"
                        >
                          <span className="line-clamp-1">{job.title}</span>
                        </Link>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-9 px-2.5"
                          aria-label={tx(
                            `Remove ${job.title}`,
                            `Alisin ang ${job.title}`,
                            `Kuhaa ang ${job.title}`,
                          )}
                          onClick={() => removeJob(job.id)}
                        >
                          <Trash2 className="size-3.5 text-muted-foreground" aria-hidden />
                        </Button>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {translateCategory(job.category)} · {barangayName(job.barangayId)} ·{" "}
                        <strong className="text-foreground">{job.budget}</strong>
                      </p>
                      <p className="mt-1 text-[11px] text-primary">
                        {tx(
                          `${matchingCount} matching worker${matchingCount === 1 ? "" : "s"} in Davao`,
                          `${matchingCount} tugmang manggagawa sa Davao`,
                          `${matchingCount} ka haom nga trabahante sa Davao`,
                        )}
                      </p>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {/* Employer Verification Status Card */}
          <section className="rounded-2xl border bg-card p-4 shadow-soft">
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-primary">
                <ShieldCheck className="size-4" aria-hidden />{" "}
                {tx(
                  "Employer Verification",
                  "Beripikasyon ng Nagpapa-hire",
                  "Beripikasyon sa Mag-hire",
                )}
              </span>
              <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                {verifLabel(idStatus)}
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {tx(
                "Basic identity verification builds trust with local workers. No business license required.",
                "Nagbibigay ng tiwala sa mga manggagawa ang basic identity verification. Hindi kailangan ng business license.",
                "Makahatag og pagsalig sa mga trabahante ang basic identity verification. Dili kinahanglan og business license.",
              )}
            </p>
            <Button asChild size="sm" variant="outline" className="mt-3 w-full">
              <Link to="/verify">
                {tx(
                  "Open Verification Center",
                  "Buksan ang Verification Center",
                  "Ablihi ang Verification Center",
                )}
              </Link>
            </Button>
          </section>

          <Link
            to="/pro"
            className={`block cursor-pointer rounded-2xl bg-gold-sheen p-5 text-gold-foreground shadow-soft transition-[transform,box-shadow,filter] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 hover:shadow-lift hover:brightness-[1.03] active:translate-y-0 active:scale-[0.995] ${FOCUS_RING} ${REDUCED_MOTION_RESET}`}
          >
            <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide">
              <Crown className="size-4" aria-hidden />{" "}
              {plans.includes("employer") ? "GAW Employer Pro Active" : "GAW Employer Pro"}
            </span>
            <p className="mt-2 font-bold text-foreground">
              {plans.includes("employer")
                ? tx(
                    "Top-rated filter & priority booking tools unlocked",
                    "Naka-unlock na ang top-rated filter at priority booking",
                    "Naka-unlock na ang top-rated filter ug priority booking",
                  )
                : tx(
                    "Saved searches & top-rated worker filters",
                    "Mga naka-save na paghahanap at top-rated worker filter",
                    "Mga naka-save nga pagpangita ug top-rated worker filter",
                  )}
            </p>
            <p className="mt-1 text-sm">
              {plans.includes("employer")
                ? tx(
                    "Manage your Pro membership →",
                    "Pamahalaan ang Pro membership →",
                    "Dumalaa ang Pro membership →",
                  )
                : tx(
                    "See demo plans →",
                    "Tingnan ang mga demo plan →",
                    "Tan-awa ang mga demo plan →",
                  )}
            </p>
          </Link>
        </aside>
      </div>
      <VerificationGuardModal
        open={showPostVerifModal}
        onOpenChange={setShowPostVerifModal}
        role="hire"
        actionContext={tx(
          "Publish a service request to Davao workers",
          "Mag-post ng service request para sa mga manggagawa",
          "Mag-post og service request sa mga trabahante",
        )}
        onVerifiedContinue={executeCreateRequest}
      />
    </div>
  );
}
