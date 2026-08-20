import type {
  RealtimeChannel,
  RealtimePostgresChangesPayload,
  SupabaseClient,
} from "@supabase/supabase-js";

/**
 * Realtime enforces RLS on `postgres_changes` using the JWT carried on the
 * websocket — and our browser client authenticates with a publishable key
 * (`sb_publishable_…`), which is not a JWT. The reviewer's access token only
 * reaches the socket once GoTrue has hydrated the session from cookies, which
 * is asynchronous. Subscribing before that happens means Realtime evaluates
 * `is_reviewer()` with no `auth.uid()`, filters out every row, and the channel
 * goes quiet forever without erroring.
 *
 * So: always `setAuth` first, then subscribe — and re-`setAuth` when the token
 * rotates, since a long triage session outlives the initial access token.
 */

export type ChannelStatus = "SUBSCRIBED" | "TIMED_OUT" | "CLOSED" | "CHANNEL_ERROR";

export type PostgresChangesFilter = {
  event: "*";
  schema: string;
  table: string;
  /** PostgREST-style, e.g. `application_id=eq.<uuid>`. */
  filter?: string;
};

/**
 * Subscribe to postgres changes with the reviewer's token on the socket.
 * Returns a teardown suitable for returning straight out of a useEffect.
 */
export function subscribeWithAuth<T extends { [key: string]: unknown }>(
  supabase: SupabaseClient,
  channelName: string,
  filter: PostgresChangesFilter,
  onChange: (payload: RealtimePostgresChangesPayload<T>) => void,
  onStatus?: (status: ChannelStatus, err?: Error) => void
): () => void {
  let channel: RealtimeChannel | null = null;
  // The effect can be torn down before the async setup below resolves
  // (StrictMode double-invoke, fast navigation) — don't leave a live channel.
  let aborted = false;

  const {
    data: { subscription: authSubscription },
  } = supabase.auth.onAuthStateChange((event, session) => {
    if (event !== "TOKEN_REFRESHED" && event !== "SIGNED_IN") return;
    void supabase.realtime.setAuth(session?.access_token ?? null);
  });

  void (async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      await supabase.realtime.setAuth(session?.access_token ?? null);
      if (aborted) return;

      channel = supabase
        .channel(channelName)
        .on<T>("postgres_changes", filter, onChange)
        .subscribe((status, err) => {
          if (err) console.error(`[realtime] ${channelName}: ${status}`, err);
          onStatus?.(status as ChannelStatus, err);
        });
    } catch (err) {
      // Surface it as an unhealthy channel so callers can fall back to polling
      // rather than sitting on a board that quietly stopped updating.
      console.error(`[realtime] ${channelName}: failed to subscribe`, err);
      onStatus?.("CHANNEL_ERROR", err as Error);
    }
  })();

  return () => {
    aborted = true;
    authSubscription.unsubscribe();
    if (channel) void supabase.removeChannel(channel);
  };
}
