import type {
  DashboardData,
  EventInfo,
  FunctionInfo,
  HouseholdInfo,
  HouseholdView,
  InviteFact,
  ResponseRecord,
  ResponseSource,
} from "../types";
import type { NormalisedAnswer } from "../validate";

interface DemoHousehold extends HouseholdInfo {
  token: string;
  functionIds: string[];
}

interface DemoState {
  event: EventInfo;
  functions: FunctionInfo[];
  households: DemoHousehold[];
  responses: Map<string, ResponseRecord[]>; // by household id
}

function seed(): DemoState {
  const event: EventInfo = {
    id: "ev-demo",
    slug: "demo-wedding",
    name: { en: "Sample Wedding", mr: "नमुना विवाह सोहळा" },
    cutoffAt: "2026-12-13T23:59:00+05:30",
    yesShowRate: 0.9,
    pendingShowRate: 0.4,
  };
  const functions: FunctionInfo[] = [
    { id: "fn-haldi", name: { en: "Haldi", mr: "हळद" }, startsAt: "2026-12-27T10:00:00+05:30", venue: "Family home", mapUrl: null, catered: true, vegOnly: false },
    { id: "fn-wedding", name: { en: "Wedding", mr: "विवाह" }, startsAt: "2026-12-28T11:30:00+05:30", venue: "Sample Hall", mapUrl: null, catered: true, vegOnly: false },
    { id: "fn-reception", name: { en: "Reception", mr: "स्वागत समारंभ" }, startsAt: "2026-12-28T19:00:00+05:30", venue: "Sample Hall", mapUrl: null, catered: true, vegOnly: false },
  ];
  const all = functions.map((f) => f.id);
  const main = ["fn-wedding", "fn-reception"];
  const mk = (n: number, side: "bride" | "groom", en: string, mr: string, functionIds: string[]): DemoHousehold => ({
    id: `hh-${n}`,
    token: `demo-family-${n}`,
    side,
    name: { en, mr },
    softCap: 6,
    functionIds,
  });
  const households = [
    mk(1, "bride", "Shri. A. Joshi & family", "श्री. अ. जोशी सहपरिवार", all),
    mk(2, "bride", "Shri. B. Kulkarni & family", "श्री. ब. कुलकर्णी सहपरिवार", main),
    mk(3, "bride", "Smt. C. Deshpande", "श्रीमती क. देशपांडे", main),
    mk(4, "bride", "Shri. D. Patil & family", "श्री. ड. पाटील सहपरिवार", all),
    mk(5, "groom", "Shri. E. Kale & family", "श्री. इ. काळे सहपरिवार", main),
    mk(6, "groom", "Shri. F. Gokhale & family", "श्री. फ. गोखले सहपरिवार", main),
    mk(7, "groom", "Dr. G. Sathe", "डॉ. ग. साठे", main),
    mk(8, "groom", "Shri. H. More & family", "श्री. ह. मोरे सहपरिवार", all),
  ];
  const at = "2026-11-10T10:00:00+05:30";
  const yes = (functionId: string, heads: number, veg: number): ResponseRecord => ({
    functionId, status: "yes", heads, veg, nonveg: heads - veg, arrivalSlot: "on_time", source: "link", updatedAt: at,
  });
  const no = (functionId: string): ResponseRecord => ({
    functionId, status: "no", heads: 0, veg: 0, nonveg: 0, arrivalSlot: null, source: "link", updatedAt: at,
  });
  const responses = new Map<string, ResponseRecord[]>([
    ["hh-2", [yes("fn-wedding", 4, 4), yes("fn-reception", 4, 4)]],
    ["hh-5", [yes("fn-wedding", 3, 1), no("fn-reception")]],
    ["hh-7", [no("fn-wedding"), no("fn-reception")]],
  ]);
  return { event, functions, households, responses };
}

// Survives hot reloads in `next dev`; resets when the server restarts.
const g = globalThis as unknown as { __pangatDemo?: DemoState };
function state(): DemoState {
  return (g.__pangatDemo ??= seed());
}

export const demoStore = {
  async getHouseholdByToken(token: string): Promise<HouseholdView | null> {
    const s = state();
    const h = s.households.find((x) => x.token === token);
    if (!h) return null;
    return {
      event: s.event,
      household: { id: h.id, side: h.side, name: h.name, softCap: h.softCap },
      functions: s.functions.filter((f) => h.functionIds.includes(f.id)),
      responses: s.responses.get(h.id) ?? [],
    };
  },

  async saveResponses(householdId: string, answers: NormalisedAnswer[], source: ResponseSource): Promise<void> {
    const updatedAt = new Date().toISOString();
    state().responses.set(householdId, answers.map((a) => ({ ...a, source, updatedAt })));
  },

  async getDashboard(eventSlug: string): Promise<DashboardData | null> {
    const s = state();
    if (s.event.slug !== eventSlug) return null;
    const facts: InviteFact[] = [];
    for (const h of s.households) {
      const rs = s.responses.get(h.id) ?? [];
      for (const functionId of h.functionIds) {
        const r = rs.find((x) => x.functionId === functionId);
        facts.push({
          householdId: h.id,
          side: h.side,
          functionId,
          status: r ? r.status : "pending",
          heads: r?.heads ?? 0,
          veg: r?.veg ?? 0,
          nonveg: r?.nonveg ?? 0,
          cap: h.softCap ?? null,
        });
      }
    }
    return { event: s.event, functions: s.functions, facts };
  },
};

export const DEMO_TOKENS = [1, 2, 3, 4, 5, 6, 7, 8].map((n) => `demo-family-${n}`);
