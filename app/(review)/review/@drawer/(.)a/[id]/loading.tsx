"use client";

import { useEffect } from "react";
import { markDrawerSkeleton, useLockBodyScroll } from "@/components/drawer-shell";

/**
 * Shown the instant a card is clicked, while the detail queries run.
 *
 * Two jobs: the panel slides in immediately instead of after the server
 * round trip, and — because this route is dynamic (cookie-backed
 * Supabase client) — its presence is what lets Next prefetch anything at
 * all for it. Without a loading boundary a dynamic route is skipped by
 * the prefetcher, so board.tsx's hover prefetch had nothing to warm.
 *
 * Mirrors the modal shell in components/application-drawer.tsx; keep the
 * wrapper classes in sync with the `mode === "modal"` branch there.
 */
export default function DrawerLoading() {
  // Tell the real panel the slide-in already played; see drawer-shell.ts.
  useEffect(markDrawerSkeleton, []);
  useLockBodyScroll(true);

  return (
    <div
      className="fixed inset-0 z-[60] flex justify-end drawer-scrim-in"
      style={{ background: "rgba(28,28,26,0.32)" }}
    >
      <div className="flex-1" />
      <div className="w-[560px] max-w-[92vw] h-full overflow-y-auto bg-bone border-l border-border drawer-panel-in">
        <div className="flex items-start justify-between gap-5 px-8 py-7 border-b border-rule">
          <div className="grid gap-3 pt-1">
            <Bar className="h-6 w-56" />
            <Bar className="h-3 w-40" />
          </div>
          <div className="flex items-center gap-2.5 shrink-0">
            <Bar className="h-9 w-24" />
            <Bar className="h-9 w-9" />
          </div>
        </div>

        <div className="px-8 py-7 grid gap-8">
          <div className="grid gap-3">
            <Bar className="h-2.5 w-16" />
            <Bar className="h-10 w-full" />
          </div>

          <div className="grid">
            {[0, 1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="grid grid-cols-[120px_1fr] gap-5 py-3.5 border-b border-rule-faint"
              >
                <Bar className="h-2.5 w-20" />
                <Bar className="h-3.5 w-48" />
              </div>
            ))}
          </div>

          <div className="grid gap-3">
            <Bar className="h-2.5 w-32" />
            <Bar className="h-3.5 w-full" />
            <Bar className="h-3.5 w-full" />
            <Bar className="h-3.5 w-2/3" />
          </div>
        </div>
      </div>
    </div>
  );
}

function Bar({ className }: { className: string }) {
  return <div className={`bg-rule-faint animate-pulse ${className}`} />;
}
