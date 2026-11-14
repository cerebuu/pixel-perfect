// Seeded, fictional Davao City data for the GAW demo. All people and businesses are invented.

export const CATEGORIES = [
  "Plumbing",
  "Electrical",
  "Carpentry",
  "Cleaning",
  "Painting",
  "Handyman",
] as const;
export type Category = (typeof CATEGORIES)[number];

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

export function barangayName(id: string) {
  return BARANGAYS.find((b) => b.id === id)?.name ?? id;
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
      { author: "Liza M.", rating: 5, text: "Fixed our kitchen leak within an hour. Very neat work.", when: "2 weeks ago" },
      { author: "Paolo R.", rating: 5, text: "Honest pricing and explained everything clearly.", when: "1 month ago" },
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
      { author: "Grace T.", rating: 5, text: "Our condo has never looked this clean!", when: "1 week ago" },
      { author: "Ben A.", rating: 4, text: "Thorough and on time. Will book again.", when: "3 weeks ago" },
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
      { author: "Carmela D.", rating: 5, text: "Rewired our sari-sari store safely and quickly.", when: "5 days ago" },
      { author: "Jun P.", rating: 5, text: "Very professional and knowledgeable.", when: "2 months ago" },
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
      { author: "Nena S.", rating: 5, text: "Beautiful kitchen cabinets, solid build.", when: "3 weeks ago" },
      { author: "Marco L.", rating: 4, text: "Great craftsmanship, slightly delayed due to rain.", when: "2 months ago" },
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
      { author: "Rico V.", rating: 5, text: "Clean lines and zero mess. Highly recommended.", when: "1 week ago" },
      { author: "Ana C.", rating: 5, text: "Helped us pick the perfect color for our café.", when: "1 month ago" },
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
      { author: "Tess G.", rating: 5, text: "Assembled all our furniture in one afternoon.", when: "4 days ago" },
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
      { author: "Fe R.", rating: 5, text: "Very trustworthy, our go-to every Saturday.", when: "2 weeks ago" },
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
      { author: "Dennis Y.", rating: 5, text: "Solar setup has cut our bill in half.", when: "1 month ago" },
      { author: "Joan F.", rating: 5, text: "Clean CCTV install, explained the app well.", when: "2 months ago" },
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
      { author: "Rowena P.", rating: 5, text: "Came quickly even in the rain.", when: "1 week ago" },
      { author: "Allan C.", rating: 4, text: "Solved our drain problem for good.", when: "1 month ago" },
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
      { author: "Sheila O.", rating: 5, text: "No more roof leaks this rainy season!", when: "3 weeks ago" },
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
      { author: "Bianca L.", rating: 5, text: "Mounted our TV perfectly level.", when: "6 days ago" },
      { author: "Oscar N.", rating: 5, text: "Quick and courteous.", when: "1 month ago" },
    ],
    portfolio: ["TV wall mount", "Curtain rod install", "Condo fixture swap"],
  },
];

export interface Job {
  id: string;
  title: string;
  category: Category;
  barangayId: string;
  poster: string;
  budget: string;
  posted: string;
  schedule: string;
  description: string;
  urgent?: boolean;
}

export const JOBS: Job[] = [
  {
    id: "j-1",
    title: "Fix leaking bathroom faucet",
    category: "Plumbing",
    barangayId: "matina",
    poster: "Elena Ramos",
    budget: "₱800 – ₱1,200",
    posted: "2h ago",
    schedule: "This week",
    description: "Bathroom faucet drips constantly and the handle is loose. May need a cartridge replacement.",
    urgent: true,
  },
  {
    id: "j-2",
    title: "Repaint small café interior",
    category: "Painting",
    barangayId: "poblacion",
    poster: "Kapehan sa Bangkerohan",
    budget: "₱6,000 – ₱9,000",
    posted: "5h ago",
    schedule: "Next weekend",
    description: "About 40 sqm dining area. Paint will be provided; need prep and two coats.",
  },
  {
    id: "j-3",
    title: "Install 6 LED ceiling lights",
    category: "Electrical",
    barangayId: "buhangin",
    poster: "Mark Ocampo",
    budget: "₱1,500",
    posted: "1d ago",
    schedule: "Flexible",
    description: "Replace old fluorescent fixtures with LED panels. Fixtures already purchased.",
  },
  {
    id: "j-4",
    title: "Deep clean 2-bedroom condo",
    category: "Cleaning",
    barangayId: "lanang",
    poster: "Sofia Lim",
    budget: "₱2,500",
    posted: "3h ago",
    schedule: "Saturday",
    description: "Move-in cleaning for a 2BR unit, including kitchen and two bathrooms.",
    urgent: true,
  },
  {
    id: "j-5",
    title: "Build wall shelves for sari-sari store",
    category: "Carpentry",
    barangayId: "toril",
    poster: "Aling Nora's Store",
    budget: "Request quote",
    posted: "1d ago",
    schedule: "Within 2 weeks",
    description: "Three sturdy wooden shelves, about 2 meters wide each, for store products.",
  },
  {
    id: "j-6",
    title: "Assemble office furniture",
    category: "Handyman",
    barangayId: "bajada",
    poster: "BrightPath Tutorial Center",
    budget: "₱1,800",
    posted: "6h ago",
    schedule: "Tomorrow",
    description: "4 desks and 8 chairs (flat-pack). Tools available on site.",
  },
  {
    id: "j-7",
    title: "Unclog kitchen drain",
    category: "Plumbing",
    barangayId: "mintal",
    poster: "Ricardo Uy",
    budget: "₱600",
    posted: "30m ago",
    schedule: "Today",
    description: "Kitchen sink drains very slowly. Tried a plunger already.",
    urgent: true,
  },
  {
    id: "j-8",
    title: "Weekly housekeeping (Saturdays)",
    category: "Cleaning",
    barangayId: "talomo",
    poster: "The Garcia Family",
    budget: "₱700 / visit",
    posted: "2d ago",
    schedule: "Recurring",
    description: "General cleaning for a 3BR house every Saturday morning.",
  },
];

/** Fictional demo residents who send booking requests to the user's worker profile. */
export const DEMO_PERSONAS = [
  { name: "Maria Santos", initials: "MS" },
  { name: "Carlo Reyes", initials: "CR" },
  { name: "Ana Dimaculangan", initials: "AD" },
];
