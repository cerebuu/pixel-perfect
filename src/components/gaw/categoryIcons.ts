import { Droplets, Hammer, PaintRoller, Sparkles, Wrench, Zap, Leaf, Plug, Snowflake, Flame, Sofa, Truck, Laptop, GraduationCap, Camera, HardHat, Briefcase, type LucideIcon } from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  Plumbing: Droplets,
  Electrical: Zap,
  Carpentry: Hammer,
  Cleaning: Sparkles,
  Painting: PaintRoller,
  Handyman: Wrench,
  Gardening: Leaf,
  "Appliance Repair": Plug,
  "Air Conditioning Services": Snowflake,
  Welding: Flame,
  "Furniture Assembly": Sofa,
  "Moving Assistance": Truck,
  "Computer Repair": Laptop,
  Tutoring: GraduationCap,
  Photography: Camera,
  "General Labor": HardHat,
};

/** Icon for a service; custom services get a generic briefcase. */
export function iconFor(service: string): LucideIcon {
  return ICONS[service] ?? Briefcase;
}
