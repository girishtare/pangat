import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

// Keeps the host's Supabase session fresh: tokens are refreshed here and the
// new cookies written to the response. Edge middleware rather than Next 16's
// proxy.ts, because Node proxies are experimental on Cloudflare (OpenNext).
// Guest pages are not matched and never touch auth.
export async function middleware(request: NextRequest) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return NextResponse.next(); // demo mode or sign-in not configured

  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(list, headers) {
        for (const { name, value } of list) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of list) response.cookies.set(name, value, options);
        for (const [k, v] of Object.entries(headers ?? {})) response.headers.set(k, v);
      },
    },
  });
  await supabase.auth.getUser();
  return response;
}

export const config = { matcher: ["/host", "/host/:path*"] };
