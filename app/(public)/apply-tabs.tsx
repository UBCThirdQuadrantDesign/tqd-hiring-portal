"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

export type TabDef<Id extends string> = { id: Id; label: string };

/**
 * Two-label tab header with an underline that slides between the labels.
 *
 * The underline is measured from the live DOM rather than assumed, because the
 * labels have different widths and the web font can load after first paint.
 * The first measurement is applied without a transition so the underline
 * doesn't slide in from x=0 on mount.
 */
export function ApplyTabs<Id extends string>({
  tabs,
  active,
  onChange,
  idPrefix,
}: {
  tabs: readonly TabDef<Id>[];
  active: Id;
  onChange: (id: Id) => void;
  idPrefix: string;
}) {
  const listRef = useRef<HTMLDivElement>(null);
  const btnRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const hasMeasured = useRef(false);
  const [indicator, setIndicator] = useState({ left: 0, width: 0, animate: false });

  const activeIndex = Math.max(
    0,
    tabs.findIndex((t) => t.id === active),
  );

  const measure = useCallback(() => {
    const el = btnRefs.current[activeIndex];
    if (!el) return;
    const animate = hasMeasured.current;
    hasMeasured.current = true;
    setIndicator({ left: el.offsetLeft, width: el.offsetWidth, animate });
  }, [activeIndex]);

  useLayoutEffect(measure, [measure]);

  // Re-measure when the tablist resizes (viewport changes, font swap-in).
  useEffect(() => {
    const list = listRef.current;
    if (!list || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => measure());
    ro.observe(list);
    return () => ro.disconnect();
  }, [measure]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    let next: number | null = null;
    if (e.key === "ArrowRight") next = (activeIndex + 1) % tabs.length;
    else if (e.key === "ArrowLeft") next = (activeIndex - 1 + tabs.length) % tabs.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = tabs.length - 1;
    if (next === null) return;
    e.preventDefault();
    onChange(tabs[next].id);
    btnRefs.current[next]?.focus();
  };

  return (
    <div className="relative border-b border-rule">
      <div
        ref={listRef}
        role="tablist"
        aria-label="Application sections"
        onKeyDown={onKeyDown}
        className="flex gap-10"
      >
        {tabs.map((tab, i) => {
          const selected = tab.id === active;
          return (
            <button
              key={tab.id}
              ref={(el) => {
                btnRefs.current[i] = el;
              }}
              type="button"
              role="tab"
              id={`${idPrefix}-tab-${tab.id}`}
              aria-selected={selected}
              aria-controls={`${idPrefix}-panel-${tab.id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => onChange(tab.id)}
              className={`pb-3 bg-transparent border-0 cursor-pointer text-[24px] font-bold tracking-[-0.01em] transition-colors ${
                selected ? "text-ink" : "text-muted hover:text-body"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <span
        aria-hidden="true"
        className="absolute bottom-[-1px] left-0 h-0.5 bg-ink"
        style={{
          transform: `translateX(${indicator.left}px)`,
          width: indicator.width,
          transition: indicator.animate
            ? "transform 220ms cubic-bezier(0.22, 1, 0.36, 1), width 220ms cubic-bezier(0.22, 1, 0.36, 1)"
            : "none",
        }}
      />
    </div>
  );
}
