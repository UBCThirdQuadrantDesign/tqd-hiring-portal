import Image from "next/image";

/**
 * One captain photo in a polaroid frame. `rotate` is the tilt in degrees —
 * the tasteful misalignment lives at the call site, not here.
 */
export function CaptainPolaroid({
  name,
  src,
  rotate,
  className,
}: {
  name: string;
  src: string;
  rotate: number;
  className?: string;
}) {
  return (
    <div
      className={`w-[240px] bg-surface p-3.5 pb-14 shadow-[0_8px_10px_rgba(28,28,26,0.14)] ${className ?? ""}`}
      style={{ transform: `rotate(${rotate}deg)` }}
    >
      <div className="relative aspect-square bg-works-bg">
        <Image
          src={src}
          alt={name}
          fill
          className="object-cover"
          sizes="(min-width: 640px) 240px, 70vw"
        />
      </div>
      <div className="mt-4 text-center text-[15px] font-hand tracking-[0.10em] uppercase text-muted">
        {name}
      </div>
    </div>
  );
}
