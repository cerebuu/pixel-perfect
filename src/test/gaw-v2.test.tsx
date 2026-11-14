import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { validateAuth } from "@/components/gaw/AuthForm";
import { validateBooking } from "@/components/gaw/BookingForm";
import { GAWBrand, GAWWordmark } from "@/components/gaw/GAWBrand";
import { getConfiguredCartoKey, MapToolbar, resolveMapTileConfig } from "@/components/gaw/GawMap";
import {
  filterTabPillClass,
  FOCUS_RING,
  FOCUS_RING_INSET,
  iconActionButtonClass,
  interactiveEntityCardClass,
  interactiveNavCardClass,
  REDUCED_MOTION_RESET,
  segmentedOptionClass,
  selectableOptionCardClass,
  subtleArrowIconClass,
  subtleLinkClass,
} from "@/components/gaw/interactions";
import {
  AvailabilityBadge,
  HeaderBrand,
  PriceDisplay,
  SkillChip,
} from "@/components/gaw/primitives";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuHighlightGroup,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  allowedActions,
  applyAction,
  canWithdraw,
  MY_JOBS_TABS,
  nextStatus,
  tabForStatus,
  type ApplicationStatus,
  type BookingStatus,
} from "@/lib/gaw/bookings";
import {
  BARANGAYS,
  CATEGORIES,
  DAVAO_CENTER,
  nearestBarangay,
  OTHER_CATEGORY,
  RADIUS_OPTIONS,
  WORKERS,
  type Worker,
} from "@/lib/gaw/data";
import { distanceKm, filterJobs, filterWorkers, roundKm } from "@/lib/gaw/filter";
import { formatAccuracy, geoErrorMessage } from "@/lib/gaw/geo";
import {
  DICTIONARIES,
  getApplicationStatusLabel,
  getBookingStatusLabel,
  getMyJobsTabLabel,
  getVerifNextText,
  getVerifStatusLabel,
  I18nProvider,
  interpolate,
  isValidLocale,
  LanguageSelector,
  LOCALE_BOOT_SCRIPT,
  LOCALE_KEY,
  SUPPORTED_LOCALES,
  translate,
  translateCategoryFor,
  type Locale,
} from "@/lib/gaw/i18n";
import {
  addSkill,
  isPredefinedService,
  normalizeService,
  offersService,
  validateCustomService,
} from "@/lib/gaw/services";
import {
  canPerformProtectedAction,
  hasPlan,
  hiringOrigin,
  identityVerified,
  initialState,
  sanitizeLoadedState,
  type Verification,
} from "@/lib/gaw/store";
import { resolveTheme, THEME_BOOT_SCRIPT } from "@/lib/gaw/theme";
import {
  CREDENTIAL_TYPES,
  DEFAULT_REJECTION_REASON,
  DEFAULT_RESUBMISSION_REASON,
  evaluateVerificationGuard,
  formatBytes,
  ID_TYPES,
  validateUpload,
  VERIF_LABEL,
  VERIF_NEXT,
  type VerifStatus,
} from "@/lib/gaw/verification";
import { cebPH } from "@/locales/ceb-PH";
import { enPH, type TranslationKey } from "@/locales/en-PH";
import { filPH } from "@/locales/fil-PH";

