import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Service-role client. Bypasses RLS entirely — never import this into
 * client code or expose the key via NEXT_PUBLIC_*. Used only by:
 *   - the public submission Server Action (anon applicants have no
 *     `applications` INSERT policy, deliberately — see migration 0001)
 *   - signed upload/download URL minting
 */
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
