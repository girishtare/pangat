export type Lang = "en" | "mr";
export type Side = "bride" | "groom";
export type ResponseSource = "qr" | "link" | "code" | "on_behalf";
export type ArrivalSlot = "early" | "on_time" | "late";

export interface Bilingual {
  en: string;
  mr: string | null;
}

export interface EventInfo {
  id: string;
  slug: string;
  name: Bilingual;
  cutoffAt: string; // ISO timestamp
  yesShowRate: number;
  pendingShowRate: number;
}

export interface FunctionInfo {
  id: string;
  name: Bilingual;
  startsAt: string; // ISO timestamp
  venue: string | null;
  mapUrl: string | null;
  catered: boolean;
  /** Food is served but vegetarian only: no veg question, everyone counts as veg. */
  vegOnly: boolean;
}

export interface ResponseRecord {
  functionId: string;
  status: "yes" | "no";
  heads: number;
  veg: number;
  nonveg: number;
  arrivalSlot: ArrivalSlot | null;
  source: ResponseSource;
  updatedAt: string;
}

export interface HouseholdInfo {
  id: string;
  side: Side;
  name: Bilingual;
  softCap: number | null;
}

/** Everything the guest page needs for one household. */
export interface HouseholdView {
  event: EventInfo;
  household: HouseholdInfo;
  functions: FunctionInfo[]; // only the functions this household is invited to
  responses: ResponseRecord[];
  /** Invitation cards to offer: the household's slip language(s) the event has a PDF for (Marathi first). */
  cards?: Lang[];
  /** The number this household's side asks guests to call (Event settings), if set. */
  contactPhone?: string | null;
}

/** One household x function pair, as the forecast and dashboard see it. */
export interface InviteFact {
  householdId: string;
  side: Side;
  functionId: string;
  status: "yes" | "no" | "pending";
  heads: number;
  veg: number;
  nonveg: number;
  /** The household's cap (most people on the card), or null. */
  cap: number | null;
}

export interface DashboardData {
  event: EventInfo;
  functions: FunctionInfo[];
  facts: InviteFact[];
}

export function pick(text: Bilingual, lang: Lang): string {
  return lang === "mr" && text.mr ? text.mr : text.en;
}
