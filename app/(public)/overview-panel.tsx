import { application } from "@/content/application";

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
    </div>
  );
}
