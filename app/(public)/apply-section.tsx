"use client";

import { useRouter } from "next/navigation";
import { ApplyForm } from "./apply-form";
import { application } from "@/content/application";

export function ApplySection() {
  const router = useRouter();

  const onSubmitted = (name: string) => {
    // Real navigation (not client state) so a refresh on the success page
    // can't resubmit the form — the applicant has genuinely left it.
    router.push(`/apply/success?name=${encodeURIComponent(name)}`);
  };

  return (
    <>
      <div className="pb-14">
        <div className="pb-8">
          <div className="text-[clamp(28px,3.2vw,48px)] leading-[0.94] font-extrabold tracking-[-0.035em]">
            Application
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-12 mt-11">
          <div className="grid content-start gap-0">
            {application.meta.map((m) => (
              <div key={m.label} className="py-3.5">
                <div className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted">
                  {m.label}
                </div>
                <div className="mt-2 text-[15px] leading-snug">{m.value}</div>
              </div>
            ))}
          </div>

          <div className="bg-sage-pale p-8 max-w-[420px]">
            <div className="text-[11px] font-bold tracking-[0.18em] uppercase text-olive mb-4">
              How we review
            </div>
            <div className="text-[15px] leading-relaxed text-sage-deep text-pretty">
              We read every submission, then invite a shortlist to a
              thirty‑minute conversation in the studio. Offers go out after
              interviews close. Portfolios matter more than grades; a
              sketchbook page counts.
            </div>
          </div>
        </div>
      </div>

      <ApplyForm onSubmitted={onSubmitted} />
    </>
  );
}
