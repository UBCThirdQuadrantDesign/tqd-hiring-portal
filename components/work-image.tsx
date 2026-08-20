import Image from "next/image";

/**
 * Selected Works image. Falls back to a neutral placeholder block
 * when no `src` is supplied yet.
 */
export function WorkImage({ label, src }: { label: string; src?: string }) {
  if (!src) {
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

  return (
    <div className="relative h-80 bg-works-bg">
      <Image
        src={src}
        alt={label}
        fill
        className="object-cover"
        sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
      />
    </div>
  );
}
