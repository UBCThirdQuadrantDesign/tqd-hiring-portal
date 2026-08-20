import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * OAuth callback. Exchanges the code for a session, then checks the
 * allowlist (`reviewers`, active=true) before letting the user into
 * /review. A signed-in-but-not-allowlisted account is signed back out
 * and bounced to /login with an error — RLS would block them from
 * reading anything anyway, but we don't want a stray authenticated
 * session hanging around for someone who isn't a reviewer.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/review";

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    return NextResponse.redirect(`${origin}/login?error=auth_failed`);
  }

  const { data: reviewer } = await supabase
    .from("reviewers")
    .select("id")
    .eq("id", data.user.id)
    .eq("active", true)
    .maybeSingle();

  if (!reviewer) {
    await supabase.auth.signOut();
    return NextResponse.redirect(`${origin}/login?error=not_allowlisted`);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
