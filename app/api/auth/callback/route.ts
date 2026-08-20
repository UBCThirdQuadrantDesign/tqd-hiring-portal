import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * OAuth callback. Exchanges the code for a session, then checks the
 * allowlist before letting the user into /review. A signed-in-but-not-
 * allowlisted account is signed back out and bounced to /login with an
 * error — RLS would block them from reading anything anyway, but we don't
 * want a stray authenticated session hanging around for someone who isn't
 * a reviewer.
 *
 * Two-tier allowlist: `reviewers` (keyed by auth uid) is the live roster
 * that RLS reads via is_reviewer(). `reviewer_allowlist` (keyed by email,
 * migration 0003) is what a human edits, and is what lets someone be
 * approved before they have an account at all. First successful sign-in
 * promotes the second into the first.
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

  if (!reviewer && !(await provisionFromAllowlist(data.user))) {
    await supabase.auth.signOut();
    return NextResponse.redirect(`${origin}/login?error=not_allowlisted`);
  }

  return NextResponse.redirect(`${origin}${next}`);
}

/**
 * Create the `reviewers` row for a first-time sign-in whose email is on
 * `reviewer_allowlist`. Runs on the secret key: `reviewers` has no INSERT
 * policy, and deliberately so — membership is not self-service, it is
 * granted by an existing row in the allowlist.
 *
 * Returns whether the user may proceed.
 */
async function provisionFromAllowlist(user: {
  id: string;
  email?: string;
  user_metadata?: { full_name?: string; name?: string };
}): Promise<boolean> {
  const email = user.email?.toLowerCase();
  if (!email) return false;

  const admin = createAdminClient();

  const { data: allowed, error: lookupError } = await admin
    .from("reviewer_allowlist")
    .select("role")
    .eq("email", email)
    .maybeSingle();

  if (lookupError) {
    console.error("[auth] reviewer_allowlist lookup failed", lookupError);
    return false;
  }
  if (!allowed) return false;

  // Upsert on the uid rather than insert: an existing inactive row means
  // access was revoked, and being on the allowlist should not silently
  // reinstate it. onConflict do-nothing keeps the deactivation sticky.
  const { error: insertError } = await admin
    .from("reviewers")
    .upsert(
      {
        id: user.id,
        email,
        name: user.user_metadata?.full_name ?? user.user_metadata?.name ?? null,
        role: allowed.role,
        active: true,
      },
      { onConflict: "id", ignoreDuplicates: true }
    );

  if (insertError) {
    console.error("[auth] failed to provision reviewer", insertError);
    return false;
  }

  // Re-read rather than trusting the write: the row may have pre-existed
  // with active=false, in which case the upsert above was a no-op.
  const { data: row } = await admin
    .from("reviewers")
    .select("active")
    .eq("id", user.id)
    .maybeSingle();

  return row?.active === true;
}
