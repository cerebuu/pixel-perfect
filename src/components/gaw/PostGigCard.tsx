import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Link } from "@tanstack/react-router";
import { CheckCircle2, ChevronDown, ChevronUp, MapPin, Plus, Sparkles, Zap } from "lucide-react";
import { toast } from "sonner";
import { LocationPicker } from "@/components/gaw/GawMap";
import { FairPayEstimateCard, SettlementPreviewCard } from "@/components/gaw/PricingGuide";
import { LocationFilter } from "@/components/gaw/primitives";
import { ServicePicker } from "@/components/gaw/ServicePicker";
import { VerificationGuardModal } from "@/components/gaw/VerificationCenter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { gawMarketplaceClient } from "@/lib/gaw/client";
import { CATEGORIES, OTHER_CATEGORY, type Job } from "@/lib/gaw/data";
import {
  estimateGigPrice,
  FREE_OPEN_GIGS_LIMIT,
  MAX_OFFERED_PRICE_PHP,
  validateGigPrice,
  type PricingEstimateResult,
} from "@/lib/gaw/domain";
import { useI18n } from "@/lib/gaw/i18n";
import { canPerformProtectedAction, hiringOrigin, useGaw } from "@/lib/gaw/store";

export interface PostGigCardProps {
  defaultOpen?: boolean;
  showMyGigsLink?: boolean;
  onPosted?: (job: Job) => void;
  className?: string;
}

/**
 * Shared service-request / gig creation card used by both Hiring Home (/hire)
 * and My Posted Gigs (/gigs). Feeds customJobs across /jobs, /work, /gigs, and /bookings.
 */
