import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { supabasePublishableKey, supabaseUrl } from "./env";

/** Server Component / Server Action client — respects RLS as the signed-in user. */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    supabaseUrl(),
    supabasePublishableKey(),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component with no request context to
            // write to — safe to ignore as long as proxy.ts refreshes
            // the session on the surrounding request.
          }
        },
      },
    }
  );
}
