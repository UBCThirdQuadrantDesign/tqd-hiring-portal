/**
 * Placeholder for a Selected Works image. `image-slot.js` from the
 * Claude Design project is design-canvas scaffolding (drag-to-fill for
 * the mockup editor) and doesn't run outside that runtime — this is a
 * plain neutral block standing in until real photography/renders are
 * supplied. Swap for next/image once assets land.
 */
export function WorkImage({ label }: { label: string }) {
  return (
    <div
      className="relative h-80 bg-works-bg flex items-end p-4"
      role="img"
      aria-label={label}
    >
      <span className="text-[11px] font-bold tracking-[0.14em] uppercase text-muted">
        Image pending
      </span>
    </div>
  );
}
