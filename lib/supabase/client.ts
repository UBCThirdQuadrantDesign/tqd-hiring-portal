import { createBrowserClient } from "@supabase/ssr";
import { supabasePublishableKey, supabaseUrl } from "./env";

/**
 * Browser client — used by the review board for Realtime subscriptions.
 *
 * createBrowserClient is a singleton, so repeat calls hand back the same
 * client: the board's `applications` channel and the applicant panel's `notes`
 * channel share one websocket and one auth token.
 */
export function createClient() {
  return createBrowserClient(supabaseUrl(), supabasePublishableKey());
}
