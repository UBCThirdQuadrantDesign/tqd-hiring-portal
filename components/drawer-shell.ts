"use client";

import { useEffect } from "react";

/**
 * Client-side concerns shared by the applicant panel and its loading
 * skeleton, so the two behave identically while one hands off to the
 * other.
 */

/**
 * Handoff between the drawer's loading skeleton and the real panel.
 *
 * The skeleton (app/(review)/review/@drawer/(.)a/[id]/loading.tsx) plays
 * the slide-in and leaves the panel parked at its final position. When
 * the detail payload arrives React swaps in ApplicationDrawer — a fresh
 * DOM node, so the entrance animation would replay and the panel would
 * appear to slide in twice. The drawer checks this mark and renders
 * in-place instead.
 *
 * A time window rather than a read-and-clear flag: reads stay pure, so
 * StrictMode's double render can't consume the mark before it's used.
 */
const HANDOFF_WINDOW_MS = 5000;

let skeletonShownAt = 0;

export function markDrawerSkeleton() {
  skeletonShownAt = Date.now();
}

export function drawerSkeletonJustShown() {
  return skeletonShownAt > 0 && Date.now() - skeletonShownAt < HANDOFF_WINDOW_MS;
}

/**
 * Locks the page behind the panel, padding out the scrollbar width so the
 * board doesn't snap sideways when the scrollbar disappears. Both the
 * skeleton and the real panel run this — React fires the skeleton's
 * cleanup and the panel's setup in the same commit, so the lock never
 * lifts between them.
 */
export function useLockBodyScroll(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    const { body } = document;
    const gutter = window.innerWidth - document.documentElement.clientWidth;
    const prevOverflow = body.style.overflow;
    const prevPadding = body.style.paddingRight;
    body.style.overflow = "hidden";
    if (gutter > 0) body.style.paddingRight = `${gutter}px`;
    return () => {
      body.style.overflow = prevOverflow;
      body.style.paddingRight = prevPadding;
    };
  }, [enabled]);
}
