/**
 * The icons a function can have (owner, 14 Nov): picked on Event settings,
 * shown on the Guest list with a legend. No two functions of one event share
 * one (a unique index in the database). Keys must match migrations 0022/0026.
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
  // Added 14 Nov, so more function names find a match.
  { key: "cake", label: "Cake" },
  { key: "mic", label: "Microphone" },
  { key: "bell", label: "Bell" },
  { key: "sunrise", label: "Sunrise" },
  { key: "sunset", label: "Sunset" },
  { key: "guitar", label: "Guitar" },
  { key: "coffee", label: "Tea / coffee" },
  { key: "martini", label: "Cocktail" },
  { key: "chef", label: "Chef's hat" },
  { key: "handshake", label: "Handshake" },
  { key: "hearthands", label: "Heart and hands" },
  { key: "baby", label: "Baby" },
  { key: "ribbon", label: "Ribbon" },
  { key: "tent", label: "Mandap / tent" },
  { key: "plane", label: "Travel" },
] as const;

export type FunctionIconKey = (typeof FUNCTION_ICONS)[number]["key"];

export function isFunctionIcon(v: unknown): v is FunctionIconKey {
  return typeof v === "string" && FUNCTION_ICONS.some((i) => i.key === v);
}

/**
 * Words in a function's name → the icons that suit it, best first (owner,
 * 14 Nov: "pull the icons based on the function name"). English and the
 * Marathi/Hindi words families write in English. The same list is in
 * private.pick_function_icon (migration 0026), which picks an icon for a
 * function saved without one.
 */
export const ICON_WORDS: [RegExp, FunctionIconKey[]][] = [
  [/haldi|halad/, ["sun", "flower"]],
  [/meh[e]?n?di|mehndi/, ["hand", "leaf"]],
  [/sangeet|sangit|dandiya|garba|dance/, ["music", "mic", "drum"]],
  [/engage|sakhar|ring|tilak|roka/, ["gem", "crown"]],
  [/wedding|lagna|lagn|vivah|shaadi|shadi|pheras|saptapadi|mangalashtak/, ["heart", "hearthands", "gem"]],
  [/reception|swagat/, ["party", "sparkles"]],
  [/puja|pooja|havan|satyanarayan|ganpati|ganesh|devak|gondhal/, ["flame", "bell"]],
  [/breakfast|nashta|tea|chai/, ["coffee"]],
  [/lunch|dinner|meal|jevan|bhojan|feast|kelvan/, ["utensils", "chef"]],
  [/baraat|barat|varat/, ["car", "drum"]],
  [/griha|house|vastu/, ["house"]],
  [/cocktail|bar\b/, ["martini", "wine"]],
  [/party/, ["party", "wine"]],
  [/cake/, ["cake"]],
  [/morning|sunrise/, ["sunrise"]],
  [/evening|sunset/, ["sunset"]],
  [/welcome|meet|milan/, ["handshake"]],
  [/photo|shoot/, ["camera"]],
  [/travel|trip|journey|departure/, ["plane", "car"]],
  [/baby|naming|barsa|naamkaran|namkaran|dohale|seemant|simant/, ["baby"]],
  [/mandap/, ["tent"]],
  [/rukhwat|gift|aher/, ["gift", "ribbon"]],
  [/music|concert|band/, ["guitar", "music"]],
];

/** The icon to suggest for a function's name, skipping ones other functions use; null if no word matches. */
export function suggestIcon(name: string, used: readonly string[]): FunctionIconKey | null {
  const n = name.toLowerCase();
  const wanted = ICON_WORDS.filter(([re]) => re.test(n)).flatMap(([, keys]) => keys);
  return wanted.find((k) => !used.includes(k)) ?? null;
}
