import { application } from "@/content/application";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ScrollReveal } from "@/lib/motion/scroll-reveal";

/** Job-description side of the apply section. Copy lives in content/application.ts. */
export function OverviewPanel() {
  return (
    <div className="grid gap-12">
      <div className="flex flex-wrap gap-x-16 gap-y-4">
        {application.meta.map((m) => (
          <div key={m.label}>
            <div className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted">
              {m.label}
            </div>
            <div className="mt-2 text-[15px] leading-snug">{m.value}</div>
          </div>
        ))}
      </div>

      {application.overview.map((section) => (
        <div key={section.heading}>
          <div className="text-[22px] font-bold tracking-[-0.015em]">{section.heading}</div>

          {section.paragraphs.length > 0 && (
            <div className="grid gap-5 mt-5 text-base leading-relaxed text-body max-w-[62ch] text-pretty">
              {section.paragraphs.map((p) => (
                <p key={p} className="m-0">
                  {p}
                </p>
              ))}
            </div>
          )}

          {section.bullets.length > 0 && (
            <ul className="grid gap-2.5 mt-5 list-disc pl-5 text-[15px] leading-relaxed text-body max-w-[62ch] text-pretty">
              {section.bullets.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          )}
        </div>
      ))}

      {/* FAQ */}
      <div className="pb-16 sm:pb-24">
        <ScrollReveal>
          <div className="text-[clamp(28px,3.2vw,48px)] leading-none font-extrabold tracking-[-0.03em] mb-7">
            FAQ
          </div>
        </ScrollReveal>

        <ScrollReveal delay={0.08}>
          <Accordion multiple defaultValue={["item-1"]} className="w-full">
            {faqItems.map((item) => (
              <AccordionItem key={item.value} value={item.value}>
                <AccordionTrigger>{item.trigger}</AccordionTrigger>
                <AccordionContent>{item.content}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </ScrollReveal>
      </div>
    </div>
  );
}

const faqItems = [
  {
    value: "item-1",
    trigger: "Will there be an info session?",
    content: "Yes. Maybe. I don't know.",
  },
  {
    value: "item-2",
    trigger: "Are late submissions accepted?",
    content: "Email ubcthirdquadrantdesign@gmail.com for any issues.",
  },
  {
    value: "item-3",
    trigger: "Is it accessible?",
    content: "Yes. It adheres to the WAI-ARIA design pattern.",
  },
  {
    value: "item-4",
    trigger: "Is it accessible?",
    content: "Yes. It adheres to the WAI-ARIA design pattern.",
  },
];