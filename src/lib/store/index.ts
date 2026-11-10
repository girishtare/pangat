import "server-only";
import type { DashboardData, HouseholdView, ResponseSource } from "../types";
import type { NormalisedAnswer } from "../validate";
import { demoStore } from "./demo";
import { supabaseStore } from "./supabase";
import { supabaseConfig } from "../supabase/config";

export interface Store {
  getHouseholdByToken(token: string): Promise<HouseholdView | null>;
  saveResponses(householdId: string, answers: NormalisedAnswer[], source: ResponseSource): Promise<void>;
  getDashboard(eventSlug: string): Promise<DashboardData | null>;
}

/** Demo mode = no database configured; data lives in memory and resets on restart. */
export function isDemo(): boolean {
  return supabaseConfig() === null;
}

export function getStore(): Store {
  return isDemo() ? demoStore : supabaseStore;
}
