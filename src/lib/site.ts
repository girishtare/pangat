import "server-only";
import { headers } from "next/headers";

/**
 * The address guests' links and QR codes point at. Printed slips must never
 * point at a preview deployment, so the production address wins:
 * PANGAT_PUBLIC_URL (e.g. a custom domain later), else Vercel's production
 * domain, else whatever this request came in on.
 */
export async function publicBaseUrl(): Promise<string> {
  const explicit = process.env.PANGAT_PUBLIC_URL;
  if (explicit) return explicit.replace(/\/+$/, "");
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercel) return `https://${vercel}`;
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}
