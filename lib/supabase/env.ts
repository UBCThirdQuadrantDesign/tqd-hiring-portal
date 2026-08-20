/**
 * Supabase connection config, in one place.
 *
 * This project uses Supabase's modern API keys, not the legacy JWT
 * `anon` / `service_role` pair:
 *
 *   - Publishable key (`sb_publishable_…`) — safe to ship to the browser.
 *     Carries no privileges of its own; every request it makes is still
 *     subject to RLS as whichever user the session cookie identifies.
 *   - Secret key (`sb_secret_…`) — server-only, bypasses RLS. Revocable
 *     and rotatable per key from the dashboard, which is the whole point
 *     of the new scheme: leaking one no longer means re-issuing the
 *     project's JWT secret and invalidating every other key with it.
 *
 * There is no third "project key". What looks like one is the project
 * URL (`https://<project-ref>.supabase.co`), which is public.
 *
 * Both are read through the getters below so a missing value fails loudly
 * at the call site instead of sending `undefined` as an apikey header and
 * surfacing as an opaque 401 later.
 */

/** Public — the project's REST/Realtime origin. */
export function supabaseUrl(): string {
  return required("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL);
}

/** Public — publishable key, safe in client bundles. */
export function supabasePublishableKey(): string {
  const key = required(
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  );
  warnIfLegacy("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", key, "sb_publishable_");
  return key;
}

/** Server-only — secret key. Never reference this from client code. */
export function supabaseSecretKey(): string {
  const key = required("SUPABASE_SECRET_KEY", process.env.SUPABASE_SECRET_KEY);
  warnIfLegacy("SUPABASE_SECRET_KEY", key, "sb_secret_");
  return key;
}

function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `Missing ${name}. Copy it from the Supabase dashboard: Project Settings -> API Keys.`
    );
  }
  return value;
}

/**
 * Legacy JWT keys still authenticate, so a half-finished migration works
 * and stays invisible. Say so once, in dev only.
 */
function warnIfLegacy(name: string, key: string, expectedPrefix: string) {
  if (process.env.NODE_ENV === "production") return;
  if (key.startsWith(expectedPrefix)) return;
  if (!key.startsWith("eyJ")) return;
  console.warn(
    `[supabase] ${name} holds a legacy JWT key. Replace it with a ${expectedPrefix}… key from Project Settings -> API Keys, then disable the legacy keys.`
  );
}
