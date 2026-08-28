import { application } from "@/content/application";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ScrollReveal } from "@/lib/motion/scroll-reveal";

/** Job-description side of the apply section. Copy lives in content/application.ts. */
export function OverviewPanel({ onApply }: { onApply: () => void }) {
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
          <h2 className="text-[28px] font-bold tracking-[-0.015em]">{section.heading}</h2>

          {section.paragraphs.length > 0 && (
            <div className="grid gap-5 mt-5 text-base leading-relaxed text-body max-w-[62ch] text-pretty">
              {section.paragraphs.map((p) => (
                <p key={p} className="m-0">
                  {p}
                </p>
              ))}
            </div>
          )}

          {section.groups.length > 0 && (
            <div className="grid gap-6 mt-5 max-w-[62ch] text-pretty">
              {section.groups.map((group) => (
                <div key={group.title}>
                  {"subheading" in group && group.subheading && (
                    <div className="text-[16px] font-extrabold tracking-[0.18em] uppercase text-ink mt-2 mb-3">
                      {group.subheading}
                    </div>
                  )}
                  <div className="text-base font-bold leading-relaxed text-olive">
                    {group.title}
                    {"hours" in group && group.hours && (
                      <span className="ml-2 text-[12px] font-normal text-muted">
                        ({group.hours})
                      </span>
                    )}
                  </div>
                  <ul className="grid gap-2 mt-2 list-disc pl-5 text-[15px] leading-relaxed text-body">
                    {group.bullets.map((b) => (
                      <li key={b}>{b}</li>
                    ))}
                  </ul>
                </div>
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
      <div>
          <h2 className="text-[28px] leading-none font-extrabold tracking-[-0.03em] mb-3">
            FAQ
          </h2>

          <Accordion multiple defaultValue={["item-1"]} className="w-full">
            {faqItems.map((item) => (
              <AccordionItem key={item.value} value={item.value}>
                <AccordionTrigger>{item.trigger}</AccordionTrigger>
                <AccordionContent>{item.content}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
      </div>

      {/* Apply CTA — jumps straight to the first question of the survey. */}
      <div>
          <button
            type="button"
            onClick={onApply}
            className="inline-flex items-center gap-3 px-6 py-4 bg-ink text-bone text-xs font-bold tracking-[0.16em] uppercase border-0 cursor-pointer hover:bg-olive transition-colors"
          >
            <span>Apply Now</span>
          </button>
      </div>
    </div>
  );
}

const faqItems = [
  {
    value: "item-1",
    trigger: "Will there be an info session?",
    content: "Yes - follow our instagram @ubcthirdquadrant for updates.",
  },
  {
    value: "item-2",
    trigger: "Are late submissions accepted?",
    content: "Submissions close on Sept 13th at 11:59pm. Email ubcthirdquadrantdesign@gmail.com for late submissions!",
  },
  {
    value: "item-3",
    trigger: "Help! I don't know which team to pick :(",
    content: "Apply for our Discovery team. You'll have the chance to play different roles and find your interest.",
  },
];