"use client";

import { createClient } from "@/lib/supabase/client";

export function LoginButton({ next }: { next?: string }) {
  const signIn = async () => {
    const supabase = createClient();
    const callbackUrl = new URL("/api/auth/callback", window.location.origin);
    if (next) callbackUrl.searchParams.set("next", next);

    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callbackUrl.toString() },
    });
  };

  return (
    <button
      onClick={signIn}
      className="inline-flex items-center gap-3 px-7 py-4 bg-ink text-bone text-xs font-bold tracking-[0.16em] uppercase cursor-pointer hover:bg-olive transition-colors"
    >
      Sign in with Google
    </button>
  );
}
