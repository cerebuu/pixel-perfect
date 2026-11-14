import { z } from "zod";
import { GIG_CATEGORIES, MAX_OFFERED_PRICE_PHP } from "./constants";
import { isWithinDavaoRegion } from "./geo";

export const UrgencySchema = z.enum(["standard", "urgent"]).default("standard");

export const DavaoCoordsSchema = z
  .object({
    lat: z.number().finite(),
    lng: z.number().finite(),
  })
  .refine((coords) => isWithinDavaoRegion(coords.lat, coords.lng), {
    message: "Coordinates must fall inside the Davao City service area.",
  });

export const PricingEstimateRequestSchema = z.object({
  category: z.string().trim().min(1).max(80),
  estimatedHours: z.number().finite().positive().max(240),
  urgency: UrgencySchema,
  requiredSkills: z.array(z.string().trim().max(60)).max(20).default([]),
  title: z.string().trim().max(160).optional(),
  description: z.string().trim().max(2000).optional(),
  barangay: z.string().trim().max(120).optional(),
});

export const CreateGigSchema = z.object({
  title: z.string().trim().min(3).max(160),
  description: z.string().trim().min(3).max(2000),
  category: z.string().trim().min(1).max(80),
  estimatedHours: z.number().finite().positive().max(240),
  offeredPricePhp: z.number().finite().nonnegative().max(MAX_OFFERED_PRICE_PHP).nullable(),
  urgency: UrgencySchema,
  requiredSkills: z.array(z.string().trim().max(60)).max(20).default([]),
  barangayId: z.string().trim().min(1).max(120),
  landmark: z.string().trim().max(140).default(""),
  schedule: z.string().trim().min(1).max(120),
  lat: z.number().finite(),
  lng: z.number().finite(),
});

export const NearbyGigsQuerySchema = z.object({
  lat: z.coerce.number().finite(),
  lng: z.coerce.number().finite(),
  radiusKm: z.coerce.number().finite().positive().max(100).default(10),
  category: z.string().trim().max(80).optional(),
  minPayPhp: z.coerce.number().finite().nonnegative().max(MAX_OFFERED_PRICE_PHP).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const SaveGigSchema = z.object({
  gigId: z.string().trim().min(1).max(120),
  note: z.string().trim().max(280).default(""),
});

export const ApplyGigSchema = z.object({
  message: z.string().trim().min(1).max(500),
  rate: z.string().trim().max(120).default(""),
});

export const BackendCategoryEnum = z.enum(GIG_CATEGORIES);
