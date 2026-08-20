"use client";

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { ApplyForm } from "./apply-form";
import { ApplyTabs, type TabDef } from "./apply-tabs";
import { OverviewPanel } from "./overview-panel";

type TabId = "overview" | "application";

const TABS: readonly TabDef<TabId>[] = [
  { id: "overview", label: "Overview" },
  { id: "application", label: "Application" },
];

export function ApplySection() {
  const router = useRouter();
  const idPrefix = useId();
  const [active, setActive] = useState<TabId>("overview");

  const onSubmitted = (name: string) => {
    // Real navigation (not client state) so a refresh on the success page
    // can't resubmit the form — the applicant has genuinely left it.
    router.push(`/apply/success?name=${encodeURIComponent(name)}`);
  };

  return (
    <div className="mx-auto max-w-[780px] w-full">
      <ApplyTabs tabs={TABS} active={active} onChange={setActive} idPrefix={idPrefix} />

      {/* Both panels stay mounted. ApplyForm holds uploaded-file state that is
          not persisted to localStorage, so unmounting on a tab switch would
          silently drop a resume the applicant already uploaded. */}
      <div
        role="tabpanel"
        id={`${idPrefix}-panel-overview`}
        aria-labelledby={`${idPrefix}-tab-overview`}
        hidden={active !== "overview"}
        className="pt-11"
      >
        <OverviewPanel />
      </div>

      <div
        role="tabpanel"
        id={`${idPrefix}-panel-application`}
        aria-labelledby={`${idPrefix}-tab-application`}
        hidden={active !== "application"}
        className="pt-11"
      >
        <ApplyForm onSubmitted={onSubmitted} />
      </div>
    </div>
  );
}
