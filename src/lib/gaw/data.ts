// Seeded, fictional Davao City data for the GAW demo. All people and businesses are invented.
import { calculateMinimumWageFloor, estimateGigPrice, type UrgencyLevel } from "./domain";

/** The six original services, shown as shortcuts on the Hiring home. */
export const FEATURED_CATEGORIES = [
  "Plumbing",
  "Electrical",
  "Carpentry",
  "Cleaning",
  "Painting",
  "Handyman",
] as const;

/** Predefined services. Users can always pick "Other Services" and type their own. */
export const CATEGORIES = [
  ...FEATURED_CATEGORIES,
  "Gardening",
  "Appliance Repair",
  "Air Conditioning Services",
  "Welding",
  "Furniture Assembly",
  "Moving Assistance",
  "Computer Repair",
  "Tutoring",
  "Photography",
  "General Labor",
] as const;
export const OTHER_CATEGORY = "Other Services";
/** A service name: one of CATEGORIES or any custom name a user typed. */
export type Category = string;

/** Extra suggestions for worker skills, on top of CATEGORIES. Custom skills are still allowed. */
export const SKILL_SUGGESTIONS = [
  ...CATEGORIES,
  "Graphic Design",
  "Graphic Designer",
  "Computer Technician",
  "Motorcycle Repair",
  "Motorcycle Mechanic",
  "Tutor",
  "Laundry & Ironing",
  "Roofing",
  "Masonry",
  "Tile Work",
  "Pest Control",
  "Event Setup",
  "Cooking & Catering",
];

export const RADIUS_OPTIONS = [1, 3, 5, 10] as const;
export type Radius = (typeof RADIUS_OPTIONS)[number];

