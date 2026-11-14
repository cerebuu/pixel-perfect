import { useMemo, useState } from "react";
import { Check, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CATEGORIES, OTHER_CATEGORY, SKILL_SUGGESTIONS } from "@/lib/gaw/data";
import { useI18n } from "@/lib/gaw/i18n";
import { isPredefinedService, normalizeService, validateCustomService } from "@/lib/gaw/services";
import { cn } from "@/lib/utils";

export interface ServicePickerProps {
  id?: string;
  label?: string;
  value: string;
  onChange: (service: string, customDescription?: string) => void;
  includeAll?: boolean;
  allLabel?: string;
  extraOptions?: string[];
  allowCustom?: boolean;
  showCustomDescription?: boolean;
  customDescription?: string | undefined;
  onCustomDescriptionChange?: ((desc: string) => void) | undefined;
  error?: string | undefined;
  className?: string | undefined;
}

/**
 * Searchable Service & Skill selector supporting all 16 predefined categories,
 * "Other Services", and any custom service name (e.g., "Motorcycle Mechanic").
 */
export function ServicePicker({
  id = "service-picker",
  label = "Service Category",
  value,
  onChange,
  includeAll = false,
  allLabel = "All services",
  extraOptions = [],
  allowCustom = true,
  showCustomDescription = false,
  customDescription = "",
  onCustomDescriptionChange,
  error,
  className,
}: ServicePickerProps) {
  const baseOptions = useMemo(() => {
    const set = new Set<string>([...extraOptions, ...CATEGORIES]);
    return Array.from(set);
  }, [extraOptions]);

  const isCustomValue =
    value !== "" &&
    value !== "all" &&
    value !== OTHER_CATEGORY &&
    !baseOptions.some((c) => c.toLowerCase() === value.toLowerCase());

  const [selectMode, setSelectMode] = useState<"predefined" | "custom">(
    isCustomValue ? "custom" : "predefined",
  );
  const [searchFilter, setSearchFilter] = useState("");
  const [customText, setCustomText] = useState(isCustomValue ? value : "");
  const [customErr, setCustomErr] = useState<string | null>(null);

  const filteredOptions = useMemo(() => {
    const q = searchFilter.trim().toLowerCase();
    if (!q) return baseOptions;
    return baseOptions.filter((c) => c.toLowerCase().includes(q));
  }, [baseOptions, searchFilter]);

  const matchingSuggestions = useMemo(() => {
    const q = (customText || searchFilter).trim().toLowerCase();
    if (!q) return SKILL_SUGGESTIONS.filter((s) => !isPredefinedService(s)).slice(0, 6);
    return SKILL_SUGGESTIONS.filter((s) => s.toLowerCase().includes(q)).slice(0, 6);
  }, [customText, searchFilter]);

  const handleSelectChange = (next: string) => {
    setCustomErr(null);
    if (next === "__custom__") {
      setSelectMode("custom");
      if (customText.trim()) {
        const err = validateCustomService(customText);
        if (!err) {
          onChange(normalizeService(customText), customDescription);
        } else {
          onChange("", customDescription);
        }
      } else {
        onChange("", customDescription);
      }
      return;
    }
    setSelectMode("predefined");
    onChange(next, customDescription);
  };

  const applyCustomService = (raw = customText) => {
    const err = validateCustomService(raw);
    if (err) {
      setCustomErr(err);
      return;
    }
    setCustomErr(null);
    const clean = normalizeService(raw);
    setCustomText(clean);
    onChange(clean, customDescription);
  };

  const selectValue = selectMode === "custom" || isCustomValue ? "__custom__" : value;

  const { tx, translateCategory } = useI18n();

  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <label
          htmlFor={id}
          className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground"
        >
          {label}
        </label>
      )}

      {/* Searchable filter input + Category select */}
      <div className="space-y-2">
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            id={`${id}-search`}
            type="search"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder={tx(
              "Filter categories or type a service (e.g. Motorcycle Mechanic)…",
              "Mag-filter ng kategorya o mag-type ng serbisyo (hal. Motorcycle Mechanic)…",
              "I-filter ang kategorya o i-type ang serbisyo (pananglitan, Motorcycle Mechanic)…",
            )}
            className="h-9 pl-8 text-xs"
            aria-label={`Search ${label}`}
          />
        </div>

        <select
          id={id}
          className="field"
          value={selectValue}
          onChange={(e) => handleSelectChange(e.target.value)}
          aria-invalid={!!(error || customErr)}
          aria-describedby={error ? `${id}-error` : customErr ? `${id}-custom-error` : undefined}
        >
          {includeAll && <option value="all">{allLabel}</option>}
          {filteredOptions.map((c) => (
            <option key={c} value={c}>
              {translateCategory(c)}
            </option>
          ))}
          {includeAll && (
            <option value={OTHER_CATEGORY}>
              {tx(
                `${OTHER_CATEGORY} (All custom skills)`,
                `${OTHER_CATEGORY} (Lahat ng custom na kasanayan)`,
                `${OTHER_CATEGORY} (Tanang custom nga abilidad)`,
              )}
            </option>
          )}
          {allowCustom && (
            <option value="__custom__">
              {tx(
                "Other — Enter custom service…",
                "Iba pa — Maglagay ng custom na serbisyo…",
                "Uban pa — Isulat ang custom nga serbisyo…",
              )}
            </option>
          )}
        </select>
      </div>

      {/* Quick switch if search filter matches no predefined category */}
      {allowCustom &&
        searchFilter.trim().length >= 2 &&
        filteredOptions.length === 0 &&
        selectMode !== "custom" && (
          <div className="flex items-center justify-between gap-2 rounded-xl bg-secondary px-3 py-2 text-xs text-secondary-foreground">
            <span>
              {tx(
                `No predefined category matches “${searchFilter.trim()}”.`,
                `Walang kategoryang tumugma sa “${searchFilter.trim()}”.`,
                `Walay kategorya nga mohaom sa “${searchFilter.trim()}”.`,
              )}
            </span>
            <Button
              type="button"
              size="sm"
              variant="default"
              onClick={() => {
                setSelectMode("custom");
                setCustomText(searchFilter.trim());
                applyCustomService(searchFilter.trim());
              }}
            >
              <Plus className="size-3.5" />
              {tx("Use", "Gamitin", "Gamita")} “{normalizeService(searchFilter)}”
            </Button>
          </div>
        )}

      {/* Custom Service Input Panel */}
      {allowCustom && (selectMode === "custom" || isCustomValue) && (
        <div className="space-y-3 rounded-2xl border bg-muted/50 p-3.5">
          <div className="space-y-1.5">
            <label htmlFor={`${id}-custom`} className="block text-xs font-bold text-foreground">
              {tx(
                "Custom Service Name",
                "Pangalan ng Custom na Serbisyo",
                "Ngalan sa Custom nga Serbisyo",
              )}
            </label>
            <div className="flex gap-2">
              <Input
                id={`${id}-custom`}
                value={customText}
                onChange={(e) => {
                  const raw = e.target.value;
                  setCustomText(raw);
                  const err = validateCustomService(raw);
                  if (!err) {
                    setCustomErr(null);
                    onChange(normalizeService(raw), customDescription);
                  } else {
                    onChange("", customDescription);
                  }
                }}
                placeholder={tx(
                  "e.g. Motorcycle Mechanic, Solar Panel Installer",
                  "hal. Motorcycle Mechanic, Solar Panel Installer",
                  "pananglitan, Motorcycle Mechanic, Solar Panel Installer",
                )}
                aria-invalid={!!customErr}
                aria-describedby={
                  customErr ? `${id}-custom-error` : error ? `${id}-error` : undefined
                }
              />
              <Button type="button" size="sm" onClick={() => applyCustomService()}>
                <Check className="size-4" />
                {tx("Use", "Gamitin", "Gamita")}
              </Button>
            </div>
            {customErr && (
              <p
                id={`${id}-custom-error`}
                role="alert"
                className="text-xs font-medium text-destructive"
              >
                {customErr}
              </p>
            )}
          </div>

          {matchingSuggestions.length > 0 && (
            <div className="space-y-1">
              <p className="text-[11px] font-semibold text-muted-foreground">
                {tx(
                  "Popular custom services:",
                  "Mga sikat na custom na serbisyo:",
                  "Kasagarang custom nga serbisyo:",
                )}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {matchingSuggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => {
                      setCustomText(s);
                      applyCustomService(s);
                    }}
                    className={cn(
                      "cursor-pointer rounded-full border px-2.5 py-1 text-xs font-medium transition-[background-color,border-color,color,transform] duration-150 ease-out active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none motion-reduce:active:scale-100",
                      value.toLowerCase() === s.toLowerCase()
                        ? "border-primary bg-primary text-primary-foreground shadow-xs"
                        : "bg-card text-muted-foreground hover:border-hover-border hover:bg-hover-surface hover:text-foreground",
                    )}
                  >
                    + {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {showCustomDescription && (
            <div className="space-y-1">
              <label
                htmlFor={`${id}-custom-desc`}
                className="block text-xs font-semibold text-muted-foreground"
              >
                {tx(
                  "Optional Custom Service Notes",
                  "Opsyonal na Tala sa Custom na Serbisyo",
                  "Opsyonal nga Mubo nga Sulat sa Serbisyo",
                )}
              </label>
              <Input
                id={`${id}-custom-desc`}
                value={customDescription}
                onChange={(e) => onCustomDescriptionChange?.(e.target.value)}
                placeholder={tx(
                  "Briefly describe what this custom service covers (optional)",
                  "Maikling ilarawan kung ano ang sakop ng serbisyong ito (opsyonal)",
                  "Mubo nga ihulagway unsay sakop niining maong serbisyo (opsyonal)",
                )}
              />
            </div>
          )}
        </div>
      )}

      {error && (
        <p id={`${id}-error`} role="alert" className="text-sm font-medium text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
