"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger, useGSAP);

/**
 * Fade-up-on-scroll wrapper for section headings and Selected Works
 * cards — the one motion effect the plan calls "highest value-per-line"
 * on the public page. Transforms + opacity only. Wrapped in
 * gsap.matchMedia so prefers-reduced-motion collapses it to a no-op.
 */
export function ScrollReveal({
  children,
  y = 24,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  y?: number;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(
        {
          reduceMotion: "(prefers-reduced-motion: reduce)",
          full: "(prefers-reduced-motion: no-preference)",
        },
        (context) => {
          const { reduceMotion } = context.conditions as {
            reduceMotion: boolean;
          };
          if (reduceMotion || !ref.current) return;

          gsap.set(ref.current, { opacity: 0, y });
          gsap.to(ref.current, {
            opacity: 1,
            y: 0,
            duration: 0.9,
            delay,
            ease: "power3.out",
            scrollTrigger: {
              trigger: ref.current,
              start: "top 85%",
              once: true,
            },
          });
        }
      );
      return () => mm.revert();
    },
    { scope: ref }
  );

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
