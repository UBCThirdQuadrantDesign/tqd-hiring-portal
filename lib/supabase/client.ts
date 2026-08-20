import { createBrowserClient } from "@supabase/ssr";
import { supabasePublishableKey, supabaseUrl } from "./env";

/** Browser client — used by the review board for Realtime subscriptions. */
export function createClient() {
  return createBrowserClient(supabaseUrl(), supabasePublishableKey());
}
