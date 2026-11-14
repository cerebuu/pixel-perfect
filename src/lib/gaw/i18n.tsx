import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Check, ChevronDown, Globe } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { enPH, type TranslationDictionary, type TranslationKey } from "@/locales/en-PH";
import { filPH } from "@/locales/fil-PH";
import { cebPH } from "@/locales/ceb-PH";
import type { ApplicationStatus, BookingStatus, MyJobsTab } from "./bookings";
import type { VerifStatus } from "./verification";

export type Locale = "en-PH" | "fil-PH" | "ceb-PH";

export const LOCALE_KEY = "gaw:locale";
export const DEFAULT_LOCALE: Locale = "en-PH";

export interface LocaleOption {
  code: Locale;
  label: string;
  shortLabel: string;
  nativeName: string;
  regionNote: string;
}

export const SUPPORTED_LOCALES: readonly LocaleOption[] = [
  {
    code: "en-PH",
    label: "English",
    shortLabel: "EN",
    nativeName: "English (Philippines)",
    regionNote: "Standard Philippine English",
  },
  {
    code: "fil-PH",
    label: "Filipino",
    shortLabel: "FIL",
    nativeName: "Filipino (Tagalog)",
    regionNote: "Wikang Filipino",
  },
  {
    code: "ceb-PH",
    label: "Cebuano (Bisaya)",
    shortLabel: "CEB",
    nativeName: "Cebuano / Binisaya",
    regionNote: "Davao & Mindanao Bisaya",
  },
] as const;

export const DICTIONARIES: Record<Locale, TranslationDictionary> = {
  "en-PH": enPH,
  "fil-PH": filPH,
  "ceb-PH": cebPH,
};

export function isValidLocale(val: unknown): val is Locale {
  return val === "en-PH" || val === "fil-PH" || val === "ceb-PH";
}

export const LOCALE_BOOT_SCRIPT = `(function(){try{var k='${LOCALE_KEY}';var v=localStorage.getItem(k);var l=(v==='fil-PH'||v==='ceb-PH'||v==='en-PH')?v:'en-PH';document.documentElement.lang=l;}catch(e){document.documentElement.lang='en-PH';}})();`;

function lookupKey(dict: TranslationDictionary, key: TranslationKey): string | undefined {
  const [section, field] = key.split(".") as [keyof TranslationDictionary, string];
  const group = dict[section] as Record<string, string> | undefined;
  return group ? group[field] : undefined;
}

export function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, token: string) => {
    const val = vars[token];
    return val === undefined || val === null ? `{${token}}` : String(val);
  });
}

export function translate(
  locale: Locale,
  key: TranslationKey,
  vars?: Record<string, string | number>,
): string {
  const activeDict = DICTIONARIES[locale] ?? enPH;
  const raw = lookupKey(activeDict, key) ?? lookupKey(enPH, key) ?? key;
  return interpolate(raw, vars);
}

export function translateCategoryFor(locale: Locale, category: string): string {
  const dict = DICTIONARIES[locale] ?? enPH;
  const map = dict.categories as Record<string, string>;
  return map[category] ?? category;
}

export function getBookingStatusLabel(status: BookingStatus, locale: Locale = "en-PH"): string {
  const map: Record<BookingStatus, [string, string, string]> = {
    pending: ["Pending", "Naka-pending", "Naka-pending"],
    confirmed: ["Accepted", "Tinanggap", "Gidawat"],
    in_progress: ["In Progress", "Ginagawa Na", "Ginahimo Na"],
    awaiting_confirmation: [
      "Awaiting Confirmation",
      "Naghihintay ng Kumpirmasyon",
      "Naghulat sa Kumpirmasyon",
    ],
    completed: ["Completed", "Tapos Na", "Nahuman Na"],
    declined: ["Declined", "Tinanggihan", "Gibalibaran"],
    cancelled: ["Cancelled", "Kinansela", "Gikansela"],
  };
  const entry = map[status];
  if (!entry) return status;
  return locale === "fil-PH" ? entry[1] : locale === "ceb-PH" ? entry[2] : entry[0];
}

export function getApplicationStatusLabel(
  status: ApplicationStatus,
  locale: Locale = "en-PH",
): string {
  const map: Record<ApplicationStatus, [string, string, string]> = {
    submitted: ["Submitted", "Naipasa", "Na-submit"],
    withdrawn: ["Withdrawn", "Binawi", "Gibawi"],
    hired: ["Hired", "Kinuha Na", "Gidawat Na"],
  };
  const entry = map[status];
  if (!entry) return status;
  return locale === "fil-PH" ? entry[1] : locale === "ceb-PH" ? entry[2] : entry[0];
}