export function PostGigCard({
  defaultOpen = false,
  showMyGigsLink = true,
  onPosted,
  className,
}: PostGigCardProps) {
  const gaw = useGaw();
  const { locationId, plans, verification, customJobs, createJob } = gaw;
  const { t, tx } = useI18n();
  const origin = hiringOrigin(gaw);

  const [open, setOpen] = useState(defaultOpen);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<string>(CATEGORIES[0] ?? "Plumbing");
  const [barangayId, setBarangayId] = useState(locationId);
  const [pin, setPin] = useState<{ lat: number; lng: number; label: string } | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [hours, setHours] = useState(4);
  const [urgent, setUrgent] = useState(false);
  const [budgetMode, setBudgetMode] = useState<"fixed" | "quote">("fixed");
  const [budget, setBudget] = useState("600");
  const [schedule, setSchedule] = useState("");
  const [landmark, setLandmark] = useState("");
  const [details, setDetails] = useState("");
  const [errors, setErrors] = useState<{
    title?: string | undefined;
    service?: string | undefined;
    budget?: string | undefined;
    details?: string | undefined;
    form?: string | undefined;
  }>({});
  const [postedJobId, setPostedJobId] = useState<string | null>(null);
  const [showVerifModal, setShowVerifModal] = useState(false);
  const [useAiPricer, setUseAiPricer] = useState(true);
  const [aiEstimate, setAiEstimate] = useState<PricingEstimateResult | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);
  const pricingSeqRef = useRef(0);

  const isEmployerPro = plans.includes("employer");

  const localEstimate = useMemo(
    () =>
      estimateGigPrice({
        category: category || OTHER_CATEGORY,
        estimatedHours: hours,
        urgency: urgent ? "urgent" : "standard",
        requiredSkills: [],
        ...(title.trim() ? { title: title.trim() } : {}),
        ...(details.trim() ? { description: details.trim() } : {}),
        barangay: barangayId,
      }),
    [category, hours, urgent, title, details, barangayId],
  );

  useEffect(() => {
    if (!open || !useAiPricer) {
      setLoadingAi(false);
      return;
    }

    const seq = ++pricingSeqRef.current;
    const controller = new AbortController();
    setLoadingAi(true);

    const timer = setTimeout(async () => {
      try {
        const result = await gawMarketplaceClient.estimatePricing(
          {
            category: category || OTHER_CATEGORY,
            estimatedHours: hours,
            urgency: urgent ? "urgent" : "standard",
            requiredSkills: [],
            ...(title.trim() ? { title: title.trim() } : {}),
            ...(details.trim() ? { description: details.trim() } : {}),
            barangay: barangayId,
          },
          { signal: controller.signal },
        );
        if (!controller.signal.aborted && pricingSeqRef.current === seq) {
          setAiEstimate(result);
        }
      } catch {
        // Local heuristic remains active cleanly when endpoint rejects or network is unavailable
      } finally {
        if (!controller.signal.aborted && pricingSeqRef.current === seq) {
          setLoadingAi(false);
        }
      }
    }, 350);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [open, useAiPricer, category, hours, urgent, title, details, barangayId]);

  const priceEstimate =
    useAiPricer &&
    aiEstimate &&
    aiEstimate.category === localEstimate.category &&
    aiEstimate.estimatedHours === localEstimate.estimatedHours &&
    aiEstimate.urgency === localEstimate.urgency
      ? aiEstimate
      : localEstimate;

  const parsedBudget = budgetMode === "fixed" && budget.trim() !== "" ? Number(budget) : null;
  const offeredBudgetNum =
    parsedBudget !== null && Number.isFinite(parsedBudget) ? parsedBudget : null;

  const toggleForm = () => {
    setOpen((prev) => {
      const next = !prev;
      if (next) {
        setBarangayId(locationId);
        setPostedJobId(null);
      }
      return next;
    });
  };

  const executeCreateRequest = () => {
    const landmarkVal = landmark.trim() || pin?.label;
    const res = createJob({
      title: title.trim(),
      category: category.trim() || OTHER_CATEGORY,
      barangayId,
      ...(landmarkVal ? { landmark: landmarkVal } : {}),
      ...(pin ? { lat: pin.lat, lng: pin.lng } : {}),
      budgetNum: budgetMode === "fixed" ? offeredBudgetNum : null,
      estimatedHours: hours,
      schedule: schedule.trim() || tx("Flexible", "Flexible", "Flexible"),
      description: details.trim(),
      urgent,
      aiRecommendedPhp: Math.round(priceEstimate.recommendedPhp),
    });
    if (!res.ok || !res.job) {
      if (res.error === "unverified") {
        setShowVerifModal(true);
        return;
      }
      if (res.error === "below_benchmark") {
        setErrors((cur) => ({ ...cur, budget: res.message }));
        return;
      }
      setErrors((cur) => ({ ...cur, form: res.message }));
      return;
    }

    setErrors({});
    setPostedJobId(res.job.id);
    setTitle("");
    setLandmark("");
    setSchedule("");
    setDetails("");
    setPin(null);
    setShowMap(false);
    setOpen(false);
    toast.success(
      tx(
        "Service request published to nearby workers in Davao!",
        "Naipost na ang request sa mga malapit na manggagawa!",
        "Na-post na ang request sa mga duol nga trabahante sa Davao!",
      ),
    );
    onPosted?.(res.job);
  };

  const submitCreateRequest = (e: FormEvent) => {
    e.preventDefault();
    const errs: typeof errors = {};
    if (title.trim().length < 4) {
      errs.title = tx(
        "Enter a clear request title (at least 4 characters).",
        "Ilagay ang malinaw na pamagat (hindi bababa sa 4 letra).",
        "Isulat ang klaro nga titulo (labing menos 4 ka letra).",
      );
    }
    if (!category.trim()) {
      errs.service = tx(
        "Choose or enter a service category.",
        "Pumili o maglagay ng kategorya ng serbisyo.",
        "Pili o isulat ang kategorya sa serbisyo.",
      );
    }
    if (budgetMode === "fixed") {
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
        const floorCheck = validateGigPrice(hours, offeredBudgetNum);
        if (!floorCheck.isValid) {
          errs.budget = tx(
            `Budget ₱${offeredBudgetNum.toLocaleString("en-PH")} is below GAW's ₱${floorCheck.minimumRequiredPhp.toLocaleString("en-PH")} Davao fair-pay benchmark for ${hours}h.`,
            `Ang badyet na ₱${offeredBudgetNum.toLocaleString("en-PH")} ay mas mababa sa ₱${floorCheck.minimumRequiredPhp.toLocaleString("en-PH")} na gabay para sa ${hours} oras.`,
            `Ang badyet nga ₱${offeredBudgetNum.toLocaleString("en-PH")} ubos sa ₱${floorCheck.minimumRequiredPhp.toLocaleString("en-PH")} nga giya alang sa ${hours} ka oras.`,
          );
        }
      }
    }
    if (details.trim().length < 8) {
      errs.details = tx(
        "Describe what needs fixing or done (at least 8 characters).",
        "Ilarawan ang kailangang gawin (hindi bababa sa 8 letra).",
        "Ihulagway ang angay buhaton (labing menos 8 ka letra).",
      );
    }

    setErrors(errs);
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
      setShowVerifModal(true);
      return;
    }
    executeCreateRequest();
  };

  return (
    <section
      aria-labelledby="post-request-h"
      className={
        className
          ? `rounded-2xl border bg-card p-5 shadow-soft ${className}`
          : "rounded-2xl border bg-card p-5 shadow-soft"
      }
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
          variant={open ? "outline" : "default"}
          aria-expanded={open}
          aria-controls="post-request-form"
          onClick={toggleForm}
        >
          {open ? (
            <>
              <ChevronUp className="size-4" aria-hidden /> {t("hire.hideForm")}
            </>
          ) : (
            <>
              <Plus className="size-4" aria-hidden /> {t("hire.postRequestCta")}
              <ChevronDown className="ml-0.5 size-4 opacity-70" aria-hidden />
            </>
          )}
        </Button>
      </div>

      {postedJobId && (
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
              <Link to="/jobs/$id" params={{ id: postedJobId }}>
                {tx("View listing", "Tingnan ang post", "Tan-awa ang post")}
              </Link>
            </Button>
            {showMyGigsLink && (
              <Button asChild size="sm" variant="outline">
                <Link to="/gigs">{tx("My Posted Gigs", "Aking Mga Gig", "Akong Mga Gig")}</Link>
              </Button>
            )}
          </div>
        </div>
      )}

      {open && (
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

          {errors.form && (
            <p
              role="alert"
              className="rounded-xl bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive"
            >
              {errors.form}
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
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  setErrors((cur) => ({ ...cur, title: undefined }));
                }}
                aria-invalid={!!errors.title}
                aria-describedby={errors.title ? "req-title-error" : undefined}
              />
              {errors.title && (
                <p
                  id="req-title-error"
                  role="alert"
                  className="text-xs font-medium text-destructive"
                >
                  {errors.title}
                </p>
              )}
            </div>

            <ServicePicker
              id="req-service"
              label={t("hire.formServiceLabel")}
              value={category}
              onChange={(svc) => {
                setCategory(svc);
                setErrors((cur) => ({ ...cur, service: undefined }));
              }}
              error={errors.service}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <LocationFilter
              id="req-brgy"
              value={barangayId}
              onChange={(brgy) => {
                setBarangayId(brgy);
                setPin(null);
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
                value={landmark}
                onChange={(e) => setLandmark(e.target.value)}
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
                value={schedule}
                onChange={(e) => setSchedule(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" size="sm" variant="outline" onClick={() => setShowMap((v) => !v)}>
              <MapPin className="size-3.5 text-primary" aria-hidden />
              {pin
                ? tx(`Pinned: ${pin.label}`, `Pin: ${pin.label}`, `Pin: ${pin.label}`)
                : tx("Pin exact Davao location", "Ituro sa mapa", "Itudlo sa mapa")}
            </Button>
            {pin && (
              <Button type="button" size="sm" variant="ghost" onClick={() => setPin(null)}>
                {tx("Clear pin", "Alisin", "Kuhaa")}
              </Button>
            )}
          </div>

          {showMap && (
            <LocationPicker
              modeLabel={tx(
                "Job Location Pin (Davao City)",
                "Lokasyon ng Trabaho",
                "Lokasyon sa Trabaho",
              )}
              initialLocation={pin ?? origin}
              initialBarangayId={barangayId}
              initialLabel={pin?.label}
              onConfirm={(placed) => {
                setPin(placed);
                setShowMap(false);
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
                value={hours}
                onChange={(e) => setHours(Number(e.target.value))}
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
                    variant={budgetMode === mode ? "default" : "outline"}
                    onClick={() => {
                      setBudgetMode(mode);
                      setErrors((cur) => ({ ...cur, budget: undefined }));
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
                variant={urgent ? "gold" : "outline"}
                className="w-full"
                aria-pressed={urgent}
                onClick={() => setUrgent((v) => !v)}
              >
                <Zap className="size-3.5" aria-hidden />
                {urgent
                  ? tx("Urgent (+20% estimate)", "Apurahan (+20%)", "Dinalian (+20%)")
                  : tx("Standard schedule", "Karaniwang iskedyul", "Normal nga iskedyul")}
              </Button>
            </div>
          </div>

          {budgetMode === "fixed" && (
            <div className="space-y-1.5">
              <label htmlFor="req-budget" className="block text-sm font-semibold">
                {tx("Offered budget (PHP)", "Inaalok na badyet (PHP)", "Gitanyag nga badyet (PHP)")}
              </label>
              <Input
                id="req-budget"
                inputMode="numeric"
                className="scroll-mt-20 sm:max-w-xs"
                placeholder={String(Math.round(priceEstimate.recommendedPhp))}
                value={budget}
                onChange={(e) => {
                  setBudget(e.target.value.replace(/[^\d]/g, ""));
                  setErrors((cur) => ({ ...cur, budget: undefined }));
                }}
                aria-invalid={!!errors.budget}
                aria-describedby={errors.budget ? "req-budget-error" : undefined}
              />
              {errors.budget && (
                <p
                  id="req-budget-error"
                  role="alert"
                  className="text-xs font-medium text-destructive"
                >
                  {errors.budget}
                </p>
              )}
            </div>
          )}

          <div className="grid gap-3 lg:grid-cols-2">
            <FairPayEstimateCard
              estimate={priceEstimate}
              offeredBudgetPhp={offeredBudgetNum}
              useAiPricer={useAiPricer}
              onToggleAiPricer={(enabled) => {
                setUseAiPricer(enabled);
                if (!enabled) setAiEstimate(null);
              }}
              loadingAi={loadingAi}
              {...(budgetMode === "fixed"
                ? { onApplyRecommended: (amt: number) => setBudget(String(amt)) }
                : {})}
            />
            {budgetMode === "fixed" &&
              offeredBudgetNum !== null &&
              offeredBudgetNum >= priceEstimate.minimumWageFloorPhp && (
                <SettlementPreviewCard
                  amountPhp={offeredBudgetNum}
                  estimatedHours={hours}
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
              value={details}
              onChange={(e) => {
                setDetails(e.target.value);
                setErrors((cur) => ({ ...cur, details: undefined }));
              }}
              aria-invalid={!!errors.details}
              aria-describedby={errors.details ? "req-details-error" : undefined}
            />
            {errors.details && (
              <p
                id="req-details-error"
                role="alert"
                className="text-xs font-medium text-destructive"
              >
                {errors.details}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              {t("hire.hideForm")}
            </Button>
            <Button type="submit" size="lg">
              <Plus className="size-4" aria-hidden /> {t("hire.formSubmit")}
            </Button>
          </div>
        </form>
      )}

      <VerificationGuardModal
        open={showVerifModal}
        onOpenChange={setShowVerifModal}
        role="hire"
        actionContext={tx(
          "Publish a service request to Davao workers",
          "Mag-post ng service request para sa mga manggagawa",
          "Mag-post og service request sa mga trabahante",
        )}
        onVerifiedContinue={executeCreateRequest}
      />
    </section>
  );
}
