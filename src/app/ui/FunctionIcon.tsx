import { Camera, Car, Crown, Drum, Flame, Flower2, Gem, Gift, Hand, Heart, House, Leaf, Moon, Music, PartyPopper, Sparkles, Star, Sun, Utensils, Wine, type LucideIcon } from "lucide-react";
import type { FunctionIconKey } from "@/lib/functionIcons";

const ICONS: Record<FunctionIconKey, LucideIcon> = {
  sun: Sun,
  flower: Flower2,
  heart: Heart,
  gem: Gem,
  party: PartyPopper,
  music: Music,
  hand: Hand,
  flame: Flame,
  utensils: Utensils,
  sparkles: Sparkles,
  star: Star,
  moon: Moon,
  gift: Gift,
  crown: Crown,
  camera: Camera,
  car: Car,
  house: House,
  leaf: Leaf,
  drum: Drum,
  wine: Wine,
};

/** A function's icon. `label` names it for screen readers; leave it out when the name is written next to it. */
export function FunctionIcon({ icon, label, className = "h-5 w-5" }: { icon: string | null; label?: string; className?: string }) {
  const Icon = icon && icon in ICONS ? ICONS[icon as FunctionIconKey] : null;
  if (!Icon) return null;
  return label ? <Icon className={className} role="img" aria-label={label} /> : <Icon className={className} aria-hidden="true" />;
}
