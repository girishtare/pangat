// Cloudflare Workers build via OpenNext. No incremental cache: Pangat has no ISR pages.
import { defineCloudflareConfig } from "@opennextjs/cloudflare";

export default {
  ...defineCloudflareConfig(),
  // `npm run build` runs OpenNext (so Cloudflare's default build command works);
  // OpenNext in turn runs the plain Next.js build through this script.
  buildCommand: "npm run build:next",
};
