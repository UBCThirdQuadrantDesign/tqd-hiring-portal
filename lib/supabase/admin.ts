import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { supabaseSecretKey, supabaseUrl } from "./env";

/**
 * Secret-key client. Bypasses RLS entirely — never import this into
 * client code or expose the key via NEXT_PUBLIC_*. Used only by:
 *   - the public submission Server Action (anon applicants have no
 *     `applications` INSERT policy, deliberately — see migration 0001)
 *   - signed upload/download URL minting
 */
export function createAdminClient() {
  return createSupabaseClient(supabaseUrl(), supabaseSecretKey(), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