export interface Barangay {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

// Approximate area centers, used only to simulate distances in the demo.
export const BARANGAYS: Barangay[] = [
  { id: "poblacion", name: "Poblacion", lat: 7.0707, lng: 125.6087 },
  { id: "bajada", name: "Bajada", lat: 7.085, lng: 125.61 },
  { id: "buhangin", name: "Buhangin", lat: 7.108, lng: 125.615 },
  { id: "lanang", name: "Lanang", lat: 7.105, lng: 125.64 },
  { id: "matina", name: "Matina", lat: 7.056, lng: 125.588 },
  { id: "talomo", name: "Talomo", lat: 7.04, lng: 125.57 },
  { id: "mintal", name: "Mintal", lat: 7.091, lng: 125.5 },
  { id: "toril", name: "Toril", lat: 7.018, lng: 125.498 },
];

export function barangayById(id: string): Barangay | undefined {
  return BARANGAYS.find((b) => b.id === id);
}

export function barangayName(id: string) {
  return barangayById(id)?.name ?? id;
}

export interface Review {
  author: string;
  rating: number;
  text: string;
  when: string;
}

export interface Worker {
  id: string;
  name: string;
  initials: string;
  skill: Category;
  skills: string[];
  barangayId: string;
  lat: number;
  lng: number;
  /** Hourly rate in PHP. null = Request Quote. */
  rate: number | null;
  available: boolean;
  rating: number;
  jobsDone: number;
  years: number;
  bio: string;
  hours: string;
  reviews: Review[];
  portfolio: string[];
}

export const WORKERS: Worker[] = [
  {
    id: "w-ramon",
    name: "Ramon Dizon",
    initials: "RD",
    skill: "Plumbing",
    skills: ["Leak repair", "Pipe installation", "Water heater setup"],
    barangayId: "bajada",
    lat: 7.0862,
    lng: 125.6085,
    rate: 350,
    available: true,
    rating: 4.9,
    jobsDone: 128,
    years: 11,
    bio: "Licensed plumber serving north Davao. Fast response for leaks, clogged drains, and new bathroom fixtures. I bring my own tools and clean up after.",
    hours: "Mon–Sat, 7:00 AM – 6:00 PM",
    reviews: [
      {
        author: "Liza M.",
        rating: 5,
        text: "Fixed our kitchen leak within an hour. Very neat work.",
        when: "2 weeks ago",
      },
      {
        author: "Paolo R.",
        rating: 5,
        text: "Honest pricing and explained everything clearly.",
        when: "1 month ago",
      },
    ],
    portfolio: ["Bathroom repiping", "Kitchen sink install", "Water heater setup"],
  },
  {
    id: "w-joy",
    name: "Joy Villanueva",
    initials: "JV",
    skill: "Cleaning",
    skills: ["Deep cleaning", "Move-out cleaning", "Office cleaning"],
    barangayId: "matina",
    lat: 7.0575,
    lng: 125.5902,
    rate: 250,
    available: true,
    rating: 4.8,
    jobsDone: 214,
    years: 6,
    bio: "Detail-focused home and office cleaning. Eco-friendly supplies available on request. Small team of two for larger homes.",
    hours: "Daily, 8:00 AM – 5:00 PM",
    reviews: [
      {
        author: "Grace T.",
        rating: 5,
        text: "Our condo has never looked this clean!",
        when: "1 week ago",
      },
      {
        author: "Ben A.",
        rating: 4,
        text: "Thorough and on time. Will book again.",
        when: "3 weeks ago",
      },
    ],
    portfolio: ["Condo deep clean", "Office turnover", "Post-renovation clean"],
  },
  {
    id: "w-arnel",
    name: "Arnel Bautista",
    initials: "AB",
    skill: "Electrical",
    skills: ["Wiring", "Outlet & switch repair", "Lighting installation"],
    barangayId: "buhangin",
    lat: 7.1065,
    lng: 125.6172,
    rate: 450,
    available: false,
    rating: 4.9,
    jobsDone: 96,
    years: 14,
    bio: "Electrician with 14 years of residential and small-business experience. Safety-first, with clear quotes before work starts.",
    hours: "Mon–Fri, 8:00 AM – 5:00 PM",
    reviews: [
      {
        author: "Carmela D.",
        rating: 5,
        text: "Rewired our sari-sari store safely and quickly.",
        when: "5 days ago",
      },
      {
        author: "Jun P.",
        rating: 5,
        text: "Very professional and knowledgeable.",
        when: "2 months ago",
      },
    ],
    portfolio: ["Store rewiring", "LED lighting upgrade", "Breaker panel repair"],
  },
  {
    id: "w-lito",
    name: "Lito Mangubat",
    initials: "LM",
    skill: "Carpentry",
    skills: ["Cabinet making", "Door & window repair", "Furniture"],
    barangayId: "toril",
    lat: 7.0195,
    lng: 125.4995,
    rate: null,
    available: true,
    rating: 4.7,
    jobsDone: 73,
    years: 18,
    bio: "Custom cabinets, shelves, and furniture repair using local hardwood. Quotes depend on materials, so request one and I'll visit.",
    hours: "Mon–Sat, 7:00 AM – 4:00 PM",
    reviews: [
      {
        author: "Nena S.",
        rating: 5,
        text: "Beautiful kitchen cabinets, solid build.",
        when: "3 weeks ago",
      },
      {
        author: "Marco L.",
        rating: 4,
        text: "Great craftsmanship, slightly delayed due to rain.",
        when: "2 months ago",
      },
    ],
    portfolio: ["Narra kitchen cabinets", "Built-in bookshelf", "Wooden gate repair"],
  },
  {
    id: "w-cherry",
    name: "Cherry Abellana",
    initials: "CA",
    skill: "Painting",
    skills: ["Interior painting", "Exterior painting", "Wall repair"],
    barangayId: "lanang",
    lat: 7.1035,
    lng: 125.6385,
    rate: 300,
    available: true,
    rating: 4.8,
    jobsDone: 88,
    years: 8,
    bio: "Interior and exterior painting with careful prep work: masking, patching, and two-coat finish. Color advice included.",
    hours: "Mon–Sat, 8:00 AM – 5:00 PM",
    reviews: [
      {
        author: "Rico V.",
        rating: 5,
        text: "Clean lines and zero mess. Highly recommended.",
        when: "1 week ago",
      },
      {
        author: "Ana C.",
        rating: 5,
        text: "Helped us pick the perfect color for our café.",
        when: "1 month ago",
      },
    ],
    portfolio: ["Café accent wall", "Two-storey exterior", "Bedroom refresh"],
  },
  {
    id: "w-dodong",
    name: "Dodong Saldaña",
    initials: "DS",
    skill: "Handyman",
    skills: ["General repairs", "Furniture assembly", "Gutter cleaning"],
    barangayId: "poblacion",
    lat: 7.0718,
    lng: 125.6102,
    rate: 280,
    available: true,
    rating: 4.6,
    jobsDone: 159,
    years: 9,
    bio: "Your go-to for the small jobs that pile up: shelves, fixtures, leaky faucets, and furniture assembly. Same-day visits when available.",
    hours: "Daily, 7:00 AM – 7:00 PM",
    reviews: [
      {
        author: "Tess G.",
        rating: 5,
        text: "Assembled all our furniture in one afternoon.",
        when: "4 days ago",
      },
      { author: "Kim B.", rating: 4, text: "Friendly and reliable.", when: "3 weeks ago" },
    ],
    portfolio: ["Wardrobe assembly", "Shelf mounting", "Screen door repair"],
  },
  {
    id: "w-marites",
    name: "Marites Cabrera",
    initials: "MC",
    skill: "Cleaning",
    skills: ["Laundry & ironing", "Regular housekeeping", "Aircon cleaning"],
    barangayId: "buhangin",
    lat: 7.1102,
    lng: 125.6128,
    rate: 220,
    available: false,
    rating: 4.7,
    jobsDone: 141,
    years: 7,
    bio: "Weekly housekeeping, laundry, and aircon filter cleaning. Trusted by many families around Buhangin.",
    hours: "Tue–Sun, 8:00 AM – 4:00 PM",
    reviews: [
      {
        author: "Fe R.",
        rating: 5,
        text: "Very trustworthy, our go-to every Saturday.",
        when: "2 weeks ago",
      },
      { author: "Leo M.", rating: 4, text: "Good work and polite.", when: "1 month ago" },
    ],
    portfolio: ["Weekly housekeeping", "Aircon filter cleaning", "Laundry service"],
  },
  {
    id: "w-jerome",
    name: "Jerome Alcantara",
    initials: "JA",
    skill: "Electrical",
    skills: ["Solar panel setup", "CCTV installation", "Wiring"],
    barangayId: "matina",
    lat: 7.0548,
    lng: 125.5861,
    rate: null,
    available: true,
    rating: 4.8,
    jobsDone: 52,
    years: 5,
    bio: "Young electrician specializing in solar setups and CCTV for homes and small shops. Free assessment for solar quotes.",
    hours: "Mon–Sat, 8:00 AM – 6:00 PM",
    reviews: [
      {
        author: "Dennis Y.",
        rating: 5,
        text: "Solar setup has cut our bill in half.",
        when: "1 month ago",
      },
      {
        author: "Joan F.",
        rating: 5,
        text: "Clean CCTV install, explained the app well.",
        when: "2 months ago",
      },
    ],
    portfolio: ["Rooftop solar kit", "Shop CCTV", "Outdoor lighting"],
  },
  {
    id: "w-noel",
    name: "Noel Ybañez",
    initials: "NY",
    skill: "Plumbing",
    skills: ["Drain unclogging", "Septic concerns", "Faucet replacement"],
    barangayId: "mintal",
    lat: 7.0925,
    lng: 125.5018,
    rate: 320,
    available: true,
    rating: 4.5,
    jobsDone: 64,
    years: 10,
    bio: "Serving Mintal, Tugbok, and nearby areas. Drain and faucet problems fixed with clear upfront pricing.",
    hours: "Mon–Sat, 7:00 AM – 5:00 PM",
    reviews: [
      {
        author: "Rowena P.",
        rating: 5,
        text: "Came quickly even in the rain.",
        when: "1 week ago",
      },
      {
        author: "Allan C.",
        rating: 4,
        text: "Solved our drain problem for good.",
        when: "1 month ago",
      },
    ],
    portfolio: ["Drain line clearing", "Faucet replacement", "Outdoor tap install"],
  },
  {
    id: "w-bong",
    name: "Bong Esteban",
    initials: "BE",
    skill: "Carpentry",
    skills: ["Roof repair", "Ceiling installation", "Deck building"],
    barangayId: "talomo",
    lat: 7.0412,
    lng: 125.5725,
    rate: 380,
    available: true,
    rating: 4.7,
    jobsDone: 81,
    years: 12,
    bio: "Roofing, ceilings, and outdoor decks. Rainy-season leak repairs are my specialty.",
    hours: "Mon–Sat, 7:00 AM – 5:00 PM",
    reviews: [
      {
        author: "Sheila O.",
        rating: 5,
        text: "No more roof leaks this rainy season!",
        when: "3 weeks ago",
      },
      { author: "Rey D.", rating: 4, text: "Solid work on our ceiling.", when: "2 months ago" },
    ],
    portfolio: ["Roof leak repair", "Gypsum ceiling", "Garden deck"],
  },
  {
    id: "w-lorna",
    name: "Lorna Pacquiao",
    initials: "LP",
    skill: "Painting",
    skills: ["Gate & grill painting", "Waterproofing", "Interior painting"],
    barangayId: "toril",
    lat: 7.0168,
    lng: 125.4962,
    rate: 270,
    available: false,
    rating: 4.6,
    jobsDone: 47,
    years: 6,
    bio: "Gates, grills, and waterproof coatings that last through Davao's rainy months.",
    hours: "Mon–Fri, 8:00 AM – 5:00 PM",
    reviews: [
      { author: "Edwin T.", rating: 5, text: "Our gate looks brand new.", when: "2 weeks ago" },
      { author: "Mylene A.", rating: 4, text: "Good waterproofing job.", when: "2 months ago" },
    ],
    portfolio: ["Steel gate repaint", "Roof waterproofing", "Living room repaint"],
  },
  {
    id: "w-kiko",
    name: "Kiko Larrazabal",
    initials: "KL",
    skill: "Handyman",
    skills: ["TV mounting", "Curtain rods", "Minor plumbing"],
    barangayId: "lanang",
    lat: 7.1068,
    lng: 125.6421,
    rate: 300,
    available: true,
    rating: 4.8,
    jobsDone: 110,
    years: 7,
    bio: "Mounting, hanging, fixing, and assembling — tidy work for condos and homes around Lanang and Damosa.",
    hours: "Daily, 9:00 AM – 7:00 PM",
    reviews: [
      {
        author: "Bianca L.",
        rating: 5,
        text: "Mounted our TV perfectly level.",
        when: "6 days ago",
      },
      { author: "Oscar N.", rating: 5, text: "Quick and courteous.", when: "1 month ago" },
    ],
    portfolio: ["TV wall mount", "Curtain rod install", "Condo fixture swap"],
  },
  {
    id: "w-edgar",
    name: "Edgar Lumapas",
    initials: "EL",
    skill: "Motorcycle Repair",
    skills: ["Motorcycle Mechanic", "Carburetor tune-up", "Brake repair", "Oil change"],
    barangayId: "buhangin",
    lat: 7.1041,
    lng: 125.6201,
    rate: 300,
    available: true,
    rating: 4.8,
    jobsDone: 67,
    years: 9,
    bio: "Home-service motorcycle mechanic for scooters and underbones. I come to you with tools and common parts.",
    hours: "Mon–Sat, 8:00 AM – 6:00 PM",
    reviews: [
      {
        author: "Jomar T.",
        rating: 5,
        text: "Fixed my XRM right in front of the house.",
        when: "1 week ago",
      },
      {
        author: "Aileen V.",
        rating: 4,
        text: "Fair price, explained what was wrong.",
        when: "1 month ago",
      },
    ],
    portfolio: ["Scooter tune-up", "Brake pad swap", "Chain & sprocket"],
  },
  {
    id: "w-rhea",
    name: "Rhea Montemayor",
    initials: "RM",
    skill: "Tutoring",
    skills: ["Math", "Science", "Reading for kids"],
    barangayId: "matina",
    lat: 7.0591,
    lng: 125.5934,
    rate: 300,
    available: true,
    rating: 4.9,
    jobsDone: 112,
    years: 4,
    bio: "Licensed teacher offering home tutoring for Grades 1–10. Patient, structured sessions with progress notes for parents.",
    hours: "Mon–Fri, 3:00 PM – 8:00 PM",
    reviews: [
      {
        author: "Mylene F.",
        rating: 5,
        text: "My son's math grade went up in one quarter.",
        when: "2 weeks ago",
      },
      { author: "Rodel S.", rating: 5, text: "Very patient and organized.", when: "1 month ago" },
    ],
    portfolio: ["Grade 6 math review", "Reading program", "Science fair coaching"],
  },
  {
    id: "w-ken",
    name: "Ken Sarmiento",
    initials: "KS",
    skill: "Air Conditioning Services",
    skills: ["Aircon cleaning", "Freon recharge", "Split-type installation"],
    barangayId: "lanang",
    lat: 7.1012,
    lng: 125.6342,
    rate: 400,
    available: false,
    rating: 4.7,
    jobsDone: 93,
    years: 7,
    bio: "Window and split-type aircon cleaning, repair, and installation for homes and small offices.",
    hours: "Daily, 8:00 AM – 5:00 PM",
    reviews: [
      {
        author: "Lyn P.",
        rating: 5,
        text: "Our aircon is cold again, and he cleaned up after.",
        when: "5 days ago",
      },
      { author: "Caloy B.", rating: 4, text: "On time and professional.", when: "3 weeks ago" },
    ],
    portfolio: ["Split-type install", "Window-type cleaning", "Office aircon PMS"],
  },
  {
    id: "w-pacita",
    name: "Pacita Dagohoy",
    initials: "PD",
    skill: "Gardening",
    skills: ["Lawn mowing", "Plant care", "Landscaping"],
    barangayId: "talomo",
    lat: 7.0438,
    lng: 125.5761,
    rate: 250,
    available: true,
    rating: 4.6,
    jobsDone: 58,
    years: 10,
    bio: "Garden upkeep, trimming, and small landscaping projects. I love working with local orchids and ornamentals.",
    hours: "Tue–Sun, 6:00 AM – 2:00 PM",
    reviews: [
      {
        author: "Vilma Q.",
        rating: 5,
        text: "Our front yard looks amazing now.",
        when: "2 weeks ago",
      },
      {
        author: "Toto E.",
        rating: 4,
        text: "Hardworking and careful with plants.",
        when: "1 month ago",
      },
    ],
    portfolio: ["Front yard makeover", "Orchid corner", "Hedge trimming"],
  },
];

export interface Job {
  id: string;
  title: string;
  category: Category;
  barangayId: string;
  landmark: string;
  lat: number;
  lng: number;
  poster: string;
  budget: string;
  /** Numeric fixed/midpoint PHP estimate; null when poster asks for a quote. */
  budgetNum: number | null;
  estimatedHours: number;
  minimumRequiredPhp: number;
  aiRecommendedPhp: number;
  posted: string;
  schedule: string;
  description: string;
  urgent?: boolean;
  isCustom?: boolean;
  createdAt?: number;
}

type JobSeedInput = Omit<Job, "minimumRequiredPhp" | "aiRecommendedPhp">;

/** Computes benchmark floor and deterministic fair-pay estimate consistently for every job record. */
export function buildEnrichedJob(seed: JobSeedInput): Job {
  const urgency: UrgencyLevel = seed.urgent ? "urgent" : "standard";
  const floor = calculateMinimumWageFloor(seed.estimatedHours);
  const pricing = estimateGigPrice({
    category: seed.category,
    estimatedHours: seed.estimatedHours,
    urgency,
    requiredSkills: [],
    title: seed.title,
    description: seed.description,
    barangay: seed.barangayId,
  });
  return {
    ...seed,
    minimumRequiredPhp: floor.minimumRequiredPhp,
    aiRecommendedPhp: pricing.recommendedPhp,
  };
}

export const JOBS: Job[] = [
  buildEnrichedJob({
    id: "j-9",
    title: "Tune up motorcycle carburetor",
    category: "Motorcycle Repair",
    barangayId: "buhangin",
    landmark: "Near NCCC Buhangin",
    lat: 7.1102,
    lng: 125.6168,
    poster: "Jomar Tan",
    budget: "₱700",
    budgetNum: 700,
    estimatedHours: 3,
    posted: "1h ago",
    schedule: "This week",
    description:
      "Honda XRM idles roughly and stalls at stoplights. Needs carburetor cleaning and tune-up.",
  }),
  buildEnrichedJob({
    id: "j-10",
    title: "Math tutor for Grade 8 student",
    category: "Tutoring",
    barangayId: "matina",
    landmark: "Near Matina Town Square",
    lat: 7.0584,
    lng: 125.5912,
    poster: "The Fernandez Family",
    budget: "₱350 / session",
    budgetNum: 350,
    estimatedHours: 2,
    posted: "4h ago",
    schedule: "Weekday evenings",
    description: "Two sessions a week to help with algebra homework and quarterly exam review.",
  }),
  buildEnrichedJob({
    id: "j-1",
    title: "Fix leaking bathroom faucet",
    category: "Plumbing",
    barangayId: "matina",
    landmark: "Matina Crossing (near SM City)",
    lat: 7.0538,
    lng: 125.5861,
    poster: "Elena Ramos",
    budget: "₱800 – ₱1,200",
    budgetNum: 1000,
    estimatedHours: 2.5,
    posted: "2h ago",
    schedule: "This week",
    description:
      "Bathroom faucet drips constantly and the handle is loose. May need a cartridge replacement.",
    urgent: true,
  }),
  buildEnrichedJob({
    id: "j-2",
    title: "Repaint small café interior",
    category: "Painting",
    barangayId: "poblacion",
    landmark: "Near Bangkerohan Public Market",
    lat: 7.0689,
    lng: 125.6054,
    poster: "Kapehan sa Bangkerohan",
    budget: "₱6,000 – ₱9,000",
    budgetNum: 7500,
    estimatedHours: 16,
    posted: "5h ago",
    schedule: "Next weekend",
    description: "About 40 sqm dining area. Paint will be provided; need prep and two coats.",
  }),
  buildEnrichedJob({
    id: "j-3",
    title: "Install 6 LED ceiling lights",
    category: "Electrical",
    barangayId: "buhangin",
    landmark: "Milan Junction, Buhangin",
    lat: 7.1065,
    lng: 125.6129,
    poster: "Mark Ocampo",
    budget: "₱1,500",
    budgetNum: 1500,
    estimatedHours: 4,
    posted: "1d ago",
    schedule: "Flexible",
    description: "Replace old fluorescent fixtures with LED panels. Fixtures already purchased.",
  }),
  buildEnrichedJob({
    id: "j-4",
    title: "Deep clean 2-bedroom condo",
    category: "Cleaning",
    barangayId: "lanang",
    landmark: "Near SM Lanang Premier",
    lat: 7.1016,
    lng: 125.6368,
    poster: "Sofia Lim",
    budget: "₱2,500",
    budgetNum: 2500,
    estimatedHours: 6,
    posted: "3h ago",
    schedule: "Saturday",
    description: "Move-in cleaning for a 2BR unit, including kitchen and two bathrooms.",
    urgent: true,
  }),
  buildEnrichedJob({
    id: "j-5",
    title: "Build wall shelves for sari-sari store",
    category: "Carpentry",
    barangayId: "toril",
    landmark: "Near Toril Public Market",
    lat: 7.0195,
    lng: 125.5008,
    poster: "Aling Nora's Store",
    budget: "Request quote",
    budgetNum: null,
    estimatedHours: 6,
    posted: "1d ago",
    schedule: "Within 2 weeks",
    description: "Three sturdy wooden shelves, about 2 meters wide each, for store products.",
  }),
  buildEnrichedJob({
    id: "j-6",
    title: "Assemble office furniture",
    category: "Handyman",
    barangayId: "bajada",
    landmark: "Near Abreeza Ayala Mall",
    lat: 7.0872,
    lng: 125.6119,
    poster: "BrightPath Tutorial Center",
    budget: "₱1,800",
    budgetNum: 1800,
    estimatedHours: 5,
    posted: "6h ago",
    schedule: "Tomorrow",
    description: "4 desks and 8 chairs (flat-pack). Tools available on site.",
  }),
  buildEnrichedJob({
    id: "j-7",
    title: "Unclog kitchen drain",
    category: "Plumbing",
    barangayId: "mintal",
    landmark: "Mintal Proper (near UP Mindanao)",
    lat: 7.0902,
    lng: 125.4981,
    poster: "Ricardo Uy",
    budget: "₱600",
    budgetNum: 600,
    estimatedHours: 2,
    posted: "30m ago",
    schedule: "Today",
    description: "Kitchen sink drains very slowly. Tried a plunger already.",
    urgent: true,
  }),
  buildEnrichedJob({
    id: "j-8",
    title: "Weekly housekeeping (Saturdays)",
    category: "Cleaning",
    barangayId: "talomo",
    landmark: "Ulas–Talomo Highway",
    lat: 7.0424,
    lng: 125.5735,
    poster: "The Garcia Family",
    budget: "₱700 / visit",
    budgetNum: 700,
    estimatedHours: 4,
    posted: "2d ago",
    schedule: "Recurring",
    description: "General cleaning for a 3BR house every Saturday morning.",
  }),
];

/** Fictional demo residents who send booking requests to the user's worker profile. */
export const DEMO_PERSONAS = [
  { name: "Maria Santos", initials: "MS" },
  { name: "Carlo Reyes", initials: "CR" },
  { name: "Ana Dimaculangan", initials: "AD" },
  { name: "Benjie Navarro", initials: "BN" },
  { name: "Lourdes Pido", initials: "LP" },
] as const;

export function nearestBarangay(p: { lat: number; lng: number }) {
  let best = BARANGAYS[0]!;
  let bestD = Infinity;
  for (const b of BARANGAYS) {
    const d = (b.lat - p.lat) ** 2 + (b.lng - p.lng) ** 2;
    if (d < bestD) {
      bestD = d;
      best = b;
    }
  }
  return best;
}

/** Rough center of Davao City, used to warn when a GPS fix is far from the demo area. */
export const DAVAO_CENTER = { lat: 7.0731, lng: 125.6128 };
