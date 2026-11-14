import { GIG_CATEGORIES, type GigCategory } from "./constants";

const UI_TO_DOMAIN_CATEGORY: Record<string, GigCategory> = {
  plumbing: "plumbing",
  electrical: "electrical",
  carpentry: "carpentry",
  cleaning: "cleaning",
  painting: "painting",
  handyman: "handyman",
  tutoring: "tutoring",
  tutor: "tutoring",
  delivery: "delivery",
  construction: "construction",
  errands: "errands",
  caregiving: "caregiving",
  agri_harvest: "agri_harvest",
  "agri harvest": "agri_harvest",
  event_staff: "event_staff",
  "event setup": "event_staff",
  gardening: "agri_harvest",
  "appliance repair": "electrical",
  "air conditioning services": "electrical",
  welding: "construction",
  roofing: "construction",
  masonry: "construction",
  "tile work": "construction",
  "furniture assembly": "carpentry",
  "moving assistance": "delivery",
  "general labor": "handyman",
  "computer repair": "electrical",
  "computer technician": "electrical",
  "motorcycle repair": "handyman",
  "motorcycle mechanic": "handyman",
  "laundry & ironing": "cleaning",
  "pest control": "cleaning",
  "cooking & catering": "event_staff",
  photography: "other",
  "graphic design": "other",
  "graphic designer": "other",
};

const DOMAIN_TO_UI_CATEGORY: Record<GigCategory, string> = {
  plumbing: "Plumbing",
  electrical: "Electrical",
  carpentry: "Carpentry",
  cleaning: "Cleaning",
  painting: "Painting",
  handyman: "Handyman",
  delivery: "Moving Assistance",
  construction: "Welding",
  tutoring: "Tutoring",
  errands: "General Labor",
  caregiving: "Other Services",
  agri_harvest: "Gardening",
  event_staff: "Other Services",
  other: "Other Services",
};

const DOMAIN_SET = new Set<string>(GIG_CATEGORIES);

/** Maps any UI category or custom skill label to one of GAW's 14 domain categories. */
export function toDomainCategory(category: string): GigCategory {
  const normalized = category.trim().toLowerCase();
  if (!normalized) return "other";
  if (DOMAIN_SET.has(normalized)) {
    return normalized as GigCategory;
  }
  const direct = UI_TO_DOMAIN_CATEGORY[normalized];
  if (direct) return direct;

  if (normalized.includes("plumb")) return "plumbing";
  if (
    normalized.includes("electr") ||
    normalized.includes("aircon") ||
    normalized.includes("air con")
  ) {
    return "electrical";
  }
  if (normalized.includes("carpen") || normalized.includes("wood")) return "carpentry";
  if (normalized.includes("clean") || normalized.includes("housekeep")) return "cleaning";
  if (normalized.includes("paint")) return "painting";
  if (normalized.includes("tutor") || normalized.includes("math")) return "tutoring";
  if (normalized.includes("deliv") || normalized.includes("mov")) return "delivery";
  if (normalized.includes("garden") || normalized.includes("agri")) return "agri_harvest";
  if (
    normalized.includes("weld") ||
    normalized.includes("mason") ||
    normalized.includes("construct")
  ) {
    return "construction";
  }
  return "other";
}

/** Converts a backend GigCategory slug to a Pixel Perfect display category when uiCategory is absent. */
export function toUiCategory(domainCategory: GigCategory, uiCategory?: string): string {
  const custom = uiCategory?.trim();
  if (custom) return custom;
  return DOMAIN_TO_UI_CATEGORY[domainCategory] ?? "Other Services";
}
