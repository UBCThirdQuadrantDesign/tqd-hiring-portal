"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function LoginButton({ next }: { next?: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const signIn = async () => {
    setError(null);
    setPending(true);

    const supabase = createClient();
    const callbackUrl = new URL("/api/auth/callback", window.location.origin);
    if (next) callbackUrl.searchParams.set("next", next);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callbackUrl.toString() },
    });

    // On success the browser is already navigating to Google, so this only
    // runs when the handoff never happened — most often because the Google
    // provider isn't enabled on the Supabase project, which otherwise looks
    // exactly like a dead button.
    if (error) {
      setError(error.message);
      setPending(false);
    }
  };

  return (
    <>
      <button
        onClick={signIn}
        disabled={pending}
        className="inline-flex items-center gap-3 px-7 py-4 bg-ink text-bone text-xs font-bold tracking-[0.16em] uppercase cursor-pointer hover:bg-olive transition-colors disabled:opacity-60"
      >
        {pending ? "Redirecting…" : "Sign in with Google"}
      </button>
      {error && (
        <p className="mt-6 text-sm text-body bg-surface border border-border px-4 py-3">
          {error}
        </p>
      )}
    </>
  );
}
