import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * Next.js 16 renamed middleware.ts -> proxy.ts. This refreshes the
 * Supabase session cookie and gates /review/*.
 *
 * NOTE: this is convenience only. The real access boundary is Postgres
 * RLS (is_reviewer(), migration 0001) — an unlisted URL or a bypassed
 * proxy must still resolve to zero rows for a non-reviewer.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isReviewRoute =
    request.nextUrl.pathname.startsWith("/review") ||
    request.nextUrl.pathname.startsWith("/api/reviewer");
  const isLoginRoute = request.nextUrl.pathname.startsWith("/login");

  if (isReviewRoute && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  if (isLoginRoute && user) {
    const url = request.nextUrl.clone();
    url.pathname = "/review";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ["/review/:path*", "/login", "/api/reviewer/:path*"],
};
