import Image from "next/image";
import { studio } from "@/content/studio";
import { WorkImage } from "@/components/work-image";
import { CaptainPolaroid } from "@/components/captain-polaroid";
import { ScrollReveal } from "@/lib/motion/scroll-reveal";
import { ApplySection } from "./apply-section";

/** Tasteful misalignment for the captain polaroids — tilt and vertical drift. */
const CAPTAIN_ROTATIONS = [-3, 0, 3];
const CAPTAIN_OFFSETS = ["sm:-mt-3", "sm:mt-1", "sm:mt-0"];

type IntroHighlight = { text: string; bold?: boolean; href?: string };

const INTRO_HIGHLIGHTS: IntroHighlight[] = [
  { text: "carbon-negative buildings", bold: true },
  { text: "Third Space Commons", href: "https://www.thirdquadrantdesign.com/third-space" },
];

function renderIntroParagraph(p: string): React.ReactNode {
  const match = INTRO_HIGHLIGHTS.map((h) => ({ ...h, idx: p.indexOf(h.text) }))
    .filter((h) => h.idx !== -1)
    .sort((a, b) => a.idx - b.idx)[0];

  if (!match) return p;

  const before = p.slice(0, match.idx);
  const after = p.slice(match.idx + match.text.length);
  const node = match.href ? (
    <a href={match.href} className="underline!">
      {match.text}
    </a>
  ) : (
    <strong className="font-bold">{match.text}</strong>
  );

  return (
    <>
      {before}
      {node}
      {renderIntroParagraph(after)}
    </>
  );
}

export default function HomePage() {
  return (
    <div id="top" className="min-h-screen bg-bone text-ink">
      {/* Masthead */}
      <div className="relative overflow-hidden bg-bone">
        <div className="px-6 sm:px-10 pt-14 pb-4 max-w-[900px] mx-auto text-center">
          <Image
            src="/logo/tqd-logo.avif"
            alt="Third Quadrant Design"
            width={280}
            height={96}
            priority
            className="h-12 sm:h-14 w-auto mb-8 mx-auto"
          />
          <h1 className="text-[13vw] sm:text-[60px] leading-[0.88] font-bold tracking-[-0.035em] mix-blend-multiply">
            {studio.name}
          </h1>
          <div className="mt-5 text-[11px] sm:text-[13px] font-bold tracking-[0.16em] uppercase text-olive">
            {studio.recruitmentLine}
          </div>
        </div>
      </div>

      {/* Who we are */}
      <div className="px-6 sm:px-10 py-16 sm:py-24 max-w-[900px] mx-auto">
        <div className="text-[11px] font-bold tracking-[0.2em] uppercase text-muted mb-7">
          Who we are
        </div>
        <div className="grid gap-5 text-base leading-relaxed text-body text-pretty">
          {studio.intro.map((p) => (
            <p key={p} className="m-0">
              {renderIntroParagraph(p)}
            </p>
          ))}
        </div>

        <ScrollReveal>
          <div className="bg-sage-pale -mx-3 sm:-mx-5 px-3 sm:px-5 py-8 sm:py-8 mt-10 sm:mt-12">
            <div className="text-[11px] font-bold tracking-[0.18em] uppercase text-olive mb-4">
              Where we're going
            </div>
            <div className="grid gap-3.5 text-[15px] leading-relaxed text-sage-deep">
              {studio.currently.map((item, i) => (
                <div key={i}>
                  {item.strong && <strong className="font-bold">{item.strong}</strong>}
                  {"rest" in item && item.rest}
                  {"bullets" in item && (
                    <ul className="list-disc pl-5 mt-1 space-y-1">
                      {item.bullets.map((bullet, j) => (
                        <li key={j}>{bullet}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={0.08} className="mt-9">
          <a
            href="#apply"
            className="inline-flex items-center gap-3 px-6 py-4 bg-ink text-bone! text-xs font-bold tracking-[0.16em] uppercase no-underline hover:no-underline cursor-pointer hover:bg-olive transition-colors"
          >
            <span>Join the team</span>
            <span aria-hidden="true">↘</span>
          </a>
        </ScrollReveal>
      </div>

      {/* Team Captains */}
      <div className="px-6 sm:px-10 pb-16 sm:pb-24 max-w-[900px] mx-auto">
        <ScrollReveal>
          <h2 className="text-center text-[clamp(18px,2.4vw,30px)] leading-none font-bold tracking-[-0.01em]">
            Captains
          </h2>
        </ScrollReveal>

        <div className="mt-12 sm:mt-14 flex flex-col sm:flex-row items-center sm:items-start justify-center gap-10 sm:gap-6">
          {studio.captains.map((c, i) => (
            <ScrollReveal
              key={c.name}
              delay={i * 0.08}
              className={CAPTAIN_OFFSETS[i]}
            >
              <CaptainPolaroid name={c.name} src={c.image} rotate={CAPTAIN_ROTATIONS[i]} />
            </ScrollReveal>
          ))}
        </div>
      </div>

      {/* Selected Works */}
      <div className="px-6 sm:px-10 pb-16 sm:pb-24 max-w-[1440px] mx-auto mt-10">
        <div className="flex justify-between items-end gap-10 py-7">
          <ScrollReveal>
            <h2 className="text-[clamp(28px,3.2vw,48px)] leading-none font-extrabold tracking-[-0.03em]">
              Selected Works
            </h2>
          </ScrollReveal>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10 gap-x-8 mt-11">
          {studio.selectedWorks.map((p, i) => (
            <ScrollReveal key={p.title} delay={i * 0.08}>
              <div>
                <WorkImage label={`${p.title} render`} src={p.image} />
                <div className="flex justify-between gap-6 mt-4.5">
                  <div>
                    <div className="text-[22px] font-bold tracking-[-0.015em]">{p.title}</div>
                    <div className="mt-2 text-sm leading-relaxed text-[#5c5a51] max-w-[46ch] text-pretty">
                      {p.body}
                    </div>
                  </div>
                  <div className="text-xs font-bold tracking-[0.14em] uppercase text-olive-light whitespace-nowrap">
                    {p.year}
                  </div>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>

      {/* Application */}
      <div id="apply" className="px-6 sm:px-10 pt-6 pb-12 sm:pb-16 max-w-[1440px] mx-auto">
        <ApplySection />
      </div>

      {/* Footer */}
      <div className="px-6 sm:px-10 py-10 flex flex-col sm:flex-row justify-between gap-4 text-[11px] font-bold tracking-[0.16em] uppercase text-muted">
        <div>{studio.name}</div>
        <div>{studio.footer.cycle}</div>
      </div>
    </div>
  );
}