export function getVerifStatusLabel(status: VerifStatus, locale: Locale = "en-PH"): string {
  const map: Record<VerifStatus, [string, string, string]> = {
    not_submitted: ["Not submitted", "Hindi pa naipasa", "Wala pa ma-submit"],
    unverified: ["Unverified", "Hindi pa beripikado", "Wala pa ma-verify"],
    pending: ["Pending review", "Sinusuri pa", "Gisusi pa"],
    verified: ["Verified", "Beripikado", "Beripikado"],
    rejected: ["Rejected", "Tinanggihan", "Gibalibaran"],
    resubmission_required: [
      "Resubmission required",
      "Kailangang ipasa muli",
      "Kinahanglan i-submit pag-usab",
    ],
  };
  const entry = map[status];
  if (!entry) return status;
  return locale === "fil-PH" ? entry[1] : locale === "ceb-PH" ? entry[2] : entry[0];
}

export function getVerifNextText(status: VerifStatus, locale: Locale = "en-PH"): string {
  const map: Record<VerifStatus, [string, string, string]> = {
    not_submitted: [
      "Choose an ID type and upload a clear photo.",
      "Pumili ng uri ng ID at mag-upload ng malinaw na larawan.",
      "Pagpili og klase sa ID ug pag-upload og klaro nga litrato.",
    ],
    unverified: [
      "Choose an ID type and upload a clear photo.",
      "Pumili ng uri ng ID at mag-upload ng malinaw na larawan.",
      "Pagpili og klase sa ID ug pag-upload og klaro nga litrato.",
    ],
    pending: [
      "Nothing to do. We'll review it (simulated in this demo).",
      "Maghintay lang. Susuriin namin ito (simulated sa demo na ito).",
      "Paghulat lang. Susihon namo kini (gi-simulate niining demo).",
    ],
    verified: [
      "You're verified. A badge now shows on your profile.",
      "Beripikado ka na. May badge na sa profile mo.",
      "Beripikado na ka. Naa nay badge sa imong profile.",
    ],
    rejected: [
      "Upload a clearer photo of the same ID, or use a different ID.",
      "Mag-upload ng mas malinaw na larawan ng ID o gumamit ng ibang ID.",
      "Pag-upload og mas klaro nga litrato sa ID o gamita ang laing ID.",
    ],
    resubmission_required: [
      "Please upload a clearer, unobstructed photo of your ID to complete verification.",
      "Mag-upload ng mas malinaw at buong larawan ng ID para makumpleto ang beripikasyon.",
      "Palihug pag-upload og mas klaro ug tibuok nga litrato sa imong ID aron mahuman ang beripikasyon.",
    ],
  };
  const entry = map[status];
  if (!entry) return "";
  return locale === "fil-PH" ? entry[1] : locale === "ceb-PH" ? entry[2] : entry[0];
}

export function getMyJobsTabLabel(tab: MyJobsTab, locale: Locale = "en-PH"): string {
  const map: Record<MyJobsTab, [string, string, string]> = {
    applications: ["Applications", "Aplikasyon", "Aplikasyon"],
    pending: ["Pending Requests", "Naka-pending", "Naka-pending"],
    upcoming: ["Upcoming", "Darating", "Umaabot"],
    in_progress: ["In Progress", "Ginagawa", "Ginahimo"],
    completed: ["Completed", "Tapos Na", "Nahuman Na"],
    cancelled: ["Cancelled", "Kinansela", "Gikansela"],
  };
  const entry = map[tab];
  if (!entry) return tab;
  return locale === "fil-PH" ? entry[1] : locale === "ceb-PH" ? entry[2] : entry[0];
}

interface I18nValue {
  locale: Locale;
  localeOption: LocaleOption;
  setLocale: (next: Locale) => void;
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string;
  tx: (en: string, fil: string, ceb: string, vars?: Record<string, string | number>) => string;
  translateCategory: (category: string) => string;
  statusLabel: (status: BookingStatus) => string;
  appStatusLabel: (status: ApplicationStatus) => string;
  verifLabel: (status: VerifStatus) => string;
  verifNext: (status: VerifStatus) => string;
  myJobsTabLabel: (tab: MyJobsTab) => string;
  formatNumber: (n: number) => string;
}

const I18nContext = createContext<I18nValue | null>(null);

