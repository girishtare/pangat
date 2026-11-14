/**
 * The icons a function can have (owner, 14 Nov): picked on Event settings,
 * shown on the Guest list with a legend. No two functions of one event share
 * one (a unique index in the database). Keys must match migration 0022.
 */
export const FUNCTION_ICONS = [
  { key: "sun", label: "Sun" },
  { key: "flower", label: "Flower" },
  { key: "heart", label: "Heart" },
  { key: "gem", label: "Ring" },
  { key: "party", label: "Party" },
  { key: "music", label: "Music" },
  { key: "hand", label: "Hand" },
  { key: "flame", label: "Lamp flame" },
  { key: "utensils", label: "Meal" },
  { key: "sparkles", label: "Sparkles" },
  { key: "star", label: "Star" },
  { key: "moon", label: "Moon" },
  { key: "gift", label: "Gift" },
  { key: "crown", label: "Crown" },
  { key: "camera", label: "Camera" },
  { key: "car", label: "Car" },
  { key: "house", label: "House" },
  { key: "leaf", label: "Leaf" },
  { key: "drum", label: "Drum" },
  { key: "wine", label: "Glass" },
] as const;

export type FunctionIconKey = (typeof FUNCTION_ICONS)[number]["key"];

export function isFunctionIcon(v: unknown): v is FunctionIconKey {
  return typeof v === "string" && FUNCTION_ICONS.some((i) => i.key === v);
}
