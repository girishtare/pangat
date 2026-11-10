import "server-only";
import type { DashboardData, HouseholdView, ResponseSource } from "../types";
import type { NormalisedAnswer } from "../validate";
import { demoStore } from "./demo";
import { supabaseStore } from "./supabase";

export interface Store {
  getHouseholdByToken(token: string): Promise<HouseholdView | null>;
  saveResponses(householdId: string, answers: NormalisedAnswer[], source: ResponseSource): Promise<void>;
  getDashboard(eventSlug: string): Promise<DashboardData | null>;
}

/** Demo mode = no database configured; data lives in memory and resets on restart. */
export function isDemo(): boolean {
  return !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY;
}

export function getStore(): Store {
  return isDemo() ? demoStore : supabaseStore;
}