function readInitialLocale(): Locale {
  if (typeof window === "undefined") return DEFAULT_LOCALE;
  try {
    const saved = window.localStorage.getItem(LOCALE_KEY);
    if (isValidLocale(saved)) return saved;
  } catch {
    /* ignore storage issues */
  }
  return DEFAULT_LOCALE;
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(readInitialLocale);

  useEffect(() => {
    const stored = readInitialLocale();
    setLocaleState(stored);
    if (typeof document !== "undefined") {
      document.documentElement.lang = stored;
    }
  }, []);

  const setLocale = useCallback((next: Locale) => {
    if (!isValidLocale(next)) return;
    setLocaleState(next);
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(LOCALE_KEY, next);
      } catch {
        /* ignore */
      }
    }
    if (typeof document !== "undefined") {
      document.documentElement.lang = next;
    }
  }, []);

  const value = useMemo<I18nValue>(() => {
    const localeOption = SUPPORTED_LOCALES.find((o) => o.code === locale) ?? SUPPORTED_LOCALES[0]!;
    return {
      locale,
      localeOption,
      setLocale,
      t: (key, vars) => translate(locale, key, vars),
      tx: (en, fil, ceb, vars) => {
        const picked = locale === "fil-PH" ? fil : locale === "ceb-PH" ? ceb : en;
        return interpolate(picked, vars);
      },
      translateCategory: (cat) => translateCategoryFor(locale, cat),
      statusLabel: (s) => getBookingStatusLabel(s, locale),
      appStatusLabel: (s) => getApplicationStatusLabel(s, locale),
      verifLabel: (s) => getVerifStatusLabel(s, locale),
      verifNext: (s) => getVerifNextText(s, locale),
      myJobsTabLabel: (tab) => getMyJobsTabLabel(tab, locale),
      formatNumber: (n) => {
        try {
          return new Intl.NumberFormat(locale).format(n);
        } catch {
          return n.toLocaleString("en-PH");
        }
      },
    };
  }, [locale, setLocale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

const FALLBACK_I18N: I18nValue = {
  locale: DEFAULT_LOCALE,
  localeOption: SUPPORTED_LOCALES[0]!,
  setLocale: () => {},
  t: (key, vars) => translate(DEFAULT_LOCALE, key, vars),
  tx: (en, _fil, _ceb, vars) => interpolate(en, vars),
  translateCategory: (cat) => translateCategoryFor(DEFAULT_LOCALE, cat),
  statusLabel: (s) => getBookingStatusLabel(s, DEFAULT_LOCALE),
  appStatusLabel: (s) => getApplicationStatusLabel(s, DEFAULT_LOCALE),
  verifLabel: (s) => getVerifStatusLabel(s, DEFAULT_LOCALE),
  verifNext: (s) => getVerifNextText(s, DEFAULT_LOCALE),
  myJobsTabLabel: (tab) => getMyJobsTabLabel(tab, DEFAULT_LOCALE),
  formatNumber: (n) => n.toLocaleString("en-PH"),
};

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  return ctx ?? FALLBACK_I18N;
}

export function LanguageSelector({
  variant = "compact",
  className,
}: {
  variant?: "compact" | "full" | "onDeep";
  className?: string;
}) {
  const { locale, localeOption, setLocale, t } = useI18n();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={t("common.activeLanguage", { language: localeOption.label })}
          className={cn(
            "group inline-flex items-center gap-1.5 rounded-full border font-sans text-xs font-semibold transition-all duration-200 ease-out hover:-translate-y-0.5 active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            variant === "onDeep"
              ? "h-9 border-primary-foreground/20 bg-primary-foreground/10 px-3 text-primary-foreground hover:border-primary-foreground/35 hover:bg-primary-foreground/15"
              : variant === "full"
                ? "h-9 border-border bg-card px-3.5 text-foreground shadow-2xs hover:border-primary/40 hover:bg-secondary/70"
                : "h-9 border-border bg-secondary/60 px-2.5 sm:px-3 text-foreground hover:border-primary/35 hover:bg-secondary",
            className,
          )}
        >
          <Globe className="h-3.5 w-3.5 shrink-0 text-primary transition-transform duration-200 group-hover:scale-105" />
          <span className="truncate">
            {variant === "compact" ? (
              <>
                <span className="sm:hidden">{localeOption.shortLabel}</span>
                <span className="hidden sm:inline">{localeOption.label}</span>
              </>
            ) : (
              localeOption.label
            )}
          </span>
          <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-70 transition-transform duration-200 group-data-[state=open]:rotate-180" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 rounded-2xl p-1.5 shadow-lg">
        <DropdownMenuLabel className="px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {t("common.selectLanguage")}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {SUPPORTED_LOCALES.map((opt) => {
          const active = opt.code === locale;
          return (
            <DropdownMenuItem
              key={opt.code}
              onClick={() => setLocale(opt.code)}
              className={cn(
                "group flex cursor-pointer items-center justify-between gap-2 rounded-xl px-2.5 py-2 text-sm transition-all duration-150",
                active
                  ? "bg-accent/80 font-semibold text-accent-foreground"
                  : "text-foreground hover:bg-accent/60",
              )}
            >
              <div className="min-w-0">
                <div className="truncate text-sm leading-tight">{opt.label}</div>
                <div className="truncate text-[11px] text-muted-foreground">{opt.regionNote}</div>
              </div>
              {active && <Check className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
