import Image from "next/image";
import { studio } from "@/content/studio";

export default function ClosedPage() {
  return (
    <div className="min-h-screen bg-bone text-ink flex flex-col">
      <div className="flex-1 flex items-center">
        <div className="px-6 sm:px-10 pt-24 pb-16 max-w-[1440px] mx-auto w-full text-center">
          <Image
            src="/logo/tqd-logo.avif"
            alt="Third Quadrant Design"
            width={280}
            height={96}
            priority
            // The dense mark pulls the logo's visual weight left of centre, so
            // nudge right to centre it optically rather than geometrically.
            className="h-16 sm:h-20 w-auto mb-10 mx-auto translate-x-[8%]"
          />
          <div className="text-[clamp(34px,4.4vw,64px)] leading-none font-extrabold tracking-[-0.03em]">
            Applications are closed
          </div>
          <div className="mt-7 text-[17px] leading-relaxed text-[#5c5a51] max-w-[52ch] mx-auto text-pretty">
            See you next time!
          </div>
        </div>
      </div>x

      {/* Footer */}
      <div className="px-6 sm:px-10 py-10 flex flex-col sm:flex-row justify-between gap-4 text-[11px] font-bold tracking-[0.16em] uppercase text-muted">
        <div>{studio.name}</div>
        <div>{studio.footer.cycle}</div>
      </div>
    </div>
  );
}
