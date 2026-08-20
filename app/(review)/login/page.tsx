import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LoginButton } from "./login-button";

const ERROR_COPY: Record<string, string> = {
  missing_code: "Something went wrong starting sign-in. Try again.",
  auth_failed: "Google sign-in failed. Try again.",
  not_allowlisted:
    "That Google account isn't on the review team's list. Ask an admin to add you.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const { error, next } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect(next ?? "/review");

  return (
    <div className="min-h-screen flex items-center justify-center bg-bone px-6">
      <div className="w-full max-w-sm text-center">
        <div className="text-[11px] font-bold tracking-[0.2em] uppercase text-muted mb-3">
          Review board
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight mb-8">
          Third Quadrant Design
        </h1>
        {error && (
          <p className="mb-6 text-sm text-body bg-surface border border-border px-4 py-3">
            {ERROR_COPY[error] ?? "Something went wrong. Try again."}
          </p>
        )}
        <LoginButton next={next} />
      </div>
    </div>
  );
}
