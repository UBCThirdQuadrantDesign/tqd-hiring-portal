"use client";

import { useActionState, useEffect, useId, useMemo, useState } from "react";
import { nanoid } from "nanoid";
import { submitApplication, type SubmitState } from "./actions";
import { application } from "@/content/application";
import { useFileUpload } from "@/lib/use-file-upload";
import { FileDropField } from "@/components/file-drop-field";

const DRAFT_KEY = `tqd-application-draft-${application.cycle}`;
const initialState: SubmitState = { ok: false };

type DraftFields = {
  full_name: string;
  email: string;
  faculty: string;
  year: string;
  subteam: string;
  why_join: string;
  hours_per_week: string;
  other_commitments: string;
};

const emptyDraft: DraftFields = {
  full_name: "",
  email: "",
  faculty: "",
  year: application.questions.find((q) => q.id === "year")!.type === "select"
    ? (application.questions.find((q) => q.id === "year") as { options: readonly string[] }).options[0]
    : "",
  subteam: "",
  why_join: "",
  hours_per_week: "",
  other_commitments: "",
};

function wordCount(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

export function ApplyForm({ onSubmitted }: { onSubmitted: (name: string) => void }) {
  const formId = useId();
  const [draftId] = useState(() => nanoid());
  // Draft persistence — long-form answers are the thing most likely to be
  // lost to an accidental navigation. Read lazily so it happens once, on
  // the client, without a setState-in-effect render cascade; guarded for
  // SSR where localStorage doesn't exist.
  const [fields, setFields] = useState<DraftFields>(() => {
    if (typeof window === "undefined") return emptyDraft;
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      return saved ? { ...emptyDraft, ...JSON.parse(saved) } : emptyDraft;
    } catch {
      return emptyDraft;
    }
  });
  const [state, formAction, pending] = useActionState(submitApplication, initialState);

  const resume = useFileUpload("resume", draftId);
  const portfolio = useFileUpload("portfolio", draftId);

  useEffect(() => {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(fields));
    } catch {
      // ignore
    }
  }, [fields]);

  useEffect(() => {
    if (state.ok && state.submittedName) {
      try {
        localStorage.removeItem(DRAFT_KEY);
      } catch {
        // ignore
      }
      onSubmitted(state.submittedName);
    }
  }, [state, onSubmitted]);

  const field = (k: keyof DraftFields) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setFields((f) => ({ ...f, [k]: e.target.value }));

  const yearQ = application.questions.find((q) => q.id === "year");
  const subteamQ = application.questions.find((q) => q.id === "subteam");
  const resumeQ = application.questions.find((q) => q.id === "resume");
  const portfolioQ = application.questions.find((q) => q.id === "portfolio");
  const whyWords = useMemo(() => wordCount(fields.why_join), [fields.why_join]);
  const commitWords = useMemo(() => wordCount(fields.other_commitments), [fields.other_commitments]);

  const inputClass =
    "px-4 py-3.5 text-base text-ink bg-surface border border-border outline-none transition-colors focus:border-olive-light focus:bg-white";
  const labelClass = "text-xs font-bold tracking-[0.1em] uppercase text-body";

  const canSubmit =
    resume.state.status === "done" && portfolio.state.status === "done" && !pending;

  return (
    <form id={formId} action={formAction} className="grid gap-11 mt-11 mx-auto max-w-[780px] w-full">
      {/* honeypot — hidden from real applicants, screen readers skip via aria-hidden */}
      <div className="hidden" aria-hidden="true">
        <label>
          Company
          <input type="text" name="company" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      {state.error && (
        <p className="text-sm text-red-700 bg-surface border border-border px-4 py-3" role="alert">
          {state.error}
        </p>
      )}

      <div className="grid gap-[22px]">
        <label className="grid gap-2">
          <span className={labelClass}>Full name</span>
          <input
            name="full_name"
            type="text"
            placeholder="Type here"
            value={fields.full_name}
            onChange={field("full_name")}
            className={inputClass}
            aria-describedby={state.fieldErrors?.full_name ? `${formId}-full_name-error` : undefined}
          />
          {state.fieldErrors?.full_name && (
            <span id={`${formId}-full_name-error`} className="text-xs text-red-700">
              {state.fieldErrors.full_name}
            </span>
          )}
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-[22px]">
          <label className="grid gap-2">
            <span className={labelClass}>Email</span>
            <input
              name="email"
              type="email"
              placeholder="you@student.ubc.ca"
              value={fields.email}
              onChange={field("email")}
              className={inputClass}
              aria-describedby={state.fieldErrors?.email ? `${formId}-email-error` : undefined}
            />
            {state.fieldErrors?.email && (
              <span id={`${formId}-email-error`} className="text-xs text-red-700">
                {state.fieldErrors.email}
              </span>
            )}
          </label>
          <label className="grid gap-2">
            <span className={labelClass}>Faculty</span>
            <input
              name="faculty"
              type="text"
              placeholder="e.g. Applied Science"
              value={fields.faculty}
              onChange={field("faculty")}
              className={inputClass}
            />
          </label>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-[22px]">
        <label className="grid gap-2">
          <span className={labelClass}>Year</span>
          <select name="year" value={fields.year} onChange={field("year")} className={inputClass}>
            {yearQ && yearQ.type === "select" &&
              yearQ.options.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
          </select>
        </label>
        <label className="grid gap-2">
          <span className={labelClass}>Sub-team interest</span>
          <select name="subteam" value={fields.subteam} onChange={field("subteam")} className={inputClass} required>
            <option value="" disabled>
              Choose one
            </option>
            {subteamQ && subteamQ.type === "select" &&
              subteamQ.options.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
          </select>
        </label>
      </div>

      <label className="grid gap-2">
        <span className={labelClass}>Why would you like to join TQD? What do you hope to gain from being part of the team?</span>
        <textarea
          name="why_join"
          rows={7}
          placeholder="What drew you to this team, and what do you want to have built by next April?"
          value={fields.why_join}
          onChange={field("why_join")}
          className={inputClass}
        />
        <span className="text-[13px] text-muted">{whyWords} / 250 words</span>
        {state.fieldErrors?.why_join && (
          <span className="text-xs text-red-700">{state.fieldErrors.why_join}</span>
        )}
      </label>

      <label className="grid gap-2">
        <span className={labelClass}>How many hours can you dedicate per week?</span>
        <input
          name="hours_per_week"
          type="text"
          placeholder="e.g. 6–10 hrs"
          value={fields.hours_per_week}
          onChange={field("hours_per_week")}
          className={inputClass}
        />
      </label>

      <label className="grid gap-2">
        <span className={labelClass}>What other commitments/hobbies do you have?</span>
        <textarea
          name="other_commitments"
          rows={4}
          placeholder="Clubs, jobs, sports, whatever else fills the week."
          value={fields.other_commitments}
          onChange={field("other_commitments")}
          className={inputClass}
        />
        <span className="text-[13px] text-muted">{commitWords} / 150 words</span>
      </label>

      <div className="grid gap-6">
        {resumeQ && resumeQ.type === "file" && (
          <FileDropField
            label={resumeQ.label}
            accept={resumeQ.accept}
            state={resume.state}
            onFile={resume.upload}
            error={state.fieldErrors?.resume_path}
          />
        )}
        {portfolioQ && portfolioQ.type === "file" && (
          <FileDropField
            label={portfolioQ.label}
            accept={portfolioQ.accept}
            state={portfolio.state}
            onFile={portfolio.upload}
            error={state.fieldErrors?.portfolio_path}
          />
        )}
        <input type="hidden" name="resume_path" value={resume.state.path ?? ""} />
        <input type="hidden" name="portfolio_path" value={portfolio.state.path ?? ""} />
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-8 pt-10">
        <div className="text-[13px] text-muted">
          Your answers are visible only to the review team.
        </div>
        <button
          type="submit"
          disabled={!canSubmit}
          className="px-8 py-[18px] bg-ink text-bone text-xs font-bold tracking-[0.16em] uppercase cursor-pointer hover:bg-olive transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {pending ? "Submitting…" : "Submit application"}
        </button>
      </div>
    </form>
  );
}