describe("GAW V2 Feature & Functionality Suite", () => {
  describe("1. Dark Mode, Light Mode & System Default Theme", () => {
    it("resolves explicit light, dark, and system preferences accurately", () => {
      expect(resolveTheme("light", true)).toBe("light");
      expect(resolveTheme("light", false)).toBe("light");
      expect(resolveTheme("dark", false)).toBe("dark");
      expect(resolveTheme("dark", true)).toBe("dark");
      expect(resolveTheme("system", true)).toBe("dark");
      expect(resolveTheme("system", false)).toBe("light");
    });

    it("includes boot script to persist theme across refreshes without flash", () => {
      expect(THEME_BOOT_SCRIPT).toContain("gaw:theme");
      expect(THEME_BOOT_SCRIPT).toContain("prefers-color-scheme: dark");
    });
  });

  describe("2. Sign-Up Validation & Verification System", () => {
    it("validates sign-up fields including Philippine mobile number and terms acceptance", () => {
      const unaccepted = validateAuth("signup", {
        name: "Juan Dela Cruz",
        email: "juan@example.com",
        mobile: "09171234567",
        password: "password123",
        confirm: "password123",
        terms: false,
      });
      expect(unaccepted.terms).toBeDefined();

      const valid = validateAuth("signup", {
        name: "Juan Dela Cruz",
        email: "juan@example.com",
        mobile: "0917 123 4567",
        password: "password123",
        confirm: "password123",
        terms: true,
      });
      expect(Object.keys(valid)).toHaveLength(0);
    });

    it("validates ID document uploads for format and size and never marks pending uploads as verified", () => {
      expect(ID_TYPES.length).toBeGreaterThanOrEqual(4);
      expect(CREDENTIAL_TYPES.map((c) => c.key)).toEqual(["barangay", "tesda", "prc"]);

      expect(validateUpload({ type: "image/png", size: 500 * 1024 })).toBeNull();
      expect(validateUpload({ type: "application/pdf", size: 1024 * 1024 })).toBeNull();
      expect(validateUpload({ type: "application/x-msdownload", size: 1024 })).toMatch(
        /JPG, PNG, WEBP or PDF/,
      );
      expect(validateUpload({ type: "image/jpeg", size: 6 * 1024 * 1024 })).toMatch(/too large/);
      expect(validateUpload({ type: "image/jpeg", size: 0 })).toMatch(/empty/);

      const pendingVerif: Verification = {
        identity: {
          kind: ID_TYPES[0],
          fileName: "sample-id.png",
          fileSize: 204800,
          fileType: "image/png",
          isSample: true,
          status: "pending",
          submittedAt: Date.now(),
        },
        credentials: {},
      };
      // Uploading an ID sets status to "pending", NOT "verified"
      expect(identityVerified(pendingVerif)).toBe(false);

      const approvedVerif: Verification = {
        ...pendingVerif,
        identity: { ...pendingVerif.identity!, status: "verified" },
      };
      expect(identityVerified(approvedVerif)).toBe(true);
      expect(VERIF_LABEL.pending).toBe("Pending review");
      expect(VERIF_LABEL.unverified).toBe("Unverified");
      expect(VERIF_LABEL.resubmission_required).toBe("Resubmission required");
      expect(VERIF_NEXT.not_submitted).toBeTruthy();
      expect(formatBytes(250 * 1024)).toBe("250 KB");
    });

    it("enforces action-based verification guard across unverified, pending, rejected, resubmission_required, and verified states", () => {
      const unverifiedGuard = canPerformProtectedAction({ identity: null, credentials: {} });
      expect(unverifiedGuard.allowed).toBe(false);
      expect(unverifiedGuard.status).toBe("unverified");
      expect(unverifiedGuard.requiresSubmission).toBe(true);
      expect(unverifiedGuard.title).toBe("Verify Your Identity to Continue");

      const pendingGuard = evaluateVerificationGuard({ status: "pending" });
      expect(pendingGuard.allowed).toBe(false);
      expect(pendingGuard.isPending).toBe(true);
      expect(pendingGuard.requiresSubmission).toBe(false);

      const rejectedGuard = evaluateVerificationGuard({ status: "rejected" });
      expect(rejectedGuard.allowed).toBe(false);
      expect(rejectedGuard.requiresSubmission).toBe(true);
      expect(rejectedGuard.reason).toBe(DEFAULT_REJECTION_REASON);

      const resubmitGuard = evaluateVerificationGuard({ status: "resubmission_required" });
      expect(resubmitGuard.allowed).toBe(false);
      expect(resubmitGuard.requiresSubmission).toBe(true);
      expect(resubmitGuard.reason).toBe(DEFAULT_RESUBMISSION_REASON);

      const verifiedGuard = evaluateVerificationGuard({ status: "verified" });
      expect(verifiedGuard.allowed).toBe(true);
      expect(verifiedGuard.requiresSubmission).toBe(false);
    });
  });

  describe("3. Unlimited Service Categories & Flexible Worker Skills", () => {
    it("supports predefined categories, Other Services, and custom services like Motorcycle Mechanic", () => {
      expect(CATEGORIES).toContain("Plumbing");
      expect(CATEGORIES).toContain("Gardening");
      expect(CATEGORIES).toContain("Air Conditioning Services");
      expect(CATEGORIES).toContain("Computer Repair");

      expect(isPredefinedService("Plumbing")).toBe(true);
      expect(isPredefinedService("Motorcycle Mechanic")).toBe(false);

      expect(normalizeService("  motorcycle   mechanic ")).toBe("Motorcycle mechanic");
      expect(validateCustomService("Motorcycle Mechanic")).toBeNull();
      expect(validateCustomService("A")).toMatch(/at least 2/);
      expect(validateCustomService(OTHER_CATEGORY)).toMatch(/actual service/);

      const customWorker = {
        skill: "Motorcycle Repair",
        skills: ["Motorcycle Mechanic", "Tune-up"],
      };
      expect(offersService(customWorker, OTHER_CATEGORY)).toBe(true);
      expect(offersService(customWorker, "Motorcycle Mechanic")).toBe(true);
    });

    it("manages worker primary and additional custom skills without duplicates", () => {
      let skills: string[] = [];
      skills = addSkill(skills, "Carburetor tune-up", "Motorcycle Mechanic");
      skills = addSkill(skills, "carburetor tune-up", "Motorcycle Mechanic"); // duplicate ignored
      skills = addSkill(skills, "Motorcycle Mechanic", "Motorcycle Mechanic"); // primary ignored
      skills = addSkill(skills, "Brake repair", "Motorcycle Mechanic");
      expect(skills).toEqual(["Carburetor tune-up", "Brake repair"]);
    });
  });

  describe("4. Live GPS, Pinpoint Location, Radius & Worker Discovery", () => {
    it("calculates accurate distances in Davao City and filters workers by radius and custom skill", () => {
      expect(RADIUS_OPTIONS).toEqual([1, 3, 5, 10]);
      const bajada = BARANGAYS.find((b) => b.id === "bajada")!;
      expect(nearestBarangay({ lat: bajada.lat, lng: bajada.lng }).id).toBe("bajada");

      const d = roundKm(distanceKm(bajada, DAVAO_CENTER));
      expect(d).toBeGreaterThan(0);
      expect(d).toBeLessThan(10);

      const mechResults = filterWorkers(WORKERS, {
        origin: bajada,
        category: "Motorcycle Mechanic",
        query: "",
        radius: 10,
        availableOnly: false,
      });
      expect(mechResults.length).toBeGreaterThanOrEqual(1);
      expect(mechResults[0]!.name).toContain("Edgar");

      const originFromPin = hiringOrigin({
        locationId: "bajada",
        serviceLocation: { lat: 7.09, lng: 125.61, label: "Abreeza Pin", source: "pin" },
      });
      expect(originFromPin).toMatchObject({ lat: 7.09, lng: 125.61 });
    });

    it("provides clear geolocation fallback error messages and accuracy formatting", () => {
      expect(geoErrorMessage("denied")).toMatch(/permission was denied/i);
      expect(geoErrorMessage("unavailable")).toMatch(/drop a pin/i);
      expect(geoErrorMessage("ready")).toBeNull();
      expect(formatAccuracy(42)).toBe("±42 m");
      expect(formatAccuracy(1500)).toBe("±1.5 km");
    });
  });

  describe("5. GAW Pro Subscription Entitlements", () => {
    it("separates Worker Pro and Employer Pro entitlements", () => {
      expect(hasPlan([], "worker")).toBe(false);
      expect(hasPlan(["worker"], "worker")).toBe(true);
      expect(hasPlan(["worker"], "employer")).toBe(false);
      expect(hasPlan(["worker", "employer"], "employer")).toBe(true);
    });
  });

  describe("6. My Jobs & Shared Booking State Machine", () => {
    it("enforces valid booking state transitions and prevents completing unstarted jobs", () => {
      expect(MY_JOBS_TABS.map((t) => t.key)).toEqual([
        "applications",
        "saved",
        "pending",
        "upcoming",
        "in_progress",
        "completed",
        "cancelled",
      ]);

      // Cannot finish or confirm a pending booking directly
      expect(nextStatus("pending", "finish")).toBeNull();
      expect(nextStatus("pending", "confirm")).toBeNull();
      expect(nextStatus("confirmed", "finish")).toBeNull();

      // Valid full lifecycle: pending -> confirmed -> in_progress -> awaiting_confirmation -> completed
      let items: { id: string; status: BookingStatus }[] = [{ id: "b-1", status: "pending" }];
      expect(tabForStatus(items[0]!.status)).toBe("pending");
      expect(allowedActions(items[0]!.status, "worker")).toEqual(["accept", "decline"]);

      items = applyAction(items, "b-1", "accept");
      expect(items[0]!.status).toBe("confirmed");
      expect(tabForStatus(items[0]!.status)).toBe("upcoming");

      items = applyAction(items, "b-1", "start");
      expect(items[0]!.status).toBe("in_progress");
      expect(tabForStatus(items[0]!.status)).toBe("in_progress");

      items = applyAction(items, "b-1", "finish");
      expect(items[0]!.status).toBe("awaiting_confirmation");
      expect(tabForStatus(items[0]!.status)).toBe("in_progress");

      items = applyAction(items, "b-1", "confirm");
      expect(items[0]!.status).toBe("completed");
      expect(tabForStatus(items[0]!.status)).toBe("completed");

      expect(canWithdraw("submitted")).toBe(true);
      expect(canWithdraw("withdrawn")).toBe(false);
      expect(canWithdraw("hired")).toBe(false);
    });

    it("validates booking form and job filtering", () => {
      const errs = validateBooking(
        {
          service: "Motorcycle Mechanic",
          description: "Need carburetor tune-up and brake check at home.",
          date: "2026-12-01",
          time: "10:00",
          barangayId: "bajada",
          budgetMode: "budget",
          budget: "500",
        },
        "2026-11-14",
      );
      expect(Object.keys(errs)).toHaveLength(0);

      expect(filterJobs([], { category: "all", barangayId: "all", query: "" })).toEqual([]);
    });
  });

  describe("7. Brand Identity System (GAWBrand & GAWWordmark)", () => {
    it("exports centralized GAWBrand and GAWWordmark components supporting icon, compact, full, and expanded variants", () => {
      expect(typeof GAWBrand).toBe("function");
      expect(typeof GAWWordmark).toBe("function");

      const iconEl = GAWBrand({ variant: "icon" });
      const compactEl = GAWBrand({ variant: "compact" });
      const fullEl = GAWBrand({ variant: "full", proBadge: true });
      const expandedEl = GAWBrand({ variant: "expanded", onDeep: true });
      const wordmarkEl = GAWWordmark({ mode: "transparent", framed: true });

      expect(iconEl).toBeTruthy();
      expect(compactEl).toBeTruthy();
      expect(fullEl).toBeTruthy();
      expect(expandedEl).toBeTruthy();
      expect(wordmarkEl).toBeTruthy();
    });

    it("resolves map tiles safely without unauthenticated CARTO watermarked endpoints and renders reusable primitives", () => {
      const lightCfg = resolveMapTileConfig(false);
      expect(lightCfg.provider).toBe("osm");
      expect(lightCfg.url).toContain("tile.openstreetmap.org");

      // When no CARTO API key is configured, Dark Mode uses authorized OpenStreetMap tiles instead of unauthenticated CARTO tiles
      const darkCfg = resolveMapTileConfig(true);
      if (!getConfiguredCartoKey()) {
        expect(darkCfg.provider).toBe("osm");
        expect(darkCfg.url).toContain("tile.openstreetmap.org");
        expect(darkCfg.url).not.toContain("cartocdn.com");
      }

      // Forced fallback always uses OpenStreetMap
      const fallbackCfg = resolveMapTileConfig(true, true);
      expect(fallbackCfg.provider).toBe("osm");
      expect(fallbackCfg.url).toContain("tile.openstreetmap.org");

      const headerBrandHtml = renderToStaticMarkup(<HeaderBrand size="sm" />);
      expect(headerBrandHtml).toContain("GAW");
      expect(headerBrandHtml).toContain("Grab a Work");
      expect(headerBrandHtml).toContain("aspect-square size-8 sm:size-[34px] md:size-9");
      expect(headerBrandHtml).toContain("object-contain");
      expect(headerBrandHtml).toContain("gap-2.5 sm:gap-3");
      expect(SkillChip({ children: "Motorcycle Mechanic" })).toBeTruthy();
      expect(PriceDisplay({ formattedRate: "₱300" })).toBeTruthy();
      expect(AvailabilityBadge({ available: true })).toBeTruthy();
      expect(
        MapToolbar({
          locating: false,
          watching: true,
          onUseCurrentLocation: () => {},
          onToggleWatch: () => {},
          onRecenter: () => {},
          onRefresh: () => {},
        }),
      ).toBeTruthy();
    });
  });

  describe("8. Interactive Feedback, Focus & Reduced-Motion Utilities", () => {
    it("generates consistent pointer, focus-visible, reduced-motion, and variant classes", () => {
      expect(FOCUS_RING).toContain("focus-visible:ring-2");
      expect(FOCUS_RING_INSET).toContain("focus-visible:ring-inset");
      expect(REDUCED_MOTION_RESET).toContain("motion-reduce:transition-none");

      const segInactive = segmentedOptionClass(false, "card");
      expect(segInactive).toContain("cursor-pointer");
      expect(segInactive).toContain("hover:bg-hover-surface");
      expect(segInactive).toContain("disabled:cursor-not-allowed");

      const segDeep = segmentedOptionClass(true, "deep");
      expect(segDeep).toContain("bg-deep");
      expect(segDeep).toContain("text-deep-foreground");

      const segPrimary = segmentedOptionClass(true, "primary");
      expect(segPrimary).toContain("bg-primary");
      expect(segPrimary).toContain("text-primary-foreground");

      const pillActive = filterTabPillClass(true);
      const pillInactive = filterTabPillClass(false);
      expect(pillActive).toContain("bg-deep");
      expect(pillInactive).toContain("hover:border-hover-border");
      expect(pillInactive).toContain("hover:bg-hover-surface");

      const optionActive = selectableOptionCardClass(true);
      const optionInactive = selectableOptionCardClass(false);
      expect(optionActive).toContain("ring-primary/25");
      expect(optionInactive).toContain("hover:border-hover-border");

      const iconDefault = iconActionButtonClass("default");
      const iconDanger = iconActionButtonClass("destructive");
      expect(iconDefault).toContain("hover:bg-hover-surface");
      expect(iconDanger).toContain("hover:bg-danger-hover-surface");
      expect(iconDanger).toContain("hover:text-destructive");

      expect(interactiveNavCardClass).toContain("hover:border-hover-border");
      expect(interactiveEntityCardClass).toContain("has-[a:focus-visible]:ring-2");
      expect(subtleLinkClass).toContain("hover:underline");
      expect(subtleArrowIconClass).toContain("group-hover:translate-x-1");
    });

    it("renders DropdownMenuHighlightGroup SSR-safely and exports themed dropdown primitives", () => {
      expect(typeof DropdownMenu).toBe("function");
      expect(DropdownMenuContent).toBeTruthy();
      expect(typeof DropdownMenuHighlightGroup).toBe("function");
      expect(DropdownMenuItem).toBeTruthy();

      const html = renderToStaticMarkup(
        <DropdownMenuHighlightGroup>
          <span>Verification Center</span>
        </DropdownMenuHighlightGroup>,
      );
      expect(html).toContain("Verification Center");
      expect(html).toContain('aria-hidden="true"');
    });
  });

  describe("9. Multilingual i18n (en-PH, fil-PH, ceb-PH) & Defensive Persistence", () => {
    it("maintains identical, non-empty translation keys across en-PH, fil-PH, and ceb-PH including all service categories", () => {
      expect(SUPPORTED_LOCALES.map((l) => l.code)).toEqual(["en-PH", "fil-PH", "ceb-PH"]);

      const enSections = Object.keys(enPH).sort();
      expect(Object.keys(filPH).sort()).toEqual(enSections);
      expect(Object.keys(cebPH).sort()).toEqual(enSections);

      for (const section of enSections as (keyof typeof enPH)[]) {
        const enGroup = enPH[section] as Record<string, string>;
        const filGroup = filPH[section] as Record<string, string>;
        const cebGroup = cebPH[section] as Record<string, string>;

        const enKeys = Object.keys(enGroup).sort();
        expect(Object.keys(filGroup).sort()).toEqual(enKeys);
        expect(Object.keys(cebGroup).sort()).toEqual(enKeys);

        for (const k of enKeys) {
          expect(enGroup[k]!.trim().length).toBeGreaterThan(0);
          expect(filGroup[k]!.trim().length).toBeGreaterThan(0);
          expect(cebGroup[k]!.trim().length).toBeGreaterThan(0);
        }
      }

      for (const cat of [...CATEGORIES, OTHER_CATEGORY]) {
        for (const loc of ["en-PH", "fil-PH", "ceb-PH"] as Locale[]) {
          expect(
            (DICTIONARIES[loc].categories as Record<string, string>)[cat]?.trim().length,
          ).toBeGreaterThan(0);
        }
      }
    });

    it("translates keys, interpolates tokens, and formats category and status labels across en-PH -> fil-PH -> ceb-PH -> en-PH", () => {
      expect(interpolate("Hello {name}, {count} left", { name: "Juan", count: 3 })).toBe(
        "Hello Juan, 3 left",
      );
      expect(interpolate("Keep {missing}", {})).toBe("Keep {missing}");

      const key: TranslationKey = "mode.hireTitle";
      const sequence: Locale[] = ["en-PH", "fil-PH", "ceb-PH", "en-PH"];
      const results = sequence.map((loc) => translate(loc, key));
      expect(results[0]).toBe("Hire a Worker");
      expect(results[1]).not.toBe("Hire a Worker");
      expect(results[2]).not.toBe("Hire a Worker");
      expect(results[3]).toBe("Hire a Worker");

      expect(translateCategoryFor("fil-PH", "Plumbing")).not.toBe("Plumbing");
      expect(translateCategoryFor("ceb-PH", "Plumbing")).not.toBe("Plumbing");
      expect(translateCategoryFor("ceb-PH", "Motorcycle Mechanic")).toBe("Motorcycle Mechanic");

      const bookingStatuses: BookingStatus[] = [
        "pending",
        "confirmed",
        "in_progress",
        "awaiting_confirmation",
        "completed",
        "declined",
        "cancelled",
      ];
      const verifStatuses: VerifStatus[] = [
        "not_submitted",
        "unverified",
        "pending",
        "verified",
        "rejected",
        "resubmission_required",
      ];
      const appStatuses: ApplicationStatus[] = ["submitted", "withdrawn", "hired"];

      for (const loc of ["en-PH", "fil-PH", "ceb-PH"] as Locale[]) {
        expect(isValidLocale(loc)).toBe(true);
        for (const bs of bookingStatuses) {
          expect(getBookingStatusLabel(bs, loc).trim().length).toBeGreaterThan(0);
        }
        for (const vs of verifStatuses) {
          expect(getVerifStatusLabel(vs, loc).trim().length).toBeGreaterThan(0);
          expect(getVerifNextText(vs, loc).trim().length).toBeGreaterThan(0);
        }
        for (const as of appStatuses) {
          expect(getApplicationStatusLabel(as, loc).trim().length).toBeGreaterThan(0);
        }
        for (const tab of MY_JOBS_TABS) {
          expect(getMyJobsTabLabel(tab.key, loc).trim().length).toBeGreaterThan(0);
        }
      }
      expect(isValidLocale("fr-FR")).toBe(false);
    });

    it("provides LOCALE_BOOT_SCRIPT and renders LanguageSelector SSR-safely without flag emojis", () => {
      expect(LOCALE_KEY).toBe("gaw:locale");
      expect(LOCALE_BOOT_SCRIPT).toContain("gaw:locale");
      expect(LOCALE_BOOT_SCRIPT).toContain("fil-PH");
      expect(LOCALE_BOOT_SCRIPT).toContain("ceb-PH");
      expect(LOCALE_BOOT_SCRIPT).toContain("document.documentElement.lang");

      const selectorHtml = renderToStaticMarkup(
        <I18nProvider>
          <LanguageSelector variant="full" />
        </I18nProvider>,
      );
      expect(selectorHtml).toContain("English");
      expect(selectorHtml).not.toMatch(/[\u{1F1E6}-\u{1F1FF}]{2}/u);
    });

    it("sanitizes corrupted or partial localStorage state safely without crashing", () => {
      expect(sanitizeLoadedState(null, initialState)).toEqual(initialState);
      expect(sanitizeLoadedState(["bad"], initialState)).toEqual(initialState);
      expect(sanitizeLoadedState("corrupted", initialState)).toEqual(initialState);

      const partialCorrupt = {
        mode: "work",
        bookings: "not-an-array",
        applications: null,
        plans: 123,
        verification: "invalid",
      };
      const sanitized = sanitizeLoadedState(partialCorrupt, initialState);
      expect(sanitized.mode).toBe("work");
      expect(sanitized.bookings).toEqual(initialState.bookings);
      expect(sanitized.applications).toEqual(initialState.applications);
      expect(sanitized.plans).toEqual(initialState.plans);
      expect(sanitized.verification).toEqual(initialState.verification);
    });

    it("compares raw unrounded distances in filterWorkers so workers just outside radius are excluded", () => {
      const origin = { lat: 7.08, lng: 125.61 };
      const baseWorker = WORKERS[0]!;
      const insideWorker: Worker = {
        ...baseWorker,
        id: "w-inside-edge",
        name: "Inside Edge Worker",
        lat: origin.lat + 0.0088, // ~0.98 km (rounds to 1.0 km)
        lng: origin.lng,
        available: true,
      };
      const outsideWorker: Worker = {
        ...baseWorker,
        id: "w-outside-edge",
        name: "Outside Edge Worker",
        lat: origin.lat + 0.0094, // ~1.045 km (rounds to 1.0 km, but > 1 km raw)
        lng: origin.lng,
        available: true,
      };

      const dIn = distanceKm(origin, insideWorker);
      const dOut = distanceKm(origin, outsideWorker);
      expect(dIn).toBeLessThan(1);
      expect(dOut).toBeGreaterThan(1);
      expect(roundKm(dOut)).toBe(1);

      const results = filterWorkers([insideWorker, outsideWorker], {
        origin,
        category: "all",
        query: "",
        radius: 1,
        availableOnly: false,
      });
      expect(results.map((w) => w.id)).toEqual(["w-inside-edge"]);
    });
  });
});
