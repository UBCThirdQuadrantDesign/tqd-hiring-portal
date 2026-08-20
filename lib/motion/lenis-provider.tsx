"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/**
 * Smooth scroll for the public route group only — the reviewer board
 * intentionally uses native scroll (this provider is not imported into
 * app/(review)). Skipped entirely under prefers-reduced-motion so
 * scrolling stays native and instantaneous.
 *
 * No component currently needs the Lenis instance itself (ScrollTrigger
 * syncs via the .on("scroll", ...) call below), so this only runs the
 * side effect — no context/ref plumbing to expose an instance nothing
 * reads yet. Add a context back if a consumer needs `lenis.scrollTo()`.
 */
export function LenisProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (prefersReduced) return;

    const instance = new Lenis({
      lerp: 0.3,
      duration: 0.3,
      easing: (t) => 1 - Math.pow(1 - t, 3), // expo-ish ease-out
      // Same-page hash links (e.g. "Join the team" -> #apply) would otherwise
      // jump natively; hand them to Lenis so they glide instead. The offset
      // stands in for the target's scroll-mt, which scrollTo does not read.
      anchors: {
        offset: -40,
        duration: 0.5,
        easing: (t) => 1 - Math.pow(1 - t, 5),
      },
    });

    const onTick = (time: number) => instance.raf(time * 1000);

    instance.on("scroll", ScrollTrigger.update);
    gsap.ticker.add(onTick);
    gsap.ticker.lagSmoothing(0);

    return () => {
      instance.destroy();
      gsap.ticker.remove(onTick);
    };
  }, []);

  return <>{children}</>;
}
